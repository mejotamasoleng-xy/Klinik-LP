import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const disableHmr = process.env.DISABLE_HMR === 'true' || Boolean(process.env.V0_WORKSPACE_ROOT);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // The v0 preview proxy does not reliably pass Vite's HMR WebSocket.
      hmr: disableHmr ? false : undefined,
      ws: disableHmr ? (false as const) : undefined,
      // Disable watching in agent previews to prevent flicker during streamed edits.
      watch: disableHmr ? null : {},
    },
  };
});
