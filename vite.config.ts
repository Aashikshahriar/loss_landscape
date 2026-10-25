import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/loss_landscape/',
  build: { chunkSizeWarningLimit: 1300 },
  test: { include: ['tests/**/*.test.ts'] },
});
