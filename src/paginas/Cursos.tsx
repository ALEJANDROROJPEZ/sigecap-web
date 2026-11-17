// Catálogo de cursos por dependencia y trimestre (RF05)
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil, Plus } from 'lucide-react';
import { api, leerError } from '../lib/api';
import { useAnios, useCatalogos, useLista, useRetraso } from '../lib/consultas';
import { ROMANOS, anioActual, fecha, paraInput, periodo, trimestreActual } from '../lib/formato';
import type { Curso } from '../lib/tipos';
import {
  Alerta, AreaTexto, BarraFiltros, Boton, Buscador, Cargando, Casilla, Confirmar, Encabezado, Entrada, Filtro, InsigniaActivo, MenuAcciones, Modal, Paginacion, Panel, Selector, Vacio,
} from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';

function FormularioCurso({ curso, cerrar }: { curso: Curso | null; cerrar: () => void }) {
  const catalogos = useCatalogos();
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [f, setF] = useState(() => ({
    idDependencia: curso ? String(curso.idDependencia) : '', idTemaEtica: curso?.idTemaEtica ? String(curso.idTemaEtica) : '',
    nombre: curso?.nombre ?? '', nombreCorto: curso?.nombreCorto ?? '', ordenReporte: curso?.ordenReporte ? String(curso.ordenReporte) : '',
    aplicaEstructura: curso?.aplicaEstructura ?? true, aplicaHonorarios: curso?.aplicaHonorarios ?? true, descripcion: curso?.descripcion ?? '',
    trimestre: String(curso?.trimestre ?? trimestreActual()), anio: String(curso?.anio ?? anioActual()),
    fechaInicio: paraInput(curso?.fechaInicio), fechaLimiteRegistro: paraInput(curso?.fechaLimiteRegistro),
    fechaEntregaConstancia: paraInput(curso?.fechaEntregaConstancia), urlPlataforma: curso?.urlPlataforma ?? '',
  }));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState('');
  const texto = (nombre: 'idDependencia' | 'idTemaEtica' | 'nombre' | 'nombreCorto' | 'ordenReporte' | 'descripcion' | 'trimestre' | 'anio' | 'fechaInicio' | 'fechaLimiteRegistro' | 'fechaEntregaConstancia' | 'urlPlataforma') => ({
    value: f[nombre], error: errores[nombre],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((v) => ({ ...v, [nombre]: e.target.value })),
  });

  const guardar = useMutation({
    mutationFn: () => {
      const datos = {
        ...f, idDependencia: Number(f.idDependencia), idTemaEtica: f.idTemaEtica ? Number(f.idTemaEtica) : null,
        ordenReporte: f.ordenReporte ? Number(f.ordenReporte) : null, trimestre: Number(f.trimestre), anio: Number(f.anio),
      };
      return curso ? api.put(`/cursos/${curso.id}`, datos) : api.post('/cursos', datos);
    },
    onSuccess: () => { avisos.exito(curso ? 'Curso actualizado.' : 'Curso registrado.'); void consultas.invalidateQueries({ queryKey: ['cursos'] }); cerrar(); },
    onError: async (err) => { const r = await leerError(err); setErrores(r.campos); setGeneral(r.mensaje); },
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    const faltan: Record<string, string> = {};
    if (!f.idDependencia) faltan.idDependencia = 'Elige la dependencia que imparte el curso';
    if (f.nombre.trim().length < 3) faltan.nombre = 'Escribe el nombre del curso';
    if (!f.aplicaEstructura && !f.aplicaHonorarios) faltan.aplica = 'El curso debe aplicar al menos a un tipo de contratación';
    setErrores(faltan);
    setGeneral('');
    if (Object.keys(faltan).length === 0) guardar.mutate();
  }

  return (
    <Modal abierto titulo={curso ? 'Editar curso' : 'Nuevo curso'} cerrar={cerrar} ancho="lg"
      pie={<><Boton onClick={cerrar}>Cancelar</Boton><Boton variante="primario" type="submit" form="form-curso" cargando={guardar.isPending}>{curso ? 'Guardar cambios' : 'Registrar curso'}</Boton></>}>
      <form id="form-curso" onSubmit={enviar} noValidate className="space-y-6">
        {general && <Alerta>{general}</Alerta>}
        <div className="grid gap-4 sm:grid-cols-4">
          <Entrada etiqueta="Nombre del curso" contenedor="sm:col-span-4" {...texto('nombre')} />
          <Selector etiqueta="Dependencia" contenedor="sm:col-span-2" {...texto('idDependencia')}>
            <option value="">Elige una dependencia</option>
            {catalogos.data?.dependencias.map((d) => <option key={d.id} value={d.id}>{d.siglas} – {d.nombre}</option>)}
          </Selector>
          <Selector etiqueta="Trimestre" {...texto('trimestre')}>
            {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{ROMANOS[t]}</option>)}
          </Selector>
          <Entrada etiqueta="Año" type="number" min={2000} max={2100} {...texto('anio')} />
          <AreaTexto etiqueta="Descripción" opcional rows={2} contenedor="sm:col-span-4" {...texto('descripcion')} />
          <Entrada etiqueta="Dirección de la plataforma del curso" type="url" opcional placeholder="https://" contenedor="sm:col-span-4" {...texto('urlPlataforma')} />
        </div>
        <fieldset>
          <legend className="mb-3 font-semibold">Fechas</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Entrada etiqueta="Inicio" type="date" opcional {...texto('fechaInicio')} />
            <Entrada etiqueta="Límite de registro" type="date" opcional {...texto('fechaLimiteRegistro')} />
            <Entrada etiqueta="Entrega de constancia" type="date" opcional {...texto('fechaEntregaConstancia')} />
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-semibold">A quién aplica</legend>
          <p className="mb-3 text-[0.8125rem] text-suave">En el Concentrado de constancias, el personal al que no aplica aparece como «NO APLICA».</p>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <Casilla etiqueta="Personal de estructura" checked={f.aplicaEstructura} onChange={(e) => setF((v) => ({ ...v, aplicaEstructura: e.target.checked }))} />
            <Casilla etiqueta="Personal de honorarios" checked={f.aplicaHonorarios} onChange={(e) => setF((v) => ({ ...v, aplicaHonorarios: e.target.checked }))} />
          </div>
          {errores.aplica && <p className="mt-1 text-[0.8125rem] text-peligro">{errores.aplica}</p>}
        </fieldset>
        <fieldset>
          <legend className="font-semibold">Datos para los reportes institucionales</legend>
          <p className="mb-3 text-[0.8125rem] text-suave">Se usan en el Concentrado de constancias y en el Formulario del Comité de Ética.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Entrada etiqueta="Nombre corto" opcional maxLength={31} ayuda="Nombre de la hoja de Excel (31 caracteres)" {...texto('nombreCorto')} />
            <Entrada etiqueta="Orden en el reporte" type="number" min={1} opcional {...texto('ordenReporte')} />
            <Selector etiqueta="Tema del Comité de Ética" opcional {...texto('idTemaEtica')}>
              <option value="">Sin tema</option>
              {catalogos.data?.temasEtica.map((t) => <option key={t.id} value={t.id}>{t.codigo} – {t.descripcion}</option>)}
            </Selector>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export default function Cursos() {
  const catalogos = useCatalogos();
  const anios = useAnios();
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [buscar, setBuscar] = useState('');
  const [filtros, setFiltros] = useState({ anio: '', trimestre: '', idDependencia: '', activo: 'true' });
  const [pagina, setPagina] = useState(1);
  const [editar, setEditar] = useState<Curso | null | 'nuevo'>(null);
  const [cambio, setCambio] = useState<Curso | null>(null);
  const texto = useRetraso(buscar);
  const { data, isLoading } = useLista<Curso>('cursos', '/cursos', { buscar: texto, ...filtros, pagina, porPagina: 20 });
  const filtrar = (campo: keyof typeof filtros) => (e: React.ChangeEvent<HTMLSelectElement>) => { setFiltros((f) => ({ ...f, [campo]: e.target.value })); setPagina(1); };

  const estado = useMutation({
    mutationFn: (c: Curso) => api.patch(`/cursos/${c.id}/estado`, { activo: !c.activo }),
    onSuccess: (_r, c) => { avisos.exito(c.activo ? 'Curso dado de baja.' : 'Curso reactivado.'); void consultas.invalidateQueries({ queryKey: ['cursos'] }); setCambio(null); },
    onError: avisos.falla,
  });

  return (
    <>
      <Encabezado titulo="Cursos" descripcion="Cursos que imparten las dependencias federales, organizados por trimestre. Para cursos de años anteriores, regístralos con su año original.">
        <Boton variante="primario" icono={<Plus className="size-4" />} onClick={() => setEditar('nuevo')}>Nuevo curso</Boton>
      </Encabezado>
      <Panel sinRelleno>
        <BarraFiltros>
          <Buscador placeholder="Buscar por nombre" aria-label="Buscar cursos" value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
          <Filtro etiqueta="Año" value={filtros.anio} onChange={filtrar('anio')}>
            <option value="">Todos los años</option>
            {anios.data?.map((a) => <option key={a} value={a}>{a}</option>)}
          </Filtro>
          <Filtro etiqueta="Trimestre" value={filtros.trimestre} onChange={filtrar('trimestre')}>
            <option value="">Todos los trimestres</option>
            {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Trimestre {ROMANOS[t]}</option>)}
          </Filtro>
          <Filtro etiqueta="Dependencia" value={filtros.idDependencia} onChange={filtrar('idDependencia')}>
            <option value="">Todas las dependencias</option>
            {catalogos.data?.dependencias.map((d) => <option key={d.id} value={d.id}>{d.siglas}</option>)}
          </Filtro>
          <Filtro etiqueta="Estatus" value={filtros.activo} onChange={filtrar('activo')}>
            <option value="true">Activos</option><option value="false">Dados de baja</option><option value="">Todos</option>
          </Filtro>
        </BarraFiltros>
        {isLoading ? <Cargando /> : data?.datos.length === 0 ? (
          <Vacio titulo="No hay cursos con estos filtros">Registra un curso para poder asignarlo al personal.</Vacio>
        ) : (
          <table className="tabla">
            <thead><tr><th>Curso</th><th>Dependencia</th><th>Periodo</th><th>Entrega de constancia</th><th>Aplica a</th><th className="text-right">Asignado a</th><th>Estatus</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {data?.datos.map((c) => (
                <tr key={c.id}>
                  <td className="principal max-w-md">
                    {c.nombre}
                    {c.urlPlataforma && (
                      <a href={c.urlPlataforma} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex align-middle text-marca" aria-label="Abrir la plataforma del curso">
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </td>
                  <td data-etiqueta="Dependencia">{c.dependencia.siglas}</td>
                  <td data-etiqueta="Periodo" className="num">{periodo(c)}</td>
                  <td data-etiqueta="Entrega de constancia" className="num">{fecha(c.fechaEntregaConstancia)}</td>
                  <td data-etiqueta="Aplica a">{c.aplicaEstructura && c.aplicaHonorarios ? 'Todo el personal' : c.aplicaEstructura ? 'Estructura' : 'Honorarios'}</td>
                  <td data-etiqueta="Asignado a" className="num text-right">{c._count.cursosEmpleado} {c._count.cursosEmpleado === 1 ? 'persona' : 'personas'}</td>
                  <td data-etiqueta="Estatus"><InsigniaActivo activo={c.activo} /></td>
                  <td className="acciones">
                    <div className="flex items-center justify-end gap-1.5">
                      <Boton chico icono={<Pencil className="size-4" />} onClick={() => setEditar(c)}>Editar</Boton>
                      <MenuAcciones etiqueta={`Más acciones para ${c.nombre}`} acciones={[
                        { texto: c.activo ? 'Dar de baja' : 'Reactivar', peligro: c.activo, alElegir: () => setCambio(c) },
                      ]} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && <Paginacion pagina={pagina} porPagina={data.porPagina} total={data.total} cambiar={setPagina} />}
      </Panel>
      {editar && <FormularioCurso curso={editar === 'nuevo' ? null : editar} cerrar={() => setEditar(null)} />}
      <Confirmar abierto={!!cambio} titulo={cambio?.activo ? 'Dar de baja el curso' : 'Reactivar el curso'} peligro={cambio?.activo}
        textoBoton={cambio?.activo ? 'Dar de baja' : 'Reactivar'} cargando={estado.isPending} cerrar={() => setCambio(null)} confirmar={() => cambio && estado.mutate(cambio)}>
        {cambio?.activo
          ? <p>«{cambio.nombre}» dejará de aparecer como pendiente para el personal y saldrá de los reportes. Las constancias ya aprobadas se conservan.</p>
          : <p>«{cambio?.nombre}» volverá a mostrarse al personal que lo tiene asignado.</p>}
      </Confirmar>
    </>
  );
}
