// Todas las notificaciones del usuario (RF11)
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { cx, fechaHora } from '../lib/formato';
import type { Notificacion, Paginado } from '../lib/tipos';
import { Boton, Cargando, Encabezado, Paginacion, Panel, Vacio } from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';

export default function Notificaciones() {
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['notificaciones', 'todas', pagina],
    queryFn: async () => (await api.get<Paginado<Notificacion> & { noLeidas: number }>('/notificaciones', { params: { pagina, porPagina: 15 } })).data,
  });
  const refrescar = () => consultas.invalidateQueries({ queryKey: ['notificaciones'] });
  const leer = useMutation({ mutationFn: (id: number) => api.patch(`/notificaciones/${id}/leida`), onSuccess: refrescar, onError: avisos.falla });
  const leerTodas = useMutation({ mutationFn: () => api.patch('/notificaciones/leidas'), onSuccess: refrescar, onError: avisos.falla });
  const eliminar = useMutation({ mutationFn: (id: number) => api.delete(`/notificaciones/${id}`), onSuccess: refrescar, onError: avisos.falla });
  const limpiar = useMutation({
    mutationFn: async () => (await api.delete<{ eliminadas: number }>('/notificaciones/leidas')).data,
    onSuccess: (r) => { avisos.exito(`Se eliminaron ${r.eliminadas} notificaciones leídas.`); setPagina(1); void refrescar(); },
    onError: avisos.falla,
  });
  const hayLeidas = data?.datos.some((n) => n.leida);

  return (
    <>
      <Encabezado titulo="Notificaciones" descripcion="Avisos sobre tus cursos y constancias. También llegan en el momento, sin recargar la página.">
        <Boton icono={<CheckCheck className="size-4" />} disabled={!data?.noLeidas} cargando={leerTodas.isPending} onClick={() => leerTodas.mutate()}>Marcar todas como leídas</Boton>
        <Boton icono={<Trash2 className="size-4" />} disabled={!hayLeidas} cargando={limpiar.isPending} onClick={() => limpiar.mutate()}>Eliminar las leídas</Boton>
      </Encabezado>
      <Panel sinRelleno>
        {isLoading ? <Cargando /> : data?.datos.length === 0 ? <Vacio titulo="No tienes notificaciones">Aquí verás los cursos que te asignen y el resultado de tus constancias.</Vacio> : (
          <ul className="divide-y divide-borde">
            {data?.datos.map((n) => (
              <li key={n.id} className={cx('flex items-start gap-3 px-4 py-3.5', !n.leida && 'bg-guinda-50/60 dark:bg-guinda-500/10')}>
                <span className={cx('mt-2 size-2 shrink-0 rounded-full', n.leida ? 'bg-transparent' : 'bg-guinda-500')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cx('text-sm', !n.leida && 'font-semibold')}>{n.titulo}{!n.leida && <span className="sr-only"> (sin leer)</span>}</p>
                  <p className="text-sm text-suave">{n.mensaje}</p>
                  <p className="mt-0.5 text-xs text-suave">{fechaHora(n.creadaEn)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!n.leida && <Boton chico variante="sutil" onClick={() => leer.mutate(n.id)}>Marcar leída</Boton>}
                  <Boton chico variante="sutil" aria-label="Eliminar notificación" icono={<Trash2 className="size-4" />} onClick={() => eliminar.mutate(n.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Paginacion pagina={pagina} porPagina={data.porPagina} total={data.total} cambiar={setPagina} />}
      </Panel>
    </>
  );
}
