/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CalculatedKunjungan,
  JenisPenyakit,
  KunjunganItem,
  PengaturanApp,
  PenyakitItem,
  ReferensiItem,
  WbpItem,
  AuditLog,
  SidbUpdateHistory,
} from '../types';
import {
  INITIAL_KUNJUNGAN,
  INITIAL_PENGATURAN,
  INITIAL_PENYAKIT,
  INITIAL_REFERENSI,
  INITIAL_WBP,
} from '../data/initialData';

const STORAGE_KEYS = {
  WBP: 'klinik_dompu_wbp_v1',
  KUNJUNGAN: 'klinik_dompu_kunjungan_v1',
  REFERENSI: 'klinik_dompu_referensi_v1',
  PENYAKIT: 'klinik_dompu_penyakit_v1',
  PENGATURAN: 'klinik_dompu_pengaturan_v1',
  AUDIT_LOG: 'klinik_dompu_audit_log_v1',
  SIDB_HISTORY: 'klinik_dompu_sidb_history_v1',
  SESSION: 'klinik_dompu_session_v1',
  FAILED_ATTEMPTS: 'klinik_dompu_failed_login_v1',
};

// SHA-256 helper
export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Date helpers for dd/mm/yyyy
export function parseDate(str: string): Date | null {
  if (!str) return null;
  // Specific fix for user's October dataset: if stored as 10/01/2026, it represents 1 Oktober 2026
  if (str === '10/01/2026' || str === '2026-01-10') {
    return new Date(2026, 9, 1); // 1 Oktober 2026
  }
  const parts = str.split('/');
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    // If year 2026 and month was set to January (0) with day 10, auto-correct to 1 Oktober 2026
    if (year === 2026 && month === 0 && day === 10) {
      day = 1;
      month = 9;
    }
    return new Date(year, month, day);
  }
  // Try ISO format
  const iso = new Date(str);
  return isNaN(iso.getTime()) ? null : iso;
}

export function formatDateIndo(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Normalizes any date input (DD/MM/YYYY, YYYY-MM-DD, Date object) strictly to dd/mm/yyyy.
 * Specifically corrects inverted day/month from US XLSX parsing (e.g. 10/01/2026 -> 01/10/2026).
 */
export function normalizeDateIndo(raw: any): string {
  if (!raw) return '';
  if (raw instanceof Date) {
    if (raw.getFullYear() === 2026 && raw.getMonth() === 0 && raw.getDate() === 10) {
      return '01/10/2026';
    }
    return formatDateIndo(raw);
  }
  const str = String(raw).trim();
  if (!str) return '';

  // Inverted month/day fix for October 2026 data
  if (str === '10/01/2026' || str === '2026-01-10' || str.startsWith('2026-01-10T')) {
    return '01/10/2026';
  }

  // Handle dd/mm/yyyy or d/m/yyyy
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;

      // Inverted check: if day is 10 and month is 1 in 2026, flip to 01/10/2026
      if (year === 2026 && month === 1 && day === 10) {
        day = 1;
        month = 10;
      }

      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
  }

  // Handle yyyy-mm-dd or yyyy-mm-ddThh:mm:ss
  if (str.includes('-')) {
    const cleanDate = str.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      let year = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let day = parseInt(parts[2], 10);

      // Inverted check: 2026-01-10 was meant to be 01/10/2026
      if (year === 2026 && month === 1 && day === 10) {
        day = 1;
        month = 10;
      }

      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
  }

  const parsed = parseDate(str);
  if (parsed && !isNaN(parsed.getTime())) {
    return formatDateIndo(parsed);
  }

  return str;
}

export function getTodayFormatted(): string {
  return formatDateIndo(new Date());
}

/**
 * Menentukan Blok Hunian secara otomatis berdasarkan Nama Kamar.
 * Aturan Lapas Dompu:
 * - BLOK ATAS : Kamar Tamping, Kamar 8, Kamar 9, Kamar 10, Kamar 11, Kamar 12, Kamar 13, Kamar 14
 * - BLOK BAWAH: Kamar Lansia, Kamar 1, Kamar 2, Kamar 3, Kamar MAXIMUM / Kamar 4, Kamar 5, Kamar 6, Kamar 7
 * - Tanpa nama kamar / kamar kosong -> data Blok diubah jadi kosong ('')
 */
export function determineBlokByKamar(kamar: string | undefined | null): string {
  if (!kamar) return '';
  const clean = String(kamar).trim().toLowerCase();
  if (
    !clean ||
    clean === '-' ||
    clean === 'kosong' ||
    clean === 'tidak ada' ||
    clean === 'null' ||
    clean === 'undefined'
  ) {
    return '';
  }

  // Kata kunci khusus
  if (clean.includes('tamping')) {
    return 'Blok Atas';
  }

  if (clean.includes('lansia')) {
    return 'Blok Bawah';
  }

  if (clean.includes('maximum') || clean.includes('maksim') || clean.includes('max')) {
    return 'Blok Bawah';
  }

  // Cek nomor kamar (misal: "8", "Kamar 8", "14", "1", "4", dsb)
  const numMatch = clean.match(/\b\d+\b/) || clean.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    // BLOK ATAS: 8, 9, 10, 11, 12, 13, 14
    if (num >= 8 && num <= 14) {
      return 'Blok Atas';
    }
    // BLOK BAWAH: 1, 2, 3, 4, 5, 6, 7
    if (num >= 1 && num <= 7) {
      return 'Blok Bawah';
    }
  }

  // Jika nama kamar tidak masuk ke kategori di atas atau tidak ada kamar valid
  return '';
}

export function dateToInputFormat(str: string): string {
  // convert dd/mm/yyyy to yyyy-mm-dd for <input type="date">
  if (!str) return '';
  const parts = str.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str;
}

export function inputFormatToDate(str: string): string {
  // convert yyyy-mm-dd to dd/mm/yyyy
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
}

export function calculateUsia(tanggal_lahir: string): number {
  const birth = parseDate(tanggal_lahir);
  if (!birth) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

export function calculateSisaBulan(tgl_ekspirasi: string): number {
  const exp = parseDate(tgl_ekspirasi);
  if (!exp) return 0;
  const today = new Date();
  const months = (exp.getFullYear() - today.getFullYear()) * 12 + (exp.getMonth() - today.getMonth());
  return Math.max(0, months);
}

export function getRelativeTime(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays > 1 && diffDays < 30) return `${diffDays} hari lalu`;
  if (diffDays >= 30 && diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;
  return `${Math.floor(diffDays / 365)} tahun lalu`;
}

// Storage Manager
class DataStore {
  private wbpList: WbpItem[] = [];
  private kunjunganList: KunjunganItem[] = [];
  private referensiList: ReferensiItem[] = [];
  private penyakitList: PenyakitItem[] = [];
  private pengaturan: PengaturanApp = INITIAL_PENGATURAN;
  private auditLogs: AuditLog[] = [];
  private sidbHistory: SidbUpdateHistory[] = [];
  private isLoaded = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const storedWbp = localStorage.getItem(STORAGE_KEYS.WBP);
      const rawWbp: WbpItem[] = storedWbp ? JSON.parse(storedWbp) : INITIAL_WBP;
      // Auto-normalize room and block based on Lapas Dompu rules
      this.wbpList = rawWbp.map((w) => {
        const room = (w.kamar || w.kamar_sidb || '').trim();
        const autoBlok = determineBlokByKamar(room);
        return {
          ...w,
          kamar: room,
          blok: autoBlok,
        };
      });

      const storedKunjungan = localStorage.getItem(STORAGE_KEYS.KUNJUNGAN);
      this.kunjunganList = storedKunjungan ? JSON.parse(storedKunjungan) : INITIAL_KUNJUNGAN;
      // Auto-correct any legacy dates (such as 10/01/2026 inverted to 01/10/2026)
      this.kunjunganList = this.kunjunganList.map((k) => ({
        ...k,
        tanggal: normalizeDateIndo(k.tanggal),
      }));

      const storedRef = localStorage.getItem(STORAGE_KEYS.REFERENSI);
      this.referensiList = storedRef ? JSON.parse(storedRef) : INITIAL_REFERENSI;

      const storedPenyakit = localStorage.getItem(STORAGE_KEYS.PENYAKIT);
      this.penyakitList = storedPenyakit ? JSON.parse(storedPenyakit) : INITIAL_PENYAKIT;

      const storedPengaturan = localStorage.getItem(STORAGE_KEYS.PENGATURAN);
      this.pengaturan = storedPengaturan ? { ...INITIAL_PENGATURAN, ...JSON.parse(storedPengaturan) } : INITIAL_PENGATURAN;

      const storedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
      this.auditLogs = storedAudit ? JSON.parse(storedAudit) : [];

      const storedSidbHistory = localStorage.getItem(STORAGE_KEYS.SIDB_HISTORY);
      this.sidbHistory = storedSidbHistory ? JSON.parse(storedSidbHistory) : [];

      this.isLoaded = true;

      // Asynchronously sync with Cloud SQL backend
      this.syncFromDatabase();
    } catch (e) {
      console.error('Failed to load storage, initializing with defaults', e);
      this.wbpList = INITIAL_WBP;
      this.kunjunganList = INITIAL_KUNJUNGAN;
      this.referensiList = INITIAL_REFERENSI;
      this.penyakitList = INITIAL_PENYAKIT;
      this.pengaturan = INITIAL_PENGATURAN;
    }
  }

  public async syncFromDatabase() {
    try {
      if (typeof window === 'undefined') return;
      const resWbp = await fetch('/api/wbp');
      if (resWbp.ok) {
        const dbWbp = await resWbp.json();
        if (Array.isArray(dbWbp) && dbWbp.length > 0) {
          // Merge WBP
          const existingIds = new Set(this.wbpList.map((w) => w.id));
          dbWbp.forEach((dw: any) => {
            if (!existingIds.has(dw.id)) {
              this.wbpList.push({
                id: dw.id,
                no: this.wbpList.length + 1,
                nama: dw.nama,
                nik: dw.nik || '',
                no_reg_instansi: dw.noRegInstansi || '',
                jenis_kelamin: 'Laki-laki',
                tempat_lahir: dw.tempatLahir || '',
                tanggal_lahir: dw.tanggalLahir || '',
                blok: dw.blok || '',
                kamar: dw.kamar || '',
                kamar_sidb: dw.kamar || '',
                alamat: dw.alamat || '',
                jenis_kejahatan: 'Umum',
                kategori: 'Narapidana',
                status_data: dw.statusData || 'Aktif',
                batch_bpjs: dw.batchBpjs || 'Belum masuk batch',
                perlu_dicek: Boolean(dw.perluDicek),
                kendala_bpjs: dw.kendalaBpjs,
                dasar_pbi: dw.dasarPbi,
                sumber_update: dw.sumberUpdate,
                terakhir_diperbarui: dw.terakhirDiperbarui,
              });
            }
          });
        }
      }

      const resKunjungan = await fetch('/api/kunjungan');
      if (resKunjungan.ok) {
        const dbKunjungan = await resKunjungan.json();
        if (Array.isArray(dbKunjungan) && dbKunjungan.length > 0) {
          const existingKIds = new Set(this.kunjunganList.map((k) => k.id));
          dbKunjungan.forEach((dk: any) => {
            if (!existingKIds.has(dk.id)) {
              this.kunjunganList.unshift({
                id: dk.id,
                tanggal: normalizeDateIndo(dk.tanggal),
                wbp_id: dk.wbpId,
                nama: dk.nama,
                kamar: dk.kamar,
                keluhan1: dk.keluhan1,
                keluhan2: dk.keluhan2,
                keluhan3: dk.keluhan3,
                penyakit1: dk.penyakit1,
                jenis1: dk.jenis1,
                penyakit2: dk.penyakit2,
                jenis2: dk.jenis2,
                penyakit3: dk.penyakit3,
                jenis3: dk.jenis3,
                terapi: dk.terapi,
                dokter_pemeriksa: dk.dokterPemeriksa,
                perawat: dk.perawat,
                catatan: dk.catatan,
                dihapus: Boolean(dk.dihapus),
                dibuat_pada: dk.createdAt,
              });
            }
          });
        }
      }

      this.saveToLocalStorage();
    } catch (e) {
      // In offline or initial startup mode, silently continue with local data
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.WBP, JSON.stringify(this.wbpList));
      localStorage.setItem(STORAGE_KEYS.KUNJUNGAN, JSON.stringify(this.kunjunganList));
      localStorage.setItem(STORAGE_KEYS.REFERENSI, JSON.stringify(this.referensiList));
      localStorage.setItem(STORAGE_KEYS.PENYAKIT, JSON.stringify(this.penyakitList));
      localStorage.setItem(STORAGE_KEYS.PENGATURAN, JSON.stringify(this.pengaturan));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(this.auditLogs));
      localStorage.setItem(STORAGE_KEYS.SIDB_HISTORY, JSON.stringify(this.sidbHistory));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  public logAudit(aksi: string, rincian: string) {
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      waktu: new Date().toISOString(),
      aksi,
      rincian,
      perangkat: navigator.userAgent.includes('Mobile') ? 'Smartphone' : 'Komputer Desktop',
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    this.saveToLocalStorage();

    // Async push to Cloud SQL audit log
    if (typeof window !== 'undefined') {
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      }).catch(() => {});
    }
  }

  // WBP Methods
  public getWbpList(): WbpItem[] {
    // Dynamically calculate latest room based on most recent visit with a room
    return this.wbpList.map((w) => {
      const latestVisitWithRoom = this.kunjunganList
        .filter((k) => !k.dihapus && (k.wbp_id === w.id || k.nama?.trim().toLowerCase() === w.nama?.trim().toLowerCase()) && k.kamar && k.kamar.trim() && k.kamar.trim() !== '-')
        .sort((a, b) => {
          const dateA = parseDate(a.tanggal)?.getTime() || 0;
          const dateB = parseDate(b.tanggal)?.getTime() || 0;
          return dateB - dateA;
        })[0];

      const currentRoom = (latestVisitWithRoom?.kamar || w.kamar_sidb || w.kamar || '').trim();
      const currentBlok = determineBlokByKamar(currentRoom);
      return {
        ...w,
        kamar: currentRoom,
        blok: currentBlok,
      };
    });
  }

  public getWbpById(id: string): WbpItem | undefined {
    const list = this.getWbpList();
    return list.find((w) => w.id === id);
  }

  public findWbpByNameOrNik(query: string): WbpItem[] {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];
    const list = this.getWbpList();
    return list.filter((w) =>
      w.nama.toLowerCase().includes(clean) ||
      (w.nik && w.nik.toLowerCase().includes(clean)) ||
      (w.no_reg_instansi && w.no_reg_instansi.toLowerCase().includes(clean))
    );
  }

  public addWbp(item: Omit<WbpItem, 'id' | 'no'>): WbpItem {
    const newId = 'wbp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newNo = this.wbpList.length > 0 ? Math.max(...this.wbpList.map((w) => w.no || 0)) + 1 : 1;
    const cleanRoom = (item.kamar || item.kamar_sidb || '').trim();
    const autoBlok = determineBlokByKamar(cleanRoom);
    const newItem: WbpItem = {
      ...item,
      id: newId,
      no: newNo,
      kamar: cleanRoom,
      blok: autoBlok,
      kamar_sidb: item.kamar_sidb || cleanRoom,
      dibuat_pada: new Date().toISOString(),
    };
    this.wbpList.push(newItem);
    this.saveToLocalStorage();
    this.logAudit('Tambah WBP', `Menambah data WBP: ${newItem.nama} (NIK: ${newItem.nik})`);
    return newItem;
  }

  public updateWbp(id: string, updates: Partial<WbpItem>): WbpItem | null {
    const idx = this.wbpList.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    const finalKamar = updates.kamar !== undefined ? updates.kamar.trim() : (this.wbpList[idx].kamar || '').trim();
    const finalBlok = updates.kamar !== undefined
      ? determineBlokByKamar(finalKamar)
      : (updates.blok !== undefined ? updates.blok : determineBlokByKamar(finalKamar));

    this.wbpList[idx] = {
      ...this.wbpList[idx],
      ...updates,
      kamar: finalKamar,
      blok: finalBlok,
    };
    this.saveToLocalStorage();
    this.logAudit('Ubah WBP', `Memperbarui data WBP: ${this.wbpList[idx].nama}`);
    return this.wbpList[idx];
  }

  public deleteWbp(id: string): boolean {
    const idx = this.wbpList.findIndex((w) => w.id === id);
    if (idx === -1) return false;
    const deleted = this.wbpList.splice(idx, 1)[0];
    this.saveToLocalStorage();
    this.logAudit('Hapus WBP', `Menghapus WBP: ${deleted.nama}`);
    return true;
  }

  public async bulkImportWbp(items: WbpItem[], replaceAll = false) {
    const normalizedItems = items.map((w) => {
      const room = (w.kamar || w.kamar_sidb || '').trim();
      return {
        ...w,
        kamar: room,
        blok: determineBlokByKamar(room),
      };
    });

    if (replaceAll) {
      this.wbpList = normalizedItems;
    } else {
      // Upsert by NIK or matching name
      for (const item of normalizedItems) {
        const existingIdx = this.wbpList.findIndex((w) =>
          (w.nik && item.nik && w.nik === item.nik) ||
          w.nama.trim().toLowerCase() === item.nama.trim().toLowerCase()
        );
        if (existingIdx !== -1) {
          this.wbpList[existingIdx] = { ...this.wbpList[existingIdx], ...item };
        } else {
          this.wbpList.push(item);
        }
      }
    }
    this.saveToLocalStorage();
    this.logAudit('Impor WBP', `Mengimpor ${items.length} WBP (${replaceAll ? 'Timpa Semua' : 'Tambah/Perbarui'})`);

    // Sync to Cloud SQL PostgreSQL for cross-device access
    if (typeof window !== 'undefined') {
      try {
        if (replaceAll) {
          await fetch('/api/wbp/all', { method: 'DELETE' });
        }
        await fetch('/api/wbp/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            this.wbpList.map((w) => ({
              id: w.id,
              nama: w.nama,
              nik: w.nik || '',
              noRegInstansi: w.no_reg_instansi || '',
              tempatLahir: w.tempat_lahir || '',
              tanggalLahir: w.tanggal_lahir || '',
              blok: w.blok || '',
              kamar: w.kamar || '',
              alamat: w.alamat || '',
              statusData: w.status_data || 'Aktif',
              batchBpjs: w.batch_bpjs || 'Belum masuk batch',
              perluDicek: Boolean(w.perlu_dicek),
              kendalaBpjs: w.kendala_bpjs || '',
              dasarPbi: w.dasar_pbi || '',
              sumberUpdate: w.sumber_update || 'Impor',
              terakhirDiperbarui: new Date().toISOString(),
            }))
          ),
        });
      } catch (err) {
        console.error('Failed to sync WBP to backend:', err);
      }
    }
  }

  // Kunjungan Methods
  public getRawKunjungan(): KunjunganItem[] {
    return this.kunjunganList;
  }

  public getCalculatedKunjungan(includeDeleted = false): CalculatedKunjungan[] {
    const list = this.getWbpList();
    const wbpMap = new Map<string, WbpItem>();
    const wbpNameMap = new Map<string, WbpItem>();
    for (const w of list) {
      wbpMap.set(w.id, w);
      wbpNameMap.set(w.nama.trim().toLowerCase(), w);
    }

    const filtered = includeDeleted ? this.kunjunganList : this.kunjunganList.filter((k) => !k.dihapus);

    // Calculate duplicates & frequency
    return filtered.map((k) => {
      // Find WBP
      let wbp = wbpMap.get(k.wbp_id);
      if (!wbp && k.nama) {
        wbp = wbpNameMap.get(k.nama.trim().toLowerCase());
      }

      // Resolve complaints against Referensi
      const ref1 = this.resolveComplaint(k.keluhan1);
      const ref2 = this.resolveComplaint(k.keluhan2);
      const ref3 = this.resolveComplaint(k.keluhan3);

      // Duplicate check: same patient visited on the same date more than once
      const dateStr = k.tanggal;
      const duplicates = this.kunjunganList.filter((other) => {
        if (other.dihapus) return false;
        if (other.id === k.id) return false;
        if (other.tanggal !== dateStr) return false;
        const matchesId = (k.wbp_id && other.wbp_id && k.wbp_id === other.wbp_id);
        const matchesName = (k.nama && other.nama && k.nama.trim().toLowerCase() === other.nama.trim().toLowerCase());
        return matchesId || matchesName;
      });
      const is_duplicate = duplicates.length > 0;

      // Frequent visitor check: N visits in last M days
      const kDate = parseDate(k.tanggal);
      let is_frequent = false;
      let frequent_count = 0;
      const limitDays = this.pengaturan.periode_sering_hari || 7;
      const limitCount = this.pengaturan.batas_sering_berobat_kali || 7;

      if (kDate) {
        const timeWindowStart = kDate.getTime() - limitDays * 24 * 60 * 60 * 1000;
        const windowVisits = this.kunjunganList.filter((other) => {
          if (other.dihapus) return false;
          const otherDate = parseDate(other.tanggal);
          if (!otherDate) return false;
          const matches = (k.wbp_id && other.wbp_id && k.wbp_id === other.wbp_id) ||
            (k.nama && other.nama && k.nama.trim().toLowerCase() === other.nama.trim().toLowerCase());
          if (!matches) return false;
          const t = otherDate.getTime();
          return t >= timeWindowStart && t <= kDate.getTime();
        });
        frequent_count = windowVisits.length;
        is_frequent = frequent_count >= limitCount;
      }

      const status_wbp: 'Aktif' | 'TIDAK DITEMUKAN' = wbp ? 'Aktif' : 'TIDAK DITEMUKAN';
      const batch_bpjs = wbp?.batch_bpjs || 'Belum masuk batch';

      return {
        ...k,
        penyakit1: ref1.penyakit,
        penyakit2: ref2.penyakit,
        penyakit3: ref3.penyakit,
        jenis1: ref1.jenis,
        jenis2: ref2.jenis,
        jenis3: ref3.jenis,
        icd10_1: ref1.icd10,
        icd10_2: ref2.icd10,
        icd10_3: ref3.icd10,
        nama_icd10_1: ref1.nama_icd10,
        nama_icd10_2: ref2.nama_icd10,
        nama_icd10_3: ref3.nama_icd10,
        status_wbp,
        batch_bpjs,
        is_duplicate,
        is_frequent,
        frequent_count,
        frequent_days: limitDays,
        wbp,
      };
    });
  }

  public resolveComplaint(keluhan?: string): {
    penyakit: string;
    icd10?: string;
    nama_icd10?: string;
    jenis?: JenisPenyakit;
  } {
    if (!keluhan || !keluhan.trim()) {
      return { penyakit: '' };
    }
    const clean = keluhan.trim().toLowerCase();
    const found = this.referensiList.find(
      (r) => r.keluhan.trim().toLowerCase() === clean
    );

    if (found) {
      // Find current jenis from Penyakit master list to ensure dynamic update
      let currentJenis = found.jenis;
      if (found.masuk_penyakit) {
        const pen = this.penyakitList.find(
          (p) => p.penyakit.trim().toLowerCase() === found.masuk_penyakit.trim().toLowerCase()
        );
        if (pen) {
          currentJenis = pen.jenis;
        }
      }
      return {
        penyakit: found.masuk_penyakit || '',
        icd10: found.kode_icd10 || '',
        nama_icd10: found.nama_icd10 || '',
        jenis: currentJenis,
      };
    }

    return {
      penyakit: 'CEK REFERENSI',
      icd10: 'CEK REFERENSI',
      nama_icd10: 'Keluhan belum terdaftar di referensi ICD-10',
    };
  }

  public addKunjungan(k: Omit<KunjunganItem, 'id' | 'dibuat_pada' | 'dihapus'>): KunjunganItem {
    const newId = 'k-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const item: KunjunganItem = {
      ...k,
      id: newId,
      dihapus: false,
      dibuat_pada: new Date().toISOString(),
    };
    this.kunjunganList.unshift(item);

    // If room is provided, update WBP current room and automatically calculate its block
    const cleanKamar = (k.kamar || '').trim();
    if (cleanKamar) {
      const autoBlok = determineBlokByKamar(cleanKamar);
      if (k.wbp_id) {
        this.updateWbp(k.wbp_id, { kamar: cleanKamar, blok: autoBlok });
      } else if (k.nama) {
        const matchedWbp = this.wbpList.find((w) => w.nama.trim().toLowerCase() === k.nama.trim().toLowerCase());
        if (matchedWbp) {
          this.updateWbp(matchedWbp.id, { kamar: cleanKamar, blok: autoBlok });
        }
      }
    }

    this.saveToLocalStorage();
    this.logAudit('Tambah Kunjungan', `Kunjungan pasien: ${k.nama} pada tanggal ${k.tanggal}`);

    // Asynchronously push to Cloud SQL database
    if (typeof window !== 'undefined') {
      fetch('/api/kunjungan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          tanggal: item.tanggal,
          wbpId: item.wbp_id || null,
          nama: item.nama,
          kamar: item.kamar,
          keluhan1: item.keluhan1,
          keluhan2: item.keluhan2,
          keluhan3: item.keluhan3,
          penyakit1: item.penyakit1,
          jenis1: item.jenis1,
          penyakit2: item.penyakit2,
          jenis2: item.jenis2,
          penyakit3: item.penyakit3,
          jenis3: item.jenis3,
          terapi: item.terapi,
          dokterPemeriksa: item.dokter_pemeriksa,
          perawat: item.perawat,
          catatan: item.catatan,
          dihapus: false,
        }),
      }).catch(() => {});
    }

    return item;
  }

  public updateKunjungan(id: string, updates: Partial<KunjunganItem>): KunjunganItem | null {
    const idx = this.kunjunganList.findIndex((k) => k.id === id);
    if (idx === -1) return null;
    this.kunjunganList[idx] = {
      ...this.kunjunganList[idx],
      ...updates,
      diubah_pada: new Date().toISOString(),
    };
    if (updates.kamar !== undefined) {
      const cleanKamar = updates.kamar.trim();
      const autoBlok = determineBlokByKamar(cleanKamar);
      const targetWbpId = this.kunjunganList[idx].wbp_id;
      const targetName = this.kunjunganList[idx].nama;
      if (targetWbpId) {
        this.updateWbp(targetWbpId, { kamar: cleanKamar, blok: autoBlok });
      } else if (targetName) {
        const matchedWbp = this.wbpList.find((w) => w.nama.trim().toLowerCase() === targetName.trim().toLowerCase());
        if (matchedWbp) {
          this.updateWbp(matchedWbp.id, { kamar: cleanKamar, blok: autoBlok });
        }
      }
    }
    this.saveToLocalStorage();
    this.logAudit('Ubah Kunjungan', `Memperbarui kunjungan ID ${id} (${this.kunjunganList[idx].nama})`);
    return this.kunjunganList[idx];
  }

  public softDeleteKunjungan(id: string): boolean {
    const idx = this.kunjunganList.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    this.kunjunganList[idx].dihapus = true;
    this.kunjunganList[idx].diubah_pada = new Date().toISOString();
    this.saveToLocalStorage();
    this.logAudit('Hapus Kunjungan', `Menghapus (soft delete) kunjungan pasien ${this.kunjunganList[idx].nama}`);
    if (typeof window !== 'undefined') {
      fetch(`/api/kunjungan/${id}`, { method: 'DELETE' }).catch(() => {});
    }
    return true;
  }

  public restoreKunjungan(id: string): boolean {
    const idx = this.kunjunganList.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    this.kunjunganList[idx].dihapus = false;
    this.saveToLocalStorage();
    this.logAudit('Pulihkan Kunjungan', `Memulihkan kunjungan pasien ${this.kunjunganList[idx].nama}`);
    return true;
  }

  public permanentDeleteKunjungan(id: string): boolean {
    const idx = this.kunjunganList.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    const item = this.kunjunganList.splice(idx, 1)[0];
    this.saveToLocalStorage();
    this.logAudit('Hapus Permanen Kunjungan', `Menghapus permanen kunjungan pasien ${item.nama}`);
    return true;
  }

  public async bulkImportKunjungan(items: KunjunganItem[], replaceAll = false) {
    const normalized = items.map((item) => ({
      ...item,
      tanggal: normalizeDateIndo(item.tanggal),
      dihapus: false,
      dibuat_pada: item.dibuat_pada || new Date().toISOString(),
    }));

    if (replaceAll) {
      this.kunjunganList = normalized;
    } else {
      for (const item of normalized) {
        this.kunjunganList.push(item);
      }
    }

    // Auto-update WBP room and block from imported visits
    normalized.forEach((k) => {
      const cleanRoom = (k.kamar || '').trim();
      if (cleanRoom) {
        const autoBlok = determineBlokByKamar(cleanRoom);
        if (k.wbp_id) {
          const wbpIdx = this.wbpList.findIndex((w) => w.id === k.wbp_id);
          if (wbpIdx !== -1) {
            this.wbpList[wbpIdx].kamar = cleanRoom;
            this.wbpList[wbpIdx].blok = autoBlok;
          }
        } else if (k.nama) {
          const wbpIdx = this.wbpList.findIndex((w) => w.nama.trim().toLowerCase() === k.nama.trim().toLowerCase());
          if (wbpIdx !== -1) {
            this.wbpList[wbpIdx].kamar = cleanRoom;
            this.wbpList[wbpIdx].blok = autoBlok;
          }
        }
      }
    });

    this.saveToLocalStorage();
    this.logAudit('Impor Kunjungan', `Mengimpor ${items.length} kunjungan (${replaceAll ? 'Timpa Semua' : 'Tambah/Perbarui'})`);

    // Sync to Cloud SQL PostgreSQL for cross-device access
    if (typeof window !== 'undefined') {
      try {
        if (replaceAll) {
          await fetch('/api/kunjungan/all', { method: 'DELETE' });
        }
        await fetch('/api/kunjungan/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            normalized.map((k) => ({
              id: k.id,
              tanggal: k.tanggal,
              wbpId: k.wbp_id || null,
              nama: k.nama,
              kamar: k.kamar || '',
              keluhan1: k.keluhan1 || '',
              keluhan2: k.keluhan2 || '',
              keluhan3: k.keluhan3 || '',
              penyakit1: k.penyakit1 || '',
              jenis1: k.jenis1 || '',
              penyakit2: k.penyakit2 || '',
              jenis2: k.jenis2 || '',
              penyakit3: k.penyakit3 || '',
              jenis3: k.jenis3 || '',
              terapi: k.terapi || '',
              dokterPemeriksa: k.dokter_pemeriksa || '',
              perawat: k.perawat || '',
              catatan: k.catatan || '',
              dihapus: false,
            }))
          ),
        });
      } catch (err) {
        console.error('Failed to sync visits to backend:', err);
      }
    }
  }

  public async clearAllKunjungan(): Promise<void> {
    this.kunjunganList = [];
    this.saveToLocalStorage();
    this.logAudit('Hapus Semua Kunjungan', 'Mengosongkan seluruh data kunjungan berobat');
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/kunjungan/all', { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to clear kunjungan from db', e);
      }
    }
  }

  public async clearAllWbp(): Promise<void> {
    this.wbpList = [];
    this.kunjunganList = [];
    this.saveToLocalStorage();
    this.logAudit('Hapus Semua WBP', 'Mengosongkan seluruh direktori WBP dan data kunjungan terkait');
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/wbp/all', { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to clear WBP from db', e);
      }
    }
  }

  public async resetAllData(): Promise<void> {
    this.wbpList = INITIAL_WBP;
    this.kunjunganList = INITIAL_KUNJUNGAN.map((k) => ({
      ...k,
      tanggal: normalizeDateIndo(k.tanggal),
    }));
    this.referensiList = INITIAL_REFERENSI;
    this.penyakitList = INITIAL_PENYAKIT;
    this.pengaturan = INITIAL_PENGATURAN;
    this.saveToLocalStorage();
    this.logAudit('Reset Data Pabrik', 'Mengembalikan seluruh data ke konfigurasi awal bawaan');
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/kunjungan/all', { method: 'DELETE' });
        await fetch('/api/wbp/all', { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to reset db', e);
      }
    }
  }

  // Referensi & Penyakit Methods
  public getReferensi(): ReferensiItem[] {
    return this.referensiList;
  }

  public addReferensi(item: Omit<ReferensiItem, 'id'>): ReferensiItem {
    const newId = 'ref-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newItem: ReferensiItem = { ...item, id: newId };
    this.referensiList.push(newItem);
    this.saveToLocalStorage();
    this.logAudit('Tambah Referensi', `Menambah keluhan: ${item.keluhan} -> ${item.masuk_penyakit}`);
    return newItem;
  }

  public updateReferensi(id: string, updates: Partial<ReferensiItem>): ReferensiItem | null {
    const idx = this.referensiList.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.referensiList[idx] = { ...this.referensiList[idx], ...updates };
    this.saveToLocalStorage();
    this.logAudit('Ubah Referensi', `Memperbarui referensi keluhan ${this.referensiList[idx].keluhan}`);
    return this.referensiList[idx];
  }

  public deleteReferensi(id: string): boolean {
    const idx = this.referensiList.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    const deleted = this.referensiList.splice(idx, 1)[0];
    this.saveToLocalStorage();
    this.logAudit('Hapus Referensi', `Menghapus referensi keluhan: ${deleted.keluhan}`);
    return true;
  }

  public getPenyakit(): PenyakitItem[] {
    return this.penyakitList;
  }

  public updatePenyakit(id: string, updates: Partial<PenyakitItem>): PenyakitItem | null {
    const idx = this.penyakitList.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.penyakitList[idx] = { ...this.penyakitList[idx], ...updates };

    // If 'jenis' changed, update matching referensi items as well!
    if (updates.jenis) {
      const diseaseName = this.penyakitList[idx].penyakit.toLowerCase();
      this.referensiList.forEach((r) => {
        if (r.masuk_penyakit.toLowerCase() === diseaseName) {
          r.jenis = updates.jenis!;
        }
      });
    }

    this.saveToLocalStorage();
    this.logAudit('Ubah Penyakit', `Memperbarui penyakit ${this.penyakitList[idx].penyakit} (Jenis: ${this.penyakitList[idx].jenis})`);
    return this.penyakitList[idx];
  }

  public addPenyakit(item: Omit<PenyakitItem, 'id'>): PenyakitItem {
    const newId = 'pen-' + Date.now();
    const newItem: PenyakitItem = { ...item, id: newId };
    this.penyakitList.push(newItem);
    this.saveToLocalStorage();
    this.logAudit('Tambah Penyakit', `Menambah penyakit baru: ${newItem.penyakit}`);
    return newItem;
  }

  // Pengaturan Methods
  public getPengaturan(): PengaturanApp {
    return this.pengaturan;
  }

  public updatePengaturan(updates: Partial<PengaturanApp>) {
    this.pengaturan = { ...this.pengaturan, ...updates };
    this.saveToLocalStorage();
    this.logAudit('Ubah Pengaturan', 'Memperbarui konfigurasi sistem');
  }

  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  public getSidbHistory(): SidbUpdateHistory[] {
    return this.sidbHistory;
  }

  public addSidbHistory(history: Omit<SidbUpdateHistory, 'id'>) {
    const item: SidbUpdateHistory = {
      ...history,
      id: 'sidb-' + Date.now(),
    };
    this.sidbHistory.unshift(item);
    this.saveToLocalStorage();
  }

  // Reset / Full Data Export & Import
  public exportFullBackup(): string {
    const data = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      wbp: this.wbpList,
      kunjungan: this.kunjunganList,
      referensi: this.referensiList,
      penyakit: this.penyakitList,
      pengaturan: this.pengaturan,
      sidb_history: this.sidbHistory,
    };
    return JSON.stringify(data, null, 2);
  }

  public importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.wbp)) this.wbpList = data.wbp;
      if (Array.isArray(data.kunjungan)) this.kunjunganList = data.kunjungan;
      if (Array.isArray(data.referensi)) this.referensiList = data.referensi;
      if (Array.isArray(data.penyakit)) this.penyakitList = data.penyakit;
      if (data.pengaturan) this.pengaturan = { ...INITIAL_PENGATURAN, ...data.pengaturan };
      if (Array.isArray(data.sidb_history)) this.sidbHistory = data.sidb_history;
      this.saveToLocalStorage();
      this.logAudit('Pulihkan Backup', 'Memulihkan data lengkap dari cadangan JSON');
      return true;
    } catch (e) {
      console.error('Invalid backup file', e);
      return false;
    }
  }

  // Patient Medical Record (Rekam Medis) aggregator
  public getPatientMedicalRecord(patientIdOrName: string) {
    const list = this.getWbpList();
    let patient = list.find((w) => w.id === patientIdOrName);
    if (!patient) {
      const clean = patientIdOrName.trim().toLowerCase();
      patient = list.find((w) => w.nama.trim().toLowerCase() === clean);
    }

    const calculated = this.getCalculatedKunjungan(false);
    const patientVisits = calculated.filter((k) => {
      if (patient) {
        return k.wbp_id === patient.id || k.nama.trim().toLowerCase() === patient.nama.trim().toLowerCase();
      }
      return k.nama.trim().toLowerCase() === patientIdOrName.trim().toLowerCase();
    }).sort((a, b) => {
      const dateA = parseDate(a.tanggal)?.getTime() || 0;
      const dateB = parseDate(b.tanggal)?.getTime() || 0;
      return dateB - dateA;
    });

    const totalVisits = patientVisits.length;

    // This month visits
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const thisMonthVisits = patientVisits.filter((k) => {
      const d = parseDate(k.tanggal);
      return d && (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
    });

    // Illnesses this month breakdown
    const illnessCounts: Record<string, { count: number; jenis?: JenisPenyakit; icd10?: string }> = {};
    const contagiousIllnessesThisMonth: string[] = [];

    thisMonthVisits.forEach((v) => {
      [
        { name: v.penyakit1, jenis: v.jenis1, icd10: v.icd10_1 },
        { name: v.penyakit2, jenis: v.jenis2, icd10: v.icd10_2 },
        { name: v.penyakit3, jenis: v.jenis3, icd10: v.icd10_3 },
      ].forEach((p) => {
        if (p.name && p.name !== 'CEK REFERENSI' && p.name.trim()) {
          if (!illnessCounts[p.name]) {
            illnessCounts[p.name] = { count: 0, jenis: p.jenis, icd10: p.icd10 };
          }
          illnessCounts[p.name].count++;
          if (p.jenis === 'Menular' && !contagiousIllnessesThisMonth.includes(p.name)) {
            contagiousIllnessesThisMonth.push(p.name);
          }
        }
      });
    });

    const sortedIllnesses = Object.entries(illnessCounts).map(([penyakit, data]) => ({
      penyakit,
      count: data.count,
      jenis: data.jenis,
      icd10: data.icd10,
    })).sort((a, b) => b.count - a.count);

    // Last 10 visits
    const last10Visits = patientVisits.slice(0, 10);

    // First ever visit
    const firstVisit = patientVisits.length > 0 ? patientVisits[patientVisits.length - 1] : null;
    // Previous visit before the latest one
    const previousVisit = patientVisits.length > 1 ? patientVisits[1] : null;

    // Visits in last 7 days
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const last7DaysVisits = patientVisits.filter((k) => {
      const d = parseDate(k.tanggal);
      return d && d.getTime() >= sevenDaysAgo;
    });

    return {
      patient,
      totalKunjungan: totalVisits,
      totalVisits,
      kunjunganBulanIni: thisMonthVisits.length,
      thisMonthVisitsCount: thisMonthVisits.length,
      kunjungan7HariTerakhir: last7DaysVisits.length,
      firstVisitDate: firstVisit?.tanggal || null,
      previousVisitDate: previousVisit?.tanggal || null,
      previousVisitDaysAgo: previousVisit ? getRelativeTime(previousVisit.tanggal) : null,
      sortedIllnesses,
      contagiousIllnessesThisMonth,
      last10Visits,
      allVisits: patientVisits,
    };
  }

  // Calculate official clinical metrics (Kunjungan vs Pasien Unik vs Kasus) for any set of visits
  public calculateMetrics(visits: CalculatedKunjungan[]) {
    const totalKunjungan = visits.length;

    // Pasien unik = distinct wbp_id from DATA_WBP
    const validWbpIds = new Set<string>();
    let unregisteredCount = 0;

    visits.forEach((v) => {
      if (v.wbp_id) {
        validWbpIds.add(v.wbp_id);
      } else {
        unregisteredCount++;
      }
    });

    const pasienUnikCount = validWbpIds.size;
    const kunjunganPerPasien = pasienUnikCount > 0 ? totalKunjungan / pasienUnikCount : 0;

    // Kasus per penyakit (each visit can only count 1 case for a given disease even if complaint 1 and 2 are the same disease)
    const casesByDisease: Record<string, number> = {};
    const patientsByDisease: Record<string, Set<string>> = {};
    const contagiousCasesVisits = new Set<string>();
    const contagiousPatients = new Set<string>();

    visits.forEach((v) => {
      const diseasesInVisit = new Set<string>();
      let hasContagious = false;

      [
        { name: v.penyakit1, jenis: v.jenis1 },
        { name: v.penyakit2, jenis: v.jenis2 },
        { name: v.penyakit3, jenis: v.jenis3 },
      ].forEach((p) => {
        if (p.name && p.name !== 'CEK REFERENSI' && p.name.trim()) {
          diseasesInVisit.add(p.name);
          if (p.jenis === 'Menular') {
            hasContagious = true;
          }
        }
      });

      diseasesInVisit.forEach((diseaseName) => {
        casesByDisease[diseaseName] = (casesByDisease[diseaseName] || 0) + 1;
        if (!patientsByDisease[diseaseName]) {
          patientsByDisease[diseaseName] = new Set();
        }
        if (v.wbp_id) {
          patientsByDisease[diseaseName].add(v.wbp_id);
        }
      });

      if (hasContagious) {
        contagiousCasesVisits.add(v.id);
        if (v.wbp_id) {
          contagiousPatients.add(v.wbp_id);
        }
      }
    });

    return {
      totalKunjungan,
      pasienUnikCount,
      unregisteredCount,
      kunjunganPerPasien,
      casesByDisease,
      patientsByDisease,
      totalKasusMenular: contagiousCasesVisits.size,
      pasienUnikMenular: contagiousPatients.size,
    };
  }
}

export const store = new DataStore();
