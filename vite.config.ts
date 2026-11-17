import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// En desarrollo, las peticiones a /api y a /socket.io se reenvían al backend (sigecap-api)
// para que el navegador trabaje con un solo origen.
export default defineConfig(({ mode }) => {
  const API = loadEnv(mode, '.', '').VITE_API_PROXY || 'http://localhost:3000';
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: API, changeOrigin: true },
        '/socket.io': { target: API, changeOrigin: true, ws: true },
      },
    },
  };
});
