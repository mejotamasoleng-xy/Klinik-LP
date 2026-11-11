/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Users,
  CheckCircle,
  AlertTriangle,
  Download,
  Printer,
  Edit2,
  Save,
  Search,
  Filter,
} from 'lucide-react';
import { WbpItem } from '../types';
import { store } from '../lib/storage';
import { exportDaftarPanggilBpjsToExcel } from '../lib/excelExport';

export default function BpjsDashboard() {
  const [wbpList, setWbpList] = useState<WbpItem[]>(() => store.getWbpList());
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'panggil' | 'semua'>('ringkasan');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKendala, setEditKendala] = useState('');
  const [editDasarPbi, setEditDasarPbi] = useState('');
  const [editBatch, setEditBatch] = useState('');

  const reloadData = () => {
    setWbpList(store.getWbpList());
  };

  const batches = store.getPengaturan().batches;

  // Breakdown metrics
  const totalWbp = wbpList.length;

  const countByBatch = useMemo(() => {
    const counts: Record<string, number> = {};
    batches.forEach((b) => {
      counts[b.nama] = 0;
    });
    counts['Belum masuk batch'] = 0;
    counts['Tidak masuk batch'] = 0;

    wbpList.forEach((w) => {
      counts[w.batch_bpjs] = (counts[w.batch_bpjs] || 0) + 1;
    });
    return counts;
  }, [wbpList, batches]);

  // Registered batches: Juli, Agustus, September, Oktober, November, etc. (excluding Belum & Tidak)
  const registeredCount = useMemo(() => {
    return wbpList.filter(
      (w) => w.batch_bpjs !== 'Belum masuk batch' && w.batch_bpjs !== 'Tidak masuk batch'
    ).length;
  }, [wbpList]);

  const pendingCount = countByBatch['Belum masuk batch'] || 0;
  const excludedCount = countByBatch['Tidak masuk batch'] || 0;
  const percentageRegistered = totalWbp > 0 ? ((registeredCount / totalWbp) * 100).toFixed(1) : '0';

  // WBP Belum Masuk Batch (Daftar Panggil)
  const daftarPanggil = useMemo(() => {
    return wbpList.filter((w) => w.batch_bpjs === 'Belum masuk batch');
  }, [wbpList]);

  // Kendala terbanyak breakdown
  const kendalaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    wbpList.forEach((w) => {
      if (w.kendala_bpjs && w.kendala_bpjs.trim()) {
        const k = w.kendala_bpjs.trim();
        counts[k] = (counts[k] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [wbpList]);

  const handleStartInlineEdit = (w: WbpItem) => {
    setEditingId(w.id);
    setEditKendala(w.kendala_bpjs || '');
    setEditDasarPbi(w.dasar_pbi || '');
    setEditBatch(w.batch_bpjs);
  };

  const handleSaveInlineEdit = (wbpId: string) => {
    store.updateWbp(wbpId, {
      kendala_bpjs: editKendala.trim(),
      dasar_pbi: editDasarPbi.trim(),
      batch_bpjs: editBatch,
    });
    setEditingId(null);
    reloadData();
  };

  const handlePrintDaftarPanggil = () => {
    setActiveTab('panggil');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleExportDaftarPanggil = () => {
    exportDaftarPanggilBpjsToExcel(wbpList);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Dashboard Pengalihan Faskes BPJS Kesehatan WBP
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring pengalihan faskes ke Klinik Lapas Dompu & inventarisasi daftar panggil
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDaftarPanggil}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-teal-600" />
              <span>Cetak Daftar Panggil</span>
            </button>
            <button
              type="button"
              onClick={handleExportDaftarPanggil}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Excel Daftar Panggil</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ringkasan')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'ringkasan'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Ringkasan & Analisis Batch
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('panggil')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'panggil'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Daftar Panggil WBP</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold">
              {pendingCount}
            </span>
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">Total WBP Aktif</span>
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {totalWbp} Orang
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">100% populasi lapas</span>
        </div>

        <div className="p-4 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-teal-700 dark:text-teal-400 block">
            Sudah Masuk Batch BPJS
          </span>
          <span className="text-2xl font-bold font-mono text-teal-800 dark:text-teal-300 mt-1 block">
            {registeredCount} Orang
          </span>
          <span className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5 block font-semibold">
            {percentageRegistered}% telah teralihkan
          </span>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-amber-700 dark:text-amber-400 block">
            Belum Masuk Batch
          </span>
          <span className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-300 mt-1 block">
            {pendingCount} Orang
          </span>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 block font-medium">
            Perlu dipanggil & didaftarkan
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">Tidak Masuk Batch</span>
          <span className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-300 mt-1 block">
            {excludedCount} Orang
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">NIK ganda / bukan 16 digit</span>
        </div>
      </div>

      {/* TAB CONTENT: RINGKASAN */}
      {activeTab === 'ringkasan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Batch Breakdown Cards */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Rincian Jumlah WBP Berdasarkan Batch Pengalihan
              </h3>

              <div className="space-y-2">
                {batches.map((b) => {
                  const count = countByBatch[b.nama] || 0;
                  const pct = totalWbp > 0 ? ((count / totalWbp) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={b.nama}
                      className="p-3 rounded-lg border flex items-center justify-between text-xs"
                      style={{
                        backgroundColor: `${b.warna}22`,
                        borderColor: `${b.warna}88`,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded border shrink-0"
                          style={{ backgroundColor: b.warna, borderColor: '#64748B' }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">Batch {b.nama}</div>
                          <div className="text-[11px] text-slate-500">{b.keterangan || 'Pengalihan Faskes'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {count} WBP
                        </div>
                        <div className="text-[11px] text-slate-400">{pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Kendala Terbanyak */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Inventarisasi Kendala Pendaftaran BPJS</span>
              </h3>

              {kendalaCounts.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {kendalaCounts.map(([kendala, count]) => (
                    <div
                      key={kendala}
                      className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-amber-900 dark:text-amber-200 pr-2">
                        {kendala}
                      </span>
                      <span className="font-bold font-mono px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 shrink-0">
                        {count} WBP
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada kendala tercatat</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DAFTAR PANGGIL */}
      {activeTab === 'panggil' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daftar Panggil WBP Belum Masuk Batch BPJS ({daftarPanggil.length} Orang)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gunakan daftar ini untuk pemanggilan WBP ke ruang registrasi / pemeriksaan NIK
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Nama Warga Binaan</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">NIK</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Kamar / Blok</th>
                  <th className="py-2.5 px-3">Alamat Asal</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Kendala / Dasar PBI</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {daftarPanggil.length > 0 ? (
                  daftarPanggil.map((w, idx) => {
                    const isEditing = editingId === w.id;
                    return (
                      <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">{w.nama}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{w.no_reg_instansi}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {w.nik || '-'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-teal-800 dark:text-teal-300">
                            {w.blok} · Kamar {w.kamar}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {w.alamat || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={editKendala}
                                onChange={(e) => setEditKendala(e.target.value)}
                                placeholder="Kendala BPJS..."
                                className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                value={editDasarPbi}
                                onChange={(e) => setEditDasarPbi(e.target.value)}
                                placeholder="Dasar PBI..."
                                className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800"
                              />
                              <select
                                value={editBatch}
                                onChange={(e) => setEditBatch(e.target.value)}
                                className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800"
                              >
                                {batches.map((b) => (
                                  <option key={b.nama} value={b.nama}>
                                    Pindahkan ke: {b.nama}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              {w.kendala_bpjs ? (
                                <span className="text-amber-800 dark:text-amber-300 text-[11px] block">
                                  {w.kendala_bpjs}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Belum ada kendala</span>
                              )}
                              {w.dasar_pbi && (
                                <span className="text-teal-700 dark:text-teal-400 text-[11px] block">
                                  PBI: {w.dasar_pbi}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(w.id)}
                              className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-semibold flex items-center gap-1 ml-auto"
                            >
                              <Save className="w-3 h-3" />
                              <span>Simpan</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartInlineEdit(w)}
                              className="px-2 py-1 text-slate-600 hover:text-teal-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs flex items-center gap-1 ml-auto"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Catat / Pindahkan</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Seluruh WBP telah terdaftar dalam Batch Pengalihan Faskes BPJS.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
