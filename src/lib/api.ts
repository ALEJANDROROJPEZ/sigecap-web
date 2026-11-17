// Cliente HTTP de la API. El token de acceso vive en memoria; el de renovación, en localStorage.
// Cuando una petición responde 401, se renueva el token una sola vez y se reintenta.
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

export const URL_API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const CLAVE_REFRESH = 'sigecap.refresh';

let tokenAcceso: string | null = null;
let alExpirar: () => void = () => {};

export const obtenerToken = () => tokenAcceso;
export const hayRefresh = () => !!localStorage.getItem(CLAVE_REFRESH);
export function guardarSesion(token: string, refreshToken: string) {
  tokenAcceso = token;
  localStorage.setItem(CLAVE_REFRESH, refreshToken);
}
export function borrarSesion() {
  tokenAcceso = null;
  localStorage.removeItem(CLAVE_REFRESH);
}
export const alExpirarSesion = (fn: () => void) => { alExpirar = fn; };

export const api = axios.create({ baseURL: `${URL_API}/api/v1` });

api.interceptors.request.use((config) => {
  if (tokenAcceso) config.headers.Authorization = `Bearer ${tokenAcceso}`;
  return config;
});

let renovando: Promise<string> | null = null;
export function renovarToken(): Promise<string> {
  renovando ??= axios
    .post(`${URL_API}/api/v1/auth/refresh`, { refreshToken: localStorage.getItem(CLAVE_REFRESH) })
    .then((r) => {
      guardarSesion(r.data.token, r.data.refreshToken);
      return r.data.token as string;
    })
    .finally(() => { renovando = null; });
  return renovando;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (AxiosRequestConfig & { _reintento?: boolean }) | undefined;
  const esAuth = original?.url?.startsWith('/auth/') && !original.url.startsWith('/auth/me');
  if (error.response?.status === 401 && original && !original._reintento && !esAuth && hayRefresh()) {
    original._reintento = true;
    try {
      await renovarToken();
      return api(original);
    } catch {
      borrarSesion();
      alExpirar();
    }
  }
  return Promise.reject(error);
});

// ---------- Errores ----------

export interface ErrorApi { mensaje: string; campos: Record<string, string>; estado?: number }

// Convierte cualquier error en un mensaje legible y, si la API los envió, los errores por campo
export async function leerError(err: unknown): Promise<ErrorApi> {
  if (axios.isAxiosError(err)) {
    if (!err.response) return { mensaje: 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.', campos: {} };
    let datos = err.response.data as { error?: string; detalles?: Record<string, string[]> } | Blob;
    if (datos instanceof Blob) {
      try { datos = JSON.parse(await datos.text()); } catch { datos = {}; }
    }
    const d = datos as { error?: string; detalles?: Record<string, string[]> };
    const campos: Record<string, string> = {};
    if (d.detalles && typeof d.detalles === 'object') {
      for (const [campo, lista] of Object.entries(d.detalles)) if (Array.isArray(lista) && lista[0]) campos[campo] = lista[0];
    }
    const primero = Object.values(campos)[0];
    return {
      mensaje: d.error === 'Datos inválidos' && primero ? `Revisa los datos: ${primero}` : d.error ?? 'Ocurrió un error inesperado.',
      campos, estado: err.response.status,
    };
  }
  return { mensaje: err instanceof Error ? err.message : 'Ocurrió un error inesperado.', campos: {} };
}

// ---------- Archivos ----------

// Descarga un archivo generado por la API (reportes, plantilla) respetando el nombre que envía el servidor
export async function descargar(ruta: string, params?: Record<string, unknown>) {
  const r = await api.get(ruta, { params, responseType: 'blob' });
  const cabecera = String(r.headers['content-disposition'] ?? '');
  const nombre = /filename\*=UTF-8''([^;]+)/.exec(cabecera)?.[1] ?? /filename="?([^";]+)"?/.exec(cabecera)?.[1] ?? 'archivo';
  const url = URL.createObjectURL(r.data as Blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = decodeURIComponent(nombre);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Quita de los filtros los valores vacíos para no enviarlos en la consulta
export const limpiar = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null));
