/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let adminAuthInstance: Auth | null = null;

try {
  if (!getApps().length && firebaseConfig?.projectId) {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  if (getApps().length) {
    adminAuthInstance = getAuth();
  }
} catch (err) {
  console.warn('[AI Studio] Firebase Admin initialization skipped:', err);
}

export const adminAuth = adminAuthInstance;
