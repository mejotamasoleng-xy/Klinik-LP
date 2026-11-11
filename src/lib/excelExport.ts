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
