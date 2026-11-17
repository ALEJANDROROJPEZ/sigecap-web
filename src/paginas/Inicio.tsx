// Inicio del administrador: indicadores de cumplimiento con filtros (RF12)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download } from 'lucide-react';
import { api, descargar, limpiar } from '../lib/api';
import { useAnios, useCatalogos } from '../lib/consultas';
import { MESES, ROMANOS, anioActual } from '../lib/formato';
import type { Dashboard, Grupo } from '../lib/tipos';
import { BarraAvance, Boton, Cargando, Encabezado, Filtro, Panel, Vacio } from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';

const COLOR = { completados: 'var(--exito)', enRevision: 'var(--color-dorado-500)', rechazados: 'var(--peligro)', pendientes: 'var(--borde)' };
const estiloTooltip = {
  contentStyle: { background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 8, fontSize: 13, color: 'var(--texto)' },
  cursor: { fill: 'var(--realce)' },
};

function Leyenda({ t }: { t: Dashboard['totales'] }) {
  const items = [
    ['Completados', t.completados, COLOR.completados], ['En revisión', t.enRevision, COLOR.enRevision],
    ['Rechazados', t.rechazados, COLOR.rechazados], ['Pendientes', t.pendientes, COLOR.pendientes],
  ] as const;
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
      {items.map(([nombre, valor, color]) => (
        <div key={nombre} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
          <dt className="text-suave">{nombre}</dt>
          <dd className="font-semibold tabular-nums">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function TablaGrupos({ titulo, columna, grupos }: { titulo: string; columna: string; grupos: Grupo[] }) {
  return (
    <Panel titulo={titulo} sinRelleno>
      {grupos.length === 0 ? <Vacio titulo="Sin datos con estos filtros" /> : (
        <table className="tabla">
          <thead><tr><th>{columna}</th><th className="w-2/5">Avance</th><th className="text-right">Completados</th><th className="text-right">Cumplimiento</th></tr></thead>
          <tbody>
            {grupos.map((g) => (
              <tr key={g.clave}>
                <td className="principal" title={g.nombre}>{columna === 'Curso' ? g.nombre : g.clave}</td>
                <td data-etiqueta="Avance"><div className="w-full min-w-24"><BarraAvance {...g} /></div></td>
                <td data-etiqueta="Completados" className="num text-right">{g.completados} de {g.total}</td>
                <td data-etiqueta="Cumplimiento" className="num text-right font-semibold">{g.cumplimiento}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

export default function Inicio() {
  const [filtros, setFiltros] = useState({ anio: String(anioActual()), trimestre: '', idDependencia: '', idSede: '' });
  const catalogos = useCatalogos();
  const anios = useAnios();
  const avisos = useAvisos();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', filtros],
    queryFn: async () => (await api.get<Dashboard>('/reportes/dashboard', { params: limpiar(filtros) })).data,
  });
  const cambiar = (campo: keyof typeof filtros) => (e: React.ChangeEvent<HTMLSelectElement>) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));
  const listaAnios = [...new Set([anioActual(), ...(anios.data ?? [])])].sort((a, b) => b - a);

  return (
    <>
      <Encabezado titulo="Inicio" descripcion="Avance de la capacitación del personal activo. Los filtros se aplican a todos los indicadores.">
        <Filtro etiqueta="Año" value={filtros.anio} onChange={cambiar('anio')}>
          <option value="">Todos los años</option>
          {listaAnios.map((a) => <option key={a} value={a}>{a}</option>)}
        </Filtro>
        <Filtro etiqueta="Trimestre" value={filtros.trimestre} onChange={cambiar('trimestre')}>
          <option value="">Todos los trimestres</option>
          {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Trimestre {ROMANOS[t]}</option>)}
        </Filtro>
        <Filtro etiqueta="Dependencia" value={filtros.idDependencia} onChange={cambiar('idDependencia')}>
          <option value="">Todas las dependencias</option>
          {catalogos.data?.dependencias.map((d) => <option key={d.id} value={d.id}>{d.siglas}</option>)}
        </Filtro>
        <Filtro etiqueta="Sede" value={filtros.idSede} onChange={cambiar('idSede')}>
          <option value="">Todas las sedes</option>
          {catalogos.data?.sedes.map((s) => <option key={s.id} value={s.id}>{s.clave}</option>)}
        </Filtro>
      </Encabezado>

      {isLoading && <Cargando />}
      {isError && <Panel><Vacio titulo="No se pudieron cargar los indicadores">Revisa tu conexión y vuelve a intentarlo.</Vacio></Panel>}
      {data && (
        <div className="space-y-5">
          {/* Banda de cumplimiento: el dato principal de la pantalla */}
          <section className="rounded-lg border border-borde bg-superficie">
            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-4">
                  <p className="font-serif text-6xl leading-none font-bold text-marca tabular-nums sm:text-7xl">{data.totales.cumplimiento}%</p>
                  <p className="text-suave">
                    de cumplimiento: <strong className="text-texto">{data.totales.completados}</strong> de{' '}
                    <strong className="text-texto">{data.totales.seguimientos}</strong> cursos asignados ya tienen constancia aprobada.
                  </p>
                </div>
                <div className="mt-5"><BarraAvance alta {...data.totales} total={data.totales.seguimientos} /></div>
                <Leyenda t={data.totales} />
              </div>
              <dl className="grid grid-cols-3 gap-4 border-t border-borde pt-4 text-sm lg:w-80 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                <div><dt className="text-suave">Personal activo</dt><dd className="text-xl font-semibold tabular-nums">{data.totales.empleadosActivos}</dd></div>
                <div><dt className="text-suave">Cursos activos</dt><dd className="text-xl font-semibold tabular-nums">{data.totales.cursosActivos}</dd></div>
                <div>
                  <dt className="text-suave">Constancias por revisar</dt>
                  <dd className="text-xl font-semibold tabular-nums">
                    {data.totales.evidenciasEnRevision}{' '}
                    {data.totales.evidenciasEnRevision > 0 && <Link to="/constancias" className="text-sm font-medium text-marca hover:underline">Revisar</Link>}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel titulo="Avance por dependencia">
              {data.porDependencia.length === 0 ? <Vacio titulo="Sin cursos asignados con estos filtros" /> : (
                <div style={{ height: Math.max(180, data.porDependencia.length * 56) }}>
                  <ResponsiveContainer>
                    <BarChart data={data.porDependencia} layout="vertical" margin={{ left: 8, right: 16 }} barSize={18}>
                      <CartesianGrid horizontal={false} stroke="var(--borde)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--suave)', fontSize: 12 }} stroke="var(--borde)" />
                      <YAxis type="category" dataKey="clave" width={96} tick={{ fill: 'var(--texto)', fontSize: 12 }} stroke="var(--borde)" />
                      <Tooltip {...estiloTooltip} />
                      <Bar isAnimationActive={false} dataKey="completados" name="Completados" stackId="a" fill={COLOR.completados} />
                      <Bar isAnimationActive={false} dataKey="enRevision" name="En revisión" stackId="a" fill={COLOR.enRevision} />
                      <Bar isAnimationActive={false} dataKey="rechazados" name="Rechazados" stackId="a" fill={COLOR.rechazados} />
                      <Bar isAnimationActive={false} dataKey="pendientes" name="Pendientes" stackId="a" fill={COLOR.pendientes} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
            <Panel titulo={`Constancias aprobadas por mes, ${data.anioSerie}`}>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={data.serieMensual.map((m) => ({ ...m, nombre: MESES[m.mes - 1] }))} margin={{ left: -16, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--borde)" />
                    <XAxis dataKey="nombre" tick={{ fill: 'var(--suave)', fontSize: 12 }} stroke="var(--borde)" />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--suave)', fontSize: 12 }} stroke="var(--borde)" />
                    <Tooltip {...estiloTooltip} />
                    <Bar isAnimationActive={false} dataKey="completados" name="Aprobadas" fill="var(--marca)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <TablaGrupos titulo="Avance por sede" columna="Sede" grupos={data.porSede} />
            <TablaGrupos titulo="Cursos con menor cumplimiento" columna="Curso" grupos={data.porCurso.slice(0, 8)} />
          </div>

          <Panel sinRelleno titulo={`Personal con cursos pendientes (${data.totales.empleadosRezagados})`}
            acciones={data.totales.empleadosRezagados > 0 && (
              <Boton chico icono={<Download className="size-4" />}
                onClick={() => descargar('/reportes/exportar', { tipo: 'rezagados', formato: 'xlsx', ...limpiar(filtros) }).catch(avisos.falla)}>
                Descargar lista completa
              </Boton>
            )}>
            {data.rezagados.length === 0 ? <Vacio titulo="Todo el personal está al corriente">No hay cursos pendientes con estos filtros.</Vacio> : (
              <table className="tabla">
                <thead><tr><th>Nombre</th><th>CUPO</th><th>Sede</th><th className="text-right">Cursos pendientes</th></tr></thead>
                <tbody>
                  {data.rezagados.map((r) => (
                    <tr key={r.idEmpleado}>
                      <td className="principal">{r.nombre}</td>
                      <td data-etiqueta="CUPO" className="num">{r.cupo}</td>
                      <td data-etiqueta="Sede">{r.sede}</td>
                      <td data-etiqueta="Cursos pendientes" className="num text-right font-semibold">{r.pendientes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
