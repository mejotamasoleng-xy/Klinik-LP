import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import type { Express, NextFunction, Request, Response } from 'express';
import { and, eq, gt, ne } from 'drizzle-orm';
import { addAuditLog } from '../db/queries.ts';
import { db } from '../db/index.ts';
import { authSessions, clinicAuth, pengaturanApp } from '../db/schema.ts';

const COOKIE_NAME = 'klinik_session';
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_USERNAME = 'klinik';
const DEFAULT_PASSWORD = 'admin';
const DEFAULT_PASSWORD_HASH = createHash('sha256').update(DEFAULT_PASSWORD).digest('hex');
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

type ClinicSession = {
  id: string;
  username: string;
  mustChangePassword: boolean;
  expiresAt: Date;
};

function requireDatabase() {
  if (!db) throw new Error('The connected Neon database is not available.');
  return db;
}

function derivePassword(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

async function createPasswordHash(password: string) {
  const salt = randomBytes(16);
  const key = await derivePassword(password, salt);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

function safeCompare(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

async function verifyPassword(password: string, storedHash: string) {
  if (storedHash.startsWith('scrypt$')) {
    const [, saltHex, keyHex] = storedHash.split('$');
    if (!saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(keyHex)) {
      return false;
    }
    const actual = await derivePassword(password, Buffer.from(saltHex, 'hex'));
    return safeCompare(actual, Buffer.from(keyHex, 'hex'));
  }

  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const actual = createHash('sha256').update(password).digest();
    return safeCompare(actual, Buffer.from(storedHash, 'hex'));
  }

  return false;
}

export async function ensureClinicAuth() {
  const database = requireDatabase();
  const [existing] = await database.select().from(clinicAuth).limit(1);
  if (existing) return;

  const [legacySettings] = await database
    .select()
    .from(pengaturanApp)
    .where(eq(pengaturanApp.key, 'app_settings'))
    .limit(1);
  const legacyHash = (legacySettings?.value as { password_hash?: unknown } | undefined)?.password_hash;
  const passwordHash = typeof legacyHash === 'string' && legacyHash ? legacyHash : await createPasswordHash(DEFAULT_PASSWORD);

  await database.insert(clinicAuth).values({
    id: 'clinic',
    username: DEFAULT_USERNAME,
    passwordHash,
    mustChangePassword: !legacyHash || legacyHash === DEFAULT_PASSWORD_HASH,
  }).onConflictDoNothing();
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function readCookie(req: Request, name: string) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const prefix = `${name}=`;
  const cookie = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : null;
}

function cookieAttributes(maxAgeSeconds: number) {
  const sameSite = process.env.NODE_ENV === 'development' ? 'None' : 'Lax';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAgeSeconds}`;
}

function setSessionCookie(res: Response, token: string, maxAgeSeconds: number) {
  const sameSite = process.env.NODE_ENV === 'development' ? 'None' : 'Lax';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAgeSeconds}`
  );
}

async function findSession(req: Request): Promise<ClinicSession | null> {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;

  const database = requireDatabase();
  const sessionId = hashSessionToken(token);
  const [session] = await database
    .select()
    .from(authSessions)
    .where(and(eq(authSessions.id, sessionId), gt(authSessions.expiresAt, new Date())))
    .limit(1);

  if (!session) return null;
  const [credential] = await database.select().from(clinicAuth).where(eq(clinicAuth.id, 'clinic')).limit(1);
  if (!credential) return null;

  return {
    id: sessionId,
    username: credential.username,
    mustChangePassword: credential.mustChangePassword,
    expiresAt: session.expiresAt,
  };
}

function consumeLoginAttempt(key: string) {
  const now = Date.now();
  const previous = loginAttempts.get(key);
  if (!previous || previous.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    return { blocked: false, remainingSeconds: 0 };
  }

  if (previous.count >= 5) {
    return { blocked: true, remainingSeconds: Math.max(1, Math.ceil((previous.resetAt - now) / 1000)) };
  }

  previous.count += 1;
  return { blocked: false, remainingSeconds: 0 };
}

function resetLoginAttempts(key: string) {
  loginAttempts.delete(key);
}

export function requireSameOriginForMutations(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const origin = req.get('origin');
  const host = req.get('host');
  if (!origin || !host) return res.status(403).json({ error: 'Permintaan lintas-origin ditolak.' });

  try {
    if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) {
      return res.status(403).json({ error: 'Permintaan lintas-origin ditolak.' });
    }
  } catch {
    return res.status(403).json({ error: 'Origin tidak valid.' });
  }

  return next();
}

export function requireClinicSession(req: Request, res: Response, next: NextFunction) {
  void findSession(req)
    .then((session) => {
      if (!session) {
        res.status(401).json({ error: 'Sesi tidak valid. Silakan masuk kembali.' });
        return;
      }
      if (session.mustChangePassword) {
        res.status(428).json({ code: 'PASSWORD_CHANGE_REQUIRED', error: 'Ubah kata sandi sebelum membuka data klinik.' });
        return;
      }
      (req as Request & { clinicSession?: ClinicSession }).clinicSession = session;
      next();
    })
    .catch((error) => {
      console.error('Session validation failed:', error);
      res.status(503).json({ error: 'Layanan autentikasi sementara tidak tersedia.' });
    });
}

export function registerClinicAuthRoutes(app: Express) {
  app.post('/api/auth/login', async (req, res) => {
    try {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim().slice(0, 64) : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      const rememberMe = req.body?.rememberMe === true;
      if (!username || !password || password.length > 256) {
        return res.status(400).json({ success: false, error: 'Username dan kata sandi wajib diisi.' });
      }

      const attemptKey = `${req.ip || 'unknown'}:${username.toLowerCase()}`;
      const attempt = loginAttempts.get(attemptKey);
      if (attempt && attempt.count >= 5 && attempt.resetAt > Date.now()) {
        const remainingSeconds = Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000));
        return res.status(429).json({
          success: false,
          error: `Terlalu banyak percobaan gagal. Coba kembali dalam ${remainingSeconds} detik.`,
          retryAfterSeconds: remainingSeconds,
        });
      }

      const database = requireDatabase();
      const [credential] = await database.select().from(clinicAuth).where(eq(clinicAuth.id, 'clinic')).limit(1);
      if (!credential) {
        return res.status(503).json({ success: false, error: 'Akun klinik belum siap. Coba kembali sebentar lagi.' });
      }

      const passwordMatches = await verifyPassword(password, credential.passwordHash);
      if (username !== credential.username || !passwordMatches) {
        const failedAttempt = consumeLoginAttempt(attemptKey);
        const remainingSeconds = failedAttempt.blocked ? failedAttempt.remainingSeconds : 0;
        return res.status(failedAttempt.blocked ? 429 : 401).json({
          success: false,
          error: failedAttempt.blocked
            ? `Terlalu banyak percobaan gagal. Coba kembali dalam ${remainingSeconds} detik.`
            : 'Kombinasi username atau kata sandi tidak sesuai.',
          retryAfterSeconds: remainingSeconds,
        });
      }

      resetLoginAttempts(attemptKey);
      const legacyHash = /^[a-f0-9]{64}$/i.test(credential.passwordHash);
      const isKnownDefault = legacyHash && credential.passwordHash.toLowerCase() === DEFAULT_PASSWORD_HASH;
      const mustChangePassword = credential.mustChangePassword || isKnownDefault;
      const passwordHash = legacyHash ? await createPasswordHash(password) : credential.passwordHash;
      if (legacyHash || mustChangePassword !== credential.mustChangePassword) {
        await database.update(clinicAuth)
          .set({ passwordHash, mustChangePassword, updatedAt: new Date() })
          .where(eq(clinicAuth.id, 'clinic'));
      }

      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + (rememberMe ? 30 * DAY_MS : DAY_MS));
      await database.insert(authSessions).values({ id: hashSessionToken(token), expiresAt });
      setSessionCookie(res, token, rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60);
      await addAuditLog({
        id: `login-${randomBytes(12).toString('hex')}`,
        waktu: new Date().toISOString(),
        aksi: 'Login Berhasil',
        rincian: 'Petugas berhasil masuk ke sistem klinik',
        perangkat: req.get('user-agent')?.slice(0, 120) || 'Perangkat tidak diketahui',
      });

      return res.json({ success: true, username: credential.username, mustChangePassword });
    } catch (error) {
      console.error('Clinic login failed:', error);
      return res.status(503).json({ success: false, error: 'Layanan login sementara tidak tersedia.' });
    }
  });

  app.get('/api/auth/session', async (req, res) => {
    try {
      const session = await findSession(req);
      if (!session) return res.json({ authenticated: false });
      return res.json({
        authenticated: true,
        username: session.username,
        mustChangePassword: session.mustChangePassword,
      });
    } catch (error) {
      console.error('Clinic session lookup failed:', error);
      return res.status(503).json({ authenticated: false, error: 'Layanan autentikasi sementara tidak tersedia.' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const token = readCookie(req, COOKIE_NAME);
      if (token) {
        const sessionId = hashSessionToken(token);
        await requireDatabase().delete(authSessions).where(eq(authSessions.id, sessionId));
        await addAuditLog({
          id: `logout-${randomBytes(12).toString('hex')}`,
          waktu: new Date().toISOString(),
          aksi: 'Logout',
          rincian: 'Petugas keluar dari sistem klinik',
          perangkat: req.get('user-agent')?.slice(0, 120) || 'Perangkat tidak diketahui',
        });
      }
      res.setHeader('Set-Cookie', cookieAttributes(0));
      return res.json({ success: true });
    } catch (error) {
      console.error('Clinic logout failed:', error);
      res.setHeader('Set-Cookie', cookieAttributes(0));
      return res.status(503).json({ success: false, error: 'Sesi lokal dihapus, tetapi server belum dapat dihubungi.' });
    }
  });

  app.post('/api/auth/change-password', async (req, res) => {
    try {
      const session = await findSession(req);
      if (!session) return res.status(401).json({ success: false, error: 'Sesi tidak valid. Silakan masuk kembali.' });

      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      if (newPassword.length < 12 || newPassword.length > 128) {
        return res.status(400).json({ success: false, error: 'Kata sandi baru harus memiliki 12–128 karakter.' });
      }
      if (newPassword === currentPassword) {
        return res.status(400).json({ success: false, error: 'Kata sandi baru harus berbeda dari kata sandi saat ini.' });
      }

      const database = requireDatabase();
      const [credential] = await database.select().from(clinicAuth).where(eq(clinicAuth.id, 'clinic')).limit(1);
      if (!credential || !(await verifyPassword(currentPassword, credential.passwordHash))) {
        return res.status(400).json({ success: false, error: 'Kata sandi saat ini tidak sesuai.' });
      }

      await database.update(clinicAuth)
        .set({ passwordHash: await createPasswordHash(newPassword), mustChangePassword: false, updatedAt: new Date() })
        .where(eq(clinicAuth.id, 'clinic'));
      await database.delete(authSessions).where(ne(authSessions.id, session.id));
      await addAuditLog({
        id: `password-${randomBytes(12).toString('hex')}`,
        waktu: new Date().toISOString(),
        aksi: 'Ganti Password',
        rincian: 'Petugas memperbarui kata sandi akun klinik bersama',
        perangkat: req.get('user-agent')?.slice(0, 120) || 'Perangkat tidak diketahui',
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('Clinic password update failed:', error);
      return res.status(503).json({ success: false, error: 'Kata sandi belum dapat diperbarui. Coba kembali.' });
    }
  });
}
