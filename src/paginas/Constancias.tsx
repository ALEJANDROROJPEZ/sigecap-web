// Revisión de constancias (RF10): lista con filtros y dictamen con el PDF a la vista
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { api, leerError } from '../lib/api';
import { useCatalogos, useLista, useRetraso } from '../lib/consultas';
import { CONTRATACION, cx, fecha, fechaHora, nombreCompleto, periodo, tamano } from '../lib/formato';
import type { EstadoEvidencia, Evidencia } from '../lib/tipos';
import { Alerta, AreaTexto, BarraFiltros, Boton, Buscador, Cargando, Encabezado, Filtro, InsigniaEvidencia, Modal, Paginacion, Panel, Vacio } from '../componentes/ui';
import { VisorPdf } from '../componentes/VisorPdf';
import { useAvisos } from '../contexto/Avisos';

function Revision({ evidencia, cerrar }: { evidencia: Evidencia; cerrar: () => void }) {
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const { empleado, curso } = evidencia.cursoEmpleado;
  const pendiente = evidencia.estado === 'EN_REVISION';

  const dictaminar = useMutation({
    mutationFn: (estado: 'APROBADA' | 'RECHAZADA') => api.patch(`/evidencias/${evidencia.id}`, { estado, comentario: comentario.trim() || undefined }),
    onSuccess: (_r, estado) => {
      avisos.exito(estado === 'APROBADA' ? `Constancia aprobada. ${empleado.nombre} ya tiene el curso completado.` : `Constancia rechazada. ${empleado.nombre} recibió el motivo para corregirla.`);
      void consultas.invalidateQueries({ queryKey: ['evidencias'] });
      void consultas.invalidateQueries({ queryKey: ['dashboard'] });
      void consultas.invalidateQueries({ queryKey: ['asignaciones'] });
      cerrar();
    },
    onError: async (err) => setError((await leerError(err)).mensaje),
  });
  function rechazar() {
    if (comentario.trim().length < 5) return setError('Para rechazar, escribe el motivo: el empleado lo verá para corregir su constancia.');
    setError('');
    dictaminar.mutate('RECHAZADA');
  }

  return (
    <Modal abierto titulo="Revisar constancia" cerrar={cerrar} ancho="xl">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <VisorPdf idEvidencia={evidencia.id} className="h-[55dvh] lg:h-[68dvh]" />
        <div className="space-y-4 text-sm lg:pt-0">
          <div>
            <h3 className="font-serif text-lg font-semibold">{nombreCompleto(empleado)}</h3>
            <p className="text-suave">{empleado.puesto}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <div><dt className="text-suave">CUPO</dt><dd className="tabular-nums">{empleado.cupo}</dd></div>
            <div><dt className="text-suave">CURP</dt><dd className="tabular-nums">{empleado.curp}</dd></div>
            <div><dt className="text-suave">Sede</dt><dd>{empleado.sede.clave}</dd></div>
            <div><dt className="text-suave">Contratación</dt><dd>{CONTRATACION[empleado.tipoContratacion]}</dd></div>
            <div className="col-span-2"><dt className="text-suave">Curso</dt><dd className="font-medium">{curso.nombre}</dd><dd className="text-suave">{curso.dependencia.siglas}, {periodo(curso)}</dd></div>
            <div><dt className="text-suave">Inicio del curso</dt><dd className="tabular-nums">{fecha(evidencia.fechaInicioCurso)}</dd></div>
            <div><dt className="text-suave">Conclusión</dt><dd className="tabular-nums">{fecha(evidencia.fechaConclusion)}</dd></div>
            <div className="col-span-2"><dt className="text-suave">Archivo</dt><dd className="break-all">{evidencia.nombreArchivo} ({tamano(evidencia.tamanoBytes)})</dd><dd className="text-suave">Subido el {fechaHora(evidencia.fechaSubida)}</dd></div>
          </dl>

          {pendiente ? (
            <div className="space-y-3 border-t border-borde pt-4">
              {error && <Alerta>{error}</Alerta>}
              <AreaTexto etiqueta="Comentario para el empleado" ayuda="Obligatorio si rechazas la constancia; opcional si la apruebas." rows={3}
                value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={1000} />
              <div className="flex flex-wrap gap-2">
                <Boton variante="primario" icono={<Check className="size-4" />} cargando={dictaminar.isPending && dictaminar.variables === 'APROBADA'} disabled={dictaminar.isPending}
                  onClick={() => { setError(''); dictaminar.mutate('APROBADA'); }}>Aprobar</Boton>
                <Boton variante="peligro" icono={<X className="size-4" />} cargando={dictaminar.isPending && dictaminar.variables === 'RECHAZADA'} disabled={dictaminar.isPending}
                  onClick={rechazar}>Rechazar</Boton>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 border-t border-borde pt-4">
              <p><InsigniaEvidencia estado={evidencia.estado} /></p>
              <p className="text-suave">
                Revisó {evidencia.revisor ? `${evidencia.revisor.empleado.nombre} ${evidencia.revisor.empleado.apellidoPaterno}` : 'un administrador'} el {fechaHora(evidencia.fechaRevision)}.
              </p>
              {evidencia.comentarioRevision && <p>Comentario: {evidencia.comentarioRevision}</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

const PESTANAS: { estado: EstadoEvidencia | ''; texto: string }[] = [
  { estado: 'EN_REVISION', texto: 'Por revisar' }, { estado: 'APROBADA', texto: 'Aprobadas' }, { estado: 'RECHAZADA', texto: 'Rechazadas' }, { estado: '', texto: 'Todas' },
];

export default function Constancias() {
  const catalogos = useCatalogos();
  const [estado, setEstado] = useState<EstadoEvidencia | ''>('EN_REVISION');
  const [buscar, setBuscar] = useState('');
  const [filtros, setFiltros] = useState({ idDependencia: '', idSede: '' });
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState<Evidencia | null>(null);
  const texto = useRetraso(buscar);
  const { data, isLoading } = useLista<Evidencia>('evidencias', '/evidencias', { estado, buscar: texto, ...filtros, pagina, porPagina: 20 });
  const porRevisar = (data as unknown as { enRevision?: number } | undefined)?.enRevision ?? 0;
  const filtrar = (campo: keyof typeof filtros) => (e: React.ChangeEvent<HTMLSelectElement>) => { setFiltros((f) => ({ ...f, [campo]: e.target.value })); setPagina(1); };

  return (
    <>
      <Encabezado titulo="Constancias" descripcion="Revisa el PDF que subió cada empleado y aprueba o rechaza. Al rechazar, el motivo le llega al empleado para que la corrija y la reenvíe." />
      <Panel sinRelleno>
        <div className="flex gap-1 overflow-x-auto border-b border-borde px-3 pt-2" role="tablist">
          {PESTANAS.map((p) => (
            <button key={p.estado} role="tab" aria-selected={estado === p.estado} onClick={() => { setEstado(p.estado); setPagina(1); }}
              className={cx('border-b-2 px-3 py-2 text-sm whitespace-nowrap', estado === p.estado ? 'border-marca font-semibold text-marca' : 'border-transparent text-suave hover:text-texto')}>
              {p.texto}{p.estado === 'EN_REVISION' && porRevisar > 0 && <span className="ml-1.5 rounded-full bg-dorado-300 px-1.5 text-xs font-semibold text-guinda-900">{porRevisar}</span>}
            </button>
          ))}
        </div>
        <BarraFiltros>
          <Buscador placeholder="Buscar por nombre, CUPO o CURP" aria-label="Buscar constancias" value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
          <Filtro etiqueta="Dependencia" value={filtros.idDependencia} onChange={filtrar('idDependencia')}>
            <option value="">Todas las dependencias</option>
            {catalogos.data?.dependencias.map((d) => <option key={d.id} value={d.id}>{d.siglas}</option>)}
          </Filtro>
          <Filtro etiqueta="Sede" value={filtros.idSede} onChange={filtrar('idSede')}>
            <option value="">Todas las sedes</option>
            {catalogos.data?.sedes.map((s) => <option key={s.id} value={s.id}>{s.clave}</option>)}
          </Filtro>
        </BarraFiltros>
        {isLoading ? <Cargando /> : data?.datos.length === 0 ? (
          <Vacio titulo={estado === 'EN_REVISION' ? 'No hay constancias por revisar' : 'No hay constancias con estos filtros'}>
            {estado === 'EN_REVISION' && 'Cuando un empleado suba su constancia aparecerá aquí y recibirás una notificación.'}
          </Vacio>
        ) : (
          <table className="tabla">
            <thead><tr><th>Empleado</th><th>Curso</th><th>Sede</th><th>Conclusión</th><th>Recibida</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {data?.datos.map((e) => (
                <tr key={e.id}>
                  <td className="principal">{nombreCompleto(e.cursoEmpleado.empleado)}<span className="block text-[0.8125rem] font-normal text-suave tabular-nums">CUPO {e.cursoEmpleado.empleado.cupo}</span></td>
                  <td data-etiqueta="Curso" className="ajusta max-w-xs">{e.cursoEmpleado.curso.nombre}<span className="block text-[0.8125rem] text-suave">{e.cursoEmpleado.curso.dependencia.siglas}, {periodo(e.cursoEmpleado.curso)}</span></td>
                  <td data-etiqueta="Sede">{e.cursoEmpleado.empleado.sede.clave}</td>
                  <td data-etiqueta="Conclusión" className="num">{fecha(e.fechaConclusion)}</td>
                  <td data-etiqueta="Recibida" className="num">{fechaHora(e.fechaSubida)}</td>
                  <td data-etiqueta="Estado"><InsigniaEvidencia estado={e.estado} /></td>
                  <td className="acciones"><div className="flex justify-end">
                    <Boton chico variante={e.estado === 'EN_REVISION' ? 'primario' : 'sutil'} onClick={() => setAbierta(e)}>{e.estado === 'EN_REVISION' ? 'Revisar' : 'Ver'}</Boton>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && <Paginacion pagina={pagina} porPagina={data.porPagina} total={data.total} cambiar={setPagina} />}
      </Panel>
      {abierta && <Revision evidencia={abierta} cerrar={() => setAbierta(null)} />}
    </>
  );
}
