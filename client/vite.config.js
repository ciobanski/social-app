// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),          // still fine; it now reads tailwind.config.js
  ],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // keep the /api prefix
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      }
    }
  }
});
