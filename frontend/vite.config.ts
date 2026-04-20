import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/App', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/Components', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/Components/Pages', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/Styles', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/Assets', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/Utils', import.meta.url)),
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
    host: '0.0.0.0',
    port: 5173,
  },
});
