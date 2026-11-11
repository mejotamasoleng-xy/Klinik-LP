/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  Info,
  Sparkles,
  Layers,
} from 'lucide-react';
import { exportRekapBulananToExcel } from '../lib/excelExport';
import { parseDate, store, determineBlokByKamar } from '../lib/storage';

export interface ExcelCategoryGroup {
  kategori: string;
  penyakit: { nama: string; jenis: 'Menular' | 'Tidak Menular' }[];
}

// 14 KATEGORI & 88 PENYAKIT PERSIS SESUAI SHEET REKAP_BULANAN DI EXCEL MASTER_KLINIK.xlsx
export const EXACT_88_EXCEL_CATEGORIES: ExcelCategoryGroup[] = [
  {
    kategori: 'GANGGUAN PERNAPASAN',
    penyakit: [
      { nama: 'FLU', jenis: 'Menular' },
      { nama: 'BRONKITIS', jenis: 'Menular' },
      { nama: 'PNUMONIA', jenis: 'Menular' },
      { nama: 'TBC', jenis: 'Menular' },
      { nama: 'ISPA', jenis: 'Menular' },
      { nama: 'ASMA', jenis: 'Tidak Menular' },
      { nama: 'PPOK', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'GANGGUAN PENCERNAAN',
    penyakit: [
      { nama: 'GERD', jenis: 'Tidak Menular' },
      { nama: 'MAAG', jenis: 'Tidak Menular' },
      { nama: 'DIARE/KONSTIPASI', jenis: 'Menular' },
      { nama: 'BATU EMPEDU', jenis: 'Tidak Menular' },
      { nama: 'Dispepsia (Syndrom Gangguan Pencernaan)', jenis: 'Tidak Menular' },
      { nama: 'Gastritis (Radang Selaput Lambung)', jenis: 'Tidak Menular' },
      { nama: 'Hemoroid (Ambeien)', jenis: 'Tidak Menular' },
      { nama: 'Sirosis Hepatis', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'PENYAKIT INFEKSIUS DAN PARASITIK',
    penyakit: [
      { nama: 'MALARIA', jenis: 'Menular' },
      { nama: 'DBD', jenis: 'Menular' },
      { nama: 'DEMAM TIFOID', jenis: 'Menular' },
      { nama: 'CACINGAN', jenis: 'Menular' },
      { nama: 'FILARIASIS', jenis: 'Menular' },
      { nama: 'TOKSOPLAMOSIS', jenis: 'Menular' },
      { nama: 'EKTOPARASIT', jenis: 'Menular' },
      { nama: 'SCABIES', jenis: 'Menular' },
      { nama: 'HERPES', jenis: 'Menular' },
      { nama: 'BISUL', jenis: 'Menular' },
      { nama: 'DERMATITIS', jenis: 'Tidak Menular' },
      { nama: 'TINEA (JAMUR)', jenis: 'Menular' },
      { nama: 'LEPRA', jenis: 'Menular' },
      { nama: 'CACAR / CAMPAK', jenis: 'Menular' },
      { nama: 'HEPATITIS A', jenis: 'Menular' },
      { nama: 'HEPATITIS B', jenis: 'Menular' },
      { nama: 'HEPATITIS C', jenis: 'Menular' },
      { nama: 'GANDANG TELINGA PECAH', jenis: 'Tidak Menular' },
      { nama: 'GANGGUAN PENDENGARAN', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'PENYAKIT GUSI DAN MULUT',
    penyakit: [
      { nama: 'SARIAWAN', jenis: 'Tidak Menular' },
      { nama: 'ABSES GUSI', jenis: 'Tidak Menular' },
      { nama: 'KARIES GIGI', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'PENYAKIT PADA SISTEM SIRKULASI',
    penyakit: [
      { nama: 'JANTUNG KORONER', jenis: 'Tidak Menular' },
      { nama: 'SERANGAN JANTUNG', jenis: 'Tidak Menular' },
      { nama: 'GAGAL JANTUNG', jenis: 'Tidak Menular' },
      { nama: 'STROKE', jenis: 'Tidak Menular' },
      { nama: 'HPERTENSI', jenis: 'Tidak Menular' },
      { nama: 'HIPOTENSI', jenis: 'Tidak Menular' },
      { nama: 'ANEMIA', jenis: 'Tidak Menular' },
      { nama: 'VARISES', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'GANGGUAN SARAF',
    penyakit: [
      { nama: 'EPILEPSI', jenis: 'Tidak Menular' },
      { nama: 'VERTIGO', jenis: 'Tidak Menular' },
      { nama: 'PARKINSON', jenis: 'Tidak Menular' },
      { nama: 'MENINGITIS', jenis: 'Menular' },
      { nama: 'ALZHEIMER', jenis: 'Tidak Menular' },
      { nama: 'Cefalgia (Nyeri Kepala)', jenis: 'Tidak Menular' },
      { nama: 'Neuropati Perifer (Gangguan Syaraf Tepi)', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'GANGGUAN ENDOKRIN, NUTRISI DAN METABOLIK',
    penyakit: [
      { nama: 'DIABETES', jenis: 'Tidak Menular' },
      { nama: 'OBESITAS', jenis: 'Tidak Menular' },
      { nama: 'OSTEOPOROSIS', jenis: 'Tidak Menular' },
      { nama: 'TIROID', jenis: 'Tidak Menular' },
      { nama: 'GAGAL GINJAL', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'GANGGUAN PADA SISTEM SALURAN KEMIH DAN GENITAL',
    penyakit: [
      { nama: 'ISK', jenis: 'Tidak Menular' },
      { nama: 'BATU GINJAL', jenis: 'Tidak Menular' },
      { nama: 'GANGGUAN PROSTAT', jenis: 'Tidak Menular' },
      { nama: 'HIV/AIDS', jenis: 'Menular' },
      { nama: 'IMS', jenis: 'Menular' },
      { nama: 'GONORE', jenis: 'Menular' },
      { nama: 'HERPES GENITAL', jenis: 'Menular' },
      { nama: 'KLAMIDIA', jenis: 'Menular' },
    ],
  },
  {
    kategori: 'KODE UNTUK TUJUAN KHUSUS',
    penyakit: [
      { nama: 'COVID-19', jenis: 'Menular' },
      { nama: 'SARS', jenis: 'Menular' },
      { nama: 'VIRUS ZIKA', jenis: 'Menular' },
    ],
  },
  {
    kategori: 'NEOPLASMA',
    penyakit: [
      { nama: 'TUMOR', jenis: 'Tidak Menular' },
      { nama: 'KANKER', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'PENYAKIT MATA',
    penyakit: [
      { nama: 'Gangguan Refraksi', jenis: 'Tidak Menular' },
      { nama: 'Corpus Alienum (Benda Asing Mata)', jenis: 'Tidak Menular' },
      { nama: 'Trauma Mata', jenis: 'Tidak Menular' },
      { nama: 'Iritasi Mata', jenis: 'Tidak Menular' },
      { nama: 'Katarak', jenis: 'Tidak Menular' },
      { nama: 'Pterygium', jenis: 'Tidak Menular' },
      { nama: 'Hordeolum (Bintitan)', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'PENYAKIT PENDENGARAN',
    penyakit: [
      { nama: 'Otitis (Eksterna, Media Akut, Media Supuratifa Kronis)', jenis: 'Tidak Menular' },
      { nama: 'Corpus Alienum (Benda Asing Telinga)', jenis: 'Tidak Menular' },
      { nama: 'Penurunan Pendengaran', jenis: 'Tidak Menular' },
      { nama: 'Vertigo Perifer', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'Penyakit Muskuloskeletal',
    penyakit: [
      { nama: 'Miopati/ Myalgia (Gangguan Otot)', jenis: 'Tidak Menular' },
      { nama: 'gout artritis (asam urat)', jenis: 'Tidak Menular' },
      { nama: 'Osteoporosis (Pengapuran Tulang)', jenis: 'Tidak Menular' },
      { nama: 'Trauma (Cidera)', jenis: 'Tidak Menular' },
      { nama: 'Osteoartritis (radang sendi)', jenis: 'Tidak Menular' },
    ],
  },
  {
    kategori: 'LAIN - LAIN',
    penyakit: [
      { nama: 'Cacat Tubuh', jenis: 'Tidak Menular' },
      { nama: 'Gangguan Jiwa', jenis: 'Tidak Menular' },
    ],
  },
];

// Flat list of the 88 disease names in exact order
export const EXACT_88_DISEASES = EXACT_88_EXCEL_CATEGORIES.flatMap((c) =>
  c.penyakit.map((p) => ({
    penyakit: p.nama,
    kategori: c.kategori,
    jenis: p.jenis,
  }))
);

export default function MonthlyRecap() {
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Oktober
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'pure_excel' | 'detailed'>('pure_excel');
  const [searchPatient, setSearchPatient] = useState('');

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const monthName = months[selectedMonth - 1];
  const periodeLabel = `${monthName} ${selectedYear}`;
  const headerNamaPasien = `NAMA PASIEN - ${periodeLabel.toUpperCase()}`;

  const allVisits = store.getCalculatedKunjungan(false);

  // Normalize disease name for matching between input and 88 columns
  const normalizeDisease = (name: string): string => {
    const clean = name.trim().toLowerCase();
    if (clean === 'hipertensi' || clean === 'hpertensi') return 'HPERTENSI';
    const found = EXACT_88_DISEASES.find((d) => d.penyakit.trim().toLowerCase() === clean);
    return found ? found.penyakit : name.trim();
  };

  // Visits in this selected month
  const monthVisits = useMemo(() => {
    return allVisits.filter((k) => {
      const d = parseDate(k.tanggal);
      if (!d) return false;
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allVisits, selectedMonth, selectedYear]);

  // Build matrix per unique patient (1 row = 1 unique patient)
  const patientMatrix = useMemo(() => {
    const map = new Map<
      string,
      {
        nama: string;
        wbp_id: string;
        blok: string;
        kamar: string;
        jumlahKunjungan: number;
        counts: Record<string, number>; // Kasus per 88 diseases
        totalMenular: number;
        totalTidakMenular: number;
        totalSemuaKasus: number;
      }
    >();

    monthVisits.forEach((v) => {
      const key = v.wbp_id || v.nama.trim().toLowerCase();
      if (!map.has(key)) {
        const roomVal = (v.kamar || v.wbp?.kamar || '').trim();
        const blokVal = determineBlokByKamar(roomVal) || (v.wbp?.blok || '');
        map.set(key, {
          nama: v.nama,
          wbp_id: v.wbp_id,
          blok: blokVal || '-',
          kamar: roomVal || '-',
          jumlahKunjungan: 0,
          counts: {},
          totalMenular: 0,
          totalTidakMenular: 0,
          totalSemuaKasus: 0,
        });
      }

      const pEntry = map.get(key)!;
      pEntry.jumlahKunjungan++;

      // De-duplicate diseases in this single visit so 1 visit = max 1 kasus per disease
      const uniqueDiseasesInVisit = new Map<string, 'Menular' | 'Tidak Menular'>();

      [
        { name: v.penyakit1, jenis: v.jenis1 },
        { name: v.penyakit2, jenis: v.jenis2 },
        { name: v.penyakit3, jenis: v.jenis3 },
      ].forEach((p) => {
        const rawName = p.name ? p.name.trim() : '';
        if (rawName && rawName !== 'CEK REFERENSI') {
          const matchedName = normalizeDisease(rawName);
          const meta = EXACT_88_DISEASES.find((d) => d.penyakit === matchedName);
          const jenis = meta ? meta.jenis : ((p.jenis || 'Tidak Menular') as 'Menular' | 'Tidak Menular');
          uniqueDiseasesInVisit.set(matchedName, jenis);
        }
      });

      uniqueDiseasesInVisit.forEach((jenis, diseaseName) => {
        pEntry.counts[diseaseName] = (pEntry.counts[diseaseName] || 0) + 1;
        pEntry.totalSemuaKasus++;
        if (jenis === 'Menular') {
          pEntry.totalMenular++;
        } else {
          pEntry.totalTidakMenular++;
        }
      });
    });

    let result = Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));

    if (searchPatient.trim()) {
      const q = searchPatient.trim().toLowerCase();
      result = result.filter((p) => p.nama.toLowerCase().includes(q) || p.kamar.toLowerCase().includes(q));
    }

    return result;
  }, [monthVisits, searchPatient]);

  // Bottom Totals per Disease (Total Kasus & Pasien Unik)
  const { totalsKasusPerPenyakit, pasienUnikPerPenyakit } = useMemo(() => {
    const kasusTotals: Record<string, number> = {};
    const pasienUnikTotals: Record<string, number> = {};

    EXACT_88_DISEASES.forEach((d) => {
      kasusTotals[d.penyakit] = 0;
      pasienUnikTotals[d.penyakit] = 0;
    });

    patientMatrix.forEach((p) => {
      Object.entries(p.counts).forEach(([disease, count]) => {
        if (kasusTotals[disease] !== undefined) {
          kasusTotals[disease] += count;
          if (count > 0) {
            pasienUnikTotals[disease] += 1;
          }
        }
      });
    });

    return {
      totalsKasusPerPenyakit: kasusTotals,
      pasienUnikPerPenyakit: pasienUnikTotals,
    };
  }, [patientMatrix]);

  const totalKunjunganSemua = patientMatrix.reduce((acc, p) => acc + p.jumlahKunjungan, 0);
  const totalKasusMenular = patientMatrix.reduce((acc, p) => acc + p.totalMenular, 0);
  const totalKasusTidakMenular = patientMatrix.reduce((acc, p) => acc + p.totalTidakMenular, 0);
  const grandTotalSemuaKasus = patientMatrix.reduce((acc, p) => acc + p.totalSemuaKasus, 0);

  // GENERATE EXACT TSV FOR 1-CLICK COPY-PASTE INTO GOOGLE SHEETS
  const copyTableToGoogleSheets = async (includeCategories: boolean) => {
    try {
      const lines: string[] = [];

      // Row 1: Category Row (if requested)
      if (includeCategories) {
        const catRow: string[] = ['', '']; // Col A (NO) & Col B (NAMA PASIEN) are blank in category row
        EXACT_88_EXCEL_CATEGORIES.forEach((cat) => {
          cat.penyakit.forEach((_, pIdx) => {
            if (pIdx === 0) {
              catRow.push(cat.kategori);
            } else {
              catRow.push('');
            }
          });
        });
        catRow.push('TOTAL');
        lines.push(catRow.join('\t'));
      }

      // Row 2: Header Row (NO \t NAMA PASIEN - BULAN TAHUN \t 88 diseases \t TOTAL)
      const headerRow: string[] = ['NO', headerNamaPasien];
      EXACT_88_DISEASES.forEach((d) => {
        headerRow.push(d.penyakit);
      });
      headerRow.push('TOTAL');
      lines.push(headerRow.join('\t'));

      // Data Rows: 1 Row per Patient
      patientMatrix.forEach((p, idx) => {
        const row: (string | number)[] = [idx + 1, p.nama];
        EXACT_88_DISEASES.forEach((d) => {
          const val = p.counts[d.penyakit] || 0;
          row.push(val);
        });
        row.push(p.totalSemuaKasus);
        lines.push(row.join('\t'));
      });

      // Bottom Row: TOTAL KASUS
      const totalRow: (string | number)[] = ['', 'TOTAL KASUS'];
      EXACT_88_DISEASES.forEach((d) => {
        totalRow.push(totalsKasusPerPenyakit[d.penyakit] || 0);
      });
      totalRow.push(grandTotalSemuaKasus);
      lines.push(totalRow.join('\t'));

      // Second Bottom Row: PASIEN UNIK
      const unikRow: (string | number)[] = ['', 'PASIEN UNIK'];
      EXACT_88_DISEASES.forEach((d) => {
        unikRow.push(pasienUnikPerPenyakit[d.penyakit] || 0);
      });
      unikRow.push(patientMatrix.length);
      lines.push(unikRow.join('\t'));

      const tsvContent = lines.join('\r\n');

      await navigator.clipboard.writeText(tsvContent);
      setCopySuccess(includeCategories ? 'Lengkap (dengan Kategori)' : 'Standar (Header & Data)');
      setTimeout(() => setCopySuccess(null), 4000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      // Fallback
      alert('Gagal menyalin otomatis. Harap gunakan tombol Ekspor Excel (.xlsx).');
    }
  };

  const handleExportExcel = () => {
    exportRekapBulananToExcel(
      periodeLabel,
      patientMatrix.map((p) => ({
        nama: p.nama,
        kamar: p.kamar,
        blok: p.blok,
        jumlahKunjungan: p.jumlahKunjungan,
        counts: p.counts,
        totalMenular: p.totalMenular,
        totalTidakMenular: p.totalTidakMenular,
        totalSemua: p.totalSemuaKasus,
      })),
      EXACT_88_DISEASES.map((d, i) => ({
        id: `p_${i}`,
        penyakit: d.penyakit,
        kategori: d.kategori,
        jenis: d.jenis,
        urutan: i + 1,
      })),
      totalsKasusPerPenyakit,
      totalKasusMenular,
      totalKasusTidakMenular,
      grandTotalSemuaKasus
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Copy / Export Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Rekapitulasi Penyakit Rawat Jalan (Sheet REKAP_BULANAN)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tepat 14 Kategori & 88 Kolom Penyakit. Format 100% presisi untuk langsung disalin ke Google Sheets laporan Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month / Year navigator */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  if (selectedMonth === 1) {
                    setSelectedMonth(12);
                    setSelectedYear((y) => y - 1);
                  } else {
                    setSelectedMonth((m) => m - 1);
                  }
                }}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {periodeLabel}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedMonth === 12) {
                    setSelectedMonth(1);
                    setSelectedYear((y) => y + 1);
                  } else {
                    setSelectedMonth((m) => m + 1);
                  }
                }}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setDisplayMode('pure_excel')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  displayMode === 'pure_excel'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Kolom A & B murni sesuai Excel untuk copy-paste langsung"
              >
                Format Persis Excel
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('detailed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  displayMode === 'detailed'
                    ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Tampilkan juga kolom Kamar & Jumlah Kunjungan Pasien"
              >
                + Kamar & Kunjungan
              </button>
            </div>

            {/* 1-CLICK COPY BUTTON FOR GOOGLE SHEETS */}
            <button
              type="button"
              onClick={() => copyTableToGoogleSheets(true)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              title="Salin seluruh tabel beserta header kategori untuk di-paste di Google Sheets"
            >
              {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copySuccess ? 'Tersalin ke Clipboard!' : 'Salin untuk Google Sheet'}</span>
            </button>

            {/* Export to Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .xlsx</span>
            </button>
          </div>
        </div>

        {/* Copy instructions toast / banner */}
        {copySuccess && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>Tabel berhasil disalin ({copySuccess})!</strong> Buka dokumen Google Sheets Anda, klik sel{' '}
                <strong>A1</strong> (atau sel awal), lalu tekan <strong>Ctrl + V</strong> (atau Cmd + V di Mac).
                Seluruh 88 kolom dan baris pasien akan tertata otomatis.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCopySuccess(null)}
              className="text-xs text-emerald-700 hover:underline font-semibold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Definitions & Google Sheets guide */}
        <div className="mt-3 p-2.5 rounded-lg bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 text-[11px] text-teal-900 dark:text-teal-200 flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-1 font-semibold">
            <Info className="w-3.5 h-3.5 text-teal-700" />
            <span>Petunjuk Copy Paste:</span>
          </div>
          <span>• Kolom A: <strong>NO</strong></span>
          <span>• Kolom B: <strong>{headerNamaPasien}</strong></span>
          <span>• Kolom C s/d CI: <strong>88 Penyakit dalam 14 Kategori</strong></span>
          <span>• Kolom CJ: <strong>TOTAL</strong></span>
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
            ✓ Formula COUNTIFS Excel dihitung otomatis real-time
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-teal-700 dark:text-teal-400 block">
            Pasien Unik ({monthName})
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {patientMatrix.length} Orang
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Jumlah baris pasien unik</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 block">
            Total Kunjungan
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {totalKunjunganSemua} Kedatangan
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Total baris input harian</span>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-400 block flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Kasus Menular</span>
          </span>
          <span className="text-xl font-bold font-mono text-rose-800 dark:text-rose-300 mt-1 block">
            {totalKasusMenular} Kasus
          </span>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400 mt-0.5 block">Dari seluruh diagnosa</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-500 block">
            Grand Total Kasus Penyakit
          </span>
          <span className="text-xl font-bold font-mono text-teal-800 dark:text-teal-300 mt-1 block">
            {grandTotalSemuaKasus} Kasus
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Jumlah seluruh sel terisi</span>
        </div>
      </div>

      {/* MATRIX SPREADSHEET TABLE WITH FROZEN HEADERS & COLUMNS */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-tight">
              {headerNamaPasien}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 font-semibold font-mono">
              {patientMatrix.length} Baris Pasien Unik · 88 Kolom Penyakit
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari nama pasien di tabel..."
              value={searchPatient}
              onChange={(e) => setSearchPatient(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 w-56 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={() => copyTableToGoogleSheets(false)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center gap-1"
              title="Salin data tanpa baris kategori"
            >
              <Copy className="w-3 h-3" />
              <span>Salin Tanpa Kategori</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse select-all">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0 z-20 shadow-xs">
              {/* Row 1: CATEGORY SUPER-HEADER */}
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px]">
                <th
                  colSpan={displayMode === 'detailed' ? 4 : 2}
                  className="py-1 px-3 bg-slate-200 dark:bg-slate-700/80 sticky left-0 z-30 border-r border-slate-300 dark:border-slate-600 text-center uppercase tracking-tight font-bold"
                >
                  IDENTITAS PASIEN
                </th>

                {EXACT_88_EXCEL_CATEGORIES.map((cat) => (
                  <th
                    key={cat.kategori}
                    colSpan={cat.penyakit.length}
                    className="py-1 px-2 border-r border-slate-300 dark:border-slate-700 text-center bg-slate-150 uppercase tracking-tight text-teal-800 dark:text-teal-300 font-bold whitespace-nowrap"
                  >
                    {cat.kategori} ({cat.penyakit.length})
                  </th>
                ))}

                <th className="py-1 px-2 bg-slate-200 dark:bg-slate-700 text-center uppercase tracking-tight font-bold w-20">
                  TOTAL
                </th>
              </tr>

              {/* Row 2: EXACT DISEASE COLUMN HEADERS */}
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px]">
                {/* Column 1: NO */}
                <th className="py-2 px-2 w-10 text-center sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                  NO
                </th>

                {/* Column 2: NAMA PASIEN - BULAN TAHUN */}
                <th className="py-2 px-3 whitespace-nowrap min-w-[200px] sticky left-10 z-30 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                  {headerNamaPasien}
                </th>

                {/* Optional Detailed Columns */}
                {displayMode === 'detailed' && (
                  <>
                    <th className="py-2 px-2 whitespace-nowrap w-16 sticky left-[240px] z-30 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-center">
                      Kamar
                    </th>
                    <th className="py-2 px-2 whitespace-nowrap w-20 sticky left-[304px] z-30 bg-teal-50 dark:bg-teal-950 text-teal-900 dark:text-teal-200 border-r border-slate-300 dark:border-slate-600 text-center font-bold">
                      Datang
                    </th>
                  </>
                )}

                {/* The 88 Disease Columns in exact Excel order */}
                {EXACT_88_DISEASES.map((d, dIdx) => (
                  <th
                    key={`${d.penyakit}_${dIdx}`}
                    className={`py-2 px-2 text-center whitespace-nowrap border-r border-slate-200 dark:border-slate-700 min-w-[80px] ${
                      d.jenis === 'Menular'
                        ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                        : ''
                    }`}
                    title={`${d.penyakit} (${d.kategori} - ${d.jenis})`}
                  >
                    <div className="font-semibold">{d.penyakit}</div>
                    <div className="text-[9px] font-normal text-slate-400">
                      {d.jenis === 'Menular' ? '⚡ Menular' : 'Tdk Menular'}
                    </div>
                  </th>
                ))}

                {/* Column CJ: TOTAL */}
                <th className="py-2 px-2 text-center whitespace-nowrap bg-teal-100/80 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold w-20">
                  TOTAL
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {patientMatrix.length > 0 ? (
                patientMatrix.map((p, idx) => (
                  <tr
                    key={p.wbp_id || p.nama}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Column 1: NO */}
                    <td className="py-1.5 px-2 text-center text-slate-400 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                      {idx + 1}
                    </td>

                    {/* Column 2: Nama Pasien */}
                    <td className="py-1.5 px-3 whitespace-nowrap font-sans font-semibold text-slate-900 dark:text-white sticky left-10 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                      {p.nama}
                    </td>

                    {/* Optional Detailed Columns */}
                    {displayMode === 'detailed' && (
                      <>
                        <td className="py-1.5 px-2 whitespace-nowrap text-center text-slate-500 sticky left-[240px] z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                          {p.kamar}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap text-center font-bold text-teal-800 dark:text-teal-300 sticky left-[304px] z-10 bg-teal-50/50 dark:bg-teal-950/40 border-r border-slate-300 dark:border-slate-700">
                          {p.jumlahKunjungan}x
                        </td>
                      </>
                    )}

                    {/* 88 Disease Values for this Patient */}
                    {EXACT_88_DISEASES.map((d, dIdx) => {
                      const count = p.counts[d.penyakit] || 0;
                      return (
                        <td
                          key={`${d.penyakit}_${dIdx}`}
                          className={`py-1.5 px-2 text-center border-r border-slate-100 dark:border-slate-800 ${
                            count > 0
                              ? d.jenis === 'Menular'
                                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold'
                                : 'bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 font-bold'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        >
                          {count > 0 ? count : 0}
                        </td>
                      );
                    })}

                    {/* Total Kasus Pasien */}
                    <td className="py-1.5 px-2 text-center font-bold text-teal-800 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-950/20">
                      {p.totalSemuaKasus}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={EXACT_88_DISEASES.length + (displayMode === 'detailed' ? 5 : 3)}
                    className="py-12 text-center text-slate-400 italic"
                  >
                    Belum ada data kunjungan pada periode {periodeLabel}.
                  </td>
                </tr>
              )}
            </tbody>

            {/* TWO BOTTOM SUMMARY ROWS PERSIS EXCEL */}
            {patientMatrix.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white font-bold sticky bottom-0 z-20 border-t-2 border-slate-300 dark:border-slate-600 font-mono">
                {/* Row 1: TOTAL KASUS */}
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <td className="py-2 px-2 sticky left-0 z-30 bg-slate-200 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600"></td>
                  <td
                    className="py-2 px-3 sticky left-10 z-30 bg-slate-200 dark:bg-slate-700 uppercase tracking-wider text-[11px] border-r border-slate-300 dark:border-slate-600 font-bold"
                  >
                    TOTAL KASUS
                  </td>

                  {displayMode === 'detailed' && (
                    <>
                      <td className="py-2 px-2 sticky left-[240px] z-30 bg-slate-200 dark:bg-slate-700 border-r border-slate-300"></td>
                      <td className="py-2 px-2 sticky left-[304px] z-30 bg-teal-100 dark:bg-teal-900 text-center text-xs border-r border-slate-300">
                        {totalKunjunganSemua}x
                      </td>
                    </>
                  )}

                  {EXACT_88_DISEASES.map((d, dIdx) => {
                    const totalKasus = totalsKasusPerPenyakit[d.penyakit] || 0;
                    return (
                      <td
                        key={`total_${d.penyakit}_${dIdx}`}
                        className={`py-2 px-2 text-center text-xs border-r border-slate-200 dark:border-slate-700 ${
                          totalKasus > 0
                            ? d.jenis === 'Menular'
                              ? 'text-rose-700 dark:text-rose-300 font-extrabold bg-rose-50/60 dark:bg-rose-950/40'
                              : 'text-teal-800 dark:text-teal-300 font-extrabold'
                            : 'text-slate-400'
                        }`}
                      >
                        {totalKasus}
                      </td>
                    );
                  })}

                  <td className="py-2 px-2 text-center font-extrabold text-teal-800 dark:text-teal-200 bg-teal-100/80 dark:bg-teal-950/60 text-xs">
                    {grandTotalSemuaKasus}
                  </td>
                </tr>

                {/* Row 2: PASIEN UNIK PER PENYAKIT */}
                <tr className="bg-slate-150 dark:bg-slate-750 text-teal-800 dark:text-teal-300">
                  <td className="py-1.5 px-2 sticky left-0 z-30 bg-slate-250 dark:bg-slate-750 border-r border-slate-300 dark:border-slate-600"></td>
                  <td
                    className="py-1.5 px-3 sticky left-10 z-30 bg-slate-250 dark:bg-slate-750 uppercase tracking-wider text-[11px] border-r border-slate-300 dark:border-slate-600 font-bold"
                  >
                    PASIEN UNIK
                  </td>

                  {displayMode === 'detailed' && (
                    <>
                      <td className="py-1.5 px-2 sticky left-[240px] z-30 bg-slate-250 dark:bg-slate-750 border-r border-slate-300"></td>
                      <td className="py-1.5 px-2 sticky left-[304px] z-30 bg-teal-200 dark:bg-teal-800 text-center text-xs border-r border-slate-300 font-bold">
                        {patientMatrix.length} org
                      </td>
                    </>
                  )}

                  {EXACT_88_DISEASES.map((d, dIdx) => {
                    const pasienCount = pasienUnikPerPenyakit[d.penyakit] || 0;
                    return (
                      <td
                        key={`unik_${d.penyakit}_${dIdx}`}
                        className="py-1.5 px-2 text-center text-[11px] font-semibold border-r border-slate-200 dark:border-slate-700"
                      >
                        {pasienCount > 0 ? pasienCount : 0}
                      </td>
                    );
                  })}

                  <td className="py-1.5 px-2 text-center text-xs font-bold text-teal-900 dark:text-teal-200">
                    {patientMatrix.length} org
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
