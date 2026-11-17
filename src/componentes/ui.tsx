// Piezas de interfaz compartidas por todas las pantallas
import { useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight, Ellipsis, Loader2, X } from 'lucide-react';
import { ESTADO_CURSO, ESTADO_EVIDENCIA, cx } from '../lib/formato';
import type { EstadoCurso, EstadoEvidencia } from '../lib/tipos';

// ---------- Botones ----------

type Variante = 'primario' | 'secundario' | 'sutil' | 'peligro';
const VARIANTES: Record<Variante, string> = {
  primario: 'bg-guinda-700 text-white hover:bg-guinda-600 dark:bg-guinda-500 dark:hover:bg-guinda-400',
  secundario: 'border border-borde bg-superficie text-texto hover:bg-realce',
  sutil: 'text-marca hover:bg-guinda-50 dark:hover:bg-realce',
  peligro: 'border border-peligro/40 text-peligro hover:bg-peligro/10',
};

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  chico?: boolean;
  cargando?: boolean;
  icono?: ReactNode;
}
export function Boton({ variante = 'secundario', chico, cargando, icono, children, className, disabled, type = 'button', ...resto }: BotonProps) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:opacity-55',
        chico ? 'h-8 px-2.5 text-[0.8125rem]' : 'h-10 px-4 text-sm',
        VARIANTES[variante], className,
      )}
      {...resto}
    >
      {cargando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icono}
      {children}
    </button>
  );
}

// ---------- Formularios ----------

const BASE_CAMPO = 'rounded-md border border-borde bg-superficie px-3 text-sm text-texto placeholder:text-suave/70 disabled:bg-realce disabled:text-suave aria-[invalid=true]:border-peligro';

interface CampoProps { etiqueta: string; error?: string; ayuda?: string; opcional?: boolean; className?: string; children: (id: string, invalido: boolean) => ReactNode }
export function Campo({ etiqueta, error, ayuda, opcional, className, children }: CampoProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[0.8125rem] font-medium">
        {etiqueta} {opcional && <span className="font-normal text-suave">(opcional)</span>}
      </label>
      {children(id, !!error)}
      {error ? <p className="mt-1 text-[0.8125rem] text-peligro">{error}</p> : ayuda ? <p className="mt-1 text-[0.8125rem] text-suave">{ayuda}</p> : null}
    </div>
  );
}

type EntradaProps = InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; error?: string; ayuda?: string; opcional?: boolean; contenedor?: string };
export function Entrada({ etiqueta, error, ayuda, opcional, contenedor, className, ...resto }: EntradaProps) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} opcional={opcional} className={contenedor}>
      {(id, invalido) => <input id={id} aria-invalid={invalido} className={cx(BASE_CAMPO, 'h-10 w-full', className)} {...resto} />}
    </Campo>
  );
}

type SelectorProps = SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string; error?: string; ayuda?: string; opcional?: boolean; contenedor?: string };
export function Selector({ etiqueta, error, ayuda, opcional, contenedor, className, children, ...resto }: SelectorProps) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} opcional={opcional} className={contenedor}>
      {(id, invalido) => <select id={id} aria-invalid={invalido} className={cx(BASE_CAMPO, 'h-10 w-full pr-8', className)} {...resto}>{children}</select>}
    </Campo>
  );
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta: string; error?: string; ayuda?: string; opcional?: boolean; contenedor?: string };
export function AreaTexto({ etiqueta, error, ayuda, opcional, contenedor, className, ...resto }: AreaProps) {
  return (
    <Campo etiqueta={etiqueta} error={error} ayuda={ayuda} opcional={opcional} className={contenedor}>
      {(id, invalido) => <textarea id={id} aria-invalid={invalido} className={cx(BASE_CAMPO, 'w-full py-2', className)} {...resto} />}
    </Campo>
  );
}

export function Casilla({ etiqueta, descripcion, ...resto }: InputHTMLAttributes<HTMLInputElement> & { etiqueta: ReactNode; descripcion?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-guinda-700 dark:accent-guinda-400" {...resto} />
      <span>{etiqueta}{descripcion && <span className="block text-[0.8125rem] text-suave">{descripcion}</span>}</span>
    </label>
  );
}

// Filtro compacto para las barras de herramientas (sin etiqueta visible)
export function Filtro({ etiqueta, children, className, ...resto }: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  return <select aria-label={etiqueta} className={cx(BASE_CAMPO, 'h-10 max-w-full min-w-0 pr-8', className)} {...resto}>{children}</select>;
}
export function Buscador({ className, ...resto }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="search" className={cx(BASE_CAMPO, 'h-10 w-full sm:w-80', className)} {...resto} />;
}

// ---------- Estructura de página ----------

export function Encabezado({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-[70ch] text-sm text-suave">{descripcion}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Panel({ titulo, acciones, children, className, sinRelleno }: { titulo?: string; acciones?: ReactNode; children: ReactNode; className?: string; sinRelleno?: boolean }) {
  return (
    <section className={cx('rounded-lg border border-borde bg-superficie', className)}>
      {(titulo || acciones) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borde px-4 py-3">
          {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
          {acciones}
        </div>
      )}
      <div className={sinRelleno ? 'md:overflow-x-auto' : 'p-4'}>{children}</div>
    </section>
  );
}

export function BarraFiltros({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-b border-borde p-3">{children}</div>;
}

// ---------- Estados ----------

const TONOS = {
  gris: 'bg-realce text-suave border-borde',
  verde: 'bg-verde-100 text-verde-700 border-verde-300 dark:bg-verde-500/20 dark:text-verde-300 dark:border-verde-500',
  dorado: 'bg-dorado-100 text-dorado-700 border-dorado-300 dark:bg-dorado-500/20 dark:text-dorado-300 dark:border-dorado-700',
  rojo: 'bg-peligro/10 text-peligro border-peligro/30',
  guinda: 'bg-guinda-50 text-guinda-700 border-guinda-200 dark:bg-guinda-500/20 dark:text-guinda-200 dark:border-guinda-600',
} as const;
export function Insignia({ tono = 'gris', children }: { tono?: keyof typeof TONOS; children: ReactNode }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', TONOS[tono])}>{children}</span>;
}
const TONO_CURSO: Record<EstadoCurso, keyof typeof TONOS> = { PENDIENTE: 'gris', EN_REVISION: 'dorado', COMPLETADO: 'verde', RECHAZADO: 'rojo' };
const TONO_EVIDENCIA: Record<EstadoEvidencia, keyof typeof TONOS> = { EN_REVISION: 'dorado', APROBADA: 'verde', RECHAZADA: 'rojo' };
export const InsigniaCurso = ({ estado }: { estado: EstadoCurso }) => <Insignia tono={TONO_CURSO[estado]}>{ESTADO_CURSO[estado]}</Insignia>;
export const InsigniaEvidencia = ({ estado }: { estado: EstadoEvidencia }) => <Insignia tono={TONO_EVIDENCIA[estado]}>{ESTADO_EVIDENCIA[estado]}</Insignia>;
export const InsigniaActivo = ({ activo, textos = ['Activo', 'Baja'] }: { activo: boolean; textos?: [string, string] }) =>
  <Insignia tono={activo ? 'verde' : 'gris'}>{activo ? textos[0] : textos[1]}</Insignia>;

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <div className="flex items-center justify-center gap-2 p-10 text-sm text-suave" role="status"><Loader2 className="size-4 animate-spin" aria-hidden />{texto}</div>;
}
export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-medium">{titulo}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-suave">{children}</div>}
    </div>
  );
}
export function Alerta({ tono = 'rojo', children }: { tono?: 'rojo' | 'dorado' | 'verde'; children: ReactNode }) {
  return <div role="alert" className={cx('rounded-md border px-3 py-2 text-sm', TONOS[tono])}>{children}</div>;
}

// Barra segmentada: completados, en revisión, rechazados y pendientes sobre el total
export function BarraAvance({ completados, enRevision, rechazados, total, alta }: { completados: number; enRevision: number; rechazados: number; total: number; alta?: boolean }) {
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  return (
    <div className={cx('flex w-full overflow-hidden rounded-full bg-borde/70', alta ? 'h-4' : 'h-2')} role="img"
      aria-label={`${completados} de ${total} completados`}>
      <span className="bg-verde-500 dark:bg-verde-300" style={{ width: `${pct(completados)}%` }} />
      <span className="bg-dorado-500 dark:bg-dorado-300" style={{ width: `${pct(enRevision)}%` }} />
      <span className="bg-peligro" style={{ width: `${pct(rechazados)}%` }} />
    </div>
  );
}

// ---------- Paginación ----------

export function Paginacion({ pagina, porPagina, total, cambiar }: { pagina: number; porPagina: number; total: number; cambiar: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (total === 0) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borde px-4 py-2.5 text-[0.8125rem] text-suave">
      <span>{desde}–{hasta} de {total}</span>
      <div className="flex items-center gap-1">
        <Boton chico disabled={pagina <= 1} onClick={() => cambiar(pagina - 1)} aria-label="Página anterior" icono={<ChevronLeft className="size-4" />} />
        <span className="px-2">Página {pagina} de {paginas}</span>
        <Boton chico disabled={pagina >= paginas} onClick={() => cambiar(pagina + 1)} aria-label="Página siguiente" icono={<ChevronRight className="size-4" />} />
      </div>
    </div>
  );
}

// ---------- Ventana modal ----------

const ANCHOS = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl', xl: 'sm:max-w-6xl' };
export function Modal({ titulo, abierto, cerrar, ancho = 'md', children, pie }: { titulo: string; abierto: boolean; cerrar: () => void; ancho?: keyof typeof ANCHOS; children: ReactNode; pie?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', alTeclear);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', alTeclear); document.body.style.overflow = anterior; };
  }, [abierto, cerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={tituloId}
        className={cx('flex max-h-[94dvh] w-full flex-col rounded-t-xl border border-borde bg-superficie shadow-xl outline-none sm:rounded-xl', ANCHOS[ancho])}>
        <div className="flex items-center justify-between gap-4 border-b border-borde px-5 py-3.5">
          <h2 id={tituloId} className="text-lg font-semibold">{titulo}</h2>
          <button onClick={cerrar} aria-label="Cerrar" className="rounded-md p-1.5 text-suave hover:bg-realce hover:text-texto"><X className="size-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-borde px-5 py-3">{pie}</div>}
      </div>
    </div>
  );
}

// Confirmación de acciones que cambian datos
export function Confirmar({ abierto, titulo, children, textoBoton, peligro, cargando, confirmar, cerrar }: {
  abierto: boolean; titulo: string; children: ReactNode; textoBoton: string; peligro?: boolean; cargando?: boolean; confirmar: () => void; cerrar: () => void;
}) {
  return (
    <Modal abierto={abierto} titulo={titulo} cerrar={cerrar} ancho="sm"
      pie={<><Boton onClick={cerrar}>Cancelar</Boton><Boton variante={peligro ? 'peligro' : 'primario'} cargando={cargando} onClick={confirmar}>{textoBoton}</Boton></>}>
      <div className="text-sm">{children}</div>
    </Modal>
  );
}

// ---------- Menú de acciones de un renglón ----------
// Las acciones secundarias se agrupan en un menú para que las tablas no se desborden.

export interface Accion { texto: string; icono?: ReactNode; alElegir: () => void; deshabilitada?: boolean; peligro?: boolean }

export function MenuAcciones({ etiqueta, acciones }: { etiqueta: string; acciones: (Accion | false | null | undefined)[] }) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const visibles = acciones.filter((a): a is Accion => !!a);

  useLayoutEffect(() => {
    if (!abierto || !boton.current) return;
    const r = boton.current.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - r.right);
    // Se abre hacia arriba cuando no cabe debajo del botón
    const alto = visibles.length * 40 + 12;
    setPosicion(r.bottom + alto > window.innerHeight ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
    lista.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [abierto, visibles.length]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    const fuera = (e: MouseEvent) => { if (!lista.current?.contains(e.target as Node) && !boton.current?.contains(e.target as Node)) cerrar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { cerrar(); boton.current?.focus(); } };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  if (visibles.length === 0) return null;
  return (
    <>
      <button ref={boton} type="button" aria-haspopup="menu" aria-expanded={abierto} aria-label={etiqueta} onClick={() => setAbierto((v) => !v)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-borde text-suave hover:bg-realce hover:text-texto">
        <Ellipsis className="size-4" />
      </button>
      {abierto && (
        <div ref={lista} role="menu" style={posicion} className="fixed z-40 min-w-52 rounded-lg border border-borde bg-superficie p-1.5 shadow-xl">
          {visibles.map((a) => (
            <button key={a.texto} role="menuitem" type="button" disabled={a.deshabilitada} onClick={() => { setAbierto(false); a.alElegir(); }}
              className={cx('flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-left text-sm whitespace-nowrap hover:bg-realce disabled:opacity-50', a.peligro && 'text-peligro')}>
              {a.icono}{a.texto}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
