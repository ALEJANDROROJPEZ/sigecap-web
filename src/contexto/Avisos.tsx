// Avisos breves en la esquina de la pantalla (confirmaciones y errores)
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { leerError } from '../lib/api';
import { cx } from '../lib/formato';

type Tipo = 'exito' | 'error' | 'info';
interface Aviso { id: number; tipo: Tipo; texto: string }
interface Valor {
  exito: (texto: string) => void;
  error: (texto: string) => void;
  info: (texto: string) => void;
  /** Muestra el mensaje de un error de la API */
  falla: (err: unknown) => void;
}

const Contexto = createContext<Valor | null>(null);
let consecutivo = 0;

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const quitar = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);
  const agregar = useCallback((tipo: Tipo, texto: string) => {
    const id = (consecutivo += 1);
    setAvisos((a) => [...a.slice(-3), { id, tipo, texto }]);
    setTimeout(() => quitar(id), tipo === 'error' ? 8000 : 5000);
  }, [quitar]);
  const valor = useMemo<Valor>(() => ({
    exito: (t) => agregar('exito', t),
    error: (t) => agregar('error', t),
    info: (t) => agregar('info', t),
    falla: (err) => { void leerError(err).then((e) => agregar('error', e.mensaje)); },
  }), [agregar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={cx(
            'pointer-events-auto flex w-full items-start gap-2.5 rounded-lg border bg-superficie px-3.5 py-3 text-sm shadow-lg sm:w-96',
            a.tipo === 'exito' && 'border-verde-300', a.tipo === 'error' && 'border-peligro/50', a.tipo === 'info' && 'border-dorado-300',
          )}>
            {a.tipo === 'exito' && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-exito" aria-hidden />}
            {a.tipo === 'error' && <TriangleAlert className="mt-0.5 size-4 shrink-0 text-peligro" aria-hidden />}
            {a.tipo === 'info' && <Info className="mt-0.5 size-4 shrink-0 text-aviso" aria-hidden />}
            <p className="min-w-0 flex-1">{a.texto}</p>
            <button onClick={() => quitar(a.id)} aria-label="Cerrar aviso" className="text-suave hover:text-texto"><X className="size-4" /></button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useAvisos() {
  const v = useContext(Contexto);
  if (!v) throw new Error('useAvisos debe usarse dentro de ProveedorAvisos');
  return v;
}
