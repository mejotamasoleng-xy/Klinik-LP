/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  Edit2,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Copy,
  Check,
  Building,
  Shield,
  Scale,
  User,
  Calendar,
  Layers,
} from 'lucide-react';
import { WbpItem } from '../types';
import { calculateSisaBulan, calculateUsia, determineBlokByKamar, store } from '../lib/storage';
import { exportTableToExcel } from '../lib/excelExport';

interface WbpDirectoryProps {
  onSelectWbp: (wbp: WbpItem) => void;
}

type ViewMode = 'full' | 'compact';

export default function WbpDirectory({ onSelectWbp }: WbpDirectoryProps) {
  const [wbpList, setWbpList] = useState<WbpItem[]>(() => store.getWbpList());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBatch, setFilterBatch] = useState<string>('Semua');
  const [filterBlok, setFilterBlok] = useState<string>('Semua');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');

  // View Mode: Full 30 Columns Excel vs Compact
  const [viewMode, setViewMode] = useState<ViewMode>('full');

  // Detail Modal / Drawer
  const [detailModal, setDetailModal] = useState<{ open: boolean; item?: WbpItem }>({ open: false });

  // Modal Add / Edit
  const [editModal, setEditModal] = useState<{ open: boolean; item?: WbpItem }>({ open: false });
  const [formData, setFormData] = useState<Partial<WbpItem>>({});
  const [editTab, setEditTab] = useState<'identitas' | 'hukum' | 'sel' | 'bpjs'>('identitas');

  // Copy Feedback
  const [copiedTsv, setCopiedTsv] = useState(false);

  const reloadData = () => {
    setWbpList(store.getWbpList());
  };

  const batches = store.getPengaturan().batches;

  // Filtered and searched list
  const filteredList = useMemo(() => {
    return wbpList.filter((w) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = q
        ? (w.nama && w.nama.toLowerCase().includes(q)) ||
          (w.nik && w.nik.includes(q)) ||
          (w.no_reg_instansi && w.no_reg_instansi.toLowerCase().includes(q)) ||
          (w.alamat && w.alamat.toLowerCase().includes(q)) ||
          (w.jenis_kejahatan && w.jenis_kejahatan.toLowerCase().includes(q)) ||
          (w.kamar && w.kamar.toLowerCase().includes(q)) ||
          (w.nomor_surat_penahanan && w.nomor_surat_penahanan.toLowerCase().includes(q))
        : true;

      const matchBatch = filterBatch !== 'Semua' ? w.batch_bpjs === filterBatch : true;
      const matchBlok = filterBlok !== 'Semua' ? w.blok === filterBlok : true;
      const matchKategori = filterKategori !== 'Semua' ? w.kategori === filterKategori : true;

      return matchSearch && matchBatch && matchBlok && matchKategori;
    });
  }, [wbpList, searchQuery, filterBatch, filterBlok, filterKategori]);

  const handleOpenAdd = () => {
    setFormData({
      no: wbpList.length + 1,
      nama: '',
      nik: '',
      no_reg_instansi: '',
      jenis_kelamin: 'Laki-laki',
      tempat_lahir: 'Dompu',
      tanggal_lahir: '',
      alamat: '',
      nama_ayah: '',
      nama_ibu: '',
      pekerjaan: 'Petani/Pekebun',
      jenis_kejahatan: '',
      kategori: 'Narapidana',
      lama_pidana: '',
      tanggal_masuk: '',
      tgl_ekspirasi: '',
      blok: 'Blok Bawah',
      kamar: '1',
      kamar_sidb: '1',
      lokasi_sel: '',
      tgl_surat_penahanan: '',
      nomor_surat_penahanan: '',
      status_data: 'Aktif',
      batch_bpjs: 'Belum masuk batch',
      status_skrining: '',
      kendala_bpjs: '',
      dasar_pbi: '',
      catatan_penggabungan: '',
    });
    setEditTab('identitas');
    setEditModal({ open: true });
  };

  const handleOpenEdit = (w: WbpItem) => {
    setFormData({ ...w });
    setEditTab('identitas');
    setEditModal({ open: true, item: w });
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama?.trim()) {
      alert('Nama warga binaan wajib diisi');
      return;
    }

    if (editModal.item) {
      store.updateWbp(editModal.item.id, formData);
    } else {
      store.addWbp(formData as any);
    }
    setEditModal({ open: false });
    reloadData();
  };

  const handleDeleteWbp = (w: WbpItem) => {
    if (confirm(`Yakin ingin menghapus data warga binaan: ${w.nama} (No Reg: ${w.no_reg_instansi})?`)) {
      store.deleteWbp(w.id);
      reloadData();
    }
  };

  // Export full 30 columns to Excel
  const handleExportExcel = () => {
    const exportData = filteredList.map((w, idx) => ({
      No: idx + 1,
      NIK: w.nik || '-',
      'No Reg Instansi': w.no_reg_instansi || '-',
      Nama: w.nama,
      'Jenis Kelamin': w.jenis_kelamin,
      'Tempat Lahir': w.tempat_lahir || '-',
      'Tanggal Lahir': w.tanggal_lahir || '-',
      Usia: calculateUsia(w.tanggal_lahir),
      Alamat: w.alamat || '-',
      'Nama Ayah': w.nama_ayah || '-',
      'Nama Ibu': w.nama_ibu || '-',
      Pekerjaan: w.pekerjaan || '-',
      'Jenis Kejahatan': w.jenis_kejahatan || '-',
      Kategori: w.kategori,
      'Lama Pidana': w.lama_pidana || '-',
      'Tanggal Masuk': w.tanggal_masuk || '-',
      'Tgl Ekspirasi': w.tgl_ekspirasi || '-',
      'Sisa Bulan ke Ekspirasi': w.tgl_ekspirasi ? calculateSisaBulan(w.tgl_ekspirasi) : '-',
      Blok: w.blok || '-',
      'Kamar (Terkini)': w.kamar || '-',
      'Lokasi Sel': w.lokasi_sel || '-',
      'Tgl Surat Penahanan': w.tgl_surat_penahanan || '-',
      'Nomor Surat Penahanan': w.nomor_surat_penahanan || '-',
      'Status Data': w.status_data || 'Aktif',
      'Batch Pengalihan Faskes BPJS': w.batch_bpjs || '-',
      'Status Skrining': w.status_skrining || '-',
      'Kendala / Catatan BPJS': w.kendala_bpjs || '-',
      'Dasar Pendaftaran PBI': w.dasar_pbi || '-',
      'Catatan Penggabungan': w.catatan_penggabungan || '-',
      'Kamar Asli (SIDB)': w.kamar_sidb || '-',
    }));
    exportTableToExcel(exportData, `DATA_WBP_30_KOLOM_LAPAS_DOMPU_${new Date().toISOString().slice(0, 10)}`);
  };

  // Copy full table as TSV to clipboard for pasting straight into Google Sheets or Excel
  const handleCopyTsv = () => {
    const headers = [
      'No', 'NIK', 'No Reg Instansi', 'Nama', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Usia',
      'Alamat', 'Nama Ayah', 'Nama Ibu', 'Pekerjaan', 'Jenis Kejahatan', 'Kategori', 'Lama Pidana',
      'Tanggal Masuk', 'Tgl Ekspirasi', 'Sisa Bulan ke Ekspirasi', 'Blok', 'Kamar', 'Lokasi Sel',
      'Tgl Surat Penahanan', 'Nomor Surat Penahanan', 'Status Data', 'Batch Pengalihan Faskes BPJS',
      'Status Skrining', 'Kendala / Catatan BPJS', 'Dasar Pendaftaran PBI', 'Catatan Penggabungan', 'Kamar asli (data SIDB)'
    ];

    const rows = filteredList.map((w, idx) => [
      idx + 1,
      w.nik || '',
      w.no_reg_instansi || '',
      w.nama || '',
      w.jenis_kelamin || '',
      w.tempat_lahir || '',
      w.tanggal_lahir || '',
      calculateUsia(w.tanggal_lahir),
      w.alamat || '',
      w.nama_ayah || '',
      w.nama_ibu || '',
      w.pekerjaan || '',
      w.jenis_kejahatan || '',
      w.kategori || '',
      w.lama_pidana || '',
      w.tanggal_masuk || '',
      w.tgl_ekspirasi || '',
      w.tgl_ekspirasi ? calculateSisaBulan(w.tgl_ekspirasi) : '',
      w.blok || '',
      w.kamar || '',
      w.lokasi_sel || '',
      w.tgl_surat_penahanan || '',
      w.nomor_surat_penahanan || '',
      w.status_data || 'Aktif',
      w.batch_bpjs || '',
      w.status_skrining || '',
      w.kendala_bpjs || '',
      w.dasar_pbi || '',
      w.catatan_penggabungan || '',
      w.kamar_sidb || '',
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 2000);
  };

  const getBatchColor = (batch: string) => {
    const found = batches.find((b) => b.nama.toLowerCase() === batch.toLowerCase());
    return found ? found.warna : '#FFFFFF';
  };

  return (
    <div className="space-y-5">
      {/* Top Banner and Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Direktori Pasien Warga Binaan Pemasyarakatan (DATA_WBP)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Struktur lengkap 30 kolom sesuai master Excel <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono">MASTER_KLINIK.xlsx</code> ({filteredList.length} dari {wbpList.length} WBP)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('full')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  viewMode === 'full'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                📊 Tabel Lengkap Excel (30 Kolom)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  viewMode === 'compact'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                📋 Ringkas
              </button>
            </div>

            {/* Quick Copy to Sheets/Excel */}
            <button
              type="button"
              onClick={handleCopyTsv}
              title="Salin seluruh data dalam format TSV untuk dipaste langsung di Google Sheets atau Excel"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
            >
              {copiedTsv ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Format Sheets/Excel</span>
                </>
              )}
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>

            {/* Add WBP */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah WBP</span>
            </button>
          </div>
        </div>

        {/* Filters Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Search Query */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIK, No Reg, kamar, perkara..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Filter Batch */}
          <div>
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Semua">Semua Batch BPJS ({wbpList.length})</option>
              {batches.map((b) => (
                <option key={b.nama} value={b.nama}>
                  Batch: {b.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Blok */}
          <div>
            <select
              value={filterBlok}
              onChange={(e) => setFilterBlok(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Semua">Semua Blok Hunian</option>
              <option value="Blok Atas">Blok Atas</option>
              <option value="Blok Bawah">Blok Bawah</option>
              <option value="Blok Wanita">Blok Wanita</option>
              <option value="Sel Isolasi">Sel Isolasi</option>
            </select>
          </div>

          {/* Filter Kategori */}
          <div>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Narapidana">Narapidana</option>
              <option value="Tahanan">Tahanan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: Full 30 Columns with Sticky Header and Sticky Columns */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0 z-30 border-b border-slate-200 dark:border-slate-700 select-none">
              <tr>
                {/* 1. No (Sticky Left) */}
                <th className="py-2.5 px-3 w-12 text-center sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                  No
                </th>

                {/* 2. NIK */}
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[140px]">NIK</th>

                {/* 3. No Reg Instansi */}
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[150px]">No Reg Instansi</th>

                {/* 4. Nama (Sticky Left) */}
                <th className="py-2.5 px-4 whitespace-nowrap min-w-[200px] sticky left-12 z-40 bg-slate-100 dark:bg-slate-800 shadow-[4px_0_6px_rgba(0,0,0,0.06)]">
                  Nama Warga Binaan
                </th>

                {/* 5. Jenis Kelamin */}
                <th className="py-2.5 px-3 whitespace-nowrap">Jenis Kelamin</th>

                {/* 6. Tempat Lahir */}
                <th className="py-2.5 px-3 whitespace-nowrap">Tempat Lahir</th>

                {/* 7. Tanggal Lahir */}
                <th className="py-2.5 px-3 whitespace-nowrap">Tanggal Lahir</th>

                {/* 8. Usia */}
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Usia</th>

                {/* 9. Alamat */}
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[220px]">Alamat</th>

                {viewMode === 'full' && (
                  <>
                    {/* 10. Nama Ayah */}
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Nama Ayah</th>

                    {/* 11. Nama Ibu */}
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Nama Ibu</th>

                    {/* 12. Pekerjaan */}
                    <th className="py-2.5 px-3 whitespace-nowrap">Pekerjaan</th>
                  </>
                )}

                {/* 13. Jenis Kejahatan */}
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[150px]">Jenis Kejahatan</th>

                {/* 14. Kategori */}
                <th className="py-2.5 px-3 whitespace-nowrap">Kategori</th>

                {viewMode === 'full' && (
                  <>
                    {/* 15. Lama Pidana */}
                    <th className="py-2.5 px-3 whitespace-nowrap">Lama Pidana</th>

                    {/* 16. Tanggal Masuk */}
                    <th className="py-2.5 px-3 whitespace-nowrap">Tanggal Masuk</th>

                    {/* 17. Tgl Ekspirasi */}
                    <th className="py-2.5 px-3 whitespace-nowrap">Tgl Ekspirasi</th>

                    {/* 18. Sisa Bulan ke Ekspirasi */}
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Sisa Bulan</th>
                  </>
                )}

                {/* 19. Blok */}
                <th className="py-2.5 px-3 whitespace-nowrap">Blok</th>

                {/* 20. Kamar */}
                <th className="py-2.5 px-3 whitespace-nowrap">Kamar</th>

                {viewMode === 'full' && (
                  <>
                    {/* 21. Lokasi Sel */}
                    <th className="py-2.5 px-3 whitespace-nowrap">Lokasi Sel</th>

                    {/* 22. Tgl Surat Penahanan */}
                    <th className="py-2.5 px-3 whitespace-nowrap">Tgl Surat Penahanan</th>

                    {/* 23. Nomor Surat Penahanan */}
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[170px]">Nomor Surat Penahanan</th>

                    {/* 24. Status Data */}
                    <th className="py-2.5 px-3 whitespace-nowrap">Status Data</th>
                  </>
                )}

                {/* 25. Batch Pengalihan Faskes BPJS */}
                <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[130px]">Batch BPJS</th>

                {viewMode === 'full' && (
                  <>
                    {/* 26. Status Skrining */}
                    <th className="py-2.5 px-3 whitespace-nowrap">Status Skrining</th>

                    {/* 27. Kendala / Catatan BPJS */}
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[200px]">Kendala BPJS</th>

                    {/* 28. Dasar Pendaftaran PBI */}
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[180px]">Dasar PBI</th>

                    {/* 29. Catatan Penggabungan */}
                    <th className="py-2.5 px-3 whitespace-nowrap min-w-[200px]">Catatan Penggabungan</th>

                    {/* 30. Kamar asli (data SIDB) */}
                    <th className="py-2.5 px-3 whitespace-nowrap">Kamar Asli (SIDB)</th>
                  </>
                )}

                {/* Action Sticky Right */}
                <th className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 z-40 bg-slate-100 dark:bg-slate-800 shadow-[-2px_0_4px_rgba(0,0,0,0.04)]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.length > 0 ? (
                filteredList.map((w, idx) => {
                  const usia = calculateUsia(w.tanggal_lahir);
                  const sisaBulan = w.tgl_ekspirasi ? calculateSisaBulan(w.tgl_ekspirasi) : '-';
                  const batchHex = getBatchColor(w.batch_bpjs);

                  return (
                    <tr
                      key={w.id}
                      className="hover:opacity-90 transition-opacity group"
                      style={{
                        backgroundColor: batchHex !== '#FFFFFF' ? `${batchHex}33` : undefined,
                      }}
                    >
                      {/* 1. No (Sticky Left) */}
                      <td className="py-2 px-3 text-center text-slate-400 font-mono sticky left-0 z-20 bg-white dark:bg-slate-900 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                        {idx + 1}
                      </td>

                      {/* 2. NIK */}
                      <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {w.nik || '-'}
                      </td>

                      {/* 3. No Reg Instansi */}
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {w.no_reg_instansi || '-'}
                      </td>

                      {/* 4. Nama (Sticky Left) */}
                      <td className="py-2 px-4 whitespace-nowrap sticky left-12 z-20 bg-white dark:bg-slate-900 shadow-[4px_0_6px_rgba(0,0,0,0.06)]">
                        <button
                          type="button"
                          onClick={() => setDetailModal({ open: true, item: w })}
                          className="font-bold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 text-left flex items-center gap-1.5"
                        >
                          <span>{w.nama}</span>
                          {w.perlu_dicek && (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] rounded font-bold">
                              Perlu Cek
                            </span>
                          )}
                        </button>
                      </td>

                      {/* 5. Jenis Kelamin */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {w.jenis_kelamin}
                      </td>

                      {/* 6. Tempat Lahir */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {w.tempat_lahir || '-'}
                      </td>

                      {/* 7. Tanggal Lahir */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        {w.tanggal_lahir || '-'}
                      </td>

                      {/* 8. Usia */}
                      <td className="py-2 px-2 text-center font-mono text-slate-700 dark:text-slate-300">
                        {usia} th
                      </td>

                      {/* 9. Alamat */}
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-[240px] truncate" title={w.alamat}>
                        {w.alamat || '-'}
                      </td>

                      {viewMode === 'full' && (
                        <>
                          {/* 10. Nama Ayah */}
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {w.nama_ayah || '-'}
                          </td>

                          {/* 11. Nama Ibu */}
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {w.nama_ibu || '-'}
                          </td>

                          {/* 12. Pekerjaan */}
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {w.pekerjaan || '-'}
                          </td>
                        </>
                      )}

                      {/* 13. Jenis Kejahatan */}
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                        {w.jenis_kejahatan || '-'}
                      </td>

                      {/* 14. Kategori */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          w.kategori === 'Narapidana'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                        }`}>
                          {w.kategori}
                        </span>
                      </td>

                      {viewMode === 'full' && (
                        <>
                          {/* 15. Lama Pidana */}
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                            {w.lama_pidana || '-'}
                          </td>

                          {/* 16. Tanggal Masuk */}
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                            {w.tanggal_masuk || '-'}
                          </td>

                          {/* 17. Tgl Ekspirasi */}
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                            {w.tgl_ekspirasi || '-'}
                          </td>

                          {/* 18. Sisa Bulan */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-teal-700 dark:text-teal-400">
                            {sisaBulan} bln
                          </td>
                        </>
                      )}

                      {/* 19. Blok */}
                      <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {w.blok || '-'}
                      </td>

                      {/* 20. Kamar */}
                      <td className="py-2 px-3 whitespace-nowrap font-bold text-teal-800 dark:text-teal-300">
                        Kamar {w.kamar || w.kamar_sidb || '-'}
                      </td>

                      {viewMode === 'full' && (
                        <>
                          {/* 21. Lokasi Sel */}
                          <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {w.lokasi_sel || '-'}
                          </td>

                          {/* 22. Tgl Surat Penahanan */}
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                            {w.tgl_surat_penahanan || '-'}
                          </td>

                          {/* 23. Nomor Surat Penahanan */}
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                            {w.nomor_surat_penahanan || '-'}
                          </td>

                          {/* 24. Status Data */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                              {w.status_data || 'Aktif'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* 25. Batch BPJS */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className="px-2.5 py-1 text-[10px] font-bold rounded-md border shadow-xs"
                          style={{
                            backgroundColor: batchHex,
                            color: '#1E293B',
                          }}
                        >
                          {w.batch_bpjs || 'Belum masuk batch'}
                        </span>
                      </td>

                      {viewMode === 'full' && (
                        <>
                          {/* 26. Status Skrining */}
                          <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {w.status_skrining || '-'}
                          </td>

                          {/* 27. Kendala BPJS */}
                          <td className="py-2 px-3 max-w-[200px] truncate text-amber-800 dark:text-amber-300" title={w.kendala_bpjs}>
                            {w.kendala_bpjs ? `⚠ ${w.kendala_bpjs}` : '-'}
                          </td>

                          {/* 28. Dasar PBI */}
                          <td className="py-2 px-3 max-w-[180px] truncate text-teal-700 dark:text-teal-400 font-medium" title={w.dasar_pbi}>
                            {w.dasar_pbi ? `PBI: ${w.dasar_pbi}` : '-'}
                          </td>

                          {/* 29. Catatan Penggabungan */}
                          <td className="py-2 px-3 max-w-[200px] truncate text-slate-500" title={w.catatan_penggabungan}>
                            {w.catatan_penggabungan || '-'}
                          </td>

                          {/* 30. Kamar Asli SIDB */}
                          <td className="py-2 px-3 whitespace-nowrap text-slate-500 font-mono">
                            {w.kamar_sidb || '-'}
                          </td>
                        </>
                      )}

                      {/* Action Sticky Right */}
                      <td className="py-2 px-3 text-center whitespace-nowrap sticky right-0 z-20 bg-white dark:bg-slate-900 shadow-[-2px_0_4px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailModal({ open: true, item: w })}
                            title="Lihat Detail Lengkap 30 Kolom"
                            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectWbp(w)}
                            title="Buka Rekam Medis Pasien"
                            className="p-1.5 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-md transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(w)}
                            title="Ubah Data WBP"
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWbp(w)}
                            title="Hapus Data"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-colors"
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
                  <td colSpan={viewMode === 'full' ? 31 : 16} className="py-12 text-center text-slate-400 italic">
                    Tidak ditemukan warga binaan yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Menampilkan <strong className="text-slate-900 dark:text-white font-mono">{filteredList.length}</strong> dari total {wbpList.length} warga binaan aktif
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
              Tabel Lengkap 30 Kolom Sesuai MASTER_KLINIK.xlsx
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: KARTU DETAIL LENGKAP WARGA BINAAN (30 KOLOM DOSSIER)            */}
      {/* ========================================================================= */}
      {detailModal.open && detailModal.item && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header with Name, Badge, and Close */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {detailModal.item.nama.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    {detailModal.item.nama}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-mono">Reg: {detailModal.item.no_reg_instansi || '-'}</span>
                    <span>·</span>
                    <span className="font-mono">NIK: {detailModal.item.nik || '-'}</span>
                    <span>·</span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px]" style={{ backgroundColor: getBatchColor(detailModal.item.batch_bpjs), color: '#1E293B' }}>
                      {detailModal.item.batch_bpjs}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModal({ open: false })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Structured Dossier Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Bagian 1: Identitas Pribadi */}
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                <div className="font-bold text-teal-800 dark:text-teal-300 uppercase tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <User className="w-3.5 h-3.5" />
                  <span>1. Identitas Pribadi & Kependudukan</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Jenis Kelamin</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.jenis_kelamin}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tempat, Tgl Lahir</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {detailModal.item.tempat_lahir}, {detailModal.item.tanggal_lahir} ({calculateUsia(detailModal.item.tanggal_lahir)} th)
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nama Ayah</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.nama_ayah || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nama Ibu</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.nama_ibu || '-'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Pekerjaan</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.pekerjaan || '-'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Alamat Asal</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{detailModal.item.alamat || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Perkara Hukum & Ekspirasi */}
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                <div className="font-bold text-teal-800 dark:text-teal-300 uppercase tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <Scale className="w-3.5 h-3.5" />
                  <span>2. Perkara Hukum & Pidana</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Kategori</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.kategori}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Jenis Kejahatan</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.jenis_kejahatan}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Lama Pidana</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.lama_pidana || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tanggal Masuk</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.tanggal_masuk || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tgl Ekspirasi</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.tgl_ekspirasi || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sisa Bulan</span>
                    <strong className="text-teal-700 dark:text-teal-400 font-bold">
                      {detailModal.item.tgl_ekspirasi ? `${calculateSisaBulan(detailModal.item.tgl_ekspirasi)} bulan` : '-'}
                    </strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Nomor & Tgl Surat Penahanan</span>
                    <p className="font-mono text-slate-700 dark:text-slate-300">
                      {detailModal.item.nomor_surat_penahanan || '-'} ({detailModal.item.tgl_surat_penahanan || '-'})
                    </p>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Penempatan & Kamar Hunian */}
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                <div className="font-bold text-teal-800 dark:text-teal-300 uppercase tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <Building className="w-3.5 h-3.5" />
                  <span>3. Penempatan Sel & Kamar</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Blok Hunian</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.blok}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Kamar Terkini</span>
                    <strong className="text-teal-700 dark:text-teal-400 font-bold text-sm">
                      Kamar {detailModal.item.kamar || detailModal.item.kamar_sidb || '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Kamar Asli SIDB</span>
                    <strong className="text-slate-600 dark:text-slate-400 font-mono">
                      {detailModal.item.kamar_sidb || '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Lokasi Sel</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.lokasi_sel || '-'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Status Data</span>
                    <strong className="text-emerald-700 dark:text-emerald-400">{detailModal.item.status_data || 'Aktif'}</strong>
                  </div>
                </div>
              </div>

              {/* Bagian 4: Integrasi BPJS / JKN */}
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                <div className="font-bold text-teal-800 dark:text-teal-300 uppercase tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800">
                  <Shield className="w-3.5 h-3.5" />
                  <span>4. Integrasi JKN / BPJS Kesehatan</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Batch Pengalihan</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.batch_bpjs}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Status Skrining</span>
                    <strong className="text-slate-800 dark:text-slate-200">{detailModal.item.status_skrining || '-'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Kendala / Catatan BPJS</span>
                    <p className="text-amber-800 dark:text-amber-300 font-medium">
                      {detailModal.item.kendala_bpjs || 'Tidak ada kendala'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Dasar Pendaftaran PBI</span>
                    <p className="text-slate-700 dark:text-slate-300">{detailModal.item.dasar_pbi || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Catatan Penggabungan / Update</span>
                    <p className="text-slate-500 italic text-[11px]">{detailModal.item.catatan_penggabungan || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDetailModal({ open: false });
                  handleOpenEdit(detailModal.item!);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Ubah Data Ini</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailModal({ open: false });
                    onSelectWbp(detailModal.item!);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>Buka Rekam Medis Pasien</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModal({ open: false })}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FORM TAMBAH / EDIT WBP LENGKAP 30 KOLOM                        */}
      {/* ========================================================================= */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {editModal.item ? `Ubah Data Warga Binaan: ${formData.nama}` : 'Tambah Warga Binaan Baru'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Lengkapi 30 atribut data sesuai master Excel Lapas Dompu
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModal({ open: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs Navigation in Modal */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setEditTab('identitas')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  editTab === 'identitas'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                1. Identitas Pribadi
              </button>
              <button
                type="button"
                onClick={() => setEditTab('hukum')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  editTab === 'hukum'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                2. Perkara & Pidana
              </button>
              <button
                type="button"
                onClick={() => setEditTab('sel')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  editTab === 'sel'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                3. Penempatan Sel
              </button>
              <button
                type="button"
                onClick={() => setEditTab('bpjs')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  editTab === 'bpjs'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                4. BPJS / PBI
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* TAB 1: IDENTITAS PRIBADI */}
              {editTab === 'identitas' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nama || ''}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      placeholder="CONTOH NAMA BIN CONTOH"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nomor Induk Kependudukan (NIK)
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      value={formData.nik || ''}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                      placeholder="16 digit NIK KTP"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No Registrasi Instansi
                    </label>
                    <input
                      type="text"
                      value={formData.no_reg_instansi || ''}
                      onChange={(e) => setFormData({ ...formData, no_reg_instansi: e.target.value })}
                      placeholder="Contoh: BI.161/DEWASA/2021"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jenis Kelamin
                    </label>
                    <select
                      value={formData.jenis_kelamin || 'Laki-laki'}
                      onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={formData.tempat_lahir || ''}
                      onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                      placeholder="Dompu, Bima, dll."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal Lahir (dd/mm/yyyy)
                    </label>
                    <input
                      type="text"
                      value={formData.tanggal_lahir || ''}
                      onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                      placeholder="01/07/1980"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Ayah
                    </label>
                    <input
                      type="text"
                      value={formData.nama_ayah || ''}
                      onChange={(e) => setFormData({ ...formData, nama_ayah: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Ibu
                    </label>
                    <input
                      type="text"
                      value={formData.nama_ibu || ''}
                      onChange={(e) => setFormData({ ...formData, nama_ibu: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pekerjaan
                    </label>
                    <input
                      type="text"
                      value={formData.pekerjaan || ''}
                      onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                      placeholder="Petani/Pekebun, Wiraswasta, dll."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Alamat Lengkap
                    </label>
                    <input
                      type="text"
                      value={formData.alamat || ''}
                      onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                      placeholder="Alamat desa/kelurahan, kecamatan, kabupaten"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: HUKUM & PIDANA */}
              {editTab === 'hukum' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kategori
                    </label>
                    <select
                      value={formData.kategori || 'Narapidana'}
                      onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="Narapidana">Narapidana</option>
                      <option value="Tahanan">Tahanan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jenis Kejahatan / Tindak Pidana
                    </label>
                    <input
                      type="text"
                      value={formData.jenis_kejahatan || ''}
                      onChange={(e) => setFormData({ ...formData, jenis_kejahatan: e.target.value })}
                      placeholder="Narkotika, Perlindungan Anak, Penganiayaan..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lama Pidana
                    </label>
                    <input
                      type="text"
                      value={formData.lama_pidana || ''}
                      onChange={(e) => setFormData({ ...formData, lama_pidana: e.target.value })}
                      placeholder="Contoh: 15 Thn 0 Bln"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal Masuk (dd/mm/yyyy)
                    </label>
                    <input
                      type="text"
                      value={formData.tanggal_masuk || ''}
                      onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                      placeholder="12/11/2021"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tgl Ekspirasi (dd/mm/yyyy)
                    </label>
                    <input
                      type="text"
                      value={formData.tgl_ekspirasi || ''}
                      onChange={(e) => setFormData({ ...formData, tgl_ekspirasi: e.target.value })}
                      placeholder="08/11/2038"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tgl Surat Penahanan
                    </label>
                    <input
                      type="text"
                      value={formData.tgl_surat_penahanan || ''}
                      onChange={(e) => setFormData({ ...formData, tgl_surat_penahanan: e.target.value })}
                      placeholder="14/06/2021"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nomor Surat Penahanan
                    </label>
                    <input
                      type="text"
                      value={formData.nomor_surat_penahanan || ''}
                      onChange={(e) => setFormData({ ...formData, nomor_surat_penahanan: e.target.value })}
                      placeholder="Contoh: 154/PID.SUS/2021/PN.RBI"
                      className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: PENEMPATAN SEL */}
              {editTab === 'sel' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kamar Terkini
                    </label>
                    <input
                      type="text"
                      value={formData.kamar || ''}
                      onChange={(e) => {
                        const newKamar = e.target.value;
                        const autoBlok = determineBlokByKamar(newKamar);
                        setFormData({ ...formData, kamar: newKamar, blok: autoBlok });
                      }}
                      placeholder="1, 14, LANSIA, TAMPING..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Mengubah kamar otomatis mengubah Blok Hunian
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Blok Hunian (Otomatis dari Kamar)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.blok || ''}
                        onChange={(e) => setFormData({ ...formData, blok: e.target.value })}
                        placeholder="(Kosong jika tanpa kamar)"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                      />
                      {formData.blok && (
                        <span className={`px-2 py-1 text-xs font-bold rounded whitespace-nowrap ${
                          formData.blok === 'Blok Atas'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : formData.blok === 'Blok Bawah'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {formData.blok}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Atas: Tamping, 8-14 · Bawah: Lansia, 1-7, Max · Kosong jika tanpa kamar
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lokasi Sel
                    </label>
                    <input
                      type="text"
                      value={formData.lokasi_sel || ''}
                      onChange={(e) => setFormData({ ...formData, lokasi_sel: e.target.value })}
                      placeholder="Contoh: TP Umum LT 1/8"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kamar Asli Data SIDB
                    </label>
                    <input
                      type="text"
                      value={formData.kamar_sidb || ''}
                      onChange={(e) => {
                        const newSidb = e.target.value;
                        const activeRoom = formData.kamar || newSidb;
                        setFormData({
                          ...formData,
                          kamar_sidb: newSidb,
                          blok: determineBlokByKamar(activeRoom),
                        });
                      }}
                      placeholder="Kamar asal saat impor SIDB"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Status Data
                    </label>
                    <input
                      type="text"
                      value={formData.status_data || 'Aktif'}
                      onChange={(e) => setFormData({ ...formData, status_data: e.target.value })}
                      placeholder="Aktif (data 5 Nov)"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: BPJS / PBI */}
              {editTab === 'bpjs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Batch Pengalihan Faskes BPJS
                    </label>
                    <select
                      value={formData.batch_bpjs || 'Belum masuk batch'}
                      onChange={(e) => setFormData({ ...formData, batch_bpjs: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
                    >
                      {batches.map((b) => (
                        <option key={b.nama} value={b.nama}>
                          {b.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Status Skrining
                    </label>
                    <input
                      type="text"
                      value={formData.status_skrining || ''}
                      onChange={(e) => setFormData({ ...formData, status_skrining: e.target.value })}
                      placeholder="Sudah / Belum Skrining"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kendala / Catatan BPJS
                    </label>
                    <input
                      type="text"
                      value={formData.kendala_bpjs || ''}
                      onChange={(e) => setFormData({ ...formData, kendala_bpjs: e.target.value })}
                      placeholder="Contoh: Belum terdaftar; NIK tidak sesuai ketentuan (kosong/bukan 16 digit)"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Dasar Pendaftaran PBI
                    </label>
                    <input
                      type="text"
                      value={formData.dasar_pbi || ''}
                      onChange={(e) => setFormData({ ...formData, dasar_pbi: e.target.value })}
                      placeholder="Contoh: PBI JK Mei 2026 No. 92/HUK/2026"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Catatan Penggabungan / Riwayat Update
                    </label>
                    <textarea
                      rows={2}
                      value={formData.catatan_penggabungan || ''}
                      onChange={(e) => setFormData({ ...formData, catatan_penggabungan: e.target.value })}
                      placeholder="Catatan riwayat update data dari SIDB atau BPJS"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Bagian {editTab === 'identitas' ? '1' : editTab === 'hukum' ? '2' : editTab === 'sel' ? '3' : '4'} dari 4</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModal({ open: false })}
                    className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs"
                  >
                    Simpan Seluruh Data WBP
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
