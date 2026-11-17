// Bitácora de auditoría (RF14): quién hizo qué y cuándo, con los datos antes y después del cambio
import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useLista, useRetraso } from '../lib/consultas';
import { fechaHora } from '../lib/formato';
import type { RegistroBitacora } from '../lib/tipos';
import { BarraFiltros, Buscador, Cargando, Encabezado, Filtro, Paginacion, Panel, Vacio } from '../componentes/ui';

const ACCIONES: Record<string, string> = {
  LOGIN: 'Inició sesión', CREAR: 'Creó', ACTUALIZAR: 'Actualizó', BAJA: 'Dio de baja', REACTIVAR: 'Reactivó', DESACTIVAR: 'Desactivó', IMPORTAR: 'Importó',
  SUBIR: 'Subió', APROBAR: 'Aprobó', RECHAZAR: 'Rechazó', EXPORTAR: 'Exportó', ENVIAR_CORREO: 'Envió correo de', RESTAURAR: 'Restauró', CREAR_MASIVO: 'Creó en lote',
  CAMBIAR_CONTRASENA: 'Cambió su contraseña', RESTABLECER_CONTRASENA: 'Restableció la contraseña de', SOLICITAR_RECUPERACION: 'Solicitó recuperar la contraseña', ACTUALIZAR_CONTACTO: 'Actualizó el contacto de',
};
const ENTIDADES: Record<string, string> = {
  usuario: 'usuario', empleado: 'empleado', curso: 'curso', asignacion: 'asignación', evidencia: 'constancia', reporte: 'reporte', plantilla_correo: 'plantilla de correo',
  sede: 'sede', area: 'área', dependencia: 'dependencia', tema_etica: 'tema del Comité de Ética',
};
const SIN_OBJETO = new Set(['LOGIN', 'CAMBIAR_CONTRASENA', 'SOLICITAR_RECUPERACION']);
const describir = (b: RegistroBitacora) =>
  SIN_OBJETO.has(b.accion) ? ACCIONES[b.accion] : `${ACCIONES[b.accion] ?? b.accion} ${ENTIDADES[b.entidad] ?? b.entidad}${b.idEntidad ? ` núm. ${b.idEntidad}` : ''}`;

function Datos({ titulo, datos }: { titulo: string; datos: unknown }) {
  if (datos === null || datos === undefined) return null;
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[0.8125rem] font-medium">{titulo}</p>
      <pre className="max-h-64 overflow-auto rounded-md border border-borde bg-superficie p-3 text-xs leading-relaxed whitespace-pre-wrap break-all">{JSON.stringify(datos, null, 2)}</pre>
    </div>
  );
}

export default function Bitacora() {
  const [buscar, setBuscar] = useState('');
  const [filtros, setFiltros] = useState({ accion: '', entidad: '', desde: '', hasta: '' });
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<number | null>(null);
  const texto = useRetraso(buscar);
  const opciones = useQuery({ queryKey: ['bitacora', 'filtros'], queryFn: async () => (await api.get<{ acciones: string[]; entidades: string[] }>('/bitacora/filtros')).data });
  const { data, isLoading } = useLista<RegistroBitacora>('bitacora', '/bitacora', { buscar: texto, ...filtros, pagina, porPagina: 25 });
  const filtrar = (campo: keyof typeof filtros) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => { setFiltros((f) => ({ ...f, [campo]: e.target.value })); setPagina(1); };
  const claseFecha = 'h-10 rounded-md border border-borde bg-superficie px-3 text-sm';

  return (
    <>
      <Encabezado titulo="Bitácora" descripcion="Registro de las acciones realizadas en el sistema. Es de solo consulta: los registros no se pueden modificar ni eliminar." />
      <Panel sinRelleno>
        <BarraFiltros>
          <Buscador placeholder="Buscar por nombre o CUPO de quien lo hizo" aria-label="Buscar en la bitácora" value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
          <Filtro etiqueta="Acción" value={filtros.accion} onChange={filtrar('accion')}>
            <option value="">Todas las acciones</option>
            {opciones.data?.acciones.map((a) => <option key={a} value={a}>{ACCIONES[a] ?? a}</option>)}
          </Filtro>
          <Filtro etiqueta="Sobre" value={filtros.entidad} onChange={filtrar('entidad')}>
            <option value="">Todo</option>
            {opciones.data?.entidades.map((e) => <option key={e} value={e}>{ENTIDADES[e] ?? e}</option>)}
          </Filtro>
          <label className="flex items-center gap-2 text-sm text-suave">Desde <input type="date" className={claseFecha} value={filtros.desde} onChange={filtrar('desde')} /></label>
          <label className="flex items-center gap-2 text-sm text-suave">Hasta <input type="date" className={claseFecha} value={filtros.hasta} onChange={filtrar('hasta')} /></label>
        </BarraFiltros>
        {isLoading ? <Cargando /> : data?.datos.length === 0 ? <Vacio titulo="No hay registros con estos filtros" /> : (
          <table className="tabla">
            <thead><tr><th className="w-8"><span className="sr-only">Detalle</span></th><th>Fecha</th><th>Quién</th><th>Qué hizo</th><th>Dirección IP</th></tr></thead>
            <tbody>
              {data?.datos.map((b) => {
                const tieneDetalle = b.datosAnteriores !== null || b.datosNuevos !== null;
                return (
                  <Fragment key={b.id}>
                    <tr>
                      <td>
                        {tieneDetalle && (
                          <button onClick={() => setAbierto(abierto === b.id ? null : b.id)} aria-expanded={abierto === b.id} aria-label="Ver los datos del cambio"
                            className="rounded p-1 text-suave hover:bg-realce hover:text-texto">
                            {abierto === b.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </button>
                        )}
                      </td>
                      <td data-etiqueta="Fecha" className="num whitespace-nowrap">{fechaHora(b.fecha)}</td>
                      <td data-etiqueta="Quién">{b.usuario ? `${b.usuario.empleado.nombre} ${b.usuario.empleado.apellidoPaterno}` : 'Sin sesión'}</td>
                      <td data-etiqueta="Qué hizo">{describir(b)}</td>
                      <td data-etiqueta="Dirección IP" className="num text-suave">{b.ipOrigen ?? '—'}</td>
                    </tr>
                    {abierto === b.id && (
                      <tr className="bg-realce hover:bg-realce">
                        <td colSpan={5} className="ajusta">
                          <div className="grid gap-4 py-1 text-left md:grid-cols-2">
                            <Datos titulo="Antes" datos={b.datosAnteriores} />
                            <Datos titulo={b.datosAnteriores ? 'Después' : 'Datos registrados'} datos={b.datosNuevos} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
        {data && <Paginacion pagina={pagina} porPagina={data.porPagina} total={data.total} cambiar={setPagina} />}
      </Panel>
    </>
  );
}
