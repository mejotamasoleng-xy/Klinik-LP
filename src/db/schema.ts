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

// Master Warga Binaan Pemasyarakatan (DATA_WBP - 30 Kolom Lengkap)
export const wbp = pgTable('wbp', {
  id: text('id').primaryKey(),
  no: integer('no'),
  nik: text('nik'),
  noRegInstansi: text('no_reg_instansi'),
  nama: text('nama').notNull(),
  jenisKelamin: text('jenis_kelamin').default('Laki-laki'),
  tempatLahir: text('tempat_lahir'),
  tanggalLahir: text('tanggal_lahir'),
  alamat: text('alamat'),
  namaAyah: text('nama_ayah'),
  namaIbu: text('nama_ibu'),
  pekerjaan: text('pekerjaan'),
  jenisKejahatan: text('jenis_kejahatan'),
  kategori: text('kategori').default('Narapidana'),
  lamaPidana: text('lama_pidana'),
  tanggalMasuk: text('tanggal_masuk'),
  tglEkspirasi: text('tgl_ekspirasi'),
  blok: text('blok').default(''),
  kamar: text('kamar').default(''),
  kamarSidb: text('kamar_sidb').default(''),
  lokasiSel: text('lokasi_sel'),
  tglSuratPenahanan: text('tgl_surat_penahanan'),
  nomorSuratPenahanan: text('nomor_surat_penahanan'),
  statusData: text('status_data').default('Aktif'),
  batchBpjs: text('batch_bpjs').default('Belum masuk batch'),
  statusSkrining: text('status_skrining'),
  kendalaBpjs: text('kendala_bpjs'),
  dasarPbi: text('dasar_pbi'),
  catatanPenggabungan: text('catatan_penggabungan'),
  perluDicek: boolean('perlu_dicek').default(false),
  sumberUpdate: text('sumber_update'),
  terakhirDiperbarui: text('terakhir_diperbarui'),
  dibuatPada: text('dibuat_pada'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Catatan Kunjungan Rawat Jalan Harian (INPUT_HARIAN)
export const kunjungan = pgTable('kunjungan', {
  id: text('id').primaryKey(),
  tanggal: text('tanggal').notNull(), // dd/mm/yyyy
  wbpId: text('wbp_id').references(() => wbp.id, { onDelete: 'set null' }),
  nama: text('nama').notNull(),
  nik: text('nik'),
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
  dibuatPada: text('dibuat_pada'),
  diubahPada: text('diubah_pada'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Master 88+ Penyakit dalam 14 Kategori (DAFTAR_PENYAKIT)
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

// Riwayat Pembaruan SIDB
export const sidbHistory = pgTable('sidb_history', {
  id: text('id').primaryKey(),
  tanggal: text('tanggal').notNull(),
  namaFile: text('nama_file').notNull(),
  totalBaris: integer('total_baris').default(0),
  wbpBaru: integer('wbp_baru').default(0),
  wbpDiperbarui: integer('wbp_diperbarui').default(0),
  wbpDitandaiCek: integer('wbp_ditandai_cek').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const katalogObat = pgTable('katalog_obat', {
  id: text('id').primaryKey(),
  no: integer('no').notNull().unique(),
  namaTampilanObat: text('nama_tampilan_obat').notNull(),
  namaDasar: text('nama_dasar').notNull(),
  kekuatanSediaan: text('kekuatan_sediaan').notNull(),
  satuanTerkecil: text('satuan_terkecil').notNull(),
  isiPerKotak: integer('isi_per_kotak').notNull(),
  satuanIsi: text('satuan_isi').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const clinicAuth = pgTable('clinic_auth', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const authSessions = pgTable('auth_sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appMigrations = pgTable('app_migrations', {
  key: text('key').primaryKey(),
  appliedAt: timestamp('applied_at').defaultNow(),
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
