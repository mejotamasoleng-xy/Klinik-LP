/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

loadEnv({ path: '.env.development.local' });

declare global {
  var _postgresPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const hasSqlConfig = Boolean(connectionString);

export const createPool = () => {
  if (!connectionString) return null;

  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL pool client:', err);
    });
  }

  return global._postgresPool;
};

let dbInstance: NodePgDatabase<typeof schema> | null = null;

if (hasSqlConfig) {
  const pool = createPool();
  if (pool) dbInstance = drizzle(pool, { schema });
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL is required for production data access.');
}

export const db = dbInstance;
