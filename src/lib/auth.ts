/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const FAILED_ATTEMPTS_KEY = 'klinik_dompu_auth_lockout';

export interface AuthState {
  isAuthenticated: boolean;
  username: string;
  mustChangePassword: boolean;
}

export interface LockoutState {
  count: number;
  lockedUntil: number;
}

export function getLockoutState(): LockoutState {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

export function recordFailedAttempt(retryAfterSeconds = 0) {
  const current = getLockoutState();
  const count = current.count + 1;
  const lockedUntil = retryAfterSeconds > 0
    ? Date.now() + retryAfterSeconds * 1000
    : count >= 5 ? Date.now() + 60_000 : current.lockedUntil;
  const next = { count, lockedUntil };
  localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(next));
  return { ...next, isLocked: lockedUntil > Date.now() };
}

export function resetFailedAttempts() {
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
}

export async function loginWithCredentials(
  username: string,
  password: string,
  rememberMe: boolean
): Promise<{ success: boolean; message?: string; mustChangePassword?: boolean }> {
  const lockout = getLockoutState();
  if (lockout.lockedUntil > Date.now()) {
    const remaining = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
    return { success: false, message: `Terlalu banyak percobaan gagal. Coba kembali dalam ${remaining} detik.` };
  }
  if (!username.trim() || !password) {
    return { success: false, message: 'Username dan kata sandi wajib diisi.' };
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password, rememberMe }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const retryAfter = Number(result.retryAfterSeconds || 0);
      recordFailedAttempt(retryAfter);
      return { success: false, message: result.error || 'Kombinasi username atau kata sandi tidak sesuai.' };
    }

    resetFailedAttempts();
    return { success: true, mustChangePassword: Boolean(result.mustChangePassword) };
  } catch {
    return { success: false, message: 'Tidak dapat menghubungi server klinik. Periksa koneksi lalu coba kembali.' };
  }
}

export async function getCurrentSession(): Promise<AuthState | null> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Sesi klinik tidak dapat diperiksa.');
  const result = await response.json();
  if (!result.authenticated) return null;
  return {
    isAuthenticated: true,
    username: result.username,
    mustChangePassword: Boolean(result.mustChangePassword),
  };
}

export async function changePasswordWithSession(currentPassword: string, newPassword: string) {
  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = await response.json().catch(() => ({}));
    return response.ok
      ? { success: true }
      : { success: false, message: result.error || 'Kata sandi belum dapat diperbarui.' };
  } catch {
    return { success: false, message: 'Tidak dapat menghubungi server klinik. Periksa koneksi lalu coba kembali.' };
  }
}

export async function logoutSession() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    // The server-side session expires automatically if logout cannot reach the server.
  }
}
