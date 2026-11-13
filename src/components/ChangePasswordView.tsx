import { FormEvent, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { changePasswordWithSession } from '../lib/auth';

interface ChangePasswordViewProps {
  onPasswordChanged: () => Promise<void> | void;
}

export default function ChangePasswordView({ onPasswordChanged }: ChangePasswordViewProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    if (newPassword.length < 12) {
      setMessage('Kata sandi baru harus memiliki sedikitnya 12 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setLoading(true);
    const result = await changePasswordWithSession(currentPassword, newPassword);
    if (!result.success) {
      setMessage(result.message || 'Kata sandi belum dapat diperbarui.');
      setLoading(false);
      return;
    }

    await onPasswordChanged();
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
        <div className="mb-6 flex items-start gap-3">
          <span className="rounded-lg bg-teal-50 dark:bg-teal-950/50 p-2.5 text-teal-700 dark:text-teal-300">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Amankan akun klinik</h1>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Buat kata sandi baru sebelum membuka data rekam medis bersama. Pada login pertama, gunakan perangkat yang menyimpan data klinik terbaru agar dapat dimigrasikan ke database bersama.
            </p>
          </div>
        </div>

        {message && (
          <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Kata sandi saat ini
            <input
              autoComplete="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Kata sandi baru
            <input
              autoComplete="new-password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">Gunakan sedikitnya 12 karakter.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Ulangi kata sandi baru
            <input
              autoComplete="new-password"
              type="password"
              minLength={12}
              maxLength={128}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            <KeyRound aria-hidden="true" className="h-4 w-4" />
            {loading ? 'Menyimpan…' : 'Simpan dan lanjutkan'}
          </button>
        </form>
      </section>
    </main>
  );
}
