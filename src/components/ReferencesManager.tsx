/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Shield,
  Layers,
  FileText,
  X,
} from 'lucide-react';
import { PenyakitItem, ReferensiItem } from '../types';
import { store } from '../lib/storage';

export default function ReferencesManager() {
  const [activeTab, setActiveTab] = useState<'keluhan' | 'penyakit'>('keluhan');
  const [searchQuery, setSearchQuery] = useState('');
  const [referensiList, setReferensiList] = useState<ReferensiItem[]>(() => store.getReferensi());
  const [penyakitList, setPenyakitList] = useState<PenyakitItem[]>(() => store.getPenyakit());

  // Modal Add/Edit
  const [modalRef, setModalRef] = useState<{ open: boolean; item?: ReferensiItem }>({ open: false });
  const [formRef, setFormRef] = useState<Partial<ReferensiItem>>({});

  const [modalPenyakit, setModalPenyakit] = useState<{ open: boolean; item?: PenyakitItem }>({ open: false });
  const [formPenyakit, setFormPenyakit] = useState<Partial<PenyakitItem>>({});

  const reloadData = () => {
    setReferensiList(store.getReferensi());
    setPenyakitList(store.getPenyakit());
  };

  // All visits for counting ICD-10 usage dynamically
  const allVisits = store.getCalculatedKunjungan(false);

  const icdUsageCount = useMemo(() => {
    const map: Record<string, number> = {};
    allVisits.forEach((v) => {
      [v.icd10_1, v.icd10_2, v.icd10_3].forEach((code) => {
        if (code && code !== 'CEK REFERENSI') {
          map[code] = (map[code] || 0) + 1;
        }
      });
    });
    return map;
  }, [allVisits]);

  // Filtered lists
  const filteredReferensi = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return referensiList;
    return referensiList.filter(
      (r) =>
        r.keluhan.toLowerCase().includes(q) ||
        r.masuk_penyakit.toLowerCase().includes(q) ||
        r.kode_icd10.toLowerCase().includes(q) ||
        r.nama_icd10.toLowerCase().includes(q)
    );
  }, [referensiList, searchQuery]);

  const filteredPenyakit = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return penyakitList;
    return penyakitList.filter(
      (p) =>
        p.penyakit.toLowerCase().includes(q) ||
        p.kategori.toLowerCase().includes(q) ||
        p.jenis.toLowerCase().includes(q)
    );
  }, [penyakitList, searchQuery]);

  // Categories list
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(penyakitList.map((p) => p.kategori)));
  }, [penyakitList]);

  // Referensi Handlers
  const handleOpenAddRef = () => {
    setFormRef({
      keluhan: '',
      masuk_penyakit: '',
      catatan: '',
      kode_icd10: '',
      nama_icd10: '',
      jenis: 'Tidak Menular',
    });
    setModalRef({ open: true });
  };

  const handleOpenEditRef = (r: ReferensiItem) => {
    setFormRef({ ...r });
    setModalRef({ open: true, item: r });
  };

  const handleSaveRef = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.keluhan?.trim()) {
      alert('Nama keluhan wajib diisi');
      return;
    }

    if (modalRef.item) {
      store.updateReferensi(modalRef.item.id, formRef);
    } else {
      store.addReferensi(formRef as any);
    }
    setModalRef({ open: false });
    reloadData();
  };

  const handleDeleteRef = (r: ReferensiItem) => {
    if (confirm(`Hapus referensi keluhan "${r.keluhan}"?`)) {
      store.deleteReferensi(r.id);
      reloadData();
    }
  };

  // Penyakit Handlers
  const handleOpenEditPenyakit = (p: PenyakitItem) => {
    setFormPenyakit({ ...p });
    setModalPenyakit({ open: true, item: p });
  };

  const handleOpenAddPenyakit = () => {
    setFormPenyakit({
      penyakit: '',
      kategori: uniqueCategories[0] || 'LAIN - LAIN',
      jenis: 'Tidak Menular',
    });
    setModalPenyakit({ open: true });
  };

  const handleSavePenyakit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPenyakit.penyakit?.trim()) {
      alert('Nama penyakit wajib diisi');
      return;
    }

    if (modalPenyakit.item) {
      store.updatePenyakit(modalPenyakit.item.id, formPenyakit);
    } else {
      store.addPenyakit(formPenyakit as any);
    }
    setModalPenyakit({ open: false });
    reloadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Master Referensi Keluhan & Standarisasi ICD-10
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pemetaan otomatis keluhan ke diagnosa ICD-10 dan klasifikasi Menular / Tidak Menular
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'keluhan' ? (
              <button
                type="button"
                onClick={handleOpenAddRef}
                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Keluhan ICD-10</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddPenyakit}
                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Penyakit Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab & Search Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('keluhan')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === 'keluhan'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Referensi Keluhan ({referensiList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('penyakit')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === 'penyakit'
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Daftar Penyakit & Kategori ({penyakitList.length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari keluhan / diagnosa..."
              className="pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-56"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: REFERENSI KELUHAN TABLE */}
      {activeTab === 'keluhan' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Keluhan Pasien</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Masuk ke Kolom Penyakit</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Kode ICD-10</th>
                  <th className="py-2.5 px-4">Nama Resmi Diagnosa ICD-10</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Jenis Penyakit</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Penggunaan</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReferensi.map((r, idx) => {
                  const usage = r.kode_icd10 ? icdUsageCount[r.kode_icd10] || 0 : 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-4 font-semibold text-slate-900 dark:text-white">
                        {r.keluhan}
                      </td>
                      <td className="py-2 px-3 font-medium text-teal-800 dark:text-teal-300 whitespace-nowrap">
                        {r.masuk_penyakit || (
                          <span className="text-slate-400 italic">Dikosongkan</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {r.kode_icd10 || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                        {r.nama_icd10 || '-'}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.jenis === 'Menular'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {r.jenis}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                        {usage > 0 ? `${usage}x` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRef(r)}
                            className="p-1 text-slate-500 hover:text-teal-700 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRef(r)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR PENYAKIT & KATEGORI TABLE */}
      {activeTab === 'penyakit' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Perubahan Klasifikasi:</strong> Mengubah status 'Menular' atau 'Tidak Menular' di sini akan langsung
              berlaku ke seluruh data riwayat kunjungan dan rekapitulasi bulanan secara otomatis.
            </span>
          </div>

          <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Kategori Diagnosa</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Nama Penyakit (Kolom Rekap)</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Jenis Penyakit</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPenyakit.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-4 font-semibold text-teal-800 dark:text-teal-300">
                      {p.kategori}
                    </td>
                    <td className="py-2 px-4 font-bold text-slate-900 dark:text-white">
                      {p.penyakit}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.jenis === 'Menular'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {p.jenis}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPenyakit(p)}
                        className="px-2 py-1 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded text-xs flex items-center gap-1 ml-auto"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Ubah Jenis / Kategori</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL EDIT REFERENSI */}
      {modalRef.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {modalRef.item ? 'Ubah Referensi Keluhan' : 'Tambah Referensi Keluhan'}
              </h3>
              <button
                type="button"
                onClick={() => setModalRef({ open: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRef} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keluhan Pasien *
                </label>
                <input
                  type="text"
                  required
                  value={formRef.keluhan || ''}
                  onChange={(e) => setFormRef({ ...formRef, keluhan: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Masuk ke Kolom Penyakit
                </label>
                <input
                  type="text"
                  list="penyakit-list-options"
                  value={formRef.masuk_penyakit || ''}
                  onChange={(e) => setFormRef({ ...formRef, masuk_penyakit: e.target.value })}
                  placeholder="Contoh: ISPA, Gastritis..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <datalist id="penyakit-list-options">
                  {penyakitList.map((p) => (
                    <option key={p.id} value={p.penyakit}>
                      {p.kategori} ({p.jenis})
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode ICD-10
                  </label>
                  <input
                    type="text"
                    value={formRef.kode_icd10 || ''}
                    onChange={(e) => setFormRef({ ...formRef, kode_icd10: e.target.value })}
                    placeholder="Contoh: J06.9"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Penyakit
                  </label>
                  <select
                    value={formRef.jenis || 'Tidak Menular'}
                    onChange={(e) => setFormRef({ ...formRef, jenis: e.target.value as any })}
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
                  value={formRef.nama_icd10 || ''}
                  onChange={(e) => setFormRef({ ...formRef, nama_icd10: e.target.value })}
                  placeholder="Contoh: Infeksi saluran napas atas akut, tidak spesifik"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan
                </label>
                <input
                  type="text"
                  value={formRef.catatan || ''}
                  onChange={(e) => setFormRef({ ...formRef, catatan: e.target.value })}
                  placeholder="Opsional"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalRef({ open: false })}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT PENYAKIT */}
      {modalPenyakit.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {modalPenyakit.item ? 'Ubah Penyakit Master' : 'Tambah Penyakit Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalPenyakit({ open: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePenyakit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Penyakit
                </label>
                <input
                  type="text"
                  list="kategori-list-options"
                  required
                  value={formPenyakit.kategori || ''}
                  onChange={(e) => setFormPenyakit({ ...formPenyakit, kategori: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <datalist id="kategori-list-options">
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Penyakit (Kolom Rekap) *
                </label>
                <input
                  type="text"
                  required
                  value={formPenyakit.penyakit || ''}
                  onChange={(e) => setFormPenyakit({ ...formPenyakit, penyakit: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Penyakit (Menular / Tidak Menular) *
                </label>
                <select
                  value={formPenyakit.jenis || 'Tidak Menular'}
                  onChange={(e) => setFormPenyakit({ ...formPenyakit, jenis: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Tidak Menular">Tidak Menular</option>
                  <option value="Menular">Menular</option>
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Perubahan akan diterapkan secara instan ke seluruh laporan masa lalu dan kunjungan baru.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalPenyakit({ open: false })}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
