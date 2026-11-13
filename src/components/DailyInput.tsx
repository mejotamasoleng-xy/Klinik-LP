/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  User,
  Plus,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Stethoscope,
  Trash2,
  Edit2,
  Printer,
  ChevronRight,
  Flame,
  Shield,
  X,
  FileText,
  Search,
} from 'lucide-react';
import {
  CalculatedKunjungan,
  KunjunganItem,
  ReferensiItem,
  WbpItem,
} from '../types';
import {
  calculateUsia,
  dateToInputFormat,
  determineBlokByKamar,
  getTodayFormatted,
  inputFormatToDate,
  parseDate,
  store,
  useStoreSync,
} from '../lib/storage';
import { TOP_QUICK_CHIPS } from '../data/initialData';

interface DailyInputProps {
  onOpenMedicalRecord: (wbp: WbpItem) => void;
  onRefreshData?: () => void;
}

export default function DailyInput({ onOpenMedicalRecord }: DailyInputProps) {
  const storeVersion = useStoreSync();
  // Form fields
  const [tanggal, setTanggal] = useState<string>(getTodayFormatted());
  const [namaInput, setNamaInput] = useState<string>('');
  const [selectedWbp, setSelectedWbp] = useState<WbpItem | null>(null);
  const [keluhan1, setKeluhan1] = useState<string>('');
  const [keluhan2, setKeluhan2] = useState<string>('');
  const [keluhan3, setKeluhan3] = useState<string>('');
  const [kamar, setKamar] = useState<string>('');
  const [terapi, setTerapi] = useState<string>('');

  // UI States
  const [searchSuggestions, setSearchSuggestions] = useState<WbpItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeComplaintDropdown, setActiveComplaintDropdown] = useState<1 | 2 | 3 | null>(null);
  const [showQuickChips, setShowQuickChips] = useState<boolean>(false);
  const [undoItem, setUndoItem] = useState<{ id: string; action: 'save' | 'delete'; data?: KunjunganItem } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Complaint modal state (Inline Referensi Adder)
  const [inlineRefModal, setInlineRefModal] = useState<{ open: boolean; targetSlot: 1 | 2 | 3; initialQuery: string }>({
    open: false,
    targetSlot: 1,
    initialQuery: '',
  });
  const [newKeluhanName, setNewKeluhanName] = useState('');
  const [newMasukPenyakit, setNewMasukPenyakit] = useState('');
  const [newKodeIcd10, setNewKodeIcd10] = useState('');
  const [newNamaIcd10, setNewNamaIcd10] = useState('');
  const [newJenis, setNewJenis] = useState<'Menular' | 'Tidak Menular'>('Tidak Menular');

  // Table filter state
  const [tableFilterDate, setTableFilterDate] = useState<string>(getTodayFormatted());
  const [tableSearch, setTableSearch] = useState<string>('');

  // Refs for keyboard navigation
  const namaInputRef = useRef<HTMLInputElement>(null);
  const keluhan1InputRef = useRef<HTMLInputElement>(null);
  const terapiInputRef = useRef<HTMLInputElement>(null);

  // Data cache
  const [allKunjungan, setAllKunjungan] = useState<CalculatedKunjungan[]>([]);
  const [referensiList, setReferensiList] = useState<ReferensiItem[]>([]);
  const [wbpList, setWbpList] = useState<WbpItem[]>([]);
  const [pengaturan, setPengaturan] = useState(store.getPengaturan());

  const reloadData = () => {
    setAllKunjungan(store.getCalculatedKunjungan(false));
    setReferensiList(store.getReferensi());
    setWbpList(store.getWbpList());
    setPengaturan(store.getPengaturan());
  };

  useEffect(() => {
    reloadData();
  }, [storeVersion]);

  // Filter today's or selected date's visits
  const filteredVisits = allKunjungan
    .filter((k) => {
      const matchDate = tableFilterDate ? k.tanggal === tableFilterDate : true;
      const matchSearch = tableSearch
        ? k.nama.toLowerCase().includes(tableSearch.toLowerCase()) ||
          (k.nik && k.nik.includes(tableSearch)) ||
          k.keluhan1.toLowerCase().includes(tableSearch.toLowerCase())
        : true;
      return matchDate && matchSearch;
    })
    .sort((a, b) => {
      const timeA = new Date(a.dibuat_pada).getTime() || 0;
      const timeB = new Date(b.dibuat_pada).getTime() || 0;
      return timeB - timeA;
    });

  // Handle typing name
  const handleNamaChange = (val: string) => {
    setNamaInput(val);
    if (!val.trim()) {
      setSelectedWbp(null);
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const clean = val.trim().toLowerCase();
    const matches = wbpList.filter(
      (w) =>
        w.nama.toLowerCase().includes(clean) ||
        (w.nik && w.nik.toLowerCase().includes(clean)) ||
        (w.no_reg_instansi && w.no_reg_instansi.toLowerCase().includes(clean))
    );
    setSearchSuggestions(matches.slice(0, 6));
    setShowSuggestions(true);
  };

  const handleSelectWbp = (w: WbpItem) => {
    setSelectedWbp(w);
    setNamaInput(w.nama);
    setShowSuggestions(false);
    // Autofill Room with current room
    setKamar(w.kamar || w.kamar_sidb || '');
    // Focus to complaint
    setTimeout(() => {
      keluhan1InputRef.current?.focus();
    }, 100);
  };

  // Pre-save validations
  const isDuplicateWarning = (() => {
    if (!selectedWbp && !namaInput.trim()) return false;
    return allKunjungan.some(
      (k) =>
        k.tanggal === tanggal &&
        k.id !== editingVisitId &&
        ((selectedWbp && k.wbp_id === selectedWbp.id) ||
          k.nama.trim().toLowerCase() === namaInput.trim().toLowerCase())
    );
  })();

  const frequentWarning = (() => {
    const patient = selectedWbp || wbpList.find((w) => w.nama.trim().toLowerCase() === namaInput.trim().toLowerCase());
    if (!patient) return null;
    const targetDate = parseDate(tanggal) || new Date();
    const limitDays = pengaturan.periode_sering_hari || 7;
    const limitCount = pengaturan.batas_sering_berobat_kali || 7;
    const windowStart = targetDate.getTime() - limitDays * 24 * 60 * 60 * 1000;

    const visitsInWindow = allKunjungan.filter((k) => {
      if (k.id === editingVisitId) return false;
      const kDate = parseDate(k.tanggal);
      if (!kDate) return false;
      const isSame = (k.wbp_id && k.wbp_id === patient.id) || k.nama.trim().toLowerCase() === patient.nama.trim().toLowerCase();
      if (!isSame) return false;
      const t = kDate.getTime();
      return t >= windowStart && t <= targetDate.getTime();
    });

    if (visitsInWindow.length >= limitCount) {
      return { count: visitsInWindow.length, days: limitDays };
    }
    return null;
  })();

  // Check if any selected complaint is Contagious (Menular)
  const contagiousAlert = (() => {
    const complaints = [keluhan1, keluhan2, keluhan3].filter(Boolean);
    const contagiousFound: string[] = [];
    complaints.forEach((c) => {
      const resolved = store.resolveComplaint(c);
      if (resolved.jenis === 'Menular') {
        contagiousFound.push(`${c} (${resolved.penyakit})`);
      }
    });
    return contagiousFound.length > 0 ? contagiousFound : null;
  })();

  // Handle Quick Chips
  const handleQuickChip = (chip: string) => {
    if (!keluhan1) {
      setKeluhan1(chip);
    } else if (!keluhan2) {
      setKeluhan2(chip);
    } else if (!keluhan3) {
      setKeluhan3(chip);
    } else {
      setKeluhan1(chip);
    }
  };

  // Submit visit
  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaInput.trim()) {
      alert('Nama pasien wajib diisi.');
      namaInputRef.current?.focus();
      return;
    }
    if (!keluhan1.trim()) {
      alert('Keluhan 1 wajib diisi.');
      keluhan1InputRef.current?.focus();
      return;
    }

    setSaveStatus('saving');

    const wbpIdToSave = selectedWbp ? selectedWbp.id : '';

    if (editingVisitId) {
      const updated = store.updateKunjungan(editingVisitId, {
        tanggal,
        wbp_id: wbpIdToSave,
        nama: selectedWbp ? selectedWbp.nama : namaInput.trim(),
        keluhan1: keluhan1.trim(),
        keluhan2: keluhan2.trim(),
        keluhan3: keluhan3.trim(),
        kamar: kamar.trim(),
        terapi: terapi.trim(),
      });
      if (updated) {
        setToastMessage(`Kunjungan pasien ${namaInput} berhasil diperbarui.`);
        setEditingVisitId(null);
      }
    } else {
      const saved = store.addKunjungan({
        tanggal,
        wbp_id: wbpIdToSave,
        nama: selectedWbp ? selectedWbp.nama : namaInput.trim(),
        keluhan1: keluhan1.trim(),
        keluhan2: keluhan2.trim(),
        keluhan3: keluhan3.trim(),
        kamar: kamar.trim(),
        terapi: terapi.trim(),
      });

      setUndoItem({ id: saved.id, action: 'save' });
      setToastMessage(`Kunjungan ${saved.nama} tersimpan.`);
    }

    // Reset Form & Return focus to name
    setNamaInput('');
    setSelectedWbp(null);
    setKeluhan1('');
    setKeluhan2('');
    setKeluhan3('');
    setKamar('');
    setTerapi('');
    setSaveStatus('saved');
    reloadData();

    setTimeout(() => {
      namaInputRef.current?.focus();
      setSaveStatus('idle');
    }, 200);
  };

  const handleEditVisit = (visit: CalculatedKunjungan) => {
    setEditingVisitId(visit.id);
    setTanggal(visit.tanggal);
    setNamaInput(visit.nama);
    const matched = wbpList.find((w) => w.id === visit.wbp_id || w.nama.toLowerCase() === visit.nama.toLowerCase());
    setSelectedWbp(matched || null);
    setKeluhan1(visit.keluhan1 || '');
    setKeluhan2(visit.keluhan2 || '');
    setKeluhan3(visit.keluhan3 || '');
    setKamar(visit.kamar || '');
    setTerapi(visit.terapi || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    namaInputRef.current?.focus();
  };

  const handleDeleteVisit = (visit: CalculatedKunjungan) => {
    if (confirm(`Hapus kunjungan pasien ${visit.nama} pada tanggal ${visit.tanggal}?`)) {
      store.softDeleteKunjungan(visit.id);
      setUndoItem({ id: visit.id, action: 'delete' });
      setToastMessage(`Kunjungan ${visit.nama} dihapus.`);
      reloadData();
    }
  };

  const handleUndo = () => {
    if (!undoItem) return;
    if (undoItem.action === 'save') {
      store.permanentDeleteKunjungan(undoItem.id);
      setToastMessage('Penyimpanan kunjungan berhasil dibatalkan.');
    } else if (undoItem.action === 'delete') {
      store.restoreKunjungan(undoItem.id);
      setToastMessage('Kunjungan berhasil dipulihkan kembali.');
    }
    setUndoItem(null);
    reloadData();
  };

  // Open inline modal to add complaint to referensi
  const handleOpenInlineRef = (slot: 1 | 2 | 3, query: string) => {
    setInlineRefModal({ open: true, targetSlot: slot, initialQuery: query });
    setNewKeluhanName(query);
    setNewMasukPenyakit(query);
    setNewKodeIcd10('');
    setNewNamaIcd10('');
    setNewJenis('Tidak Menular');
  };

  const handleSaveInlineRef = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeluhanName.trim() || !newMasukPenyakit.trim()) {
      alert('Nama keluhan dan penyakit wajib diisi');
      return;
    }
    const added = store.addReferensi({
      keluhan: newKeluhanName.trim(),
      masuk_penyakit: newMasukPenyakit.trim(),
      kode_icd10: newKodeIcd10.trim() || 'R69',
      nama_icd10: newNamaIcd10.trim() || newMasukPenyakit.trim(),
      jenis: newJenis,
    });

    if (inlineRefModal.targetSlot === 1) setKeluhan1(added.keluhan);
    if (inlineRefModal.targetSlot === 2) setKeluhan2(added.keluhan);
    if (inlineRefModal.targetSlot === 3) setKeluhan3(added.keluhan);

    setInlineRefModal({ open: false, targetSlot: 1, initialQuery: '' });
    reloadData();
  };

  // Selected Patient Clinical Record preview
  const patientMedicalSummary = selectedWbp ? store.getPatientMedicalRecord(selectedWbp.id) : null;

  return (
    <div className="space-y-6">
      {/* Toast Notification with Undo */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-xs">{toastMessage}</span>
          {undoItem && (
            <button
              type="button"
              onClick={handleUndo}
              className="ml-2 px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold rounded flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Urungkan</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Form on Left, Medical Record on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Quick Chips */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingVisitId ? 'Ubah Data Kunjungan' : 'Form Input Kunjungan Harian Pasien'}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Tekan Tab / Enter untuk berpindah & simpan</span>
              </div>
            </div>

            {/* LIVE PRE-SAVE WARNINGS */}
            <div className="space-y-2 mb-4">
              {isDuplicateWarning && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Peringatan DUPLIKAT:</strong> Pasien ini sudah tercatat berkunjung pada tanggal {tanggal}.
                  </span>
                </div>
              )}

              {frequentWarning && (
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/80 text-purple-900 dark:text-purple-200 text-xs flex items-center gap-2 font-medium">
                  <Flame className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>
                    <strong>Peringatan SERING BEROBAT:</strong> Pasien sudah berobat {frequentWarning.count} kali dalam{' '}
                    {frequentWarning.days} hari terakhir.
                  </span>
                </div>
              )}

              {contagiousAlert && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2 font-medium">
                  <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>
                    <strong>Penyakit Menular Terdeteksi:</strong> {contagiousAlert.join(', ')}. Periksa kebersihan dan
                    kondisi kamar/blok sekitar ({selectedWbp?.blok || '-'}, Kamar {kamar || selectedWbp?.kamar || '-'}).
                  </span>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveVisit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Layanan
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateToInputFormat(tanggal)}
                      onChange={(e) => setTanggal(inputFormatToDate(e.target.value))}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>

                {/* Nama Pasien (Search-as-you-type) */}
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Nama Pasien (WBP) *</span>
                    {selectedWbp && (
                      <span className="text-[11px] font-normal text-teal-600 dark:text-teal-400">
                        {selectedWbp.kategori} · Usia {calculateUsia(selectedWbp.tanggal_lahir)} thn
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      ref={namaInputRef}
                      type="text"
                      required
                      value={namaInput}
                      onChange={(e) => handleNamaChange(e.target.value)}
                      onFocus={() => namaInput.trim() && setShowSuggestions(true)}
                      placeholder="Ketik nama atau 4 digit NIK..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                    />
                  </div>

                  {/* Suggestions dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-30 max-h-56 overflow-y-auto">
                      {searchSuggestions.map((w) => {
                        const last4Nik = w.nik ? w.nik.slice(-4) : '----';
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => handleSelectWbp(w)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors border-b last:border-0 border-slate-100 dark:border-slate-800"
                          >
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{w.nama}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                NIK: ...{last4Nik} · {w.blok} (Kamar {w.kamar})
                              </div>
                            </div>
                            <span
                              className="px-2 py-0.5 text-[10px] font-semibold rounded"
                              style={{
                                backgroundColor:
                                  w.batch_bpjs === 'Juli' ? '#FFFF99' :
                                  w.batch_bpjs === 'Agustus' ? '#9FC5E8' :
                                  w.batch_bpjs === 'September' ? '#B6D7A8' :
                                  w.batch_bpjs === 'Oktober' ? '#FFB3DA' :
                                  w.batch_bpjs === 'November' ? '#F9CB9C' : '#E2E8F0',
                                color: '#1E293B',
                              }}
                            >
                              {w.batch_bpjs}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Keluhan Section Header with Optional Quick Helper */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                    <span>Keluhan Utama Pasien (1-3 Keluhan)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickChips(!showQuickChips)}
                    className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 flex items-center gap-1 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/30 transition-colors"
                  >
                    <span>⚡ {showQuickChips ? 'Tutup Pilihan Cepat' : 'Pilihan Cepat Populer'}</span>
                  </button>
                </div>

                {/* Collapsible Quick Chips (Only visible when requested) */}
                {showQuickChips && (
                  <div className="mb-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5">
                    {TOP_QUICK_CHIPS.map((chip) => {
                      const res = store.resolveComplaint(chip);
                      const isMenular = res.jenis === 'Menular';
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            handleQuickChip(chip);
                            setShowQuickChips(false);
                          }}
                          className={`px-2 py-0.5 text-xs rounded border transition-all flex items-center gap-1 ${
                            isMenular
                              ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <span>+ {chip}</span>
                          {isMenular && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Keluhan 1, 2, 3 Grid with Compact Floating Autocomplete */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Keluhan 1 */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Keluhan 1 *
                    </label>
                    {keluhan1 && (
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold truncate max-w-[130px]">
                        {store.resolveComplaint(keluhan1).penyakit || 'CEK REFERENSI'}
                      </span>
                    )}
                  </div>
                  <input
                    ref={keluhan1InputRef}
                    type="text"
                    required
                    value={keluhan1}
                    onChange={(e) => {
                      setKeluhan1(e.target.value);
                      setActiveComplaintDropdown(1);
                    }}
                    onFocus={() => {
                      if (keluhan1.trim().length >= 1) setActiveComplaintDropdown(1);
                    }}
                    onBlur={() => setTimeout(() => setActiveComplaintDropdown(null), 200)}
                    placeholder="Ketik keluhan 1..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                  />

                  {/* Sleek Floating Suggestions (Max 5 items, only on typing) */}
                  {activeComplaintDropdown === 1 && keluhan1.trim().length >= 1 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 max-h-44 overflow-y-auto">
                      {referensiList
                        .filter(
                          (r) =>
                            r.keluhan.toLowerCase().includes(keluhan1.trim().toLowerCase()) ||
                            r.masuk_penyakit.toLowerCase().includes(keluhan1.trim().toLowerCase())
                        )
                        .slice(0, 5)
                        .map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setKeluhan1(r.keluhan);
                              setActiveComplaintDropdown(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-slate-800 flex items-center justify-between border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{r.keluhan}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                r.jenis === 'Menular'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {r.masuk_penyakit} {r.jenis === 'Menular' ? '⚡' : ''}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}

                  {keluhan1 && store.resolveComplaint(keluhan1).penyakit === 'CEK REFERENSI' && (
                    <button
                      type="button"
                      onClick={() => handleOpenInlineRef(1, keluhan1)}
                      className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline block"
                    >
                      + Tambah "{keluhan1}" ke Referensi ICD-10
                    </button>
                  )}
                </div>

                {/* Keluhan 2 */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Keluhan 2
                    </label>
                    {keluhan2 && (
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold truncate max-w-[130px]">
                        {store.resolveComplaint(keluhan2).penyakit || 'CEK REFERENSI'}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={keluhan2}
                    onChange={(e) => {
                      setKeluhan2(e.target.value);
                      setActiveComplaintDropdown(2);
                    }}
                    onFocus={() => {
                      if (keluhan2.trim().length >= 1) setActiveComplaintDropdown(2);
                    }}
                    onBlur={() => setTimeout(() => setActiveComplaintDropdown(null), 200)}
                    placeholder="Opsional (misal: pilek)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                  />

                  {/* Sleek Floating Suggestions */}
                  {activeComplaintDropdown === 2 && keluhan2.trim().length >= 1 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 max-h-44 overflow-y-auto">
                      {referensiList
                        .filter(
                          (r) =>
                            r.keluhan.toLowerCase().includes(keluhan2.trim().toLowerCase()) ||
                            r.masuk_penyakit.toLowerCase().includes(keluhan2.trim().toLowerCase())
                        )
                        .slice(0, 5)
                        .map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setKeluhan2(r.keluhan);
                              setActiveComplaintDropdown(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-slate-800 flex items-center justify-between border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{r.keluhan}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                r.jenis === 'Menular'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {r.masuk_penyakit} {r.jenis === 'Menular' ? '⚡' : ''}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}

                  {keluhan2 && store.resolveComplaint(keluhan2).penyakit === 'CEK REFERENSI' && (
                    <button
                      type="button"
                      onClick={() => handleOpenInlineRef(2, keluhan2)}
                      className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline block"
                    >
                      + Tambah "{keluhan2}" ke Referensi
                    </button>
                  )}
                </div>

                {/* Keluhan 3 */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Keluhan 3
                    </label>
                    {keluhan3 && (
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold truncate max-w-[130px]">
                        {store.resolveComplaint(keluhan3).penyakit || 'CEK REFERENSI'}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={keluhan3}
                    onChange={(e) => {
                      setKeluhan3(e.target.value);
                      setActiveComplaintDropdown(3);
                    }}
                    onFocus={() => {
                      if (keluhan3.trim().length >= 1) setActiveComplaintDropdown(3);
                    }}
                    onBlur={() => setTimeout(() => setActiveComplaintDropdown(null), 200)}
                    placeholder="Opsional (misal: demam)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                  />

                  {/* Sleek Floating Suggestions */}
                  {activeComplaintDropdown === 3 && keluhan3.trim().length >= 1 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 max-h-44 overflow-y-auto">
                      {referensiList
                        .filter(
                          (r) =>
                            r.keluhan.toLowerCase().includes(keluhan3.trim().toLowerCase()) ||
                            r.masuk_penyakit.toLowerCase().includes(keluhan3.trim().toLowerCase())
                        )
                        .slice(0, 5)
                        .map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setKeluhan3(r.keluhan);
                              setActiveComplaintDropdown(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-slate-800 flex items-center justify-between border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{r.keluhan}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                r.jenis === 'Menular'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {r.masuk_penyakit} {r.jenis === 'Menular' ? '⚡' : ''}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}

                  {keluhan3 && store.resolveComplaint(keluhan3).penyakit === 'CEK REFERENSI' && (
                    <button
                      type="button"
                      onClick={() => handleOpenInlineRef(3, keluhan3)}
                      className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline block"
                    >
                      + Tambah "{keluhan3}" ke Referensi
                    </button>
                  )}
                </div>
              </div>

              {/* Kamar & Terapi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Kamar Saat Kunjungan
                    </label>
                    {kamar.trim() && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        determineBlokByKamar(kamar) === 'Blok Atas'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : determineBlokByKamar(kamar) === 'Blok Bawah'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {determineBlokByKamar(kamar) || 'Tanpa Blok'}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={kamar}
                    onChange={(e) => setKamar(e.target.value)}
                    placeholder="Contoh: 1, 14, LANSIA, TAMPING"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                    {kamar.trim()
                      ? `Otomatis memperbarui Kamar & ${determineBlokByKamar(kamar) || 'Blok kosong'}`
                      : 'Otomatis: Blok Atas (Tamping, 8-14), Blok Bawah (Lansia, 1-7, Max)'}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Terapi & Obat yang Diberikan
                  </label>
                  <input
                    ref={terapiInputRef}
                    type="text"
                    value={terapi}
                    onChange={(e) => setTerapi(e.target.value)}
                    placeholder="Contoh: Paracetamol 3x500mg, Antasida 3x1 cth, Istirahat"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {editingVisitId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVisitId(null);
                      setNamaInput('');
                      setSelectedWbp(null);
                      setKeluhan1('');
                      setKeluhan2('');
                      setKeluhan3('');
                      setKamar('');
                      setTerapi('');
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Batal Ubah
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingVisitId ? 'Simpan Pembaruan' : 'Simpan Kunjungan (Enter)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Instant Patient Medical Record Drawer/Panel */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs sticky top-20">
            {selectedWbp && patientMedicalSummary ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedWbp.nama}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      NIK: {selectedWbp.nik || '-'} · Usia {calculateUsia(selectedWbp.tanggal_lahir)} thn
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedWbp.blok} / Kamar {selectedWbp.kamar}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 text-[10px] font-semibold rounded border"
                    style={{
                      backgroundColor:
                        selectedWbp.batch_bpjs === 'Juli' ? '#FFFF99' :
                        selectedWbp.batch_bpjs === 'Agustus' ? '#9FC5E8' :
                        selectedWbp.batch_bpjs === 'September' ? '#B6D7A8' :
                        selectedWbp.batch_bpjs === 'Oktober' ? '#FFB3DA' :
                        selectedWbp.batch_bpjs === 'November' ? '#F9CB9C' : '#E2E8F0',
                      color: '#1E293B',
                    }}
                  >
                    BPJS: {selectedWbp.batch_bpjs}
                  </span>
                </div>

                {/* Quick Clinical Dossier Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Berobat</div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                      {patientMedicalSummary.totalVisits}x
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50">
                    <div className="text-[10px] text-teal-700 dark:text-teal-400 uppercase font-semibold">Bulan Ini</div>
                    <div className="text-base font-bold text-teal-800 dark:text-teal-300 mt-0.5 font-mono">
                      {patientMedicalSummary.thisMonthVisitsCount}x
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Sebelumnya</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {patientMedicalSummary.previousVisitDaysAgo || 'Baru'}
                    </div>
                  </div>
                </div>

                {/* Contagious Summary This Month */}
                {patientMedicalSummary.contagiousIllnessesThisMonth.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200">
                    <div className="font-semibold flex items-center gap-1.5 text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Kasus Menular Bulan Ini ({patientMedicalSummary.contagiousIllnessesThisMonth.length}):</span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium">
                      {patientMedicalSummary.contagiousIllnessesThisMonth.join(', ')}
                    </p>
                  </div>
                )}

                {/* Sakit Apa Saja Bulan Ini */}
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                    Sakit Bulan Ini (Frekuensi)
                  </div>
                  {patientMedicalSummary.sortedIllnesses.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {patientMedicalSummary.sortedIllnesses.map((item) => (
                        <div
                          key={item.penyakit}
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-800/60"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.penyakit}
                            </span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                                item.jenis === 'Menular'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {item.jenis}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                            {item.count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Belum ada catatan penyakit di bulan ini</p>
                  )}
                </div>

                {/* 10 Kedatangan Terakhir */}
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                    Riwayat 10 Kunjungan Terakhir
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {patientMedicalSummary.last10Visits.map((v) => (
                      <div
                        key={v.id}
                        className="p-2 rounded border border-slate-100 dark:border-slate-800 text-xs bg-slate-50/50 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {v.tanggal}
                          </span>
                          <span>Kamar {v.kamar || '-'}</span>
                        </div>
                        <div className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-1">
                          {[v.keluhan1, v.keluhan2, v.keluhan3].filter(Boolean).join(', ')}
                        </div>
                        {v.terapi && (
                          <div className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5 truncate">
                            Rx: {v.terapi}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* View Full Dossier / Print */}
                <button
                  type="button"
                  onClick={() => onOpenMedicalRecord(selectedWbp)}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>Buka Rekam Medis Lengkap & Cetak</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Stethoscope className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Panel Rekam Medis Otomatis
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  Pilih atau cari nama warga binaan di formulir sebelah kiri untuk melihat riwayat kunjungan 10 kedatangan terakhir.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TODAY'S VISITS TABLE (Bottom section) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Daftar Kunjungan Pasien ({filteredVisits.length} data)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan kunjungan berobat yang tercatat pada sistem
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filter Date */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={dateToInputFormat(tableFilterDate)}
                onChange={(e) => setTableFilterDate(inputFormatToDate(e.target.value))}
                className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
              />
              {tableFilterDate && (
                <button
                  type="button"
                  onClick={() => setTableFilterDate('')}
                  className="text-[11px] text-teal-600 hover:underline"
                >
                  Semua
                </button>
              )}
            </div>

            {/* Table Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Cari pasien / keluhan..."
                className="pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white w-40 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tanggal</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Nama WBP</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Blok / Kamar</th>
                <th className="py-2.5 px-3">Keluhan & Penyakit (ICD-10)</th>
                <th className="py-2.5 px-3">Terapi</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Batch BPJS</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center">Status / Peringatan</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredVisits.length > 0 ? (
                filteredVisits.map((v, idx) => {
                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      style={{
                        backgroundColor:
                          v.batch_bpjs === 'Juli' ? '#FFFF9922' :
                          v.batch_bpjs === 'Agustus' ? '#9FC5E822' :
                          v.batch_bpjs === 'September' ? '#B6D7A822' :
                          v.batch_bpjs === 'Oktober' ? '#FFB3DA22' :
                          v.batch_bpjs === 'November' ? '#F9CB9C22' : undefined,
                      }}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {v.tanggal}
                      </td>
                      <td className="py-2 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{v.nama}</span>
                          {v.status_wbp === 'TIDAK DITEMUKAN' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold">
                              TIDAK DITEMUKAN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          NIK: {v.wbp?.nik || v.nik || '-'}
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {v.wbp?.blok || '-'} · Kamar {v.kamar || v.wbp?.kamar || '-'}
                      </td>
                      <td className="py-2 px-3 max-w-xs">
                        <div className="space-y-1">
                          {/* Keluhan 1 */}
                          {v.keluhan1 && (
                            <div className="flex flex-wrap items-center gap-1 text-[11px]">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {v.keluhan1}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span
                                className={`font-semibold ${
                                  v.penyakit1 === 'CEK REFERENSI'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {v.penyakit1}
                              </span>
                              {v.icd10_1 && v.icd10_1 !== 'CEK REFERENSI' && (
                                <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-1 rounded">
                                  {v.icd10_1}
                                </span>
                              )}
                              {v.jenis1 && (
                                <span
                                  className={`px-1 py-0.2 text-[9px] font-semibold rounded ${
                                    v.jenis1 === 'Menular'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {v.jenis1}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Keluhan 2 */}
                          {v.keluhan2 && (
                            <div className="flex flex-wrap items-center gap-1 text-[11px]">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {v.keluhan2}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span
                                className={`font-semibold ${
                                  v.penyakit2 === 'CEK REFERENSI'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {v.penyakit2}
                              </span>
                              {v.icd10_2 && v.icd10_2 !== 'CEK REFERENSI' && (
                                <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-1 rounded">
                                  {v.icd10_2}
                                </span>
                              )}
                              {v.jenis2 && (
                                <span
                                  className={`px-1 py-0.2 text-[9px] font-semibold rounded ${
                                    v.jenis2 === 'Menular'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {v.jenis2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Keluhan 3 */}
                          {v.keluhan3 && (
                            <div className="flex flex-wrap items-center gap-1 text-[11px]">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {v.keluhan3}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span
                                className={`font-semibold ${
                                  v.penyakit3 === 'CEK REFERENSI'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {v.penyakit3}
                              </span>
                              {v.icd10_3 && v.icd10_3 !== 'CEK REFERENSI' && (
                                <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-1 rounded">
                                  {v.icd10_3}
                                </span>
                              )}
                              {v.jenis3 && (
                                <span
                                  className={`px-1 py-0.2 text-[9px] font-semibold rounded ${
                                    v.jenis3 === 'Menular'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {v.jenis3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 max-w-xs">
                        {v.terapi || '-'}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold rounded border"
                          style={{
                            backgroundColor:
                              v.batch_bpjs === 'Juli' ? '#FFFF99' :
                              v.batch_bpjs === 'Agustus' ? '#9FC5E8' :
                              v.batch_bpjs === 'September' ? '#B6D7A8' :
                              v.batch_bpjs === 'Oktober' ? '#FFB3DA' :
                              v.batch_bpjs === 'November' ? '#F9CB9C' : '#E2E8F0',
                            color: '#1E293B',
                          }}
                        >
                          {v.batch_bpjs}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {v.is_duplicate && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold border"
                              style={{ backgroundColor: '#FFD966', color: '#78350F' }}
                            >
                              DUPLIKAT
                            </span>
                          )}
                          {v.is_frequent && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold border"
                              style={{ backgroundColor: '#D9D2E9', color: '#4C1D95' }}
                            >
                              SERING ({v.frequent_count}x/{v.frequent_days}hr)
                            </span>
                          )}
                          {!v.is_duplicate && !v.is_frequent && (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditVisit(v)}
                            title="Ubah Data"
                            className="p-1 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVisit(v)}
                            title="Hapus Kunjungan"
                            className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Belum ada kunjungan pada tanggal {tableFilterDate || 'yang dipilih'}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INLINE REFERENSI ADDER */}
      {inlineRefModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>Tambah Keluhan ke Referensi ICD-10</span>
              </h3>
              <button
                type="button"
                onClick={() => setInlineRefModal({ open: false, targetSlot: 1, initialQuery: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInlineRef} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keluhan Pasien *
                </label>
                <input
                  type="text"
                  required
                  value={newKeluhanName}
                  onChange={(e) => setNewKeluhanName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Masuk ke Penyakit (Kolom Rekap) *
                </label>
                <input
                  type="text"
                  required
                  value={newMasukPenyakit}
                  onChange={(e) => setNewMasukPenyakit(e.target.value)}
                  placeholder="Contoh: ISPA, Gastritis, Scabies..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode ICD-10
                  </label>
                  <input
                    type="text"
                    value={newKodeIcd10}
                    onChange={(e) => setNewKodeIcd10(e.target.value)}
                    placeholder="Contoh: J06.9"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Penyakit *
                  </label>
                  <select
                    value={newJenis}
                    onChange={(e) => setNewJenis(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Tidak Menular">Tidak Menular</option>
                    <option value="Menular">Menular</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Resmi Diagnosa ICD-10
                </label>
                <input
                  type="text"
                  value={newNamaIcd10}
                  onChange={(e) => setNewNamaIcd10(e.target.value)}
                  placeholder="Contoh: Infeksi saluran napas atas akut"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInlineRefModal({ open: false, targetSlot: 1, initialQuery: '' })}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                >
                  Simpan ke Referensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
