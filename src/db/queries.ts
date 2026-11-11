/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import {
  wbp,
  kunjungan,
  daftarPenyakit,
  referensiIcd10,
  pengaturanApp,
  auditLogs,
  users,
} from './schema.ts';

// WBP Queries
export async function getAllWbp() {
  try {
    return await db.select().from(wbp);
  } catch (error) {
    console.error('Failed to fetch WBP:', error);
    throw new Error('Database query failed for WBP.', { cause: error });
  }
}

export async function upsertWbpBatch(records: (typeof wbp.$inferInsert)[]) {
  try {
    if (!records.length) return [];
    return await db
      .insert(wbp)
      .values(records)
      .onConflictDoUpdate({
        target: wbp.id,
        set: {
          nama: records[0]?.nama,
          nik: records[0]?.nik,
          noRegInstansi: records[0]?.noRegInstansi,
          blok: records[0]?.blok,
          kamar: records[0]?.kamar,
          batchBpjs: records[0]?.batchBpjs,
          perluDicek: records[0]?.perluDicek,
          terakhirDiperbarui: records[0]?.terakhirDiperbarui,
        },
      })
      .returning();
  } catch (error) {
    console.error('Failed to upsert WBP:', error);
    throw new Error('Failed to save WBP records.', { cause: error });
  }
}

// Kunjungan Queries
export async function getAllKunjungan() {
  try {
    return await db.select().from(kunjungan).orderBy(desc(kunjungan.createdAt));
  } catch (error) {
    console.error('Failed to fetch Kunjungan:', error);
    throw new Error('Database query failed for Kunjungan.', { cause: error });
  }
}

export async function insertKunjungan(record: typeof kunjungan.$inferInsert) {
  try {
    const result = await db.insert(kunjungan).values(record).returning();
    return result[0];
  } catch (error) {
    console.error('Failed to insert Kunjungan:', error);
    throw new Error('Failed to record visit.', { cause: error });
  }
}

export async function insertKunjunganBatch(records: (typeof kunjungan.$inferInsert)[]) {
  try {
    if (!records.length) return [];
    const chunkSize = 100;
    const results = [];
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const res = await db.insert(kunjungan).values(chunk).onConflictDoNothing().returning();
      results.push(...res);
    }
    return results;
  } catch (error) {
    console.error('Failed to batch insert Kunjungan:', error);
    throw new Error('Failed to record batch visits.', { cause: error });
  }
}

export async function clearAllKunjunganFromDb() {
  try {
    return await db.delete(kunjungan).returning();
  } catch (error) {
    console.error('Failed to clear kunjungan from db:', error);
    throw new Error('Failed to clear kunjungan records.', { cause: error });
  }
}

export async function clearAllWbpFromDb() {
  try {
    // Delete visits first due to foreign key
    await db.delete(kunjungan);
    return await db.delete(wbp).returning();
  } catch (error) {
    console.error('Failed to clear wbp from db:', error);
    throw new Error('Failed to clear WBP records.', { cause: error });
  }
}

export async function softDeleteKunjungan(id: string) {
  try {
    return await db
      .update(kunjungan)
      .set({ dihapus: true })
      .where(eq(kunjungan.id, id))
      .returning();
  } catch (error) {
    console.error('Failed to delete visit:', error);
    throw new Error('Failed to delete visit.', { cause: error });
  }
}

// Penyakit & Referensi
export async function getAllPenyakit() {
  try {
    return await db.select().from(daftarPenyakit).orderBy(daftarPenyakit.urutan);
  } catch (error) {
    console.error('Failed to fetch Penyakit:', error);
    return [];
  }
}

export async function getAllReferensi() {
  try {
    return await db.select().from(referensiIcd10);
  } catch (error) {
    console.error('Failed to fetch Referensi:', error);
    return [];
  }
}

// Pengaturan
export async function getSetting(key: string) {
  try {
    const result = await db
      .select()
      .from(pengaturanApp)
      .where(eq(pengaturanApp.key, key));
    return result[0]?.value;
  } catch (error) {
    console.error(`Failed to get setting ${key}:`, error);
    return null;
  }
}

export async function setSetting(key: string, value: any) {
  try {
    return await db
      .insert(pengaturanApp)
      .values({ key, value })
      .onConflictDoUpdate({
        target: pengaturanApp.key,
        set: { value },
      })
      .returning();
  } catch (error) {
    console.error(`Failed to set setting ${key}:`, error);
    throw new Error('Failed to save settings.', { cause: error });
  }
}

// Audit Logs
export async function addAuditLog(entry: typeof auditLogs.$inferInsert) {
  try {
    return await db.insert(auditLogs).values(entry).returning();
  } catch (error) {
    console.error('Failed to add audit log:', error);
  }
}

export async function getAuditLogs() {
  try {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return [];
  }
}
