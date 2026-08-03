import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function assertFirebaseProjectIdNotTypo(mode: string) {
  const env = loadEnv(mode, process.cwd(), '');
  const pid = env.VITE_FIREBASE_PROJECT_ID?.trim();
  // Common copy/paste mistake: digit "1" instead of letter "l" in "nbbl".
  if (pid === 'nbb1-playcenter') {
    throw new Error(
      'VITE_FIREBASE_PROJECT_ID is "nbb1-playcenter" (ends with digit 1). The real Firebase project id is "nbbl-playcenter" (letter l before "-playcenter"). Callable URLs use this value in the hostname; the typo breaks admin callables and often shows as a CORS preflight failure. Fix .env.local and every hosting provider env (e.g. Vercel) then rebuild.',
    );
  }
}

export default defineConfig(({mode}) => {
  assertFirebaseProjectIdNotTypo(mode);
  return {
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // HMR can be disabled via DISABLE_HMR (e.g. hosted environments with file watching issues).
    hmr: process.env.DISABLE_HMR !== 'true',
  },
};
});
