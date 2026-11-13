/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useCallback, useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar, { TabKey } from './components/Sidebar';
import LoginView from './components/LoginView';
import ChangePasswordView from './components/ChangePasswordView';
import { getCurrentSession, logoutSession } from './lib/auth';
import { store, useStoreSync } from './lib/storage';
import { WbpItem } from './types';

// Keep infrequently used, data-heavy screens out of the initial bundle.
const DailyInput = lazy(() => import('./components/DailyInput'));
const WbpDirectory = lazy(() => import('./components/WbpDirectory'));
const MonthlyRecap = lazy(() => import('./components/MonthlyRecap'));
const BpjsDashboard = lazy(() => import('./components/BpjsDashboard'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const MedicalRecordModal = lazy(() => import('./components/MedicalRecordModal'));

export default function App() {
  const storeVersion = useStoreSync();
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-out' | 'syncing' | 'authenticated' | 'change-password' | 'error'>('checking');
  const [startupError, setStartupError] = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>('input');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('klinik_dompu_theme') === 'dark';
  });

  const [selectedPatientForRecord, setSelectedPatientForRecord] = useState<WbpItem | null>(null);

  const [counts, setCounts] = useState({
    todayVisits: 0,
    totalWbp: 0,
    pendingBpjs: 0,
    flaggedSidb: 0,
  });

  const updateCounts = () => {
    const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const visits = store.getCalculatedKunjungan(false);
    const wbps = store.getWbpList();

    setCounts({
      todayVisits: visits.filter((k) => k.tanggal === todayStr).length,
      totalWbp: wbps.length,
      pendingBpjs: wbps.filter((w) => w.batch_bpjs === 'Belum masuk batch').length,
      flaggedSidb: wbps.filter((w) => w.perlu_dicek).length,
    });
  };

  const prepareAuthenticatedApp = useCallback(async () => {
    setAuthStatus('syncing');
    setStartupError('');
    try {
      await store.importLocalDataToDatabase();
      await store.syncFromDatabase();
      store.startRealtimeSync();
      setActiveTab('input');
      setAuthStatus('authenticated');
    } catch {
      store.stopRealtimeSync();
      setStartupError('Tidak dapat memuat data dari database klinik. Periksa koneksi lalu coba lagi.');
      setAuthStatus('error');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const session = await getCurrentSession();
        if (!active) return;
        if (!session) {
          setAuthStatus('signed-out');
          return;
        }
        if (session.mustChangePassword) {
          setAuthStatus('change-password');
          return;
        }
        await prepareAuthenticatedApp();
      } catch {
        if (active) {
          setStartupError('Sesi atau database klinik tidak dapat diperiksa. Coba muat ulang halaman.');
          setAuthStatus('error');
        }
      }
    };

    const handleSessionExpired = () => {
      store.clearSensitiveData();
      setAuthStatus('signed-out');
    };
    const handlePasswordChangeRequired = () => setAuthStatus('change-password');

    void restoreSession();
    window.addEventListener('clinic:session-expired', handleSessionExpired);
    window.addEventListener('clinic:password-change-required', handlePasswordChangeRequired);
    return () => {
      active = false;
      window.removeEventListener('clinic:session-expired', handleSessionExpired);
      window.removeEventListener('clinic:password-change-required', handlePasswordChangeRequired);
    };
  }, [prepareAuthenticatedApp]);

  useEffect(() => {
    if (authStatus === 'authenticated') updateCounts();
  }, [authStatus, activeTab, storeVersion]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('klinik_dompu_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setDarkMode(savedTheme === 'dark');
    }
  }, [storeVersion]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('klinik_dompu_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogout = async () => {
    await logoutSession();
    store.clearSensitiveData();
    setAuthStatus('signed-out');
  };

  if (authStatus === 'checking' || authStatus === 'syncing') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">Menghubungkan ke data klinik…</p>
      </main>
    );
  }

  if (authStatus === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
        <section className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Koneksi data belum tersedia</h1>
          <p role="alert" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{startupError}</p>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={() => void prepareAuthenticatedApp()} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Coba lagi</button>
            <button type="button" onClick={handleLogout} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Keluar</button>
          </div>
        </section>
      </main>
    );
  }

  if (authStatus === 'change-password') {
    return <ChangePasswordView onPasswordChanged={prepareAuthenticatedApp} />;
  }

  if (authStatus === 'signed-out') {
    return (
      <LoginView
        onLoginSuccess={(mustChangePassword) => {
          if (mustChangePassword) setAuthStatus('change-password');
          else void prepareAuthenticatedApp();
        }}
      />
    );
  }

  const freshSelectedPatient = selectedPatientForRecord
    ? store.getWbpById(selectedPatientForRecord.id) || selectedPatientForRecord
    : null;

  const tabLabels: Record<TabKey, string> = {
    input: 'Input Harian Pelayanan Medis',
    pasien: 'Direktori Data Warga Binaan (DATA_WBP)',
    rekap: 'Laporan Rekapitulasi Penyakit Bulanan',
    bpjs: 'Dashboard Pengalihan Faskes BPJS',
    dashboard: 'Dashboard Analisis Klinis & Diagram Bulat',
    pengaturan: 'Pengaturan Sistem & Master Data',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
        onOpenSettings={() => setActiveTab('pengaturan')}
        onLogout={handleLogout}
        onSelectPatient={(wbp) => setSelectedPatientForRecord(wbp)}
        activeTabLabel={tabLabels[activeTab]}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Memuat halaman…</div>}>
              {activeTab === 'input' && (
                <DailyInput onOpenMedicalRecord={setSelectedPatientForRecord} onRefreshData={updateCounts} />
              )}
              {activeTab === 'pasien' && <WbpDirectory onSelectWbp={setSelectedPatientForRecord} />}
              {activeTab === 'rekap' && <MonthlyRecap />}
              {activeTab === 'bpjs' && <BpjsDashboard />}
              {activeTab === 'dashboard' && (
                <Dashboard onNavigateToTab={setActiveTab} onSelectWbp={setSelectedPatientForRecord} />
              )}
              {activeTab === 'pengaturan' && <SettingsModal />}
              {freshSelectedPatient && (
                <MedicalRecordModal wbp={freshSelectedPatient} onClose={() => setSelectedPatientForRecord(null)} />
              )}
            </Suspense>
          </div>
        </main>
      </div>

      <footer className="border-t border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900 px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
        Made with <span aria-label="love">❤️</span> by Joshua | © 2026
      </footer>
    </div>
  );
}
