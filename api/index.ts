import type { Request, Response } from 'express';
import { app, initializeApp } from '../server.ts';

export default async function handler(req: Request, res: Response) {
  try {
    await initializeApp();
    app(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    res.status(503).json({ error: 'Layanan klinik sementara tidak tersedia.' });
  }
}
