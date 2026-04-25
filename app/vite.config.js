import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Forces 5173 so Electron can always find it
  },
  build: {
    outDir: 'dist', // Vite defaults to 'dist', but your main.js might look for 'build'
  }
});