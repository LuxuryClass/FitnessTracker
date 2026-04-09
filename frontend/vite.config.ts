import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@app': resolve(__dirname, 'src/App'),
      '@components': resolve(__dirname, 'src/Components'),
      '@pages': resolve(__dirname, 'src/Components/Pages'),
      '@styles': resolve(__dirname, 'src/Styles'),
      '@assets': resolve(__dirname, 'src/Assets'),
      '@utils': resolve(__dirname, 'src/Utils'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "@styles/mixins.scss" as *;',
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
