import type { EstadoCurso, EstadoEvidencia } from './tipos';

export const ROMANOS = ['', 'I', 'II', 'III', 'IV'];
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const cx = (...clases: (string | false | null | undefined)[]) => clases.filter(Boolean).join(' ');

// Las columnas DATE llegan como «AAAA-MM-DDT00:00:00.000Z»: se toma solo la parte de la fecha
export const fecha = (iso?: string | null) => {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};
export const fechaHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
// Día de un momento exacto (fecha y hora), en la zona horaria del navegador
export const dia = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
export const paraInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function haceCuanto(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d < 30 ? `hace ${d} ${d === 1 ? 'día' : 'días'}` : fecha(iso);
}

export const periodo = (c: { anio: number; trimestre: number }) => `${c.anio}-${ROMANOS[c.trimestre]}`;
export const nombreCompleto = (e: { nombre: string; apellidoPaterno: string; apellidoMaterno?: string | null }) =>
  [e.nombre, e.apellidoPaterno, e.apellidoMaterno].filter(Boolean).join(' ');
export const tamano = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export const ESTADO_CURSO: Record<EstadoCurso, string> = {
  PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', COMPLETADO: 'Completado', RECHAZADO: 'Rechazado',
};
export const ESTADO_EVIDENCIA: Record<EstadoEvidencia, string> = {
  EN_REVISION: 'En revisión', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada',
};
export const CONTRATACION = { ESTRUCTURA: 'Estructura', HONORARIOS: 'Honorarios' } as const;

// Trimestre y año en curso, como valores iniciales de los filtros
export const trimestreActual = () => Math.floor(new Date().getMonth() / 3) + 1;
export const anioActual = () => new Date().getFullYear();
