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
  upsertWbpBatch,
  getAllKunjungan,
  insertKunjungan,
  insertKunjunganBatch,
  clearAllKunjunganFromDb,
  clearAllWbpFromDb,
  softDeleteKunjungan,
  getAllPenyakit,
  getAllReferensi,
  getSetting,
  setSetting,
  getAuditLogs,
  addAuditLog,
} from './src/db/queries.ts';
import { optionalOrRequiredAuth } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { daftarPenyakit, referensiIcd10, wbp, kunjungan } from './src/db/schema.ts';
import {
  INITIAL_PENYAKIT,
  INITIAL_REFERENSI,
  INITIAL_WBP,
} from './src/data/initialData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Seed master records into Cloud SQL if empty
async function seedInitialDataIfEmpty() {
  try {
    const existingPenyakit = await getAllPenyakit();
    if (existingPenyakit.length === 0) {
      console.log('Seeding initial 88 diseases into Cloud SQL...');
      await db.insert(daftarPenyakit).values(
        INITIAL_PENYAKIT.map((p, idx) => ({
          id: p.id,
          kategori: p.kategori,
          penyakit: p.penyakit,
          jenis: p.jenis,
          urutan: p.urutan || (idx + 1),
        }))
      );
    }

    const existingRef = await getAllReferensi();
    if (existingRef.length === 0) {
      console.log('Seeding initial ICD-10 reference into Cloud SQL...');
      await db.insert(referensiIcd10).values(
        INITIAL_REFERENSI.map((r) => ({
          id: r.id,
          keluhan: r.keluhan,
          masukPenyakit: r.masuk_penyakit,
          kodeIcd10: r.kode_icd10,
          namaIcd10: r.nama_icd10,
          jenis: r.jenis,
          catatan: r.catatan,
        }))
      );
    }

    const existingWbp = await getAllWbp();
    if (existingWbp.length === 0) {
      console.log('Seeding initial WBP into Cloud SQL...');
      await db.insert(wbp).values(
        INITIAL_WBP.map((w) => ({
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
          sumberUpdate: w.sumber_update || '',
          terakhirDiperbarui: w.terakhir_diperbarui || '',
        }))
      );
    }
  } catch (err) {
    console.error('Initial seeding notice (may already exist or proxy initializing):', err);
  }
}

// REST API Endpoints for Cloud SQL
app.get('/api/wbp', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const list = await getAllWbp();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wbp/batch', optionalOrRequiredAuth, async (req, res) => {
  try {
    const items = req.body;
    const result = await upsertWbpBatch(items);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/kunjungan', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const list = await getAllKunjungan();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kunjungan', optionalOrRequiredAuth, async (req, res) => {
  try {
    const item = req.body;
    const result = await insertKunjungan(item);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kunjungan/batch', optionalOrRequiredAuth, async (req, res) => {
  try {
    const items = req.body;
    const result = await insertKunjunganBatch(items);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/kunjungan/all', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const result = await clearAllKunjunganFromDb();
    res.json({ message: 'All visits deleted', count: result.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/wbp/all', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const result = await clearAllWbpFromDb();
    res.json({ message: 'All WBP deleted', count: result.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/kunjungan/:id', optionalOrRequiredAuth, async (req, res) => {
  try {
    const result = await softDeleteKunjungan(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/penyakit', async (_req, res) => {
  try {
    const list = await getAllPenyakit();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/referensi', async (_req, res) => {
  try {
    const list = await getAllReferensi();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
    const result = await setSetting(req.params.key, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/audit', optionalOrRequiredAuth, async (_req, res) => {
  try {
    const list = await getAuditLogs();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audit', optionalOrRequiredAuth, async (req, res) => {
  try {
    const result = await addAuditLog(req.body);
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

  app.listen(port, () => {
    console.log(`Server Klinik Lapas Dompu running on port ${port}`);
    seedInitialDataIfEmpty();
  });
}

startServer();
