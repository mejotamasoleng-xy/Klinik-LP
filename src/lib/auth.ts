/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hashPassword, store } from './storage';

const SESSION_STORAGE_KEY = 'klinik_dompu_auth_session';
const FAILED_ATTEMPTS_KEY = 'klinik_dompu_auth_lockout';

export interface AuthState {
  isAuthenticated: boolean;
  username: string;
  loginTime: number;
  rememberMe: boolean;
}

export interface LockoutState {
  count: number;
  lockedUntil: number; // timestamp in ms
}

export function getLockoutState(): LockoutState {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

export function recordFailedAttempt(): { count: number; lockedUntil: number; isLocked: boolean } {
  const current = getLockoutState();
  const newCount = current.count + 1;
  let lockedUntil = current.lockedUntil;

  // After 5 failed attempts, lock for 60 seconds (1 minute)
  if (newCount >= 5) {
    lockedUntil = Date.now() + 60 * 1000;
  }

  const newState: LockoutState = { count: newCount, lockedUntil };
  localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(newState));
  return {
    count: newCount,
    lockedUntil,
    isLocked: lockedUntil > Date.now(),
  };
}

export function resetFailedAttempts() {
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
}

export async function loginWithCredentials(
  usernameInput: string,
  passwordInput: string,
  rememberMe: boolean
): Promise<{ success: boolean; message?: string }> {
  const lockout = getLockoutState();
  const now = Date.now();
  if (lockout.lockedUntil && lockout.lockedUntil > now) {
    const remainingSec = Math.ceil((lockout.lockedUntil - now) / 1000);
    return {
      success: false,
      message: `Terlalu banyak percobaan gagal. Silakan tunggu ${remainingSec} detik sebelum mencoba kembali.`,
    };
  }

  const cleanUser = usernameInput.trim();
  const cleanPass = passwordInput.trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, message: 'Username dan password wajib diisi.' };
  }

  if (cleanUser !== 'klinik') {
    const att = recordFailedAttempt();
    if (att.isLocked) {
      return {
        success: false,
        message: 'Salah password 5 kali berturut-turut. Akses ditahan selama 1 menit demi keamanan.',
      };
    }
    return { success: false, message: 'Kombinasi username atau password tidak sesuai.' };
  }

  const currentSettings = store.getPengaturan();
  const inputHash = await hashPassword(cleanPass);

  if (inputHash !== currentSettings.password_hash) {
    const att = recordFailedAttempt();
    if (att.isLocked) {
      return {
        success: false,
        message: 'Salah password 5 kali berturut-turut. Akses ditahan selama 1 menit demi keamanan.',
      };
    }
    return { success: false, message: 'Kombinasi username atau password tidak sesuai.' };
  }

  // Success
  resetFailedAttempts();
  const session: AuthState = {
    isAuthenticated: true,
    username: cleanUser,
    loginTime: now,
    rememberMe,
  };

  const storageToUse = rememberMe ? localStorage : sessionStorage;
  storageToUse.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

  store.logAudit('Login Berhasil', 'Petugas berhasil masuk ke sistem klinik');
  return { success: true };
}

export function getCurrentSession(): AuthState | null {
  try {
    let raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    }
    if (!raw) return null;

    const parsed: AuthState = JSON.parse(raw);
    const now = Date.now();
    // 30 days expiration if rememberMe, else 24 hours
    const maxAge = parsed.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    if (now - parsed.loginTime > maxAge) {
      logoutSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function logoutSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  store.logAudit('Logout', 'Petugas keluar dari sistem klinik');
}
