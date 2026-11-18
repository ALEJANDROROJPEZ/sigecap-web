import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/latin-500.css';
import '@fontsource/noto-sans/latin-600.css';
import '@fontsource/noto-sans/latin-700.css';
import '@fontsource/noto-serif/latin-600.css';
import '@fontsource/noto-serif/latin-700.css';
import './index.css';
import { App } from './App';
import { ProveedorAvisos } from './contexto/Avisos';
import { ProveedorSesion } from './contexto/Sesion';

const consultas = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } },
});

// En GitHub Pages la aplicación se sirve bajo /sigecap-web/; en local, en /
const baseRuta = window.location.pathname.startsWith('/sigecap-web') ? '/sigecap-web' : undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={consultas}>
      <BrowserRouter basename={baseRuta}>
        <ProveedorAvisos>
          <ProveedorSesion>
            <App />
          </ProveedorSesion>
        </ProveedorAvisos>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
