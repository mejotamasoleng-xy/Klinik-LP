/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ClipboardEdit,
  Users,
  FileSpreadsheet,
  ShieldAlert,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  Stethoscope,
  BarChart3,
  Sliders,
} from 'lucide-react';

export type TabKey =
  | 'input'
  | 'pasien'
  | 'rekap'
  | 'bpjs'
  | 'dashboard'
  | 'pengaturan';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  counts?: {
    todayVisits: number;
    totalWbp: number;
    pendingBpjs: number;
    flaggedSidb: number;
  };
}

export default function Sidebar({ activeTab, onTabChange, counts }: SidebarProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Grouped Navigation Items per user request
  const menuGroups = [
    {
      groupTitle: 'Pelayanan Klinis',
      items: [
        {
          id: 'input' as TabKey,
          label: 'Input Harian',
          desc: 'Pencatatan rawat jalan & rekam medis',
          icon: ClipboardEdit,
          badge: counts?.todayVisits ? `${counts.todayVisits} hari ini` : undefined,
          badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 font-bold',
        },
        {
          id: 'pasien' as TabKey,
          label: 'Data Pasien (WBP)',
          desc: 'Direktori 512 warga binaan',
          icon: Users,
          badge: counts?.totalWbp ? `${counts.totalWbp}` : undefined,
        },
        {
          id: 'rekap' as TabKey,
          label: 'Rekap Bulanan',
          desc: '14 Kategori & 88 Penyakit (Copy Excel)',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      groupTitle: 'Analisis & Laporan',
      items: [
        {
          id: 'dashboard' as TabKey,
          label: 'Dashboard',
          desc: 'Analitika klinis & surveilans epidemiologi',
          icon: LayoutDashboard,
        },
        {
          id: 'bpjs' as TabKey,
          label: 'Dashboard BPJS',
          desc: 'Pengalihan Faskes & Daftar Panggil PBI',
          icon: ShieldAlert,
          badge: counts?.pendingBpjs ? `${counts.pendingBpjs} panggil` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-bold',
        },
      ],
    },
    {
      groupTitle: 'Konfigurasi & Master Data',
      items: [
        {
          id: 'pengaturan' as TabKey,
          label: 'Pengaturan Sistem',
          desc: 'Kamus ICD-10, update SIDB, impor & akun',
          icon: Settings,
        },
      ],
    },
  ];

  const handleSelectTab = (tab: TabKey) => {
    onTabChange(tab);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on lg screens) */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
        {/* Brand Banner with Official Logo */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Logo Klinik Pratama Lapas Kelas IIB Dompu"
            className="h-10 w-auto max-w-[210px] object-contain"
          />
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {menuGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.groupTitle}
              </div>

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold shadow-xs border border-teal-200/60 dark:border-teal-800/60'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400'
                        }`}
                      />
                      <div className="text-left truncate">
                        <div className="truncate font-semibold">{item.label}</div>
                      </div>
                    </div>
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded-sm font-semibold tabular-nums shrink-0 ${
                          item.badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-center">
          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Klinik Pratama Lapas Dompu
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">
            Kemenimipas RI · NTB
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (5 core buttons: Input, Pasien, Rekap, BPJS, Dashboard) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-md">
        <div className="flex items-center justify-around">
          <button
            type="button"
            onClick={() => handleSelectTab('input')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === 'input'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ClipboardEdit className="w-5 h-5 mb-0.5" />
            <span>Input</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('pasien')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === 'pasien'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Pasien</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('rekap')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === 'rekap'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5 mb-0.5" />
            <span>Rekap</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('bpjs')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === 'bpjs'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ShieldAlert className="w-5 h-5 mb-0.5" />
            <span>BPJS</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    </>
  );
}
