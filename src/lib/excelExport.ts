/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { CalculatedKunjungan, PenyakitItem, WbpItem } from '../types';

export function exportTableToExcel(data: any[], fileName: string, sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportRekapBulananToExcel(
  bulanTahun: string,
  patients: {
    nama: string;
    kamar: string;
    blok: string;
    jumlahKunjungan: number;
    counts: Record<string, number>;
    totalMenular: number;
    totalTidakMenular: number;
    totalSemua: number;
  }[],
  penyakitList: PenyakitItem[],
  totalsPerPenyakit: Record<string, number>,
  grandTotalMenular: number,
  grandTotalTidakMenular: number,
  grandTotalSemua: number
) {
  // Build structured 2D array for clean Excel formatting
  const rows: any[][] = [];

  // Title headers
  rows.push([`LAPORAN REKAPITULASI PENYAKIT RAWAT JALAN KLINIK LAPAS KELAS IIB DOMPU`]);
  rows.push([`PERIODE: ${bulanTahun.toUpperCase()}`]);
  rows.push([]);

  // Column header row:
  const headerRow = ['NO', 'NAMA WARGA BINAAN', 'BLOK/KAMAR', 'JUMLAH KUNJUNGAN'];
  penyakitList.forEach((p) => {
    headerRow.push(`${p.penyakit} [${p.jenis.toUpperCase()}]`);
  });
  headerRow.push('TOTAL KASUS MENULAR', 'TOTAL KASUS TDK MENULAR', 'TOTAL SEMUA KASUS');
  rows.push(headerRow);

  // Patient rows (Each row = 1 unique patient)
  patients.forEach((p, idx) => {
    const row: any[] = [
      idx + 1,
      p.nama,
      `${p.blok || ''} ${p.kamar ? `Kamar ${p.kamar}` : ''}`.trim(),
      p.jumlahKunjungan,
    ];
    penyakitList.forEach((pen) => {
      row.push(p.counts[pen.penyakit] || 0);
    });
    row.push(p.totalMenular);
    row.push(p.totalTidakMenular);
    row.push(p.totalSemua);
    rows.push(row);
  });

  // Total summary row: TOTAL KASUS
  const totalKunjunganSemua = patients.reduce((acc, p) => acc + p.jumlahKunjungan, 0);
  const totalRow: any[] = ['TOTAL KASUS', 'JUMLAH KASUS KELUHAN', '', totalKunjunganSemua];
  penyakitList.forEach((pen) => {
    totalRow.push(totalsPerPenyakit[pen.penyakit] || 0);
  });
  totalRow.push(grandTotalMenular);
  totalRow.push(grandTotalTidakMenular);
  totalRow.push(grandTotalSemua);
  rows.push(totalRow);

  // Pasien Unik per penyakit row
  const unikRow: any[] = ['PASIEN UNIK', `${patients.length} ORANG BERBEDA`, '', ''];
  penyakitList.forEach((pen) => {
    const countUnik = patients.filter((p) => (p.counts[pen.penyakit] || 0) > 0).length;
    unikRow.push(countUnik);
  });
  rows.push(unikRow);

  // Footnote definitions
  rows.push([]);
  rows.push(['CATATAN DEFINISI RESMI KLINIS:']);
  rows.push(['1. KUNJUNGAN = Jumlah baris kedatangan pasien di Input Harian (berapa kali pasien datang berobat).']);
  rows.push(['2. PASIEN UNIK = Jumlah orang berbeda dari DATA_WBP yang berobat (tiap orang dihitung 1 kali per periode).']);
  rows.push(['3. KASUS = Jumlah kunjungan yang memuat penyakit tersebut (1 kunjungan memuat batuk & pilek = 1 kasus ISPA).']);
  rows.push(['4. Kunjungan per pasien = Total Kunjungan dibagi Pasien Unik.']);

  // Blank rows before signature space
  rows.push([]);
  rows.push(['', '', '', '', 'Dompu, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })]);
  rows.push(['', '', '', '', 'Dokter Penanggung Jawab / Petugas Medis']);
  rows.push([]);
  rows.push([]);
  rows.push(['', '', '', '', '(.......................................................)']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Penyakit');
  XLSX.writeFile(wb, `REKAP_PENYAKIT_${bulanTahun.replace(/\s+/g, '_')}.xlsx`);
}

export function exportDaftarPanggilBpjsToExcel(wbpList: WbpItem[]) {
  const filtered = wbpList.filter((w) => w.batch_bpjs === 'Belum masuk batch');
  const mapped = filtered.map((w, idx) => ({
    'No': idx + 1,
    'Nama WBP': w.nama,
    'NIK': w.nik || '-',
    'No Reg Instansi': w.no_reg_instansi || '-',
    'Blok': w.blok || '-',
    'Kamar': w.kamar || '-',
    'Alamat Asal': w.alamat || '-',
    'Tempat, Tgl Lahir': `${w.tempat_lahir || ''}, ${w.tanggal_lahir || ''}`,
    'Status Data': w.status_data || 'Aktif',
    'Kendala BPJS': w.kendala_bpjs || '',
    'Dasar Pendaftaran PBI': w.dasar_pbi || '',
  }));

  const ws = XLSX.utils.json_to_sheet(mapped);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Panggil BPJS');
  XLSX.writeFile(wb, `DAFTAR_PANGGIL_BPJS_BELUM_MASUK_BATCH_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportFormPenyakitMenularNtb(
  bulanTahun: string,
  visits: CalculatedKunjungan[]
) {
  // Unique patients with Ispa, Scabies, Diare in this month
  const targetIllnesses = ['ISPA', 'SCABIES', 'DIARE/KONSTIPASI', 'FLU', 'TBC'];
  const patientMap = new Map<string, { wbp?: WbpItem; nama: string; illnesses: Set<string>; tanggalKunjungan: string }>();

  visits.forEach((v) => {
    const p1 = (v.penyakit1 || '').toUpperCase();
    const p2 = (v.penyakit2 || '').toUpperCase();
    const p3 = (v.penyakit3 || '').toUpperCase();

    const matches = targetIllnesses.filter((t) => p1.includes(t) || p2.includes(t) || p3.includes(t));
    if (matches.length > 0) {
      const key = v.wbp_id || v.nama.trim().toLowerCase();
      if (!patientMap.has(key)) {
        patientMap.set(key, {
          wbp: v.wbp,
          nama: v.nama,
          illnesses: new Set(),
          tanggalKunjungan: v.tanggal,
        });
      }
      matches.forEach((m) => patientMap.get(key)!.illnesses.add(m));
    }
  });

  const exportData = Array.from(patientMap.values()).map((item, idx) => ({
    'No': idx + 1,
    'Nama WBP': item.nama,
    'NIK': item.wbp?.nik || '-',
    'No Reg': item.wbp?.no_reg_instansi || '-',
    'Jenis Kelamin': item.wbp?.jenis_kelamin || 'Laki-laki',
    'Tanggal Lahir': item.wbp?.tanggal_lahir || '-',
    'Tanggal Masuk': item.wbp?.tanggal_masuk || '-',
    'Blok / Kamar': `${item.wbp?.blok || ''} / ${item.wbp?.kamar || ''}`,
    'Penyakit Menular Terdeteksi': Array.from(item.illnesses).join(', '),
    'Tanggal Berobat Terakhir': item.tanggalKunjungan,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'LP Dompu - Menular');
  XLSX.writeFile(wb, `FORM_PENYAKIT_MENULAR_NTB_LP_DOMPU_${bulanTahun.replace(/\s+/g, '_')}.xlsx`);
}

export function exportComprehensiveBackupToExcel(backupData: {
  exported_at?: string;
  version?: string;
  wbp: WbpItem[];
  kunjungan: any[];
  referensi: any[];
  penyakit: PenyakitItem[];
  pengaturan: any;
  sidb_history: any[];
  audit_logs: any[];
  preferences?: { theme?: string };
}) {
  const wb = XLSX.utils.book_new();
  const safeStr = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.length > 32000 ? s.slice(0, 32000) : s;
  };

  // 1. RINGKASAN_BACKUP
  const summaryRows = [
    { Bagian: 'Nama Aplikasi', Keterangan: 'Klinik Pratama Lapas Kelas IIB Dompu', Jumlah_Data: '' },
    { Bagian: 'Versi Cadangan', Keterangan: backupData.version || '2.0', Jumlah_Data: '' },
    { Bagian: 'Waktu Ekspor', Keterangan: backupData.exported_at || new Date().toISOString(), Jumlah_Data: '' },
    { Bagian: 'DATA_WBP', Keterangan: 'Seluruh master data warga binaan (30 kolom)', Jumlah_Data: backupData.wbp?.length || 0 },
    { Bagian: 'INPUT_HARIAN (Aktif)', Keterangan: 'Catatan kunjungan pelayanan medis aktif', Jumlah_Data: (backupData.kunjungan || []).filter((k) => !k.dihapus).length },
    { Bagian: 'KOTAK_SAMPAH_KUNJUNGAN', Keterangan: 'Catatan kunjungan yang dihapus lunak', Jumlah_Data: (backupData.kunjungan || []).filter((k) => k.dihapus).length },
    { Bagian: 'REFERENSI_ICD10', Keterangan: 'Kamus pemetaan keluhan ke penyakit & ICD-10', Jumlah_Data: backupData.referensi?.length || 0 },
    { Bagian: 'DAFTAR_PENYAKIT', Keterangan: 'Master kategori dan jenis penyakit', Jumlah_Data: backupData.penyakit?.length || 0 },
    { Bagian: 'PENGATURAN_SISTEM', Keterangan: 'Konfigurasi klinik, batch BPJS, & preferensi', Jumlah_Data: backupData.pengaturan?.batches?.length || 0 },
    { Bagian: 'RIWAYAT_SIDB', Keterangan: 'Riwayat pembaruan file SIDB', Jumlah_Data: backupData.sidb_history?.length || 0 },
    { Bagian: 'AUDIT_LOG', Keterangan: 'Riwayat aktivitas petugas lintas perangkat', Jumlah_Data: backupData.audit_logs?.length || 0 },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'RINGKASAN_BACKUP');

  // 2. DATA_WBP (All 30+ fields)
  const wbpRows = (backupData.wbp || []).map((w, idx) => ({
    No: w.no ?? idx + 1,
    ID: safeStr(w.id),
    NIK: safeStr(w.nik),
    'No Reg Instansi': safeStr(w.no_reg_instansi),
    Nama: safeStr(w.nama),
    'Jenis Kelamin': safeStr(w.jenis_kelamin),
    'Tempat Lahir': safeStr(w.tempat_lahir),
    'Tanggal Lahir': safeStr(w.tanggal_lahir),
    Alamat: safeStr(w.alamat),
    'Nama Ayah': safeStr(w.nama_ayah),
    'Nama Ibu': safeStr(w.nama_ibu),
    Pekerjaan: safeStr(w.pekerjaan),
    'Jenis Kejahatan': safeStr(w.jenis_kejahatan),
    Kategori: safeStr(w.kategori),
    'Lama Pidana': safeStr(w.lama_pidana),
    'Tanggal Masuk': safeStr(w.tanggal_masuk),
    'Tgl Ekspirasi': safeStr(w.tgl_ekspirasi),
    Blok: safeStr(w.blok),
    Kamar: safeStr(w.kamar),
    'Kamar asli (data SIDB)': safeStr(w.kamar_sidb),
    'Lokasi Sel': safeStr(w.lokasi_sel),
    'Tgl Surat Penahanan': safeStr(w.tgl_surat_penahanan),
    'Nomor Surat Penahanan': safeStr(w.nomor_surat_penahanan),
    'Status Data': safeStr(w.status_data),
    'Batch Pengalihan Faskes BPJS': safeStr(w.batch_bpjs),
    'Status Skrining': safeStr(w.status_skrining),
    'Kendala / Catatan BPJS': safeStr(w.kendala_bpjs),
    'Dasar Pendaftaran PBI': safeStr(w.dasar_pbi),
    'Catatan Penggabungan': safeStr(w.catatan_penggabungan),
    'Perlu Dicek SIDB': w.perlu_dicek ? 'Ya' : 'Tidak',
    'Sumber Update': safeStr(w.sumber_update),
    'Terakhir Diperbarui': safeStr(w.terakhir_diperbarui),
    'Dibuat Pada': safeStr(w.dibuat_pada),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(wbpRows.length > 0 ? wbpRows : [{ Info: 'Tidak ada data WBP' }]),
    'DATA_WBP'
  );

  // 3. INPUT_HARIAN (All active + soft-deleted kunjungan)
  const kunjunganRows = (backupData.kunjungan || []).map((k, idx) => ({
    No: idx + 1,
    ID: safeStr(k.id),
    Tanggal: safeStr(k.tanggal),
    'WBP ID': safeStr(k.wbp_id),
    Nama: safeStr(k.nama),
    NIK: safeStr(k.nik),
    Kamar: safeStr(k.kamar),
    'Keluhan 1': safeStr(k.keluhan1),
    'Keluhan 2': safeStr(k.keluhan2),
    'Keluhan 3': safeStr(k.keluhan3),
    'Penyakit 1': safeStr(k.penyakit1),
    'Penyakit 2': safeStr(k.penyakit2),
    'Penyakit 3': safeStr(k.penyakit3),
    Terapi: safeStr(k.terapi),
    'Dokter Pemeriksa': safeStr(k.dokter_pemeriksa),
    Perawat: safeStr(k.perawat),
    Catatan: safeStr(k.catatan),
    Status: k.dihapus ? 'Dihapus (Kotak Sampah)' : 'Aktif',
    'Dibuat Pada': safeStr(k.dibuat_pada),
    'Diubah Pada': safeStr(k.diubah_pada),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(kunjunganRows.length > 0 ? kunjunganRows : [{ Info: 'Tidak ada data kunjungan' }]),
    'INPUT_HARIAN'
  );

  // 4. REFERENSI_ICD10
  const refRows = (backupData.referensi || []).map((r, idx) => ({
    No: idx + 1,
    ID: safeStr(r.id),
    Keluhan: safeStr(r.keluhan),
    'Masuk ke kolom penyakit': safeStr(r.masuk_penyakit),
    Catatan: safeStr(r.catatan),
    'Kode ICD-10': safeStr(r.kode_icd10),
    'Nama ICD-10': safeStr(r.nama_icd10),
    'Jenis (Menular/Tidak Menular)': safeStr(r.jenis),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(refRows.length > 0 ? refRows : [{ Info: 'Tidak ada data referensi' }]),
    'REFERENSI_ICD10'
  );

  // 5. DAFTAR_PENYAKIT
  const penyakitRows = (backupData.penyakit || []).map((p, idx) => ({
    No: p.urutan ?? idx + 1,
    ID: safeStr(p.id),
    Kategori: safeStr(p.kategori),
    Penyakit: safeStr(p.penyakit),
    Jenis: safeStr(p.jenis),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(penyakitRows.length > 0 ? penyakitRows : [{ Info: 'Tidak ada daftar penyakit' }]),
    'DAFTAR_PENYAKIT'
  );

  // 6. PENGATURAN_SISTEM
  const peng = backupData.pengaturan || {};
  const settingsRows = [
  { Kunci: 'batas_sering_berobat_kali', Nilai: safeStr(peng.batas_sering_berobat_kali ?? 7) },
  { Kunci: 'periode_sering_hari', Nilai: safeStr(peng.periode_sering_hari ?? 7) },
  { Kunci: 'preferensi_tema', Nilai: safeStr(backupData.preferences?.theme || 'light') },
    ...(Array.isArray(peng.batches)
      ? peng.batches.map((b: any, idx: number) => ({
          Kunci: `batch_${idx + 1}`,
          Nilai: `${b.nama} (${b.warna})`,
        }))
      : []),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settingsRows), 'PENGATURAN_SISTEM');

  // 7. RIWAYAT_SIDB
  const sidbRows = (backupData.sidb_history || []).map((s, idx) => ({
    No: idx + 1,
    ID: safeStr(s.id),
    Tanggal: safeStr(s.tanggal),
    'Nama File': safeStr(s.nama_file),
    'Total Baris': s.total_baris ?? 0,
    'WBP Baru': s.wbp_baru ?? 0,
    'WBP Diperbarui': s.wbp_diperbarui ?? 0,
    'Ditandai Cek': s.wbp_ditandai_cek ?? 0,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sidbRows.length > 0 ? sidbRows : [{ Info: 'Belum ada riwayat update SIDB' }]),
    'RIWAYAT_SIDB'
  );

  // 8. AUDIT_LOG
  const auditRows = (backupData.audit_logs || []).map((a, idx) => ({
    No: idx + 1,
    ID: safeStr(a.id),
    Waktu: safeStr(a.waktu),
    Aksi: safeStr(a.aksi),
    Rincian: safeStr(a.rincian),
    Perangkat: safeStr(a.perangkat),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(auditRows.length > 0 ? auditRows : [{ Info: 'Belum ada audit log' }]),
    'AUDIT_LOG'
  );

  const dateTag = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `BACKUP_EXCEL_MENYELURUH_KLINIK_DOMPU_${dateTag}.xlsx`);
}

export function parseFileInBrowser(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // cellDates: false ensures date text strings like "01/10/2026" remain as string "01/10/2026" and are not flipped by US MM/DD/YYYY logic
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false, raw: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
