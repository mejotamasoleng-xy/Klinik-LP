/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  AlertTriangle,
  Flame,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  Info,
  Home,
  UserCheck,
  Search,
  X,
  Building2,
  Thermometer,
  Layers,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  HeartPulse,
  Filter,
  FlameKindling,
  Grid3X3,
} from 'lucide-react';
import { parseDate, store, calculateUsia, determineBlokByKamar } from '../lib/storage';
import { WbpItem, CalculatedKunjungan } from '../types';

interface DashboardProps {
  onNavigateToTab: (tab: any) => void;
  onSelectWbp: (wbp: WbpItem) => void;
}

// Master Drill-Down Modal State
interface DrillDownState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  badgeLabel?: string;
  badgeColor?: string;
  visits: CalculatedKunjungan[];
  wbpList?: WbpItem[];
  isWbpMode?: boolean;
}

type FilterMode = 'bulan' | 'tahun' | 'custom';
type HeatmapMetric = 'kunjungan' | 'pasienUnik';

export default function Dashboard({ onNavigateToTab, onSelectWbp }: DashboardProps) {
  // Filter States: Bulan, Tahun, atau Rentang Tanggal Custom
  const [filterMode, setFilterMode] = useState<FilterMode>('bulan');
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // Oktober bawaan
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  
  // Custom Date Range (ISO format YYYY-MM-DD for date inputs)
  const [customStartDate, setCustomStartDate] = useState<string>('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-31');

  // Heatmap Metric State (Kunjungan vs Pasien Unik)
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('kunjungan');

  // Drill-down Modal State
  const [drillDown, setDrillDown] = useState<DrillDownState>({
    isOpen: false,
    title: '',
    subtitle: '',
    visits: [],
  });
  const [drillSearch, setDrillSearch] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const monthName = months[selectedMonth - 1];

  // Readable label for the current active filter
  const periodeLabel = useMemo(() => {
    if (filterMode === 'bulan') {
      return `${monthName} ${selectedYear}`;
    }
    if (filterMode === 'tahun') {
      return `Sepanjang Tahun ${selectedYear}`;
    }
    // Custom
    const startParts = customStartDate.split('-');
    const endParts = customEndDate.split('-');
    const formattedStart = startParts.length === 3 ? `${startParts[2]}/${startParts[1]}/${startParts[0]}` : customStartDate;
    const formattedEnd = endParts.length === 3 ? `${endParts[2]}/${endParts[1]}/${endParts[0]}` : customEndDate;
    return `${formattedStart} s/d ${formattedEnd}`;
  }, [filterMode, monthName, selectedYear, customStartDate, customEndDate]);

  const allVisits = store.getCalculatedKunjungan(false);
  const wbpList = store.getWbpList();
  const pengaturan = store.getPengaturan();
  const penyakitMaster = store.getPenyakit();

  // Active visits filtered based on current filter mode
  const activeVisits = useMemo(() => {
    return allVisits.filter((k) => {
      const d = parseDate(k.tanggal);
      if (!d) return false;

      if (filterMode === 'bulan') {
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
      }

      if (filterMode === 'tahun') {
        return d.getFullYear() === selectedYear;
      }

      if (filterMode === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }

      return true;
    });
  }, [allVisits, filterMode, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Previous comparison visits
  const prevComparisonVisits = useMemo(() => {
    if (filterMode === 'bulan') {
      const prevM = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevY = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
      return allVisits.filter((k) => {
        const d = parseDate(k.tanggal);
        return d && d.getMonth() + 1 === prevM && d.getFullYear() === prevY;
      });
    }
    if (filterMode === 'tahun') {
      return allVisits.filter((k) => {
        const d = parseDate(k.tanggal);
        return d && d.getFullYear() === selectedYear - 1;
      });
    }
    return [];
  }, [allVisits, filterMode, selectedMonth, selectedYear]);

  // Metrics calculation
  const currentMetrics = useMemo(() => store.calculateMetrics(activeVisits), [activeVisits]);
  const prevMetrics = useMemo(() => store.calculateMetrics(prevComparisonVisits), [prevComparisonVisits]);

  const totalKunjungan = currentMetrics.totalKunjungan;
  const pasienUnik = currentMetrics.pasienUnikCount;
  const kunjunganPerPasien = currentMetrics.kunjunganPerPasien.toFixed(2);
  const kunjunganDiff = totalKunjungan - prevMetrics.totalKunjungan;
  const pasienUnikDiff = pasienUnik - prevMetrics.pasienUnikCount;

  // Service days & daily average
  const serviceDays = new Set(activeVisits.map((v) => v.tanggal)).size;
  const avgVisitsPerDay = serviceDays > 0 ? (totalKunjungan / serviceDays).toFixed(1) : '0';

  // Compute total kasus and non-contagious cases
  const totalSemuaKasus = useMemo(() => {
    return Object.values(currentMetrics.casesByDisease).reduce((acc, count) => acc + count, 0);
  }, [currentMetrics]);

  const totalKasusTidakMenular = useMemo(() => {
    return Math.max(0, totalSemuaKasus - currentMetrics.totalKasusMenular);
  }, [totalSemuaKasus, currentMetrics.totalKasusMenular]);

  // Contagious & Non-contagious visit lists
  const contagiousVisits = useMemo(() => {
    return activeVisits.filter(
      (v) => v.jenis1 === 'Menular' || v.jenis2 === 'Menular' || v.jenis3 === 'Menular'
    );
  }, [activeVisits]);

  const nonContagiousVisits = useMemo(() => {
    return activeVisits.filter(
      (v) => v.jenis1 !== 'Menular' && v.jenis2 !== 'Menular' && v.jenis3 !== 'Menular'
    );
  }, [activeVisits]);

  // Contagious disease breakdown
  const contagiousDiseaseBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    activeVisits.forEach((v) => {
      if (v.jenis1 === 'Menular' && v.penyakit1) counts[v.penyakit1] = (counts[v.penyakit1] || 0) + 1;
      if (v.jenis2 === 'Menular' && v.penyakit2) counts[v.penyakit2] = (counts[v.penyakit2] || 0) + 1;
      if (v.jenis3 === 'Menular' && v.penyakit3) counts[v.penyakit3] = (counts[v.penyakit3] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [activeVisits]);

  // =========================================================================
  // HEATMAP KAMAR WBP (PER BLOK & PER KAMAR)
  // =========================================================================
  const roomHeatmapData = useMemo(() => {
    // 1. Identify all blocks and all rooms from WBP Master and Active Visits
    const blockRoomsMap: Record<
      string,
      Record<
        string,
        {
          blok: string;
          kamar: string;
          visits: CalculatedKunjungan[];
          uniqueWbpSet: Set<string>;
          wbpInmates: WbpItem[];
          hasContagious: boolean;
        }
      >
    > = {};

    // Standard known blocks order: Blok Atas, Blok Bawah, etc.
    const ensureBlock = (rawBlok: string) => {
      const b = (rawBlok || '').trim();
      if (!b) return '';
      if (!blockRoomsMap[b]) {
        blockRoomsMap[b] = {};
      }
      return b;
    };

    // Pre-populate with all valid rooms from WBP Master
    wbpList.forEach((w) => {
      const k = (w.kamar || w.kamar_sidb || '').trim();
      if (!k || k === '-' || k.toLowerCase() === 'kosong') return;
      const b = determineBlokByKamar(k) || w.blok;
      if (!b) return;
      ensureBlock(b);
      if (!blockRoomsMap[b][k]) {
        blockRoomsMap[b][k] = {
          blok: b,
          kamar: k,
          visits: [],
          uniqueWbpSet: new Set(),
          wbpInmates: [],
          hasContagious: false,
        };
      }
      blockRoomsMap[b][k].wbpInmates.push(w);
    });

    // Populate active visits
    activeVisits.forEach((v) => {
      const k = (v.kamar || v.wbp?.kamar || '').trim();
      if (!k || k === '-' || k.toLowerCase() === 'kosong') return;
      const b = determineBlokByKamar(k) || v.wbp?.blok;
      if (!b) return;
      ensureBlock(b);
      if (!blockRoomsMap[b][k]) {
        blockRoomsMap[b][k] = {
          blok: b,
          kamar: k,
          visits: [],
          uniqueWbpSet: new Set(),
          wbpInmates: [],
          hasContagious: false,
        };
      }
      blockRoomsMap[b][k].visits.push(v);
      if (v.wbp_id) {
        blockRoomsMap[b][k].uniqueWbpSet.add(v.wbp_id);
      }
      if (v.jenis1 === 'Menular' || v.jenis2 === 'Menular' || v.jenis3 === 'Menular') {
        blockRoomsMap[b][k].hasContagious = true;
      }
    });

    // Natural sort helper for room numbers (1, 2, ... 10, LANSIA, ISOLASI)
    const sortRooms = (a: string, b: string) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return a.localeCompare(b);
    };

    // Sort blocks: Blok Atas first, then Blok Bawah, then others
    const sortedBlockNames = Object.keys(blockRoomsMap).sort((a, b) => {
      if (/atas/i.test(a)) return -1;
      if (/atas/i.test(b)) return 1;
      if (/bawah/i.test(a)) return -1;
      if (/bawah/i.test(b)) return 1;
      return a.localeCompare(b);
    });

    return sortedBlockNames.map((bName) => {
      const roomsObj = blockRoomsMap[bName];
      const sortedRoomKeys = Object.keys(roomsObj).sort(sortRooms);

      const rooms = sortedRoomKeys.map((rKey) => {
        const item = roomsObj[rKey];
        const kCount = item.visits.length;
        const uCount = item.uniqueWbpSet.size;
        const totalPenghuni = item.wbpInmates.length;

        // Top complaints in this room
        const compCounts: Record<string, number> = {};
        item.visits.forEach((v) => {
          [v.keluhan1, v.keluhan2, v.keluhan3].forEach((c) => {
            if (c && c !== '-') compCounts[c] = (compCounts[c] || 0) + 1;
          });
        });
        const topComplaints = Object.entries(compCounts)
          .sort((x, y) => y[1] - x[1])
          .slice(0, 2)
          .map(([n, cnt]) => `${n} (${cnt})`)
          .join(', ');

        return {
          blok: bName,
          kamar: rKey,
          visits: item.visits,
          kunjunganCount: kCount,
          uniquePatients: uCount,
          totalPenghuni,
          hasContagious: item.hasContagious,
          topComplaints: topComplaints || 'Belum ada keluhan',
        };
      });

      const totalBlockKunjungan = rooms.reduce((acc, r) => acc + r.kunjunganCount, 0);
      const totalBlockUnik = new Set(rooms.flatMap((r) => Array.from(blockRoomsMap[bName][r.kamar].uniqueWbpSet))).size;
      const totalBlockPenghuni = rooms.reduce((acc, r) => acc + r.totalPenghuni, 0);

      return {
        blockName: bName,
        rooms,
        totalBlockKunjungan,
        totalBlockUnik,
        totalBlockPenghuni,
      };
    });
  }, [wbpList, activeVisits]);

  // CREATIVE VISUALIZATION: SPEKTRUM KATEGORI PENYAKIT SISTEM ORGAN
  const categorySpectrum = useMemo(() => {
    const catMap: Record<string, { kasus: number; visits: CalculatedKunjungan[]; patientSet: Set<string> }> = {};

    activeVisits.forEach((v) => {
      [v.penyakit1, v.penyakit2, v.penyakit3].forEach((p) => {
        if (p && p !== 'CEK REFERENSI') {
          const matched = penyakitMaster.find((m) => m.penyakit.toLowerCase() === p.toLowerCase());
          const cat = matched?.kategori || 'LAIN - LAIN';
          if (!catMap[cat]) {
            catMap[cat] = { kasus: 0, visits: [], patientSet: new Set() };
          }
          catMap[cat].kasus++;
          if (!catMap[cat].visits.some((existing) => existing.id === v.id)) {
            catMap[cat].visits.push(v);
          }
          if (v.wbp_id) catMap[cat].patientSet.add(v.wbp_id);
        }
      });
    });

    const categoryIcons: Record<string, string> = {
      'PENYAKIT SALURAN PERNAPASAN': '🫁',
      'PENYAKIT KULIT DAN JARINGAN BAWAH KULIT': '🩹',
      'PENYAKIT SISTEM OTOT, TULANG DAN JARINGAN IKAT': '🦴',
      'PENYAKIT SISTEM PENCERNAAN': '💊',
      'PENYAKIT SISTEM SARAF': '🧠',
      'PENYAKIT MATA DAN ADNEKSA': '👁️',
      'PENYAKIT SISTEM SIRKULASI': '❤️',
      'PENYAKIT TELINGA DAN MASTOID': '👂',
      'PENYAKIT INFEKSI DAN PARASIT TERTENTU': '🦠',
      'CEDERA, KERACUNAN DAN KONSEKUENSI LAIN': '🩹',
      'PENYAKIT RONGGA MULUT, KELENJAR LUDAH DAN RAHANG': '🦷',
      'PENYAKIT SISTEM KEMIH DAN KELAMIN': '💧',
      'GEJALA, TANDA DAN PENEMUAN KLINIS LAIN': '📋',
      'LAIN - LAIN': '🩺',
    };

    const categoryColors = [
      'border-teal-400 bg-teal-50/70 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200',
      'border-sky-400 bg-sky-50/70 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200',
      'border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200',
      'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200',
      'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200',
      'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200',
      'border-purple-400 bg-purple-50/70 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200',
      'border-slate-400 bg-slate-50/70 dark:bg-slate-950/30 text-slate-900 dark:text-slate-200',
    ];

    return Object.entries(catMap)
      .map(([catName, data], idx) => {
        const pct = totalSemuaKasus > 0 ? ((data.kasus / totalSemuaKasus) * 100).toFixed(1) : '0';
        return {
          catName,
          icon: categoryIcons[catName] || '🩺',
          kasus: data.kasus,
          uniquePatients: data.patientSet.size,
          visits: data.visits,
          percentage: pct,
          colorClass: categoryColors[idx % categoryColors.length],
        };
      })
      .sort((a, b) => b.kasus - a.kasus);
  }, [activeVisits, totalSemuaKasus, penyakitMaster]);

  // Trend Chart Data (Double Bar Chart: Total Kunjungan vs Pasien Unik)
  const chartTrendData = useMemo(() => {
    if (filterMode === 'bulan') {
      const stats = [];
      const days = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let day = 1; day <= days; day++) {
        const dayVisits = activeVisits.filter((v) => {
          const d = parseDate(v.tanggal);
          return d && d.getDate() === day;
        });
        const wbpSet = new Set(dayVisits.filter((v) => v.wbp_id).map((v) => v.wbp_id));
        stats.push({
          key: `day-${day}`,
          label: `${day}`,
          tooltipTitle: `Tanggal ${day} ${monthName} ${selectedYear}`,
          kunjungan: dayVisits.length,
          pasienUnik: wbpSet.size,
          visits: dayVisits,
        });
      }
      return stats;
    }

    if (filterMode === 'tahun') {
      const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return months.map((mName, idx) => {
        const mNum = idx + 1;
        const mVisits = allVisits.filter((k) => {
          const d = parseDate(k.tanggal);
          return d && d.getFullYear() === selectedYear && d.getMonth() + 1 === mNum;
        });
        const wbpSet = new Set(mVisits.filter((v) => v.wbp_id).map((v) => v.wbp_id));
        return {
          key: `month-${mNum}`,
          label: shortMonths[idx],
          tooltipTitle: `Bulan ${mName} ${selectedYear}`,
          kunjungan: mVisits.length,
          pasienUnik: wbpSet.size,
          visits: mVisits,
        };
      });
    }

    // Custom Mode: group by unique dates present in the range
    const dateMap = new Map<string, CalculatedKunjungan[]>();
    activeVisits.forEach((v) => {
      const t = v.tanggal || 'Tanpa Tanggal';
      if (!dateMap.has(t)) dateMap.set(t, []);
      dateMap.get(t)!.push(v);
    });

    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
      const da = parseDate(a)?.getTime() || 0;
      const db = parseDate(b)?.getTime() || 0;
      return da - db;
    });

    return sortedDates.map((dt) => {
      const vList = dateMap.get(dt) || [];
      const wbpSet = new Set(vList.filter((v) => v.wbp_id).map((v) => v.wbp_id));
      const parts = dt.split('/');
      const shortLabel = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : dt;
      return {
        key: `custom-${dt}`,
        label: shortLabel,
        tooltipTitle: `Tanggal ${dt}`,
        kunjungan: vList.length,
        pasienUnik: wbpSet.size,
        visits: vList,
      };
    });
  }, [filterMode, activeVisits, allVisits, selectedYear, selectedMonth, monthName, months]);

  const maxTrendValue = useMemo(() => {
    return Math.max(...chartTrendData.map((d) => Math.max(d.kunjungan, d.pasienUnik)), 5);
  }, [chartTrendData]);

  // Top 10 Morbidity List (Kasus & Pasien Unik)
  const topDiseases = useMemo(() => {
    const diseaseList = Object.entries(currentMetrics.casesByDisease).map(([name, kasusCount]) => {
      const matched = penyakitMaster.find((p) => p.penyakit.toLowerCase() === name.toLowerCase());
      const jenis = matched?.jenis || 'Tidak Menular';
      const patientSet = currentMetrics.patientsByDisease[name] || new Set();
      const pctKasus = totalKunjungan > 0 ? ((kasusCount / totalKunjungan) * 100).toFixed(1) : '0';

      const diseaseVisits = activeVisits.filter(
        (v) =>
          (v.penyakit1 && v.penyakit1.toLowerCase() === name.toLowerCase()) ||
          (v.penyakit2 && v.penyakit2.toLowerCase() === name.toLowerCase()) ||
          (v.penyakit3 && v.penyakit3.toLowerCase() === name.toLowerCase())
      );

      return {
        name,
        kategori: matched?.kategori || 'UMUM',
        kasus: kasusCount,
        pasienUnik: patientSet.size,
        jenis,
        percentage: pctKasus,
        visits: diseaseVisits,
      };
    });

    return diseaseList.sort((a, b) => b.kasus - a.kasus).slice(0, 10);
  }, [currentMetrics, totalKunjungan, activeVisits, penyakitMaster]);

  // Pasien Paling Sering Berobat
  const topFrequentPatients = useMemo(() => {
    const map = new Map<string, { wbp?: WbpItem; nama: string; kunjunganCount: number; kamar: string; blok: string; visits: CalculatedKunjungan[] }>();

    activeVisits.forEach((v) => {
      const key = v.wbp_id || v.nama.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          wbp: v.wbp,
          nama: v.nama,
          kunjunganCount: 0,
          kamar: v.kamar || v.wbp?.kamar || '-',
          blok: v.wbp?.blok || '-',
          visits: [],
        });
      }
      map.get(key)!.kunjunganCount++;
      map.get(key)!.visits.push(v);
    });

    return Array.from(map.values())
      .sort((a, b) => b.kunjunganCount - a.kunjunganCount)
      .slice(0, 5);
  }, [activeVisits]);

  // Annual Summary table (Januari - Desember)
  const monthlyAnnualSummary = useMemo(() => {
    return months.map((mName, idx) => {
      const mNum = idx + 1;
      const mVisits = allVisits.filter((k) => {
        const d = parseDate(k.tanggal);
        return d && d.getFullYear() === selectedYear && d.getMonth() + 1 === mNum;
      });

      const metrics = store.calculateMetrics(mVisits);
      return {
        monthName: mName,
        monthNum: mNum,
        kunjungan: metrics.totalKunjungan,
        pasienUnik: metrics.pasienUnikCount,
        rasio: metrics.kunjunganPerPasien.toFixed(2),
        visits: mVisits,
      };
    });
  }, [allVisits, selectedYear]);

  // Total Year Metrics
  const fullYearVisits = useMemo(() => {
    return allVisits.filter((k) => {
      const d = parseDate(k.tanggal);
      return d && d.getFullYear() === selectedYear;
    });
  }, [allVisits, selectedYear]);

  const fullYearMetrics = useMemo(() => store.calculateMetrics(fullYearVisits), [fullYearVisits]);

  // Handlers for Drill-Down Clicks
  const openDrillDownVisits = (title: string, subtitle: string, visits: CalculatedKunjungan[], badgeLabel?: string, badgeColor?: string) => {
    setDrillSearch('');
    setDrillDown({
      isOpen: true,
      title,
      subtitle,
      badgeLabel,
      badgeColor,
      visits,
      isWbpMode: false,
    });
  };

  const openDrillDownWbp = (title: string, subtitle: string, list: WbpItem[], badgeLabel?: string, badgeColor?: string) => {
    setDrillSearch('');
    setDrillDown({
      isOpen: true,
      title,
      subtitle,
      badgeLabel,
      badgeColor,
      visits: [],
      wbpList: list,
      isWbpMode: true,
    });
  };

  // Quick Preset Handlers for Custom Range
  const setQuickRange = (preset: '7hari' | '30hari' | 'bulanIni' | 'tahunIni') => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setFilterMode('custom');
    if (preset === '7hari') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setCustomStartDate(toIso(past));
      setCustomEndDate(toIso(today));
    } else if (preset === '30hari') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setCustomStartDate(toIso(past));
      setCustomEndDate(toIso(today));
    } else if (preset === 'bulanIni') {
      const start = new Date(selectedYear, selectedMonth - 1, 1);
      const end = new Date(selectedYear, selectedMonth, 0);
      setCustomStartDate(toIso(start));
      setCustomEndDate(toIso(end));
    } else if (preset === 'tahunIni') {
      const start = new Date(selectedYear, 0, 1);
      const end = new Date(selectedYear, 11, 31);
      setCustomStartDate(toIso(start));
      setCustomEndDate(toIso(end));
    }
  };

  // Filtered Drill-down rows
  const filteredVisits = useMemo(() => {
    if (!drillSearch.trim()) return drillDown.visits;
    const q = drillSearch.toLowerCase();
    return drillDown.visits.filter((v) => {
      return (
        v.nama.toLowerCase().includes(q) ||
        (v.wbp?.no_reg_instansi || '').toLowerCase().includes(q) ||
        (v.wbp?.blok || '').toLowerCase().includes(q) ||
        (v.kamar || '').toLowerCase().includes(q) ||
        (v.penyakit1 || '').toLowerCase().includes(q) ||
        (v.penyakit2 || '').toLowerCase().includes(q) ||
        (v.penyakit3 || '').toLowerCase().includes(q) ||
        (v.keluhan1 || '').toLowerCase().includes(q) ||
        (v.terapi || '').toLowerCase().includes(q)
      );
    });
  }, [drillDown.visits, drillSearch]);

  const filteredWbpList = useMemo(() => {
    if (!drillDown.wbpList) return [];
    if (!drillSearch.trim()) return drillDown.wbpList;
    const q = drillSearch.toLowerCase();
    return drillDown.wbpList.filter((w) => {
      return (
        w.nama.toLowerCase().includes(q) ||
        w.nik.toLowerCase().includes(q) ||
        w.no_reg_instansi.toLowerCase().includes(q) ||
        w.blok.toLowerCase().includes(q) ||
        w.kamar.toLowerCase().includes(q) ||
        (w.batch_bpjs || '').toLowerCase().includes(q)
      );
    });
  }, [drillDown.wbpList, drillSearch]);

  const handleCopyDrilldownText = () => {
    let text = `${drillDown.title}\n${drillDown.subtitle}\n`;
    text += `=================================================\n`;
    if (drillDown.isWbpMode && drillDown.wbpList) {
      filteredWbpList.forEach((w, idx) => {
        text += `${idx + 1}. ${w.nama} (Reg: ${w.no_reg_instansi || '-'}) | NIK: ${w.nik} | Blok: ${w.blok} Kamar ${w.kamar} | BPJS: ${w.batch_bpjs || '-'}\n`;
      });
    } else {
      filteredVisits.forEach((v, idx) => {
        text += `${idx + 1}. [${v.tanggal}] ${v.nama} (${v.wbp?.blok || '-'} Kamar ${v.kamar || '-'}) | Keluhan: ${v.keluhan1} | Diagnosa: ${v.penyakit1} | Terapi: ${v.terapi || '-'}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* COMPREHENSIVE FILTER BAR (BULAN / TAHUN / RENTANG TANGGAL CUSTOM)         */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ringkasan Layanan Kesehatan & Kunjungan Berobat
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pantauan harian kesehatan warga binaan · Periode aktif: <strong className="text-teal-700 dark:text-teal-400 font-semibold">{periodeLabel}</strong>
            </p>
          </div>

          {/* Segmented Mode Switcher: Bulan | Tahun Penuh | Rentang Custom */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start lg:self-auto border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setFilterMode('bulan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filterMode === 'bulan'
                  ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📅 Per Bulan
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('tahun')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filterMode === 'tahun'
                  ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🗓️ Tahun Penuh
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filterMode === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ⚡ Rentang Custom
            </button>
          </div>
        </div>

        {/* Dynamic Controls based on selected filter mode */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          {filterMode === 'bulan' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Pilih Periode:</span>
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
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-2 py-1 text-xs font-bold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx + 1} className="dark:bg-slate-900">
                      {m}
                    </option>
                  ))}
                </select>
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
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          )}

          {filterMode === 'tahun' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Pilih Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value={2024}>Tahun 2024</option>
                <option value={2025}>Tahun 2025</option>
                <option value={2026}>Tahun 2026</option>
                <option value={2027}>Tahun 2027</option>
              </select>
              <span className="text-xs text-slate-400 italic">
                (Menampilkan agregasi 12 bulan penuh Januari - Desember)
              </span>
            </div>
          )}

          {filterMode === 'custom' && (
            <div className="flex flex-wrap items-center gap-2.5 w-full">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Dari:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Sampai:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono focus:outline-none"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1 ml-auto">
                <span className="text-[11px] text-slate-400 mr-1">Preset Cepat:</span>
                <button
                  type="button"
                  onClick={() => setQuickRange('7hari')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 border border-slate-200 dark:border-slate-700"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('30hari')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 border border-slate-200 dark:border-slate-700"
                >
                  30 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('bulanIni')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 border border-slate-200 dark:border-slate-700"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('tahunIni')}
                  className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 border border-slate-200 dark:border-slate-700"
                >
                  Tahun Ini
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5 Primary KPI Cards (All Clickable to Drill Down) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Kunjungan */}
        <div
          onClick={() => openDrillDownVisits(`Semua Kunjungan (${periodeLabel})`, `Menampilkan seluruh ${totalKunjungan} catatan kunjungan rawat jalan`, activeVisits, 'Total Kunjungan', 'bg-teal-600 text-white')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-teal-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 group-hover:underline">
              Total Kunjungan
            </span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
            {totalKunjungan}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Kedatangan</span>
            <span className="text-[10px] text-teal-600 font-semibold group-hover:underline">Detail ↗</span>
          </div>
        </div>

        {/* Pasien Unik */}
        <div
          onClick={() => openDrillDownVisits(`Pasien Unik (${periodeLabel})`, `Menampilkan ${pasienUnik} warga binaan berbeda yang berobat`, activeVisits, 'Pasien Unik', 'bg-indigo-600 text-white')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 group-hover:underline">
              Pasien Unik
            </span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
            {pasienUnik}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Orang Berbeda</span>
            <span className="text-[10px] text-indigo-600 font-semibold group-hover:underline">Detail ↗</span>
          </div>
        </div>

        {/* Rasio Kunjungan / Pasien */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Kunjungan/Pasien
            </span>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
            {kunjunganPerPasien}x
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Intensitas rawat jalan
          </div>
        </div>

        {/* Rata-rata per Hari Layanan */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Beban Harian
            </span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
            {avgVisitsPerDay}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Pasien/hari layanan
          </div>
        </div>

        {/* Hari Layanan */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Hari Layanan
            </span>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
            {serviceDays}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Hari aktif klinik
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POSISI UTAMA: TREN KUNJUNGAN HARIAN (DIAGRAM BATANG GANDA)               */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                Tren Kunjungan Harian & Jumlah Pasien ({periodeLabel})
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Diagram batang ganda: membandingkan kedatangan berobat dengan orang sakit · <span className="text-teal-700 dark:text-teal-400 font-semibold">Klik batang tanggal untuk melihat daftar pasien</span>
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-teal-600" />
              <span className="text-slate-700 dark:text-slate-300">Total Kunjungan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600" />
              <span className="text-slate-700 dark:text-slate-300">Pasien Berbeda</span>
            </div>
          </div>
        </div>

        {/* Double Bar Chart Area */}
        <div className="h-52 flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800">
          {chartTrendData.map((d) => {
            const hKunjungan = maxTrendValue > 0 ? (d.kunjungan / maxTrendValue) * 100 : 0;
            const hPasien = maxTrendValue > 0 ? (d.pasienUnik / maxTrendValue) * 100 : 0;
            const hasData = d.kunjungan > 0 || d.pasienUnik > 0;

            return (
              <div
                key={d.key}
                onClick={() => {
                  if (hasData) {
                    openDrillDownVisits(
                      d.tooltipTitle,
                      `Menampilkan ${d.kunjungan} kunjungan (${d.pasienUnik} pasien berbeda)`,
                      d.visits,
                      d.label,
                      'bg-teal-700 text-white'
                    );
                  }
                }}
                className={`flex-1 flex flex-col items-center h-full justify-end group relative ${
                  hasData ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                {/* Tooltip on Hover */}
                {hasData && (
                  <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded-lg p-2 pointer-events-none z-30 whitespace-nowrap shadow-xl border border-slate-700">
                    <div className="font-bold text-slate-100">{d.tooltipTitle}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-teal-300">● {d.kunjungan} Kunjungan</span>
                      <span className="text-indigo-300">● {d.pasienUnik} Pasien</span>
                    </div>
                    <div className="text-[9px] text-amber-300 font-medium mt-0.5">👉 Klik untuk lihat rincian</div>
                  </div>
                )}

                {/* Double Bars Side-by-Side */}
                <div className="flex items-end justify-center gap-0.5 sm:gap-1 w-full h-full pb-1">
                  {/* Bar 1: Kunjungan */}
                  <div
                    style={{ height: `${Math.max(hKunjungan, d.kunjungan > 0 ? 8 : 2)}%` }}
                    className={`flex-1 max-w-[14px] rounded-t transition-all ${
                      d.kunjungan > 0
                        ? 'bg-teal-600 group-hover:bg-teal-500 group-hover:shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/40'
                    }`}
                    title={`Kunjungan: ${d.kunjungan}`}
                  />
                  {/* Bar 2: Pasien Unik */}
                  <div
                    style={{ height: `${Math.max(hPasien, d.pasienUnik > 0 ? 8 : 2)}%` }}
                    className={`flex-1 max-w-[14px] rounded-t transition-all ${
                      d.pasienUnik > 0
                        ? 'bg-indigo-600 group-hover:bg-indigo-500 group-hover:shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/40'
                    }`}
                    title={`Pasien Unik: ${d.pasienUnik}`}
                  />
                </div>

                {/* X-axis Label */}
                <span className="text-[9px] text-slate-400 mt-1 font-mono font-medium truncate max-w-full">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PETA KAMAR WARGA BINAAN SAKIT (HEATMAP KAMAR & BLOK)                       */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FlameKindling className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                Peta Kamar Warga Binaan Sakit (Heatmap)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sebaran kamar hunian tempat warga binaan yang berobat tinggal · <span className="text-teal-700 dark:text-teal-400 font-bold">Klik kotak kamar mana pun untuk melihat nama pasien</span>
            </p>
          </div>

          {/* Heatmap Metric Selector & Legend */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle metric */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setHeatmapMetric('kunjungan')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  heatmapMetric === 'kunjungan'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Kunjungan
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMetric('pasienUnik')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  heatmapMetric === 'pasienUnik'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Pasien Sakit (Unik)
              </button>
            </div>

            {/* Visual Color Scale Legend */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
                Nihil
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300" />
                1-2
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-300" />
                3-5
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 text-white font-bold" />
                ≥6 (Klaster)
              </span>
            </div>
          </div>
        </div>

        {/* Heatmap Blocks & Room Cells */}
        <div className="space-y-4">
          {roomHeatmapData.map((b) => (
            <div
              key={b.blockName}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                    {b.blockName}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ({b.rooms.length} Kamar terdata · {b.totalBlockPenghuni} Penghuni Aktif)
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Total Sakit: <strong className="font-mono text-teal-700 dark:text-teal-400">{b.totalBlockKunjungan} Kunjungan</strong> ({b.totalBlockUnik} Orang)
                </div>
              </div>

              {/* Room Cells Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {b.rooms.map((r) => {
                  const val = heatmapMetric === 'kunjungan' ? r.kunjunganCount : r.uniquePatients;

                  // Determine color scale
                  let colorClass = 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400';
                  let valClass = 'text-slate-400 font-mono';
                  if (val >= 6) {
                    colorClass = 'bg-rose-500 text-white border-rose-600 shadow-xs hover:bg-rose-600';
                    valClass = 'text-white font-mono font-extrabold';
                  } else if (val >= 3) {
                    colorClass = 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:border-amber-400';
                    valClass = 'text-amber-800 dark:text-amber-300 font-mono font-bold';
                  } else if (val >= 1) {
                    colorClass = 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 hover:border-emerald-400';
                    valClass = 'text-emerald-800 dark:text-emerald-300 font-mono font-bold';
                  }

                  return (
                    <div
                      key={r.kamar}
                      onClick={() => {
                        if (r.kunjunganCount > 0) {
                          openDrillDownVisits(
                            `Kamar ${r.kamar} (${b.blockName})`,
                            `Menampilkan ${r.kunjunganCount} kunjungan (${r.uniquePatients} pasien unik) dari Kamar ${r.kamar} · Dominan: ${r.topComplaints}`,
                            r.visits,
                            `Kamar ${r.kamar}`,
                            r.hasContagious ? 'bg-rose-600 text-white' : 'bg-teal-700 text-white'
                          );
                        }
                      }}
                      className={`p-2 rounded-lg border transition-all flex flex-col justify-between group relative ${colorClass} ${
                        r.kunjunganCount > 0 ? 'cursor-pointer hover:scale-102 hover:shadow-xs' : 'cursor-default opacity-85'
                      }`}
                      title={`${b.blockName} - Kamar ${r.kamar}: ${r.kunjunganCount} kunjungan, ${r.uniquePatients} pasien unik. ${r.hasContagious ? '(Penyakit Menular Terdeteksi!)' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-tight truncate">
                          Kmr {r.kamar}
                        </span>
                        {r.hasContagious && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"
                            title="Ada Penyakit Menular di Kamar Ini"
                          />
                        )}
                      </div>

                      <div className="my-1 flex items-baseline justify-between">
                        <span className={`text-base leading-none ${valClass}`}>
                          {val}
                        </span>
                        <span className="text-[9px] opacity-75">
                          {r.totalPenghuni > 0 ? `/${r.totalPenghuni} wbp` : ''}
                        </span>
                      </div>

                      <div className="text-[9px] truncate opacity-70 group-hover:opacity-100">
                        {r.kunjunganCount > 0 ? `${r.topComplaints}` : 'Nihil sakit'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: PEMANTAUAN PENYAKIT MENULAR VS TIDAK MENULAR */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                Pemantauan Penyakit: Menular vs Tidak Menular
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Memisahkan penyakit yang bisa menular (flu, scabies/gatal, diare) dari penyakit biasa · Klik kartu untuk melihat nama pasien
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {currentMetrics.totalKasusMenular} Kasus Menular ({totalSemuaKasus > 0 ? ((currentMetrics.totalKasusMenular / totalSemuaKasus) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>

        {/* Proportional Ratio Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${totalSemuaKasus > 0 ? (currentMetrics.totalKasusMenular / totalSemuaKasus) * 100 : 0}%` }}
              className="bg-rose-500 h-full transition-all duration-500"
              title={`Kasus Menular: ${currentMetrics.totalKasusMenular}`}
            />
            <div
              style={{ width: `${totalSemuaKasus > 0 ? (totalKasusTidakMenular / totalSemuaKasus) * 100 : 100}%` }}
              className="bg-teal-600 h-full transition-all duration-500"
              title={`Tidak Menular: ${totalKasusTidakMenular}`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              Kasus Menular: <strong className="font-mono text-rose-600">{currentMetrics.totalKasusMenular}</strong> ({totalSemuaKasus > 0 ? ((currentMetrics.totalKasusMenular / totalSemuaKasus) * 100).toFixed(1) : 0}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0" />
              Tidak Menular: <strong className="font-mono text-teal-600">{totalKasusTidakMenular}</strong> ({totalSemuaKasus > 0 ? ((totalKasusTidakMenular / totalSemuaKasus) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>

        {/* 2 Interactive Clickable Surveillance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* KARTU 1: KASUS MENULAR */}
          <div
            onClick={() => openDrillDownVisits('Daftar Kasus Penyakit Menular', `Menampilkan ${contagiousVisits.length} kunjungan berisiko penularan (${periodeLabel})`, contagiousVisits, 'Waspada Klaster', 'bg-rose-600 text-white')}
            className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 hover:border-rose-400 cursor-pointer transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span className="font-bold text-xs text-rose-900 dark:text-rose-200 uppercase tracking-tight">
                  Penyakit Menular (Klaster Potensial)
                </span>
              </div>
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 group-hover:underline">
                Telusuri Pasien ↗
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-3xl font-extrabold font-mono text-rose-700 dark:text-rose-300">
                {currentMetrics.totalKasusMenular}
              </div>
              <div className="text-xs text-rose-600/80 dark:text-rose-400">
                kasus terdeteksi ({contagiousVisits.length} kunjungan)
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {contagiousDiseaseBreakdown.length > 0 ? (
                contagiousDiseaseBreakdown.slice(0, 4).map(([name, count]) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                  >
                    {name}: <strong>{count}</strong>
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-400 italic">Nihil kasus menular pada periode ini.</span>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
              <span>👉 Klik untuk telusuri riwayat kamar & pasien menular</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* KARTU 2: KASUS NON-MENULAR */}
          <div
            onClick={() => openDrillDownVisits('Daftar Kasus Penyakit Tidak Menular', `Menampilkan ${nonContagiousVisits.length} kunjungan non-menular (${periodeLabel})`, nonContagiousVisits, 'Penyakit Umum', 'bg-teal-700 text-white')}
            className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50/80 dark:hover:bg-teal-950/40 hover:border-teal-400 cursor-pointer transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span className="font-bold text-xs text-teal-900 dark:text-teal-200 uppercase tracking-tight">
                  Penyakit Tidak Menular (Metabolik & Kronis)
                </span>
              </div>
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 group-hover:underline">
                Telusuri Pasien ↗
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-3xl font-extrabold font-mono text-teal-800 dark:text-teal-300">
                {totalKasusTidakMenular}
              </div>
              <div className="text-xs text-teal-700/80 dark:text-teal-400">
                kasus umum ({nonContagiousVisits.length} kunjungan)
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
              Mencakup gangguan muskuloskeletal (pegal/myalgia), hipertensi, gangguan lambung/dyspepsia, dan sakit kepala biasa.
            </p>

            <div className="mt-3 pt-2 border-t border-teal-200/60 dark:border-teal-900/40 flex items-center justify-between text-[11px] text-teal-800 dark:text-teal-300 font-semibold">
              <span>👉 Klik untuk melihat daftar kasus non-menular</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: KELOMPOK PENYAKIT BERDASARKAN BAGIAN TUBUH */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                Kelompok Penyakit Berdasarkan Bagian Tubuh
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pengelompokan keluhan dan diagnosa berdasarkan organ atau bagian tubuh yang sakit · Klik kelompok mana pun untuk melihat nama pasien
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total {totalSemuaKasus} keluhan tercatat
          </span>
        </div>

        {/* Proportional Multi-Segment Bar */}
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-4 shadow-inner">
          {categorySpectrum.slice(0, 6).map((cat, idx) => (
            <div
              key={cat.catName}
              style={{ width: `${cat.percentage}%` }}
              className={`h-full ${
                idx === 0 ? 'bg-teal-600' :
                idx === 1 ? 'bg-sky-500' :
                idx === 2 ? 'bg-indigo-500' :
                idx === 3 ? 'bg-amber-500' :
                idx === 4 ? 'bg-rose-500' : 'bg-purple-500'
              }`}
              title={`${cat.catName}: ${cat.kasus} kasus (${cat.percentage}%)`}
            />
          ))}
        </div>

        {/* Category Interactive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categorySpectrum.map((cat) => (
            <div
              key={cat.catName}
              onClick={() => openDrillDownVisits(`Kategori: ${cat.catName}`, `Menampilkan ${cat.kasus} kasus (${cat.uniquePatients} pasien unik) dalam kategori ini`, cat.visits, cat.catName, 'bg-indigo-700 text-white')}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-900 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer transition-all shadow-xs group"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                  {cat.percentage}%
                </span>
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white mt-2 line-clamp-2 leading-tight">
                {cat.catName}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>{cat.kasus} Kasus</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.uniquePatients} Pasien</span>
              </div>
              <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center justify-end gap-1 group-hover:underline">
                <span>Rincian</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: 10 PENYAKIT PALING SERING & PASIEN PALING SERING BEROBAT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP 10 PENYAKIT (2 Columns - Clickable rows) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                10 Penyakit & Keluhan Paling Sering
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Membandingkan jumlah kasus kunjungan dan jumlah orang yang sakit · Klik baris penyakit untuk melihat daftar pasien
              </p>
            </div>
            <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
              Periode {periodeLabel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 border-b">
                <tr>
                  <th className="py-2 px-3 w-8 text-center">No</th>
                  <th className="py-2 px-3">Nama Penyakit</th>
                  <th className="py-2 px-3">Kategori</th>
                  <th className="py-2 px-3 text-center">Kasus</th>
                  <th className="py-2 px-3 text-center">Pasien Unik</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {topDiseases.length > 0 ? (
                  topDiseases.map((d, idx) => (
                    <tr
                      key={d.name}
                      onClick={() => openDrillDownVisits(`Penyakit: ${d.name}`, `Menampilkan ${d.kasus} kasus (${d.pasienUnik} pasien unik) dengan diagnosis ${d.name}`, d.visits, d.name, d.jenis === 'Menular' ? 'bg-rose-600 text-white' : 'bg-teal-700 text-white')}
                      className="hover:bg-teal-50/70 dark:hover:bg-teal-950/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 flex items-center justify-between">
                        <span>{d.name}</span>
                        <span className="text-[10px] text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">Detail ↗</span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[140px]">{d.kategori}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-teal-700 dark:text-teal-300">{d.kasus}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-700 dark:text-slate-300">{d.pasienUnik} org</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded font-semibold ${
                            d.jenis === 'Menular'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {d.jenis === 'Menular' ? '⚡ Menular' : 'Tdk Menular'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      Belum ada data diagnosa penyakit pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PASIEN PALING SERING BEROBAT (1 Column) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
                Warga Binaan Paling Sering Berobat
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Warga binaan dengan jumlah kedatangan berobat terbanyak · Klik nama untuk melihat riwayat berobat
            </p>

            <div className="space-y-2">
              {topFrequentPatients.map((p, idx) => (
                <div
                  key={p.nama}
                  onClick={() => openDrillDownVisits(`Riwayat Berobat: ${p.nama}`, `Menampilkan seluruh ${p.kunjunganCount} kunjungan dari ${p.nama} (${p.blok} Kamar ${p.kamar})`, p.visits, `${p.kunjunganCount}x Berobat`, 'bg-amber-600 text-white')}
                  className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-700">
                      {idx + 1}. {p.nama}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {p.blok} · Kamar {p.kamar}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900">
                      {p.kunjunganCount}x
                    </span>
                    {p.wbp && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectWbp(p.wbp!);
                        }}
                        className="text-[10px] text-teal-700 hover:underline font-semibold"
                      >
                        Rekam Medis
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 italic">
            Ambang batas sering: {pengaturan.batas_sering_berobat_kali}x dalam {pengaturan.periode_sering_hari} hari.
          </div>
        </div>
      </div>

      {/* SECTION 5: REKAPITULASI KUNJUNGAN PER BULAN (JANUARI - DESEMBER) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
              Ringkasan Kunjungan per Bulan (Januari - Desember {selectedYear})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Rekapitulasi kedatangan berobat dan jumlah orang berbeda sepanjang tahun ({fullYearMetrics.pasienUnikCount} orang) · Klik bulan untuk melihat rincian
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 border-b">
              <tr>
                <th className="py-2.5 px-3">Bulan</th>
                <th className="py-2.5 px-3 text-center">Jumlah Kunjungan</th>
                <th className="py-2.5 px-3 text-center">Pasien Unik</th>
                <th className="py-2.5 px-3 text-center">Kunjungan/Pasien</th>
                <th className="py-2.5 px-3 text-center">% dari Total Tahun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthlyAnnualSummary.map((m) => {
                const pct = fullYearMetrics.totalKunjungan > 0
                  ? ((m.kunjungan / fullYearMetrics.totalKunjungan) * 100).toFixed(1)
                  : '0';
                const isSelected = m.monthNum === selectedMonth && filterMode === 'bulan';
                return (
                  <tr
                    key={m.monthName}
                    onClick={() => {
                      if (m.kunjungan > 0) {
                        openDrillDownVisits(
                          `Kunjungan Bulan ${m.monthName} ${selectedYear}`,
                          `Menampilkan ${m.kunjungan} kunjungan (${m.pasienUnik} pasien unik) selama bulan ${m.monthName}`,
                          m.visits,
                          `Bulan ${m.monthName}`,
                          'bg-teal-700 text-white'
                        );
                      }
                    }}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/70 dark:bg-teal-950/40 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{m.monthName}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-mono">{m.kunjungan} kali</td>
                    <td className="py-2 px-3 text-center font-mono">{m.pasienUnik} orang</td>
                    <td className="py-2 px-3 text-center font-mono">{m.rasio}x</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-500">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
              <tr
                onClick={() => openDrillDownVisits(`Seluruh Kunjungan Tahun ${selectedYear}`, `Menampilkan total ${fullYearMetrics.totalKunjungan} kunjungan (${fullYearMetrics.pasienUnikCount} pasien unik) sepanjang tahun ${selectedYear}`, fullYearVisits, `Tahun ${selectedYear}`, 'bg-slate-900 text-white')}
                className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <td className="py-2.5 px-3 uppercase tracking-wider text-[11px]">
                  TOTAL TAHUN {selectedYear} (Klik untuk rincian)
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-teal-800 dark:text-teal-300 font-extrabold">
                  {fullYearMetrics.totalKunjungan} Kunjungan
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-900 dark:text-white font-extrabold">
                  {fullYearMetrics.pasienUnikCount} Pasien Unik
                </td>
                <td className="py-2.5 px-3 text-center font-mono">
                  {fullYearMetrics.kunjunganPerPasien.toFixed(2)}x
                </td>
                <td className="py-2.5 px-3 text-center font-mono">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MASTER DRILL-DOWN MODAL / DRAWER (INTERACTIVE DETAIL DATA EXPLORER)     */}
      {/* ========================================================================= */}
      {drillDown.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50 dark:bg-slate-950/50">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {drillDown.title}
                  </h3>
                  {drillDown.badgeLabel && (
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${drillDown.badgeColor || 'bg-teal-700 text-white'}`}>
                      {drillDown.badgeLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {drillDown.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDrillDown((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar: Search & Copy */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, kamar, diagnosa, keluhan..."
                  value={drillSearch}
                  onChange={(e) => setDrillSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-slate-500 font-mono">
                  {drillDown.isWbpMode ? `${filteredWbpList.length} WBP` : `${filteredVisits.length} Catatan`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyDrilldownText}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Ringkasan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {drillDown.isWbpMode ? (
                /* WBP Master Mode */
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 sticky top-0 z-10 border-b">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3">No. Register / NIK</th>
                      <th className="py-2.5 px-3">Penempatan</th>
                      <th className="py-2.5 px-3">Batch BPJS</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredWbpList.length > 0 ? (
                      filteredWbpList.map((w, idx) => (
                        <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{w.nama}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            <div>{w.no_reg_instansi || '-'}</div>
                            <div className="text-slate-400">{w.nik || 'NIK Nihil'}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">{w.blok}</span> · Kamar {w.kamar}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {w.batch_bpjs || 'Belum masuk batch'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setDrillDown((prev) => ({ ...prev, isOpen: false }));
                                onSelectWbp(w);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 hover:underline"
                            >
                              Rekam Medis ↗
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                          Tidak ditemukan data warga binaan yang cocok dengan pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                /* Clinical Visits Mode */
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 sticky top-0 z-10 border-b">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">No</th>
                      <th className="py-2.5 px-3 w-24">Tanggal</th>
                      <th className="py-2.5 px-3">Nama Pasien & Kamar</th>
                      <th className="py-2.5 px-3">Keluhan</th>
                      <th className="py-2.5 px-3">Diagnosis / Penyakit</th>
                      <th className="py-2.5 px-3">Terapi / Obat</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredVisits.length > 0 ? (
                      filteredVisits.map((v, idx) => {
                        const isContagious = v.jenis1 === 'Menular' || v.jenis2 === 'Menular' || v.jenis3 === 'Menular';
                        return (
                          <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {v.tanggal}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white">{v.nama}</div>
                              <div className="text-[10px] text-slate-500">
                                {v.wbp?.blok || '-'} · Kamar {v.kamar || v.wbp?.kamar || '-'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                              <div className="font-medium">{v.keluhan1}</div>
                              {(v.keluhan2 || v.keluhan3) && (
                                <div className="text-[10px] text-slate-500">
                                  {[v.keluhan2, v.keluhan3].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
                                <span>{v.penyakit1}</span>
                                {isContagious && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                                    Menular
                                  </span>
                                )}
                              </div>
                              {(v.penyakit2 || v.penyakit3) && (
                                <div className="text-[10px] text-slate-500">
                                  {[v.penyakit2, v.penyakit3].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px] max-w-[200px] truncate">
                              {v.terapi || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {v.wbp ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDrillDown((prev) => ({ ...prev, isOpen: false }));
                                    onSelectWbp(v.wbp!);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-400 hover:underline"
                                >
                                  Rekam Medis ↗
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Non-WBP</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          Tidak ditemukan data kunjungan yang cocok dengan filter pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between text-xs text-slate-500">
              <div>
                Menampilkan data aktif Klinik Pratama Lapas Dompu
              </div>
              <button
                type="button"
                onClick={() => setDrillDown((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:opacity-90 transition-opacity"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
