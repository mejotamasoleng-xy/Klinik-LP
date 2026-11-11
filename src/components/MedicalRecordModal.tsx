/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, ShieldCheck, Calendar, Clock, Stethoscope, AlertCircle } from 'lucide-react';
import { WbpItem } from '../types';
import { calculateSisaBulan, calculateUsia, getRelativeTime, store } from '../lib/storage';

interface MedicalRecordModalProps {
  wbp: WbpItem | null;
  onClose: () => void;
}

export default function MedicalRecordModal({ wbp, onClose }: MedicalRecordModalProps) {
  if (!wbp) return null;

  const dossier = store.getPatientMedicalRecord(wbp.id);
  const usia = calculateUsia(wbp.tanggal_lahir);
  const sisaBulan = wbp.tgl_ekspirasi ? calculateSisaBulan(wbp.tgl_ekspirasi) : null;
  const pengaturan = store.getPengaturan();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Non-printable actions */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Rekam Medis Rawat Jalan Warga Binaan
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekam Medis</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dossier Content - Printable */}
        <div className="p-6 overflow-y-auto space-y-6 print:p-0 print:space-y-4">
          {/* Printable Letterhead (KOP) */}
          <div className="text-center border-b-2 border-slate-900 pb-3">
            <img
              src="/logo.png"
              alt="Logo Klinik Pratama Lapas Dompu"
              className="h-14 w-auto mx-auto object-contain mb-2"
            />
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-600">
              Kementerian Imigrasi dan Pemasyarakatan Republik Indonesia
            </div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-600">
              Kantor Wilayah Nusa Tenggara Barat
            </div>
            <h1 className="text-base font-bold text-slate-900 uppercase tracking-tight mt-0.5">
              LEMBAGA PEMASYARAKATAN KELAS IIB DOMPU
            </h1>
            <p className="text-[11px] text-slate-500">
              Klinik Pratama Lapas Dompu · Jl. Letkol M. Suharmadji No. 1, Dompu, NTB
            </p>
          </div>

          {/* Section Title */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                KARTU REKAM MEDIS PASIEN RAWAT JALAN
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {wbp.nama}
              </h2>
            </div>
            <span
              className="px-2.5 py-1 text-xs font-semibold rounded border"
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
              BPJS: {wbp.batch_bpjs}
            </span>
          </div>

          {/* Patient Demographic Information */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nomor Induk Kependudukan (NIK)</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{wbp.nik || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nomor Registrasi Instansi</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{wbp.no_reg_instansi || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tempat & Tanggal Lahir</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{wbp.tempat_lahir || '-'}, {wbp.tanggal_lahir || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Usia / Jenis Kelamin</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{usia} Tahun · {wbp.jenis_kelamin}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Penempatan Blok / Kamar</span>
              <span className="font-medium text-teal-700 dark:text-teal-400">{wbp.blok} / Kamar {wbp.kamar}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status / Kategori</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{wbp.kategori} · {wbp.jenis_kejahatan}</span>
            </div>
            {wbp.tgl_ekspirasi && (
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tanggal Ekspirasi (Bebas)</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {wbp.tgl_ekspirasi} {sisaBulan !== null ? `(${sisaBulan} bln lagi)` : ''}
                </span>
              </div>
            )}
            {wbp.alamat && (
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Alamat Asal</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{wbp.alamat}</span>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar: Kunjungan metrics */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Kunjungan</span>
              <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                {dossier.totalKunjungan} Kali
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20">
              <span className="text-[10px] text-teal-700 dark:text-teal-400 block uppercase font-semibold">Kunjungan Bulan Ini</span>
              <span className="text-base font-bold text-teal-800 dark:text-teal-300 font-mono mt-0.5 block">
                {dossier.kunjunganBulanIni} Kali
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20">
              <span className="text-[10px] text-purple-700 dark:text-purple-400 block uppercase font-semibold">Kunjungan 7 Hari Terakhir</span>
              <span className="text-base font-bold text-purple-800 dark:text-purple-300 font-mono mt-0.5 block">
                {dossier.kunjungan7HariTerakhir} Kali
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Kunjungan Sebelumnya</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 block">
                {dossier.previousVisitDaysAgo || 'Belum ada'}
              </span>
            </div>
          </div>

          {/* Contagious Summary */}
          {dossier.contagiousIllnessesThisMonth.length > 0 && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Kasus Menular Bulan Ini ({dossier.contagiousIllnessesThisMonth.length} jenis):</strong>{' '}
                {dossier.contagiousIllnessesThisMonth.join(', ')}.
              </span>
            </div>
          )}

          {/* Sakit Bulan Ini */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Daftar Keluhan & Diagnosa Bulan Ini (Berdasarkan Frekuensi)
            </h4>
            {dossier.sortedIllnesses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dossier.sortedIllnesses.map((item) => (
                  <div
                    key={item.penyakit}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.penyakit}</span>
                      {item.icd10 && (
                        <span className="ml-1.5 font-mono text-[10px] text-teal-700 dark:text-teal-400">
                          ({item.icd10})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          item.jenis === 'Menular'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.jenis}
                      </span>
                      <span className="font-bold font-mono text-teal-700 dark:text-teal-400">
                        {item.count}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Tidak ada kunjungan di bulan ini</p>
            )}
          </div>

          {/* 10 Kunjungan Terakhir Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Riwayat 10 Kunjungan Terakhir Pasien
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Kamar</th>
                    <th className="py-2 px-3">Keluhan & Diagnosa (ICD-10)</th>
                    <th className="py-2 px-3">Terapi / Obat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dossier.last10Visits.length > 0 ? (
                    dossier.last10Visits.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono whitespace-nowrap text-slate-800 dark:text-slate-200">
                          {v.tanggal}
                          <span className="block text-[10px] text-slate-400 font-sans">
                            {getRelativeTime(v.tanggal)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {v.kamar || '-'}
                        </td>
                        <td className="py-2 px-3">
                          <div className="space-y-0.5">
                            {[
                              { c: v.keluhan1, p: v.penyakit1, icd: v.icd10_1, j: v.jenis1 },
                              { c: v.keluhan2, p: v.penyakit2, icd: v.icd10_2, j: v.jenis2 },
                              { c: v.keluhan3, p: v.penyakit3, icd: v.icd10_3, j: v.jenis3 },
                            ]
                              .filter((x) => x.c)
                              .map((x, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{x.c}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-slate-600 dark:text-slate-400">{x.p}</span>
                                  {x.icd && (
                                    <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1 rounded">
                                      {x.icd}
                                    </span>
                                  )}
                                  {x.j === 'Menular' && (
                                    <span className="text-[9px] px-1 bg-rose-100 text-rose-700 font-bold rounded">
                                      Menular
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                          {v.terapi || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        Belum ada riwayat kunjungan tercatat
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Space for Print */}
          <div className="hidden print:grid grid-cols-2 pt-8 text-xs text-center">
            <div>
              <p>Mengetahui,</p>
              <p className="font-semibold">Kepala Lapas Kelas IIB Dompu</p>
              <div className="h-16" />
              <p className="font-bold underline">(........................................................)</p>
              <p className="text-[10px]">NIP. ..................................................</p>
            </div>
            <div>
              <p>Dompu, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-semibold">Dokter / Petugas Perawatan Lapas</p>
              <div className="h-16" />
              <p className="font-bold underline">({pengaturan.dokter_penanggung_jawab || '........................................................'})</p>
              <p className="text-[10px]">Petugas Medis Klinik Pratama</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
