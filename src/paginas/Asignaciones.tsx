// Asignación de cursos a sedes o a todo el personal, con envío de correo (RF06, RF07)
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus } from 'lucide-react';
import { api, leerError } from '../lib/api';
import { useAnios, useCatalogos, useLista, useRetraso } from '../lib/consultas';
import { ROMANOS, dia, fecha, fechaHora, nombreCompleto, periodo } from '../lib/formato';
import type { Asignacion, AsignacionDetalle, Curso, Paginado } from '../lib/tipos';
import {
  Alerta, BarraAvance, BarraFiltros, Boton, Buscador, Cargando, Casilla, Confirmar, Encabezado, Filtro, Insignia, InsigniaActivo, InsigniaCurso, MenuAcciones, Modal, Paginacion, Panel, Selector, Vacio,
} from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';

function NuevaAsignacion({ cerrar }: { cerrar: () => void }) {
  const catalogos = useCatalogos();
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const cursos = useQuery({
    queryKey: ['cursos', 'activos'],
    queryFn: async () => (await api.get<Paginado<Curso>>('/cursos', { params: { activo: true, porPagina: 200 } })).data.datos,
  });
  const [idCurso, setIdCurso] = useState('');
  const [esGeneral, setEsGeneral] = useState(false);
  const [sedes, setSedes] = useState<number[]>([]);
  const [enviarCorreo, setEnviarCorreo] = useState(true);
  const [error, setError] = useState('');
  const curso = cursos.data?.find((c) => String(c.id) === idCurso);
  const alternar = (id: number) => setSedes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const todas = catalogos.data?.sedes ?? [];

  const crear = useMutation({
    mutationFn: async () => (await api.post<{ empleadosAsignados: number; sedesOmitidas: number }>('/asignaciones', {
      idCurso: Number(idCurso), esGeneral, idSedes: esGeneral ? [] : sedes, enviarCorreo,
    })).data,
    onSuccess: (r) => {
      avisos.exito(`Curso asignado a ${r.empleadosAsignados} ${r.empleadosAsignados === 1 ? 'persona' : 'personas'}.${enviarCorreo ? ' Los correos se están enviando.' : ''}${r.sedesOmitidas ? ` ${r.sedesOmitidas} sede(s) ya lo tenían asignado.` : ''}`);
      void consultas.invalidateQueries({ queryKey: ['asignaciones'] });
      void consultas.invalidateQueries({ queryKey: ['dashboard'] });
      cerrar();
    },
    onError: async (err) => setError((await leerError(err)).mensaje),
  });
  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!idCurso) return setError('Elige el curso que vas a asignar.');
    if (!esGeneral && sedes.length === 0) return setError('Elige al menos una sede o asigna el curso a todo el personal.');
    setError('');
    crear.mutate();
  }

  return (
    <Modal abierto titulo="Asignar curso" cerrar={cerrar} ancho="md"
      pie={<><Boton onClick={cerrar}>Cancelar</Boton><Boton variante="primario" type="submit" form="form-asignacion" cargando={crear.isPending}>Asignar curso</Boton></>}>
      <form id="form-asignacion" onSubmit={enviar} className="space-y-5" noValidate>
        {error && <Alerta>{error}</Alerta>}
        <Selector etiqueta="Curso" value={idCurso} onChange={(e) => setIdCurso(e.target.value)}
          ayuda={curso ? `${curso.dependencia.siglas}, ${periodo(curso)}. Aplica a ${curso.aplicaEstructura && curso.aplicaHonorarios ? 'todo el personal' : curso.aplicaEstructura ? 'personal de estructura' : 'personal de honorarios'}.` : undefined}>
          <option value="">{cursos.isLoading ? 'Cargando cursos…' : 'Elige un curso activo'}</option>
          {cursos.data?.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({periodo(c)})</option>)}
        </Selector>

        <fieldset>
          <legend className="mb-2 text-[0.8125rem] font-medium">Destinatarios</legend>
          <div className="space-y-2">
            <label className="flex items-start gap-2.5 text-sm">
              <input type="radio" name="destino" className="mt-0.5 size-4 accent-guinda-700" checked={!esGeneral} onChange={() => setEsGeneral(false)} />
              <span>Sedes específicas<span className="block text-[0.8125rem] text-suave">El personal activo de las sedes que marques.</span></span>
            </label>
            {!esGeneral && (
              <div className="ml-6 rounded-lg border border-borde p-3">
                <div className="mb-2 flex items-center justify-between text-[0.8125rem]">
                  <span className="text-suave">{sedes.length} de {todas.length} seleccionadas</span>
                  <button type="button" className="text-marca hover:underline" onClick={() => setSedes(sedes.length === todas.length ? [] : todas.map((s) => s.id))}>
                    {sedes.length === todas.length ? 'Quitar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
                  {todas.map((s) => <Casilla key={s.id} etiqueta={s.clave} descripcion={s.nombre} checked={sedes.includes(s.id)} onChange={() => alternar(s.id)} />)}
                </div>
              </div>
            )}
            <label className="flex items-start gap-2.5 text-sm">
              <input type="radio" name="destino" className="mt-0.5 size-4 accent-guinda-700" checked={esGeneral} onChange={() => setEsGeneral(true)} />
              <span>Asignación general<span className="block text-[0.8125rem] text-suave">Todo el personal activo, de la ORE y de todas las SARE.</span></span>
            </label>
          </div>
        </fieldset>

        <Casilla etiqueta="Enviar el correo de aviso al asignar" descripcion="Se envía desde el servidor con la plantilla «Asignación»; no necesitas abrir tu correo."
          checked={enviarCorreo} onChange={(e) => setEnviarCorreo(e.target.checked)} />
      </form>
    </Modal>
  );
}

function Detalle({ id, cerrar }: { id: number; cerrar: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['asignaciones', 'detalle', id], queryFn: async () => (await api.get<AsignacionDetalle>(`/asignaciones/${id}`)).data });
  return (
    <Modal abierto titulo="Personal asignado" cerrar={cerrar} ancho="lg">
      {isLoading || !data ? <Cargando /> : (
        <>
          <p className="mb-3 text-sm text-suave">{data.curso.nombre}, {data.esGeneral ? 'asignación general' : `sede ${data.sede?.clave}`}.</p>
          {data.cursosEmpleado.length === 0 ? <Vacio titulo="Esta asignación no tiene personal">No había empleados activos a los que aplicara el curso.</Vacio> : (
            <table className="tabla">
              <thead><tr><th>Nombre</th><th>CUPO</th><th>Sede</th><th>Estado</th></tr></thead>
              <tbody>
                {data.cursosEmpleado.map((c) => (
                  <tr key={c.id}>
                    <td className="principal">{nombreCompleto(c.empleado)}</td>
                    <td data-etiqueta="CUPO" className="num">{c.empleado.cupo}</td>
                    <td data-etiqueta="Sede">{c.empleado.sede.clave}</td>
                    <td data-etiqueta="Estado"><InsigniaCurso estado={c.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Modal>
  );
}

const TONO_ENVIO = { ENVIADO: 'verde', PENDIENTE: 'dorado', ERROR: 'rojo' } as const;
const TEXTO_ENVIO = { ENVIADO: 'Enviado', PENDIENTE: 'Enviando', ERROR: 'Con error' } as const;

export default function Asignaciones() {
  const catalogos = useCatalogos();
  const anios = useAnios();
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [buscar, setBuscar] = useState('');
  const [filtros, setFiltros] = useState({ anio: '', trimestre: '', idSede: '', activo: 'true' });
  const [pagina, setPagina] = useState(1);
  const [nueva, setNueva] = useState(false);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [accion, setAccion] = useState<{ tipo: 'correo' | 'estado'; a: Asignacion } | null>(null);
  const texto = useRetraso(buscar);
  const { data, isLoading } = useLista<Asignacion>('asignaciones', '/asignaciones', { buscar: texto, ...filtros, pagina, porPagina: 20 });
  const filtrar = (campo: keyof typeof filtros) => (e: React.ChangeEvent<HTMLSelectElement>) => { setFiltros((f) => ({ ...f, [campo]: e.target.value })); setPagina(1); };

  const correo = useMutation({
    mutationFn: async (a: Asignacion) => (await api.post<{ totalDestinatarios: number; sinCorreo: number }>(`/asignaciones/${a.id}/correo`)).data,
    onSuccess: (r) => {
      if (r.totalDestinatarios === 0) avisos.info(r.sinCorreo ? 'Nadie con curso pendiente tiene correo registrado.' : 'Todo el personal de esta asignación ya acreditó el curso.');
      else avisos.info(`Enviando correo a ${r.totalDestinatarios} ${r.totalDestinatarios === 1 ? 'persona' : 'personas'}${r.sinCorreo ? `; ${r.sinCorreo} no tienen correo registrado` : ''}.`);
      void consultas.invalidateQueries({ queryKey: ['asignaciones'] });
      setAccion(null);
    },
    onError: (e) => { avisos.falla(e); setAccion(null); },
  });
  const estado = useMutation({
    mutationFn: (a: Asignacion) => api.patch(`/asignaciones/${a.id}/estado`, { activo: !a.activo }),
    onSuccess: (_r, a) => { avisos.exito(a.activo ? 'Asignación desactivada.' : 'Asignación reactivada.'); void consultas.invalidateQueries({ queryKey: ['asignaciones'] }); setAccion(null); },
    onError: avisos.falla,
  });
  const a = accion?.a;
  const faltan = a ? a.avance.pendientes + a.avance.rechazados : 0;

  return (
    <>
      <Encabezado titulo="Asignaciones" descripcion="Asigna cada curso a una o varias sedes, o a todo el personal. Quien se incorpore después a la sede recibe el curso automáticamente mientras esté vigente.">
        <Boton variante="primario" icono={<Plus className="size-4" />} onClick={() => setNueva(true)}>Asignar curso</Boton>
      </Encabezado>
      <Panel sinRelleno>
        <BarraFiltros>
          <Buscador placeholder="Buscar por nombre del curso" aria-label="Buscar asignaciones" value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
          <Filtro etiqueta="Año" value={filtros.anio} onChange={filtrar('anio')}>
            <option value="">Todos los años</option>
            {anios.data?.map((x) => <option key={x} value={x}>{x}</option>)}
          </Filtro>
          <Filtro etiqueta="Trimestre" value={filtros.trimestre} onChange={filtrar('trimestre')}>
            <option value="">Todos los trimestres</option>
            {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Trimestre {ROMANOS[t]}</option>)}
          </Filtro>
          <Filtro etiqueta="Sede" value={filtros.idSede} onChange={filtrar('idSede')}>
            <option value="">Todas las sedes</option>
            {catalogos.data?.sedes.map((s) => <option key={s.id} value={s.id}>{s.clave}</option>)}
          </Filtro>
          <Filtro etiqueta="Estatus" value={filtros.activo} onChange={filtrar('activo')}>
            <option value="true">Activas</option><option value="false">Desactivadas</option><option value="">Todas</option>
          </Filtro>
        </BarraFiltros>
        {isLoading ? <Cargando /> : data?.datos.length === 0 ? (
          <Vacio titulo="No hay asignaciones con estos filtros">Asigna un curso para que el personal lo vea en «Mis cursos».</Vacio>
        ) : (
          <table className="tabla">
            <thead><tr><th>Curso</th><th>Destinatarios</th><th>Entrega</th><th className="w-48">Avance</th><th>Último correo</th><th>Estatus</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {data?.datos.map((x) => (
                <tr key={x.id}>
                  <td className="principal max-w-sm">
                    {x.curso.nombre}
                    <span className="block text-[0.8125rem] font-normal text-suave">{x.curso.dependencia.siglas}, {periodo(x.curso)}. Asignó {x.asignadoPor} el {dia(x.fechaAsignacion)}</span>
                  </td>
                  <td data-etiqueta="Destinatarios">{x.esGeneral ? <Insignia tono="guinda">General</Insignia> : x.sede?.clave}</td>
                  <td data-etiqueta="Entrega" className="num">{fecha(x.curso.fechaEntregaConstancia)}</td>
                  <td data-etiqueta="Avance">
                    <div className="w-full min-w-32">
                      <BarraAvance {...x.avance} />
                      <span className="mt-1 block text-[0.8125rem] text-suave">{x.avance.completados} de {x.avance.total} completados{x.avance.enRevision ? `, ${x.avance.enRevision} en revisión` : ''}</span>
                    </div>
                  </td>
                  <td data-etiqueta="Último correo">
                    {x.ultimoEnvio ? (
                      <span><Insignia tono={TONO_ENVIO[x.ultimoEnvio.estado]}>{TEXTO_ENVIO[x.ultimoEnvio.estado]}</Insignia>
                        <span className="mt-0.5 block text-[0.8125rem] text-suave">{fechaHora(x.ultimoEnvio.fechaEnvio)}</span></span>
                    ) : <span className="text-suave">Sin enviar</span>}
                  </td>
                  <td data-etiqueta="Estatus"><InsigniaActivo activo={x.activo} textos={['Activa', 'Desactivada']} /></td>
                  <td className="acciones">
                    <div className="flex items-center justify-end gap-1.5">
                      <Boton chico onClick={() => setDetalle(x.id)}>Ver personal</Boton>
                      <MenuAcciones etiqueta={`Más acciones para ${x.curso.nombre}`} acciones={[
                        x.activo && { texto: x.ultimoEnvio ? 'Reenviar correo de aviso' : 'Enviar correo de aviso', icono: <Mail className="size-4" />, alElegir: () => setAccion({ tipo: 'correo', a: x }) },
                        { texto: x.activo ? 'Desactivar asignación' : 'Reactivar asignación', peligro: x.activo, alElegir: () => setAccion({ tipo: 'estado', a: x }) },
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

      {nueva && <NuevaAsignacion cerrar={() => setNueva(false)} />}
      {detalle !== null && <Detalle id={detalle} cerrar={() => setDetalle(null)} />}
      <Confirmar abierto={accion?.tipo === 'correo'} titulo="Enviar correo de aviso" textoBoton="Enviar correo" cargando={correo.isPending}
        cerrar={() => setAccion(null)} confirmar={() => a && correo.mutate(a)}>
        <p>Se enviará el aviso de «{a?.curso.nombre}» a las {faltan} {faltan === 1 ? 'persona que aún no acredita' : 'personas que aún no acreditan'} el curso. Quienes ya lo completaron o tienen constancia en revisión no reciben nada.</p>
      </Confirmar>
      <Confirmar abierto={accion?.tipo === 'estado'} titulo={a?.activo ? 'Desactivar asignación' : 'Reactivar asignación'} peligro={a?.activo}
        textoBoton={a?.activo ? 'Desactivar' : 'Reactivar'} cargando={estado.isPending} cerrar={() => setAccion(null)} confirmar={() => a && estado.mutate(a)}>
        {a?.activo
          ? <p>El curso dejará de aparecer como pendiente para quienes aún no suben constancia. Las constancias ya recibidas se conservan.</p>
          : <p>El curso volverá a aparecer como pendiente y se asignará también al personal que se incorporó mientras estuvo desactivada.</p>}
      </Confirmar>
    </>
  );
}
