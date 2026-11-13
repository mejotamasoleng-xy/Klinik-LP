/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  RefreshCw,
  Upload,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Clock,
  Trash2,
  Users,
  Eye,
  Check,
} from 'lucide-react';
import { parseFileInBrowser } from '../lib/excelExport';
import { determineBlokByKamar, store, useStoreSync } from '../lib/storage';
import { WbpItem } from '../types';

interface ColumnMapping {
  nama: string;
  nik: string;
  no_reg_instansi: string;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat: string;
  pekerjaan: string;
  jenis_kejahatan: string;
  kategori: string;
  lama_pidana: string;
  tanggal_masuk: string;
  tgl_ekspirasi: string;
  blok: string;
  kamar: string;
}

export default function SidbUpdater() {
  useStoreSync();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  // Column mapping state
  const [mapping, setMapping] = useState<ColumnMapping>({
    nama: 'Nama',
    nik: 'NIK',
    no_reg_instansi: 'No Reg Instansi',
    jenis_kelamin: 'Jenis Kelamin',
    tempat_lahir: 'Tempat Lahir',
    tanggal_lahir: 'Tanggal Lahir',
    alamat: 'Alamat',
    pekerjaan: 'Pekerjaan',
    jenis_kejahatan: 'Jenis Kejahatan',
    kategori: 'Kategori',
    lama_pidana: 'Lama Pidana',
    tanggal_masuk: 'Tanggal Masuk',
    tgl_ekspirasi: 'Tgl Ekspirasi',
    blok: 'Blok',
    kamar: 'Kamar',
  });

  // Diff results
  const [diffResult, setDiffResult] = useState<{
    newWbp: WbpItem[];
    updatedWbp: { existing: WbpItem; updated: WbpItem; diffs: { field: string; oldVal: any; newVal: any }[] }[];
    missingWbp: WbpItem[];
  }>({ newWbp: [], updatedWbp: [], missingWbp: [] });

  const [appliedSummary, setAppliedSummary] = useState<any>(null);
  const history = store.getSidbHistory();

  // Step 1: Upload File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    try {
      const rows = await parseFileInBrowser(uploadedFile);
      if (rows.length === 0) {
        alert('File kosong atau tidak dapat dibaca');
        return;
      }
      setParsedRows(rows);
      const keys = Object.keys(rows[0]);
      setHeaders(keys);

      // Auto-detect mappings based on header names
      const autoMap: ColumnMapping = { ...mapping };
      keys.forEach((k) => {
        const lower = k.toLowerCase();
        if (lower.includes('nama') && !lower.includes('ayah') && !lower.includes('ibu')) autoMap.nama = k;
        if (lower.includes('nik') || lower.includes('ktp')) autoMap.nik = k;
        if (lower.includes('reg')) autoMap.no_reg_instansi = k;
        if (lower.includes('kelamin') || lower.includes('gender')) autoMap.jenis_kelamin = k;
        if (lower.includes('tempat') && lower.includes('lahir')) autoMap.tempat_lahir = k;
        if (lower.includes('tgl') && lower.includes('lahir')) autoMap.tanggal_lahir = k;
        if (lower.includes('alamat') || lower.includes('domisili')) autoMap.alamat = k;
        if (lower.includes('pekerjaan')) autoMap.pekerjaan = k;
        if (lower.includes('kejahatan') || lower.includes('pasal') || lower.includes('tindak')) autoMap.jenis_kejahatan = k;
        if (lower.includes('kategori')) autoMap.kategori = k;
        if (lower.includes('lama') || lower.includes('pidana')) autoMap.lama_pidana = k;
        if (lower.includes('masuk')) autoMap.tanggal_masuk = k;
        if (lower.includes('ekspirasi') || lower.includes('bebas')) autoMap.tgl_ekspirasi = k;
        if (lower.includes('blok')) autoMap.blok = k;
        if (lower.includes('kamar') || lower.includes('sel')) autoMap.kamar = k;
      });

      setMapping(autoMap);
      setStep(2);
    } catch (err: any) {
      alert('Gagal memproses file: ' + err.message);
    }
  };

  // Step 2 -> 3: Calculate Diff
  const calculateDiff = () => {
    const existingList = store.getWbpList();
    const newItems: WbpItem[] = [];
    const updatedItems: { existing: WbpItem; updated: WbpItem; diffs: { field: string; oldVal: any; newVal: any }[] }[] = [];
    const matchedExistingIds = new Set<string>();

    parsedRows.forEach((row, idx) => {
      const rowNama = String(row[mapping.nama] || '').trim();
      const rowNik = String(row[mapping.nik] || '').trim();
      if (!rowNama && !rowNik) return;

      // Match strategy: NIK match OR exact name match
      let matched = existingList.find((w) => w.nik && rowNik && w.nik.trim() === rowNik);
      if (!matched) {
        matched = existingList.find((w) => w.nama.trim().toLowerCase() === rowNama.toLowerCase());
      }

      if (matched) {
        matchedExistingIds.add(matched.id);
        const diffs: { field: string; oldVal: any; newVal: any }[] = [];

        // Columns from SIDB that overwrite old data:
        const checkField = (fieldKey: keyof WbpItem, newVal: any, label: string) => {
          const oldVal = matched![fieldKey];
          if (newVal !== undefined && newVal !== null && String(newVal).trim() !== '' && String(oldVal) !== String(newVal)) {
            diffs.push({ field: label, oldVal: oldVal || '(kosong)', newVal });
          }
        };

        const newKamarSidb = row[mapping.kamar] ? String(row[mapping.kamar]).trim() : matched.kamar_sidb;
        const targetRoom = newKamarSidb || matched.kamar || '';
        const newBlok = determineBlokByKamar(targetRoom);

        checkField('nama', rowNama, 'Nama');
        checkField('no_reg_instansi', row[mapping.no_reg_instansi], 'No Reg Instansi');
        checkField('tgl_ekspirasi', row[mapping.tgl_ekspirasi], 'Tgl Ekspirasi');
        checkField('blok', newBlok, 'Blok');
        checkField('kamar_sidb', newKamarSidb, 'Kamar SIDB');

        const updated: WbpItem = {
          ...matched,
          nama: rowNama, // New file name wins
          no_reg_instansi: row[mapping.no_reg_instansi] ? String(row[mapping.no_reg_instansi]).trim() : matched.no_reg_instansi,
          jenis_kelamin: (row[mapping.jenis_kelamin] || matched.jenis_kelamin) as any,
          tempat_lahir: row[mapping.tempat_lahir] ? String(row[mapping.tempat_lahir]).trim() : matched.tempat_lahir,
          tanggal_lahir: row[mapping.tanggal_lahir] ? String(row[mapping.tanggal_lahir]).trim() : matched.tanggal_lahir,
          alamat: row[mapping.alamat] ? String(row[mapping.alamat]).trim() : matched.alamat,
          pekerjaan: row[mapping.pekerjaan] ? String(row[mapping.pekerjaan]).trim() : matched.pekerjaan,
          jenis_kejahatan: row[mapping.jenis_kejahatan] ? String(row[mapping.jenis_kejahatan]).trim() : matched.jenis_kejahatan,
          kategori: row[mapping.kategori] ? String(row[mapping.kategori]).trim() : matched.kategori,
          lama_pidana: row[mapping.lama_pidana] ? String(row[mapping.lama_pidana]).trim() : matched.lama_pidana,
          tanggal_masuk: row[mapping.tanggal_masuk] ? String(row[mapping.tanggal_masuk]).trim() : matched.tanggal_masuk,
          tgl_ekspirasi: row[mapping.tgl_ekspirasi] ? String(row[mapping.tgl_ekspirasi]).trim() : matched.tgl_ekspirasi,
          blok: newBlok,
          kamar: targetRoom,
          kamar_sidb: newKamarSidb, // Saved to Kamar asli (SIDB)
          status_data: `Aktif (update ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`,
          perlu_dicek: false, // cleared if present in latest file
        };

        if (diffs.length > 0) {
          updatedItems.push({ existing: matched, updated, diffs });
        }
      } else {
        // Brand new WBP
        const rawKamar = row[mapping.kamar] ? String(row[mapping.kamar]).trim() : '';
        const newItem: WbpItem = {
          id: 'wbp-' + Date.now() + '-' + idx,
          no: existingList.length + newItems.length + 1,
          nama: rowNama,
          nik: rowNik,
          no_reg_instansi: row[mapping.no_reg_instansi] ? String(row[mapping.no_reg_instansi]).trim() : '',
          jenis_kelamin: (row[mapping.jenis_kelamin] || 'Laki-laki') as any,
          tempat_lahir: row[mapping.tempat_lahir] ? String(row[mapping.tempat_lahir]).trim() : '',
          tanggal_lahir: row[mapping.tanggal_lahir] ? String(row[mapping.tanggal_lahir]).trim() : '',
          alamat: row[mapping.alamat] ? String(row[mapping.alamat]).trim() : '',
          pekerjaan: row[mapping.pekerjaan] ? String(row[mapping.pekerjaan]).trim() : '',
          jenis_kejahatan: row[mapping.jenis_kejahatan] ? String(row[mapping.jenis_kejahatan]).trim() : '',
          kategori: (row[mapping.kategori] || 'Narapidana') as any,
          lama_pidana: row[mapping.lama_pidana] ? String(row[mapping.lama_pidana]).trim() : '',
          tanggal_masuk: row[mapping.tanggal_masuk] ? String(row[mapping.tanggal_masuk]).trim() : '',
          tgl_ekspirasi: row[mapping.tgl_ekspirasi] ? String(row[mapping.tgl_ekspirasi]).trim() : '',
          blok: determineBlokByKamar(rawKamar),
          kamar: rawKamar,
          kamar_sidb: rawKamar,
          status_data: `Aktif (data baru ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`,
          batch_bpjs: 'Belum masuk batch', // Default rule 4
          status_skrining: '',
          kendala_bpjs: '',
          dasar_pbi: '',
        };
        newItems.push(newItem);
      }
    });

    // Rule 5: WBP in database not found in new file: do NOT delete immediately; mark 'perlu_dicek'
    const missingItems = existingList.filter((w) => !matchedExistingIds.has(w.id));

    setDiffResult({
      newWbp: newItems,
      updatedWbp: updatedItems,
      missingWbp: missingItems,
    });
    setStep(3);
  };

  // Step 4: Apply Updates atomically & broadcast to all devices
  const handleApply = async () => {
    if (isApplying) return;
    setIsApplying(true);
    try {
      const summary = {
        tanggal: new Date().toISOString(),
        nama_file: file?.name || 'Pencarian Kompleks.xls',
        total_baris: parsedRows.length,
        wbp_baru: diffResult.newWbp.length,
        wbp_diperbarui: diffResult.updatedWbp.length,
        wbp_ditandai_cek: diffResult.missingWbp.length,
      };
      await store.applySidbUpdates({
        newWbp: diffResult.newWbp,
        updatedWbp: diffResult.updatedWbp.map((u) => u.updated),
        missingIds: diffResult.missingWbp.map((m) => m.id),
        history: summary,
      });
      setAppliedSummary(summary);
      setStep(4);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setParsedRows([]);
    setDiffResult({ newWbp: [], updatedWbp: [], missingWbp: [] });
    setAppliedSummary(null);
  };

  // Missing WBP actions
  const handleDeleteMissing = (id: string) => {
    store.deleteWbp(id);
    setDiffResult((prev) => ({
      ...prev,
      missingWbp: prev.missingWbp.filter((w) => w.id !== id),
    }));
  };

  const handleDeleteAllMissing = () => {
    if (confirm(`Yakin ingin menghapus semua (${diffResult.missingWbp.length}) WBP yang ditandai untuk dicek?`)) {
      diffResult.missingWbp.forEach((m) => store.deleteWbp(m.id));
      setDiffResult((prev) => ({ ...prev, missingWbp: [] }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-teal-700 dark:text-teal-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Pembaruan WBP dari Database SIDB (Pencarian Kompleks)
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Perbarui data warga binaan dari file ekspor SIDB terbaru tanpa menghilangkan data BPJS atau riwayat medis
        </p>

        {/* Stepper Wizard Indicator */}
        <div className="flex items-center justify-between max-w-xl mx-auto mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-teal-700 font-bold' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
              1
            </span>
            <span>Unggah File</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-teal-700 font-bold' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
              2
            </span>
            <span>Cek Pemetaan</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-teal-700 font-bold' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step >= 3 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
              3
            </span>
            <span>Pratinjau Perubahan</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 ${step === 4 ? 'text-teal-700 font-bold' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 4 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
              4
            </span>
            <span>Terapkan</span>
          </div>
        </div>
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="max-w-md mx-auto border-2 border-dashed border-teal-300 dark:border-teal-800 rounded-xl p-8 hover:bg-teal-50/20 transition-colors">
            <Upload className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Unggah File Ekspor SIDB (.xls / .xlsx / .csv)
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Pilih file "Pencarian Kompleks_&lt;tanggal&gt;.xls" terbaru yang diunduh dari aplikasi SIDB Lapas.
            </p>

            <label className="inline-block px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm transition-colors">
              <span>Pilih File dari Komputer / HP</span>
              <input
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Previous Updates History */}
          {history.length > 0 && (
            <div className="max-w-2xl mx-auto text-left pt-6 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Riwayat Pembaruan SIDB Sebelumnya:</span>
              </h4>
              <div className="space-y-1.5">
                {history.slice(0, 4).map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{h.nama_file}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right text-[11px]">
                      <span className="font-bold text-teal-700">+{h.wbp_baru} baru</span> ·{' '}
                      <span className="text-slate-600">{h.wbp_diperbarui} diperbarui</span> ·{' '}
                      <span className="text-rose-600">{h.wbp_ditandai_cek} cek</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Verifikasi Pemetaan Kolom File SIDB
              </h3>
              <p className="text-xs text-slate-500">
                File: {file?.name} ({parsedRows.length} baris data ditemukan)
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Ganti File
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {Object.entries(mapping).map(([fieldKey, currentHeader]) => (
              <div key={fieldKey} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 capitalize mb-1">
                  {fieldKey.replace(/_/g, ' ')}
                </label>
                <select
                  value={currentHeader}
                  onChange={(e) => setMapping({ ...mapping, [fieldKey]: e.target.value })}
                  className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Lewati Kolom --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={calculateDiff}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <span>Lanjut ke Pratinjau Perubahan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW DIFF */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Big Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-teal-700 block">WBP Baru Masuk</span>
              <span className="text-2xl font-bold font-mono text-teal-800 mt-1 block">
                +{diffResult.newWbp.length} Orang
              </span>
              <span className="text-[11px] text-teal-600 mt-0.5 block">
                Otomatis berstatus "Belum masuk batch" BPJS
              </span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-blue-700 block">WBP Diperbarui (Diff)</span>
              <span className="text-2xl font-bold font-mono text-blue-800 mt-1 block">
                {diffResult.updatedWbp.length} Orang
              </span>
              <span className="text-[11px] text-blue-600 mt-0.5 block">
                Nama, No Reg, Ekspirasi, atau Kamar SIDB diperbarui
              </span>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-rose-700 block">
                Tidak Ada di File Baru ("Perlu Dicek")
              </span>
              <span className="text-2xl font-bold font-mono text-rose-800 mt-1 block">
                {diffResult.missingWbp.length} Orang
              </span>
              <span className="text-[11px] text-rose-600 mt-0.5 block">
                Tidak langsung dihapus; ditandai untuk diverifikasi
              </span>
            </div>
          </div>

          {/* Detailed Differences List */}
          {diffResult.updatedWbp.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Rincian Perubahan Kolom (Data Lama vs Data Baru SIDB):
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {diffResult.updatedWbp.map((u) => (
                  <div key={u.existing.id} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white mb-1">
                      {u.existing.nama} (NIK: {u.existing.nik || '-'})
                    </div>
                    <div className="space-y-0.5 text-[11px]">
                      {u.diffs.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-slate-400 font-medium">{d.field}:</span>
                          <span className="text-rose-600 line-through">{String(d.oldVal)}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-teal-700 font-bold">{String(d.newVal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing WBP List */}
          {diffResult.missingWbp.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/60 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Daftar WBP Ditandai "Perlu Dicek" ({diffResult.missingWbp.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={handleDeleteAllMissing}
                  className="px-2.5 py-1 text-[11px] text-rose-700 hover:bg-rose-100 rounded font-semibold"
                >
                  Hapus Semua yang Ditandai
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {diffResult.missingWbp.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded bg-rose-50/50 dark:bg-rose-950/20 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{m.nama}</span>
                      <span className="text-[11px] text-slate-500 ml-2">NIK: {m.nik || '-'} · {m.blok} (Kamar {m.kamar})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMissing(m.id)}
                      className="text-rose-600 hover:underline text-[11px]"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Apply */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Data lama hanya akan diperbarui setelah Anda menekan tombol di samping.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isApplying}
                onClick={handleApply}
                className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{isApplying ? 'Menyimpan ke Cloud SQL...' : 'Terapkan Pembaruan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS SUMMARY */}
      {step === 4 && appliedSummary && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Pembaruan WBP Berhasil Diterapkan!
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Seluruh data identitas telah disinkronkan dengan file "{appliedSummary.nama_file}". Data riwayat kunjungan dan BPJS tetap aman.
          </p>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
            >
              Pembaruan File Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
