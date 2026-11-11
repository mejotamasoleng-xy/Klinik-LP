/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Mandatory users table per cloudsql-setup skill
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Master Warga Binaan Pemasyarakatan (DATA_WBP)
export const wbp = pgTable('wbp', {
  id: text('id').primaryKey(),
  nama: text('nama').notNull(),
  nik: text('nik'),
  noRegInstansi: text('no_reg_instansi'),
  tempatLahir: text('tempat_lahir'),
  tanggalLahir: text('tanggal_lahir'),
  blok: text('blok').default(''),
  kamar: text('kamar').default(''),
  alamat: text('alamat'),
  statusData: text('status_data').default('Aktif'),
  batchBpjs: text('batch_bpjs').default('Belum masuk batch'),
  perluDicek: boolean('perlu_dicek').default(false),
  kendalaBpjs: text('kendala_bpjs'),
  dasarPbi: text('dasar_pbi'),
  sumberUpdate: text('sumber_update'),
  terakhirDiperbarui: text('terakhir_diperbarui'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Catatan Kunjungan Rawat Jalan Harian (INPUT_HARIAN)
export const kunjungan = pgTable('kunjungan', {
  id: text('id').primaryKey(),
  tanggal: text('tanggal').notNull(), // dd/mm/yyyy
  wbpId: text('wbp_id').references(() => wbp.id),
  nama: text('nama').notNull(),
  kamar: text('kamar').default(''),
  keluhan1: text('keluhan1'),
  keluhan2: text('keluhan2'),
  keluhan3: text('keluhan3'),
  penyakit1: text('penyakit1'),
  jenis1: text('jenis1'),
  penyakit2: text('penyakit2'),
  jenis2: text('jenis2'),
  penyakit3: text('penyakit3'),
  jenis3: text('jenis3'),
  terapi: text('terapi'),
  dokterPemeriksa: text('dokter_pemeriksa'),
  perawat: text('perawat'),
  catatan: text('catatan'),
  dihapus: boolean('dihapus').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Master 88 Penyakit dalam 14 Kategori (DAFTAR_PENYAKIT)
export const daftarPenyakit = pgTable('daftar_penyakit', {
  id: text('id').primaryKey(),
  kategori: text('kategori').notNull(),
  penyakit: text('penyakit').notNull(),
  jenis: text('jenis').notNull(), // Menular / Tidak Menular
  urutan: integer('urutan').notNull(),
});

// Master Referensi ICD-10 (REFERENSI_ICD10)
export const referensiIcd10 = pgTable('referensi_icd10', {
  id: text('id').primaryKey(),
  keluhan: text('keluhan').notNull(),
  masukPenyakit: text('masuk_penyakit'),
  kodeIcd10: text('kode_icd10'),
  namaIcd10: text('nama_icd10'),
  jenis: text('jenis').default('Tidak Menular'),
  catatan: text('catatan'),
});

// Pengaturan Aplikasi & Ambang Batas Klinis
export const pengaturanApp = pgTable('pengaturan_app', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

// Audit Log Aktivitas Petugas
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  waktu: text('waktu').notNull(),
  aksi: text('aksi').notNull(),
  rincian: text('rincian').notNull(),
  perangkat: text('perangkat'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Drizzle relations
export const wbpRelations = relations(wbp, ({ many }) => ({
  kunjungan: many(kunjungan),
}));

export const kunjunganRelations = relations(kunjungan, ({ one }) => ({
  pasien: one(wbp, {
    fields: [kunjungan.wbpId],
    references: [wbp.id],
  }),
}));
