/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import {
  getAllWbp,
  upsertWbpSingle,
  upsertWbpBatch,
  deleteWbpById,
  clearAllWbpFromDb,
  getAllKunjungan,
  insertKunjungan,
  updateKunjunganById,
  insertKunjunganBatch,
  clearAllKunjunganFromDb,
  softDeleteKunjungan,
  restoreKunjunganById,
  permanentDeleteKunjunganById,
  getAllPenyakit,
  upsertPenyakit,
  getAllReferensi,
  upsertReferensi,
  deleteReferensiById,
  updateReferensiJenisByPenyakit,
  getSetting,
  setSetting,
  getAuditLogs,
  addAuditLog,
  getSidbHistoryList,
  addSidbHistoryEntry,
  seedPenyakitIfEmpty,
  seedReferensiIfEmpty,
  seedWbpIfEmpty,
  seedKunjunganIfEmpty,
  restoreAllTables,
  WbpInsert,
  KunjunganInsert,
  ReferensiInsert,
  PenyakitInsert,
  SidbHistoryInsert,
  AuditLogInsert,
} from './src/db/queries.ts';
import { optionalOrRequiredAuth } from './src/middleware/auth.ts';
import {
  INITIAL_KUNJUNGAN,
  INITIAL_PENGATURAN,
  INITIAL_PENYAKIT,
  INITIAL_REFERENSI,
  INITIAL_WBP,
} from './src/data/initialData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// ============================================================================
// REAL-TIME MULTI-DEVICE BROADCAST (SSE)
// ============================================================================
let syncVersion = Date.now();
const sseClients = new Set<express.Response>();

function broadcastSync(scope: string, sourceClientId?: string) {
  syncVersion += 1;
  const payload = JSON.stringify({
    type: 'sync',
    version: syncVersion,
    scope,
    sourceClientId: sourceClientId || null,
    timestamp: new Date().toISOString(),
  });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  sseClients.add(res);
  res.write(
    `data: ${JSON.stringify({ type: 'connected', version: syncVersion, timestamp: new Date().toISOString() })}\n\n`
  );

  const keepAlive = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// ============================================================================
// DATA MAPPERS (DB <-> API/Frontend Canonical Shapes)
// ============================================================================
function mapWbpFromClient(w: any): WbpInsert {
  return {
    id: String(w.id),
    no: w.no !== undefined && w.no !== null ? Number(w.no) : null,
    nik: w.nik ?? '',
    noRegInstansi: w.no_reg_instansi ?? w.noRegInstansi ?? '',
    nama: String(w.nama || ''),
    jenisKelamin: w.jenis_kelamin ?? w.jenisKelamin ?? 'Laki-laki',
    tempatLahir: w.tempat_lahir ?? w.tempatLahir ?? '',
    tanggalLahir: w.tanggal_lahir ?? w.tanggalLahir ?? '',
    alamat: w.alamat ?? '',
    namaAyah: w.nama_ayah ?? w.namaAyah ?? '',
    namaIbu: w.nama_ibu ?? w.namaIbu ?? '',
    pekerjaan: w.pekerjaan ?? '',
    jenisKejahatan: w.jenis_kejahatan ?? w.jenisKejahatan ?? '',
    kategori: w.kategori ?? 'Narapidana',
    lamaPidana: w.lama_pidana ?? w.lamaPidana ?? '',
    tanggalMasuk: w.tanggal_masuk ?? w.tanggalMasuk ?? '',
    tglEkspirasi: w.tgl_ekspirasi ?? w.tglEkspirasi ?? '',
    blok: w.blok ?? '',
    kamar: w.kamar ?? '',
    kamarSidb: w.kamar_sidb ?? w.kamarSidb ?? w.kamar ?? '',
    lokasiSel: w.lokasi_sel ?? w.lokasiSel ?? '',
    tglSuratPenahanan: w.tgl_surat_penahanan ?? w.tglSuratPenahanan ?? '',
    nomorSuratPenahanan: w.nomor_surat_penahanan ?? w.nomorSuratPenahanan ?? '',
    statusData: w.status_data ?? w.statusData ?? 'Aktif',
    batchBpjs: w.batch_bpjs ?? w.batchBpjs ?? 'Belum masuk batch',
    statusSkrining: w.status_skrining ?? w.statusSkrining ?? '',
    kendalaBpjs: w.kendala_bpjs ?? w.kendalaBpjs ?? '',
    dasarPbi: w.dasar_pbi ?? w.dasarPbi ?? '',
    catatanPenggabungan: w.catatan_penggabungan ?? w.catatanPenggabungan ?? '',
    perluDicek: Boolean(w.perlu_dicek ?? w.perluDicek ?? false),
    sumberUpdate: w.sumber_update ?? w.sumberUpdate ?? '',
    terakhirDiperbarui: w.terakhir_diperbarui ?? w.terakhirDiperbarui ?? '',
    dibuatPada: w.dibuat_pada ?? w.dibuatPada ?? '',
  };
}

function mapWbpToClient(dw: any, idx: number) {
  return {
    id: dw.id,
    no: dw.no ?? idx + 1,
    nik: dw.nik || '',
    no_reg_instansi: dw.noRegInstansi || '',
    nama: dw.nama,
    jenis_kelamin: dw.jenisKelamin || 'Laki-laki',
    tempat_lahir: dw.tempatLahir || '',
    tanggal_lahir: dw.tanggalLahir || '',
    alamat: dw.alamat || '',
    nama_ayah: dw.namaAyah || '',
    nama_ibu: dw.namaIbu || '',
    pekerjaan: dw.pekerjaan || '',
    jenis_kejahatan: dw.jenisKejahatan || '',
    kategori: dw.kategori || 'Narapidana',
    lama_pidana: dw.lamaPidana || '',
    tanggal_masuk: dw.tanggalMasuk || '',
    tgl_ekspirasi: dw.tglEkspirasi || '',
    blok: dw.blok || '',
    kamar: dw.kamar || '',
    kamar_sidb: dw.kamarSidb || dw.kamar || '',
    lokasi_sel: dw.lokasiSel || '',
    tgl_surat_penahanan: dw.tglSuratPenahanan || '',
    nomor_surat_penahanan: dw.nomorSuratPenahanan || '',
    status_data: dw.statusData || 'Aktif',
    batch_bpjs: dw.batchBpjs || 'Belum masuk batch',
    status_skrining: dw.statusSkrining || '',
    kendala_bpjs: dw.kendalaBpjs || '',
    dasar_pbi: dw.dasarPbi || '',
    catatan_penggabungan: dw.catatanPenggabungan || '',
    perlu_dicek: Boolean(dw.perluDicek),
    sumber_update: dw.sumberUpdate || '',
    terakhir_diperbarui: dw.terakhirDiperbarui || '',
    dibuat_pada: dw.dibuatPada || (dw.createdAt ? new Date(dw.createdAt).toISOString() : ''),
  };
}

function mapKunjunganFromClient(k: any): KunjunganInsert {
  return {
    id: String(k.id),
    tanggal: String(k.tanggal || ''),
    wbpId: k.wbp_id ?? k.wbpId ?? null,
    nama: String(k.nama || ''),
    nik: k.nik ?? '',
    kamar: k.kamar ?? '',
    keluhan1: k.keluhan1 ?? '',
    keluhan2: k.keluhan2 ?? '',
    keluhan3: k.keluhan3 ?? '',
    penyakit1: k.penyakit1 ?? '',
    jenis1: k.jenis1 ?? '',
    penyakit2: k.penyakit2 ?? '',
    jenis2: k.jenis2 ?? '',
    penyakit3: k.penyakit3 ?? '',
    jenis3: k.jenis3 ?? '',
    terapi: k.terapi ?? '',
    dokterPemeriksa: k.dokter_pemeriksa ?? k.dokterPemeriksa ?? '',
    perawat: k.perawat ?? '',
    catatan: k.catatan ?? '',
    dihapus: Boolean(k.dihapus ?? false),
    dibuatPada: k.dibuat_pada ?? k.dibuatPada ?? new Date().toISOString(),
    diubahPada: k.diubah_pada ?? k.diubahPada ?? null,
  };
}

function mapKunjunganToClient(dk: any) {
  return {
    id: dk.id,
    tanggal: dk.tanggal,
    wbp_id: dk.wbpId || '',
    nama: dk.nama,
    nik: dk.nik || '',
    kamar: dk.kamar || '',
    keluhan1: dk.keluhan1 || '',
    keluhan2: dk.keluhan2 || '',
    keluhan3: dk.keluhan3 || '',
    penyakit1: dk.penyakit1 || '',
    jenis1: dk.jenis1 || undefined,
    penyakit2: dk.penyakit2 || '',
    jenis2: dk.jenis2 || undefined,
    penyakit3: dk.penyakit3 || '',
    jenis3: dk.jenis3 || undefined,
    terapi: dk.terapi || '',
    dokter_pemeriksa: dk.dokterPemeriksa || '',
    perawat: dk.perawat || '',
    catatan: dk.catatan || '',
    dihapus: Boolean(dk.dihapus),
    dibuat_pada: dk.dibuatPada || (dk.createdAt ? new Date(dk.createdAt).toISOString() : new Date().toISOString()),
    diubah_pada: dk.diubahPada || undefined,
  };
}

function mapReferensiFromClient(r: any): ReferensiInsert {
  return {
    id: String(r.id),
    keluhan: String(r.keluhan || ''),
    masukPenyakit: r.masuk_penyakit ?? r.masukPenyakit ?? '',
    kodeIcd10: r.kode_icd10 ?? r.kodeIcd10 ?? '',
    namaIcd10: r.nama_icd10 ?? r.namaIcd10 ?? '',
    jenis: r.jenis ?? 'Tidak Menular',
    catatan: r.catatan ?? '',
  };
}

function mapReferensiToClient(r: any) {
  return {
    id: r.id,
    keluhan: r.keluhan,
    masuk_penyakit: r.masukPenyakit || '',
    kode_icd10: r.kodeIcd10 || '',
    nama_icd10: r.namaIcd10 || '',
    jenis: r.jenis || 'Tidak Menular',
    catatan: r.catatan || '',
  };
}

function mapPenyakitFromClient(p: any, idx: number): PenyakitInsert {
  return {
    id: String(p.id),
    kategori: String(p.kategori || ''),
    penyakit: String(p.penyakit || ''),
    jenis: String(p.jenis || 'Tidak Menular'),
    urutan: p.urutan !== undefined ? Number(p.urutan) : idx + 1,
  };
}

function mapPenyakitToClient(p: any) {
  return {
    id: p.id,
    kategori: p.kategori,
    penyakit: p.penyakit,
    jenis: p.jenis,
    urutan: p.urutan,
  };
}

function mapSidbFromClient(h: any): SidbHistoryInsert {
  return {
    id: String(h.id),
    tanggal: String(h.tanggal || new Date().toISOString()),
    namaFile: String(h.nama_file ?? h.namaFile ?? ''),
    totalBaris: Number(h.total_baris ?? h.totalBaris ?? 0),
    wbpBaru: Number(h.wbp_baru ?? h.wbpBaru ?? 0),
    wbpDiperbarui: Number(h.wbp_diperbarui ?? h.wbpDiperbarui ?? 0),
    wbpDitandaiCek: Number(h.wbp_ditandai_cek ?? h.wbpDitandaiCek ?? 0),
  };
}

function mapSidbToClient(h: any) {
  return {
    id: h.id,
    tanggal: h.tanggal,
    nama_file: h.namaFile,
    total_baris: h.totalBaris ?? 0,
    wbp_baru: h.wbpBaru ?? 0,
    wbp_diperbarui: h.wbpDiperbarui ?? 0,
    wbp_ditandai_cek: h.wbpDitandaiCek ?? 0,
  };
}

function mapAuditToClient(a: any) {
  return {
    id: a.id,
    waktu: a.waktu,
    aksi: a.aksi,
    rincian: a.rincian,
    perangkat: a.perangkat || '',
  };
}

// ============================================================================
// INITIAL SEEDING (ONLY ONCE ON FRESH DB)
// ============================================================================
async function seedInitialDataIfEmpty() {
  try {
    await seedPenyakitIfEmpty(INITIAL_PENYAKIT.map((p, idx) => mapPenyakitFromClient(p, idx)));
    await seedReferensiIfEmpty(INITIAL_REFERENSI.map(mapReferensiFromClient));

    const seededFlag = await getSetting('seeded_v1');
    if (!seededFlag) {
      await seedWbpIfEmpty(INITIAL_WBP.map(mapWbpFromClient));
      await seedKunjunganIfEmpty(INITIAL_KUNJUNGAN.map(mapKunjunganFromClient));
      const existingSettings = await getSetting('app_settings');
      if (!existingSettings) {
        await setSetting('app_settings', INITIAL_PENGATURAN);
      }
      await setSetting('seeded_v1', true);
    } else {
      const existingSettings = await getSetting('app_settings');
      if (!existingSettings) {
        await setSetting('app_settings', INITIAL_PENGATURAN);
      }
    }
  } catch (err) {
    console.error('Initial seeding notice:', err);
  }
}

async function buildFullSnapshot() {
  const [wbpRows, kunjunganRows, referensiRows, penyakitRows, appSettings, sidbRows, auditRows] =
    await Promise.all([
      getAllWbp(),
      getAllKunjungan(),
      getAllReferensi(),
      getAllPenyakit(),
      getSetting('app_settings'),
      getSidbHistoryList(),
      getAuditLogs(500),
    ]);

  return {
    version: syncVersion,
    wbp: wbpRows.map(mapWbpToClient),
    kunjungan: kunjunganRows.map(mapKunjunganToClient),
    referensi: referensiRows.map(mapReferensiToClient),
    penyakit: penyakitRows.map(mapPenyakitToClient),
    pengaturan: appSettings || INITIAL_PENGATURAN,
    sidb_history: sidbRows.map(mapSidbToClient),
    audit_logs: auditRows.map(mapAuditToClient),
  };
}

// ============================================================================
// FULL SNAPSHOT & BACKUP ENDPOINTS
// ============================================================================
app.get('/api/sync/state', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const snapshot = await buildFullSnapshot();
    res.json(snapshot);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backup/export', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const snapshot = await buildFullSnapshot();
    res.json({
      version: '2.0',
      app_name: 'Klinik Pratama Lapas Kelas IIB Dompu',
      exported_at: new Date().toISOString(),
      counts: {
        wbp: snapshot.wbp.length,
        kunjungan_total: snapshot.kunjungan.length,
        kunjungan_aktif: snapshot.kunjungan.filter((k: any) => !k.dihapus).length,
        kunjungan_sampah: snapshot.kunjungan.filter((k: any) => k.dihapus).length,
        referensi: snapshot.referensi.length,
        penyakit: snapshot.penyakit.length,
        sidb_history: snapshot.sidb_history.length,
        audit_logs: snapshot.audit_logs.length,
      },
      wbp: snapshot.wbp,
      kunjungan: snapshot.kunjungan,
      referensi: snapshot.referensi,
      penyakit: snapshot.penyakit,
      pengaturan: snapshot.pengaturan,
      sidb_history: snapshot.sidb_history,
      audit_logs: snapshot.audit_logs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/backup/restore', optionalOrRequiredAuth, async (req, res) => {
  try {
    const data = req.body;
    const clientId = req.headers['x-client-id'] as string | undefined;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Format cadangan tidak valid' });
    }

    const wbpRows: WbpInsert[] = Array.isArray(data.wbp) ? data.wbp.map(mapWbpFromClient) : [];
    const wbpIdSet = new Set(wbpRows.map((w) => w.id));
    const kunjunganRows: KunjunganInsert[] = Array.isArray(data.kunjungan)
      ? data.kunjungan.map((k: any) => {
          const mapped = mapKunjunganFromClient(k);
          if (mapped.wbpId && !wbpIdSet.has(mapped.wbpId)) {
            mapped.wbpId = null;
          }
          return mapped;
        })
      : [];
    const referensiRows: ReferensiInsert[] = Array.isArray(data.referensi)
      ? data.referensi.map(mapReferensiFromClient)
      : INITIAL_REFERENSI.map(mapReferensiFromClient);
    const penyakitRows: PenyakitInsert[] = Array.isArray(data.penyakit)
      ? data.penyakit.map((p: any, idx: number) => mapPenyakitFromClient(p, idx))
      : INITIAL_PENYAKIT.map((p, idx) => mapPenyakitFromClient(p, idx));
    const sidbRows: SidbHistoryInsert[] = Array.isArray(data.sidb_history)
      ? data.sidb_history.map(mapSidbFromClient)
      : [];
    const auditRows: AuditLogInsert[] = Array.isArray(data.audit_logs)
      ? data.audit_logs.map((a: any) => ({
          id: String(a.id),
          waktu: String(a.waktu || new Date().toISOString()),
          aksi: String(a.aksi || 'Log'),
          rincian: String(a.rincian || ''),
          perangkat: a.perangkat ?? '',
        }))
      : [];

    await restoreAllTables({
      wbp: wbpRows,
      kunjungan: kunjunganRows,
      referensi: referensiRows,
      penyakit: penyakitRows,
      pengaturan: data.pengaturan ? { ...INITIAL_PENGATURAN, ...data.pengaturan } : INITIAL_PENGATURAN,
      sidbHistory: sidbRows,
      auditLogs: auditRows,
    });

    broadcastSync('full_restore', clientId);
    res.json({ success: true, version: syncVersion });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system/factory-reset', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    await restoreAllTables({
      wbp: INITIAL_WBP.map(mapWbpFromClient),
      kunjungan: INITIAL_KUNJUNGAN.map(mapKunjunganFromClient),
      referensi: INITIAL_REFERENSI.map(mapReferensiFromClient),
      penyakit: INITIAL_PENYAKIT.map((p, idx) => mapPenyakitFromClient(p, idx)),
      pengaturan: INITIAL_PENGATURAN,
      sidbHistory: [],
      auditLogs: [],
    });
    broadcastSync('factory_reset', clientId);
    res.json({ success: true, version: syncVersion });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// WBP ENDPOINTS
// ============================================================================
app.get('/api/wbp', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const list = await getAllWbp();
    res.json(list.map(mapWbpToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wbp', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const saved = await upsertWbpSingle(mapWbpFromClient(req.body));
    broadcastSync('wbp', clientId);
    res.json(mapWbpToClient(saved, 0));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/wbp/:id', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const saved = await upsertWbpSingle(mapWbpFromClient({ ...req.body, id: req.params.id }));
    broadcastSync('wbp', clientId);
    res.json(mapWbpToClient(saved, 0));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/wbp/all', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const result = await clearAllWbpFromDb();
    broadcastSync('wbp', clientId);
    res.json({ message: 'All WBP deleted', count: result.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/wbp/:id', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const result = await deleteWbpById(req.params.id);
    broadcastSync('wbp', clientId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wbp/batch', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const items = Array.isArray(req.body) ? req.body.map(mapWbpFromClient) : [];
    const result = await upsertWbpBatch(items);
    broadcastSync('wbp', clientId);
    res.json(result.map(mapWbpToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// KUNJUNGAN ENDPOINTS
// ============================================================================
app.get('/api/kunjungan', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const list = await getAllKunjungan();
    res.json(list.map(mapKunjunganToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kunjungan', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const payload = mapKunjunganFromClient(req.body);
    if (payload.wbpId === '') payload.wbpId = null;
    const result = await insertKunjungan(payload);
    broadcastSync('kunjungan', clientId);
    res.json(mapKunjunganToClient(result));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/kunjungan/:id', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const payload = mapKunjunganFromClient({ ...req.body, id: req.params.id });
    if (payload.wbpId === '') payload.wbpId = null;
    const result = await updateKunjunganById(req.params.id, {
      ...payload,
      diubahPada: new Date().toISOString(),
    });
    broadcastSync('kunjungan', clientId);
    res.json(result ? mapKunjunganToClient(result) : null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kunjungan/batch', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const items = Array.isArray(req.body)
      ? req.body.map((k) => {
          const mapped = mapKunjunganFromClient(k);
          if (mapped.wbpId === '') mapped.wbpId = null;
          return mapped;
        })
      : [];
    const result = await insertKunjunganBatch(items);
    broadcastSync('kunjungan', clientId);
    res.json(result.map(mapKunjunganToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/kunjungan/all', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const result = await clearAllKunjunganFromDb();
    broadcastSync('kunjungan', clientId);
    res.json({ message: 'All visits deleted', count: result.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/kunjungan/:id/restore', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const result = await restoreKunjunganById(req.params.id);
    broadcastSync('kunjungan', clientId);
    res.json(result.map(mapKunjunganToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/kunjungan/:id/permanent', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const result = await permanentDeleteKunjunganById(req.params.id);
    broadcastSync('kunjungan', clientId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/kunjungan/:id', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const result = await softDeleteKunjungan(req.params.id);
    broadcastSync('kunjungan', clientId);
    res.json(result.map(mapKunjunganToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PENYAKIT & REFERENSI ICD-10 ENDPOINTS
// ============================================================================
app.get('/api/penyakit', async (_req, res) => {
  try {
    const list = await getAllPenyakit();
    res.json(list.map(mapPenyakitToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/penyakit', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const saved = await upsertPenyakit(mapPenyakitFromClient(req.body, 0));
    broadcastSync('penyakit', clientId);
    res.json(mapPenyakitToClient(saved));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/penyakit/:id', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const saved = await upsertPenyakit(mapPenyakitFromClient({ ...req.body, id: req.params.id }, 0));
    if (req.body.jenis && req.body.penyakit) {
      await updateReferensiJenisByPenyakit(req.body.penyakit, req.body.jenis);
    }
    broadcastSync('penyakit', clientId);
    res.json(mapPenyakitToClient(saved));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/referensi', async (_req, res) => {
  try {
    const list = await getAllReferensi();
    res.json(list.map(mapReferensiToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/referensi', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const saved = await upsertReferensi(mapReferensiFromClient(req.body));
    broadcastSync('referensi', clientId);
    res.json(mapReferensiToClient(saved));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/referensi/:id', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const saved = await upsertReferensi(mapReferensiFromClient({ ...req.body, id: req.params.id }));
    broadcastSync('referensi', clientId);
    res.json(mapReferensiToClient(saved));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/referensi/:id', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const result = await deleteReferensiById(req.params.id);
    broadcastSync('referensi', clientId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PENGATURAN, SIDB HISTORY & AUDIT LOG ENDPOINTS
// ============================================================================
app.get('/api/pengaturan/:key', async (req, res) => {
  try {
    const value = await getSetting(req.params.key);
    res.json(value);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pengaturan/:key', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const result = await setSetting(req.params.key, req.body);
    broadcastSync('pengaturan', clientId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sidb-history', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const list = await getSidbHistoryList();
    res.json(list.map(mapSidbToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sidb-history', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const saved = await addSidbHistoryEntry(mapSidbFromClient(req.body));
    broadcastSync('sidb_history', clientId);
    res.json(saved ? mapSidbToClient(saved) : null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/audit', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const list = await getAuditLogs(500);
    res.json(list.map(mapAuditToClient));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audit', optionalOrRequiredAuth, async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const result = await addAuditLog(req.body);
    broadcastSync('audit', clientId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Setup Vite middlewares for Frontend SPA
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server Klinik Lapas Dompu running on http://0.0.0.0:${port}`);
    seedInitialDataIfEmpty();
  });
}

startServer();
