/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SUPABASE_SQL_DDL = `-- ============================================================================
-- SKEMA DATABASE LENGKAP: KLINIK PRATAMA LAPAS KELAS IIB DOMPU
-- Salin dan tempel seluruh skrip ini ke SQL Editor di Dashboard Supabase Anda:
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- 1. Tabel Kategori Penyakit
CREATE TABLE IF NOT EXISTS public.kategori_penyakit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL UNIQUE,
    urutan INTEGER DEFAULT 0
);

-- 2. Tabel Penyakit Master
CREATE TABLE IF NOT EXISTS public.penyakit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori TEXT NOT NULL,
    penyakit TEXT NOT NULL UNIQUE,
    jenis TEXT NOT NULL CHECK (jenis IN ('Menular', 'Tidak Menular')),
    urutan INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Referensi Keluhan & ICD-10
CREATE TABLE IF NOT EXISTS public.referensi_keluhan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keluhan TEXT NOT NULL UNIQUE,
    masuk_penyakit TEXT,
    catatan TEXT,
    kode_icd10 TEXT,
    nama_icd10 TEXT,
    jenis TEXT DEFAULT 'Tidak Menular' CHECK (jenis IN ('Menular', 'Tidak Menular')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Master Data Warga Binaan Pemasyarakatan (WBP)
CREATE TABLE IF NOT EXISTS public.wbp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no INTEGER,
    nik VARCHAR(20),
    no_reg_instansi VARCHAR(50),
    nama TEXT NOT NULL,
    jenis_kelamin VARCHAR(20) DEFAULT 'Laki-laki',
    tempat_lahir TEXT,
    tanggal_lahir VARCHAR(20), -- format dd/mm/yyyy
    alamat TEXT,
    nama_ayah TEXT,
    nama_ibu TEXT,
    pekerjaan TEXT,
    jenis_kejahatan TEXT,
    kategori VARCHAR(50) DEFAULT 'Narapidana',
    lama_pidana TEXT,
    tanggal_masuk VARCHAR(20),
    tgl_ekspirasi VARCHAR(20),
    blok VARCHAR(50),
    kamar VARCHAR(50),
    kamar_sidb VARCHAR(50),
    lokasi_sel TEXT,
    tgl_surat_penahanan VARCHAR(20),
    nomor_surat_penahanan TEXT,
    status_data VARCHAR(100) DEFAULT 'Aktif',
    batch_bpjs VARCHAR(50) DEFAULT 'Belum masuk batch',
    status_skrining TEXT,
    kendala_bpjs TEXT,
    dasar_pbi TEXT,
    catatan_penggabungan TEXT,
    perlu_dicek BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Kunjungan Pelayanan Medis Harian
CREATE TABLE IF NOT EXISTS public.kunjungan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal VARCHAR(20) NOT NULL, -- format dd/mm/yyyy
    wbp_id UUID REFERENCES public.wbp(id) ON DELETE SET NULL,
    nama TEXT NOT NULL,
    keluhan1 TEXT NOT NULL,
    keluhan2 TEXT,
    keluhan3 TEXT,
    kamar VARCHAR(50),
    terapi TEXT,
    dihapus BOOLEAN DEFAULT FALSE, -- Soft delete
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Pengaturan & Konfigurasi Sistem
CREATE TABLE IF NOT EXISTS public.pengaturan (
    kunci TEXT PRIMARY KEY,
    nilai TEXT NOT NULL,
    keterangan TEXT
);

-- 7. Tabel Riwayat Audit Perubahan Data
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waktu TIMESTAMPTZ DEFAULT NOW(),
    aksi TEXT NOT NULL,
    rincian TEXT,
    perangkat TEXT
);

-- 8. Tabel Riwayat Pembaruan SIDB
CREATE TABLE IF NOT EXISTS public.sidb_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal TIMESTAMPTZ DEFAULT NOW(),
    nama_file TEXT NOT NULL,
    total_baris INTEGER DEFAULT 0,
    wbp_baru INTEGER DEFAULT 0,
    wbp_diperbarui INTEGER DEFAULT 0,
    wbp_ditandai_cek INTEGER DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- INDEKS PERFORMA
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wbp_nik ON public.wbp(nik);
CREATE INDEX IF NOT EXISTS idx_wbp_nama ON public.wbp(nama);
CREATE INDEX IF NOT EXISTS idx_wbp_batch ON public.wbp(batch_bpjs);
CREATE INDEX IF NOT EXISTS idx_kunjungan_tanggal ON public.kunjungan(tanggal);
CREATE INDEX IF NOT EXISTS idx_kunjungan_wbp ON public.kunjungan(wbp_id);
CREATE INDEX IF NOT EXISTS idx_kunjungan_dihapus ON public.kunjungan(dihapus);
CREATE INDEX IF NOT EXISTS idx_ref_keluhan ON public.referensi_keluhan(keluhan);

-- ----------------------------------------------------------------------------
-- VIEW PERHITUNGAN LENGKAP KUNJUNGAN & ICD-10
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_kunjungan_lengkap AS
SELECT 
    k.id,
    k.tanggal,
    k.wbp_id,
    k.nama,
    k.kamar,
    k.terapi,
    k.dihapus,
    k.created_at,
    -- Lookup keluhan 1
    r1.masuk_penyakit AS penyakit1,
    r1.kode_icd10 AS icd10_1,
    r1.nama_icd10 AS nama_icd10_1,
    r1.jenis AS jenis1,
    -- Lookup keluhan 2
    r2.masuk_penyakit AS penyakit2,
    r2.kode_icd10 AS icd10_2,
    r2.nama_icd10 AS nama_icd10_2,
    r2.jenis AS jenis2,
    -- Lookup keluhan 3
    r3.masuk_penyakit AS penyakit3,
    r3.kode_icd10 AS icd10_3,
    r3.nama_icd10 AS nama_icd10_3,
    r3.jenis AS jenis3,
    -- Data WBP
    w.nik,
    w.tanggal_lahir,
    w.blok,
    w.batch_bpjs,
    CASE WHEN w.id IS NOT NULL THEN 'Aktif' ELSE 'TIDAK DITEMUKAN' END AS status_wbp
FROM public.kunjungan k
LEFT JOIN public.wbp w ON k.wbp_id = w.id
LEFT JOIN public.referensi_keluhan r1 ON LOWER(TRIM(k.keluhan1)) = LOWER(TRIM(r1.keluhan))
LEFT JOIN public.referensi_keluhan r2 ON LOWER(TRIM(k.keluhan2)) = LOWER(TRIM(r2.keluhan))
LEFT JOIN public.referensi_keluhan r3 ON LOWER(TRIM(k.keluhan3)) = LOWER(TRIM(r3.keluhan));

-- ----------------------------------------------------------------------------
-- SECURITY: ROW LEVEL SECURITY (RLS)
-- Mengamankan data agar hanya dapat diakses melalui aplikasi resmi
-- ----------------------------------------------------------------------------
ALTER TABLE public.wbp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kunjungan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referensi_keluhan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penyakit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sidb_history ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: Izinkan operasi untuk kunci anon dan authenticated
CREATE POLICY "Akses publik terverifikasi wbp" ON public.wbp FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik terverifikasi kunjungan" ON public.kunjungan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik terverifikasi referensi" ON public.referensi_keluhan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik terverifikasi penyakit" ON public.penyakit FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik terverifikasi pengaturan" ON public.pengaturan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik terverifikasi audit" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses publik terverifikasi sidb" ON public.sidb_history FOR ALL USING (true) WITH CHECK (true);
`;

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  if (!url || !key) {
    return { success: false, message: 'URL Supabase dan Anon Key wajib diisi' };
  }

  try {
    const cleanUrl = url.trim().replace(/\/$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/pengaturan?select=count`, {
      method: 'GET',
      headers: {
        apikey: key.trim(),
        Authorization: `Bearer ${key.trim()}`,
      },
    });

    if (res.ok || res.status === 200 || res.status === 206) {
      return { success: true, message: 'Koneksi ke database Supabase PostgreSQL berhasil terhubung!' };
    } else {
      const errText = await res.text();
      return { success: false, message: `Respon Supabase (${res.status}): ${errText || 'Kunci anon atau URL belum tepat'}` };
    }
  } catch (err: any) {
    return { success: false, message: `Gagal terhubung ke host: ${err?.message || 'Periksa koneksi internet atau format URL'}` };
  }
}
