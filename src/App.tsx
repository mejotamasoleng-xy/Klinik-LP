/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar, { TabKey } from './components/Sidebar';
import LoginView from './components/LoginView';
import { getCurrentSession, logoutSession } from './lib/auth';
import { store } from './lib/storage';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return getCurrentSession() !== null;
  });

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

  useEffect(() => {
    if (isAuthenticated) updateCounts();
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('klinik_dompu_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogout = () => {
    logoutSession();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          setActiveTab('input');
        }}
      />
    );
  }

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
              {selectedPatientForRecord && (
                <MedicalRecordModal wbp={selectedPatientForRecord} onClose={() => setSelectedPatientForRecord(null)} />
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
