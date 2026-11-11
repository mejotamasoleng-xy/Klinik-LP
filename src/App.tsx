/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar, { TabKey } from './components/Sidebar';
import DailyInput from './components/DailyInput';
import WbpDirectory from './components/WbpDirectory';
import MonthlyRecap from './components/MonthlyRecap';
import BpjsDashboard from './components/BpjsDashboard';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import MedicalRecordModal from './components/MedicalRecordModal';
import LoginView from './components/LoginView';
import { getCurrentSession, logoutSession } from './lib/auth';
import { store } from './lib/storage';
import { WbpItem } from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return getCurrentSession() !== null;
  });

  const [activeTab, setActiveTab] = useState<TabKey>('input');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('klinik_dompu_theme') === 'dark';
  });

  // Global Medical Record modal
  const [selectedPatientForRecord, setSelectedPatientForRecord] = useState<WbpItem | null>(null);

  // Quick counts for sidebar badges
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

    const todayCount = visits.filter((k) => k.tanggal === todayStr).length;
    const pendingBpjs = wbps.filter((w) => w.batch_bpjs === 'Belum masuk batch').length;
    const flaggedSidb = wbps.filter((w) => w.perlu_dicek).length;

    setCounts({
      todayVisits: todayCount,
      totalWbp: wbps.length,
      pendingBpjs,
      flaggedSidb,
    });
  };

  useEffect(() => {
    if (isAuthenticated) {
      updateCounts();
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('klinik_dompu_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('klinik_dompu_theme', 'light');
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    logoutSession();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          setActiveTab('input'); // "Layar Input Harian adalah layar utama setelah login."
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
      {/* Top Bar with Brand, Global Search, and Actions */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenSettings={() => setActiveTab('pengaturan')}
        onLogout={handleLogout}
        onSelectPatient={(wbp) => setSelectedPatientForRecord(wbp)}
        activeTabLabel={tabLabels[activeTab]}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar & Mobile Bottom Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          counts={counts}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'input' && (
              <DailyInput
                onOpenMedicalRecord={(wbp) => setSelectedPatientForRecord(wbp)}
                onRefreshData={updateCounts}
              />
            )}

            {activeTab === 'pasien' && (
              <WbpDirectory
                onSelectWbp={(wbp) => setSelectedPatientForRecord(wbp)}
              />
            )}

            {activeTab === 'rekap' && <MonthlyRecap />}

            {activeTab === 'bpjs' && <BpjsDashboard />}

            {activeTab === 'dashboard' && (
              <Dashboard
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onSelectWbp={(wbp) => setSelectedPatientForRecord(wbp)}
              />
            )}

            {activeTab === 'pengaturan' && <SettingsModal />}
          </div>
        </main>
      </div>

      {/* Global Medical Record Modal */}
      {selectedPatientForRecord && (
        <MedicalRecordModal
          wbp={selectedPatientForRecord}
          onClose={() => setSelectedPatientForRecord(null)}
        />
      )}
    </div>
  );
}
