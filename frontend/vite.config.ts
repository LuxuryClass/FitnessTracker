import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';  // ← Вот этот импорт важен

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
        additionalData: `
          @import "@styles/variables.scss";
          @import "@styles/mixins.scss";
        `,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});