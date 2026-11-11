/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  FileText,
  RotateCcw,
  Users,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
import { parseFileInBrowser } from '../lib/excelExport';
import { store, normalizeDateIndo, determineBlokByKamar } from '../lib/storage';
import { KunjunganItem, ReferensiItem, WbpItem } from '../types';

export default function DataImporter() {
  const [activeImportType, setActiveImportType] = useState<'wbp' | 'kunjungan' | 'referensi' | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const existingWbp = store.getWbpList();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'wbp' | 'kunjungan' | 'referensi') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseFileInBrowser(file);
      if (rows.length === 0) {
        alert('File kosong');
        return;
      }

      setActiveImportType(type);
      setPreviewRows(rows);
      setPreviewHeaders(Object.keys(rows[0]));
      setSuccessMsg(null);

      // Validate rows
      const issues: string[] = [];
      if (type === 'kunjungan') {
        const wbpNames = new Set(existingWbp.map((w) => w.nama.trim().toLowerCase()));
        rows.forEach((r, idx) => {
          const nama = (r.Nama || r.nama || '').trim();
          if (!nama) {
            issues.push(`Baris ${idx + 2}: Nama pasien kosong.`);
          } else if (!wbpNames.has(nama.toLowerCase())) {
            issues.push(`Baris ${idx + 2}: Pasien "${nama}" belum terdaftar di DATA_WBP.`);
          }
        });
      } else if (type === 'wbp') {
        rows.forEach((r, idx) => {
          const nama = (r.Nama || r.nama || '').trim();
          if (!nama) {
            issues.push(`Baris ${idx + 2}: Nama WBP kosong.`);
          }
        });
      }

      setValidationIssues(issues);
    } catch (err: any) {
      alert('Gagal membaca file: ' + err.message);
    }
  };

  const handleConfirmImport = () => {
    if (!activeImportType || previewRows.length === 0) return;

    if (activeImportType === 'wbp') {
      const mapped: WbpItem[] = previewRows.map((r, idx) => ({
        id: 'wbp-imp-' + Date.now() + '-' + idx,
        no: Number(r.No || idx + 1),
        nik: String(r.NIK || r.nik || ''),
        no_reg_instansi: String(r['No Reg Instansi'] || r.no_reg_instansi || ''),
        nama: String(r.Nama || r.nama || '').trim(),
        jenis_kelamin: (r['Jenis Kelamin'] || 'Laki-laki') as any,
        tempat_lahir: String(r['Tempat Lahir'] || ''),
        tanggal_lahir: String(r['Tanggal Lahir'] || ''),
        alamat: String(r.Alamat || ''),
        pekerjaan: String(r.Pekerjaan || ''),
        jenis_kejahatan: String(r['Jenis Kejahatan'] || ''),
        kategori: String(r.Kategori || 'Narapidana'),
        lama_pidana: String(r['Lama Pidana'] || ''),
        tanggal_masuk: String(r['Tanggal Masuk'] || ''),
        tgl_ekspirasi: String(r['Tgl Ekspirasi'] || ''),
        blok: determineBlokByKamar(String(r.Kamar || r.kamar || r['Kamar asli (data SIDB)'] || '').trim()),
        kamar: String(r.Kamar || r.kamar || '').trim(),
        kamar_sidb: String(r['Kamar asli (data SIDB)'] || r.Kamar || r.kamar || '').trim(),
        status_data: String(r['Status Data'] || 'Aktif'),
        batch_bpjs: String(r['Batch Pengalihan Faskes BPJS'] || 'Belum masuk batch'),
        status_skrining: String(r['Status Skrining'] || ''),
        kendala_bpjs: String(r['Kendala / Catatan BPJS'] || ''),
        dasar_pbi: String(r['Dasar Pendaftaran PBI'] || ''),
        catatan_penggabungan: String(r['Catatan Penggabungan'] || ''),
      }));

      store.bulkImportWbp(mapped, importMode === 'replace');
      setSuccessMsg(`Berhasil mengimpor ${mapped.length} data WBP (${importMode === 'replace' ? 'Ganti Semua' : 'Tambah/Gabung'}).`);
    } else if (activeImportType === 'kunjungan') {
      const mapped: KunjunganItem[] = previewRows.map((r, idx) => {
        const nama = String(r.Nama || r.nama || '').trim();
        const matched = existingWbp.find((w) => w.nama.trim().toLowerCase() === nama.toLowerCase());
        return {
          id: 'k-imp-' + Date.now() + '-' + idx,
          tanggal: normalizeDateIndo(r.Tanggal || r.tanggal || ''),
          wbp_id: matched ? matched.id : '',
          nama,
          keluhan1: String(r['Keluhan 1'] || r.keluhan1 || '').trim(),
          keluhan2: String(r['Keluhan 2'] || r.keluhan2 || '').trim(),
          keluhan3: String(r['Keluhan 3'] || r.keluhan3 || '').trim(),
          kamar: String(r.Kamar || r.kamar || '').trim(),
          terapi: String(r.Terapi || r.terapi || '').trim(),
          dihapus: false,
          dibuat_pada: new Date().toISOString(),
        };
      });

      store.bulkImportKunjungan(mapped, importMode === 'replace');
      setSuccessMsg(`Berhasil mengimpor ${mapped.length} kunjungan pelayanan medis (${importMode === 'replace' ? 'Ganti Semua' : 'Tambah/Gabung'}).`);
    } else if (activeImportType === 'referensi') {
      previewRows.forEach((r) => {
        const keluhan = String(r.Keluhan || r.keluhan || '').trim();
        if (keluhan) {
          store.addReferensi({
            keluhan,
            masuk_penyakit: String(r['Masuk ke kolom penyakit'] || r.masuk_penyakit || '').trim(),
            catatan: String(r.Catatan || r.catatan || '').trim(),
            kode_icd10: String(r['Kode ICD-10'] || r.kode_icd10 || '').trim(),
            nama_icd10: String(r['Nama ICD-10'] || r.nama_icd10 || '').trim(),
            jenis: (r['Jenis (Menular/Tidak Menular)'] || r.jenis || 'Tidak Menular') as any,
          });
        }
      });
      setSuccessMsg(`Berhasil mengimpor referensi keluhan ICD-10.`);
    }

    setPreviewRows([]);
    setActiveImportType(null);
  };

  const handleDownloadFullBackup = () => {
    const jsonStr = store.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CADANGAN_LENGKAP_KLINIK_LAPAS_DOMPU_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const ok = store.importFullBackup(text);
        if (ok) {
          alert('Data cadangan berhasil dipulihkan secara menyeluruh!');
          window.location.reload();
        } else {
          alert('Format file cadangan tidak valid');
        }
      } catch (err: any) {
        alert('Gagal memulihkan: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-teal-700 dark:text-teal-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Pusat Impor Data Awal & Pencadangan Sistem
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Impor file CSV / Excel pecahan dari MASTER_KLINIK.xlsx atau pulihkan cadangan lengkap
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-200 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* 3 IMPORT BUTTONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Impor DATA_WBP */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              1. Impor DATA_WBP
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              File data warga binaan pemasyarakatan (512 WBP) dengan NIK, tanggal lahir, dan penempatan kamar.
            </p>
          </div>

          <label className="mt-4 w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg text-center cursor-pointer transition-colors shadow-xs">
            <span>Pilih File WBP (.csv / .xlsx)</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => handleFileUpload(e, 'wbp')}
              className="hidden"
            />
          </label>
        </div>

        {/* Card 2: Impor Input Harian */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-3">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              2. Impor Input Harian
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Riwayat 833 kunjungan pasien. Kolom Tanggal, Nama, Keluhan 1-3, Kamar, dan Terapi.
            </p>
          </div>

          <label className="mt-4 w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg text-center cursor-pointer transition-colors shadow-xs">
            <span>Pilih File Kunjungan (.csv / .xlsx)</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => handleFileUpload(e, 'kunjungan')}
              className="hidden"
            />
          </label>
        </div>

        {/* Card 3: Impor Referensi */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              3. Impor Referensi ICD-10
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pemetaan master keluhan ke diagnosa ICD-10 dan klasifikasi jenis menular / tidak menular.
            </p>
          </div>

          <label className="mt-4 w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg text-center cursor-pointer transition-colors shadow-xs">
            <span>Pilih File Referensi (.csv / .xlsx)</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => handleFileUpload(e, 'referensi')}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* PREVIEW & VALIDATION SECTION */}
      {previewRows.length > 0 && activeImportType && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pratinjau Impor: {activeImportType.toUpperCase()} ({previewRows.length} Baris Data)
              </h3>
              <p className="text-xs text-slate-500">
                Periksa data dan catatan validasi sebelum menekan simpan
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPreviewRows([]);
                setActiveImportType(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Batal
            </button>
          </div>

          {/* Validation alerts */}
          {validationIssues.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1 max-h-40 overflow-y-auto">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Ditemukan {validationIssues.length} Catatan Validasi:</span>
              </div>
              {validationIssues.map((issue, idx) => (
                <div key={idx} className="pl-5 text-[11px]">
                  • {issue}
                </div>
              ))}
            </div>
          )}

          {/* First 5 rows preview table */}
          <div className="overflow-x-auto max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 font-semibold sticky top-0">
                <tr>
                  {previewHeaders.map((h) => (
                    <th key={h} className="py-2 px-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewRows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {previewHeaders.map((h) => (
                      <td key={h} className="py-1.5 px-3 whitespace-nowrap">
                        {String(row[h] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import Mode Selection Toggle (Append vs Clean Replace) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Pilihan Penggabungan Data:
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {importMode === 'append'
                  ? 'Data baru akan digabungkan atau diperbarui jika NIK sama. Data lama tetap utuh.'
                  : 'PERINGATAN: Seluruh data sebelumnya akan dihapus bersih dan digantikan total oleh file baru ini.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setImportMode('append')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  importMode === 'append'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                }`}
              >
                <span>➕ Tambah / Perbarui (Gabung)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  importMode === 'replace'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                }`}
              >
                <span>🔄 Timpa Semua Data (Replace)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleConfirmImport}
              className={`px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm transition-all ${
                importMode === 'replace' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              {importMode === 'replace' ? 'Konfirmasi Timpa & Ganti Semua Data' : 'Simpan & Gabungkan Data'}
            </button>
          </div>
        </div>
      )}

      {/* BACKUP & RESTORE SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
          Cadangan Menyeluruh & Pemulihan Sistem (Full Backup)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Unduh seluruh salinan basis data klinik (WBP, kunjungan harian, referensi ICD-10, dan riwayat audit) sebagai file cadangan terenkripsi
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadFullBackup}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-teal-600" />
            <span>Unduh Cadangan Lengkap (.json)</span>
          </button>

          <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
            <RotateCcw className="w-4 h-4 text-teal-600" />
            <span>Pulihkan dari File Cadangan</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFullBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
