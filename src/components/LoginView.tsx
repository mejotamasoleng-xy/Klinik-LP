/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';
import { getLockoutState, loginWithCredentials } from '../lib/auth';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  useEffect(() => {
    const checkLockout = () => {
      const state = getLockoutState();
      const now = Date.now();
      if (state.lockedUntil > now) {
        setLockoutCountdown(Math.ceil((state.lockedUntil - now) / 1000));
      } else {
        setLockoutCountdown(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (lockoutCountdown > 0) {
      setErrorMsg(`Sistem terkunci sementara. Mohon tunggu ${lockoutCountdown} detik.`);
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithCredentials(username, password, rememberMe);
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMsg(res.message || 'Gagal masuk. Periksa kembali username dan password.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan pada sistem saat memproses login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        {/* Official Clinic Brand Header */}
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="Logo Klinik Pratama Lapas Kelas IIB Dompu"
            className="h-16 w-auto mx-auto object-contain mb-2"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sistem Informasi Rekam Medis & Pelayanan Kesehatan WBP
          </p>
        </div>

        {/* Lockout or Error Alert */}
        {lockoutCountdown > 0 ? (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Akses Terkunci Sementara</p>
              <p className="text-xs mt-0.5">
                Batas percobaan salah tercapai. Silakan coba kembali dalam{' '}
                <span className="font-mono font-bold text-sm">{lockoutCountdown}</span> detik.
              </p>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Username Petugas
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoComplete="username"
                required
                disabled={loading || lockoutCountdown > 0}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={loading || lockoutCountdown > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Ingat saya di perangkat ini (30 hari)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || lockoutCountdown > 0}
            className="w-full mt-2 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Memverifikasi...</span>
            ) : (
              <span>Masuk Layanan</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Lembaga Pemasyarakatan Kelas IIB Dompu · Hak Akses Petugas Medis
          </p>
        </div>
      </div>
    </div>
  );
}
