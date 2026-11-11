/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Sun, Moon, LogOut, Settings, ShieldCheck, User } from 'lucide-react';
import { store } from '../lib/storage';
import { WbpItem } from '../types';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onSelectPatient: (wbp: WbpItem) => void;
  activeTabLabel: string;
}

export default function Header({
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  onLogout,
  onSelectPatient,
  activeTabLabel,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WbpItem[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const found = store.findWbpByNameOrNik(q);
    setSearchResults(found.slice(0, 6));
    setShowResults(true);
  };

  const handleSelect = (wbp: WbpItem) => {
    onSelectPatient(wbp);
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Zone 1: Active module title & breadcrumb (Logo only on mobile where sidebar is hidden) */}
      <div className="flex items-center gap-3 shrink-0">
        <img
          src="/logo.png"
          alt="Logo Klinik Pratama Lapas Kelas IIB Dompu"
          className="h-8 w-auto max-w-[140px] object-contain shrink-0 lg:hidden"
        />
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            {activeTabLabel}
          </div>
          <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium whitespace-nowrap hidden sm:block">
            Klinik Pratama Lapas Kelas IIB Dompu
          </div>
        </div>
      </div>

      {/* Zone 2: Global Search Bar */}
      <div className="relative flex-1 max-w-md mx-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            placeholder="Cari pasien (Nama / NIK / No Reg)..."
            className="w-full pl-9 pr-3 py-1.5 text-xs md:text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1.5 z-50 max-h-80 overflow-y-auto">
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Warga Binaan Ditemukan ({searchResults.length})
            </div>
            {searchResults.map((wbp) => (
              <button
                key={wbp.id}
                type="button"
                onClick={() => handleSelect(wbp)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors border-b last:border-0 border-slate-100 dark:border-slate-800"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{wbp.nama}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>NIK: {wbp.nik || '-'}</span>
                    <span>·</span>
                    <span>{wbp.blok} / {wbp.kamar}</span>
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 text-[10px] font-medium rounded border"
                  style={{
                    backgroundColor:
                      wbp.batch_bpjs === 'Juli' ? '#FFFF99' :
                      wbp.batch_bpjs === 'Agustus' ? '#9FC5E8' :
                      wbp.batch_bpjs === 'September' ? '#B6D7A8' :
                      wbp.batch_bpjs === 'Oktober' ? '#FFB3DA' :
                      wbp.batch_bpjs === 'November' ? '#F9CB9C' : '#E2E8F0',
                    color: '#1E293B',
                  }}
                >
                  {wbp.batch_bpjs}
                </span>
              </button>
            ))}
          </div>
        )}

        {showResults && searchQuery.trim() && searchResults.length === 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-3 text-center text-xs text-slate-500 z-50">
            Warga Binaan tidak ditemukan
          </div>
        )}
      </div>

      {/* Zone 3: Actions & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Dark Mode toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Pengaturan Sistem & Ganti Password"
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User tag */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
          <User className="w-3.5 h-3.5 text-teal-600" />
          <span>Petugas Medis</span>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          title="Keluar dari Sistem"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
