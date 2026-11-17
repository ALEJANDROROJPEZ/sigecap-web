// Mis cursos (RF08, RF09, RF18): cursos asignados por estado, carga de constancia y registro de cursos de años anteriores
import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileUp, History, Upload } from 'lucide-react';
import { api, leerError } from '../lib/api';
import { cx, fecha, fechaHora, hoyISO, paraInput, periodo, tamano } from '../lib/formato';
import type { CursoCatalogo, EstadoCurso, MiCurso } from '../lib/tipos';
import { Alerta, Boton, Cargando, Encabezado, Entrada, InsigniaCurso, Modal, Panel, Selector, Vacio } from '../componentes/ui';
import { VisorPdf } from '../componentes/VisorPdf';
import { useAvisos } from '../contexto/Avisos';

const MAX_MB = 5;

// Formulario para subir la constancia de un curso asignado o registrar uno de años anteriores
function SubirConstancia({ seguimiento, historico, cerrar }: { seguimiento?: MiCurso; historico?: boolean; cerrar: () => void }) {
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [idCurso, setIdCurso] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [inicio, setInicio] = useState(paraInput(seguimiento?.curso.fechaInicio));
  const [conclusion, setConclusion] = useState('');
  const [avance, setAvance] = useState(0);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState('');
  const catalogo = useQuery({
    queryKey: ['mis-cursos', 'catalogo'], enabled: !!historico,
    queryFn: async () => (await api.get<CursoCatalogo[]>('/mis-cursos/catalogo')).data,
  });
  const rechazo = seguimiento?.estado === 'RECHAZADO' ? seguimiento.evidencias[0]?.comentarioRevision : null;

  function elegir(f: File | null) {
    setArchivo(null);
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) return setErrores((e) => ({ ...e, archivo: 'El archivo debe ser un PDF.' }));
    if (f.size > MAX_MB * 1024 * 1024) return setErrores((e) => ({ ...e, archivo: `El archivo pesa ${tamano(f.size)}; el máximo es ${MAX_MB} MB.` }));
    setErrores((e) => ({ ...e, archivo: '' }));
    setArchivo(f);
  }

  const subir = useMutation({
    mutationFn: () => {
      const datos = new FormData();
      if (seguimiento) datos.append('idCursoEmpleado', String(seguimiento.id));
      else datos.append('idCurso', idCurso);
      datos.append('fechaInicioCurso', inicio);
      datos.append('fechaConclusion', conclusion);
      datos.append('archivo', archivo!);
      return api.post('/evidencias', datos, { onUploadProgress: (p) => setAvance(p.total ? Math.round((p.loaded / p.total) * 100) : 0) });
    },
    onSuccess: () => {
      avisos.exito('Constancia enviada. El Área de Capacitación la revisará y te avisaremos el resultado.');
      void consultas.invalidateQueries({ queryKey: ['mis-cursos'] });
      cerrar();
    },
    onError: async (err) => { const r = await leerError(err); setErrores(r.campos); setGeneral(r.mensaje); setAvance(0); },
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    const faltan: Record<string, string> = {};
    if (historico && !idCurso) faltan.idCurso = 'Elige el curso que concluiste';
    if (!inicio) faltan.fechaInicioCurso = 'Indica cuándo iniciaste el curso';
    if (!conclusion) faltan.fechaConclusion = 'Indica cuándo lo concluiste';
    else if (conclusion > hoyISO()) faltan.fechaConclusion = 'La conclusión no puede ser posterior a hoy';
    else if (inicio && conclusion < inicio) faltan.fechaConclusion = 'La conclusión no puede ser anterior al inicio';
    if (!archivo) faltan.archivo = errores.archivo || 'Elige el PDF de tu constancia';
    setErrores(faltan);
    setGeneral('');
    if (Object.keys(faltan).length === 0) subir.mutate();
  }

  return (
    <Modal abierto titulo={historico ? 'Registrar curso de años anteriores' : rechazo ? 'Reenviar constancia' : 'Subir constancia'} cerrar={cerrar} ancho="sm"
      pie={<><Boton onClick={cerrar} disabled={subir.isPending}>Cancelar</Boton><Boton variante="primario" type="submit" form="form-constancia" cargando={subir.isPending}>Enviar constancia</Boton></>}>
      <form id="form-constancia" onSubmit={enviar} className="space-y-4" noValidate>
        {general && <Alerta>{general}</Alerta>}
        {seguimiento && <p className="text-sm"><span className="text-suave">Curso:</span> <strong>{seguimiento.curso.nombre}</strong></p>}
        {rechazo && <Alerta tono="dorado"><strong>Motivo del rechazo anterior:</strong> {rechazo}</Alerta>}
        {historico && (
          <>
            <p className="text-sm text-suave">Si concluiste un curso en un año anterior y tienes la constancia, regístralo aquí para que forme parte de tu historial.</p>
            <Selector etiqueta="Curso" value={idCurso} onChange={(e) => setIdCurso(e.target.value)} error={errores.idCurso}
              ayuda={catalogo.data?.length === 0 ? 'No hay cursos disponibles para registrar. Pide al Área de Capacitación que agregue el curso al catálogo.' : undefined}>
              <option value="">{catalogo.isLoading ? 'Cargando cursos…' : 'Elige un curso'}</option>
              {catalogo.data?.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.dependencia.siglas}, {periodo(c)})</option>)}
            </Selector>
          </>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Entrada etiqueta="Inicio del curso" type="date" max={hoyISO()} value={inicio} onChange={(e) => setInicio(e.target.value)} error={errores.fechaInicioCurso} />
          <Entrada etiqueta="Conclusión" type="date" max={hoyISO()} min={inicio || undefined} value={conclusion} onChange={(e) => setConclusion(e.target.value)} error={errores.fechaConclusion} />
        </div>
        <div>
          <p className="mb-1 text-[0.8125rem] font-medium">Constancia en PDF</p>
          <input ref={archivoRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => elegir(e.target.files?.[0] ?? null)} />
          <button type="button" onClick={() => archivoRef.current?.click()}
            className={cx('flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-left text-sm hover:bg-realce', errores.archivo ? 'border-peligro' : 'border-borde')}>
            <FileUp className="size-5 shrink-0 text-marca" aria-hidden />
            {archivo ? <span className="min-w-0"><span className="block truncate font-medium">{archivo.name}</span><span className="text-suave">{tamano(archivo.size)}. Toca para cambiarlo.</span></span>
              : <span><span className="block font-medium">Elegir archivo</span><span className="text-suave">Solo PDF, máximo {MAX_MB} MB.</span></span>}
          </button>
          {errores.archivo && <p className="mt-1 text-[0.8125rem] text-peligro">{errores.archivo}</p>}
        </div>
        {subir.isPending && (
          <div role="status">
            <div className="h-2 overflow-hidden rounded-full bg-borde"><div className="h-full bg-guinda-500 transition-[width]" style={{ width: `${avance}%` }} /></div>
            <p className="mt-1 text-[0.8125rem] text-suave">Enviando… {avance}%</p>
          </div>
        )}
      </form>
    </Modal>
  );
}

function Tarjeta({ c, subir, ver }: { c: MiCurso; subir: () => void; ver: (id: number) => void }) {
  const ultima = c.evidencias[0];
  const vencido = c.estado === 'PENDIENTE' && c.curso.fechaEntregaConstancia && c.curso.fechaEntregaConstancia.slice(0, 10) < hoyISO();
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <InsigniaCurso estado={c.estado} />
          <span className="text-[0.8125rem] text-suave">{c.curso.dependencia.siglas}, {periodo(c.curso)}{c.origen === 'HISTORICO' && ', registrado por ti'}</span>
        </div>
        <h2 className="font-sans text-base font-semibold">{c.curso.nombre}</h2>
        {c.curso.descripcion && <p className="mt-0.5 max-w-[70ch] text-sm text-suave">{c.curso.descripcion}</p>}

        {(c.estado === 'PENDIENTE' || c.estado === 'RECHAZADO') && c.curso.fechaEntregaConstancia && (
          <p className={cx('mt-1.5 text-sm', vencido ? 'font-medium text-peligro' : 'text-suave')}>
            {vencido ? 'La fecha de entrega venció el' : 'Entrega tu constancia a más tardar el'} {fecha(c.curso.fechaEntregaConstancia)}.
          </p>
        )}
        {c.estado === 'RECHAZADO' && ultima?.comentarioRevision && (
          <div className="mt-2 max-w-[70ch]"><Alerta><strong>Motivo del rechazo:</strong> {ultima.comentarioRevision}</Alerta></div>
        )}
        {c.estado === 'EN_REVISION' && ultima && <p className="mt-1.5 text-sm text-suave">Enviaste «{ultima.nombreArchivo}» el {fechaHora(ultima.fechaSubida)}. Está en revisión.</p>}
        {c.estado === 'COMPLETADO' && ultima && (
          <p className="mt-1.5 text-sm text-suave">Concluido el {fecha(ultima.fechaConclusion)}. Constancia aprobada el {fechaHora(ultima.fechaRevision)}.{ultima.comentarioRevision ? ` Comentario: ${ultima.comentarioRevision}` : ''}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
        {(c.estado === 'PENDIENTE' || c.estado === 'RECHAZADO') && (
          <Boton variante="primario" icono={<Upload className="size-4" />} onClick={subir}>{c.estado === 'RECHAZADO' ? 'Reenviar constancia' : 'Subir constancia'}</Boton>
        )}
        {c.curso.urlPlataforma && c.estado !== 'COMPLETADO' && (
          <a href={c.curso.urlPlataforma} target="_blank" rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-borde bg-superficie px-4 text-sm font-medium hover:bg-realce">
            <ExternalLink className="size-4" aria-hidden />Ir al curso
          </a>
        )}
        {ultima && c.estado !== 'PENDIENTE' && <Boton onClick={() => ver(ultima.id)}>Ver mi constancia</Boton>}
      </div>
    </li>
  );
}

const PESTANAS: { estado: EstadoCurso; texto: string; vacio: string }[] = [
  { estado: 'PENDIENTE', texto: 'Pendientes', vacio: 'No tienes cursos pendientes' },
  { estado: 'RECHAZADO', texto: 'Por corregir', vacio: 'No tienes constancias rechazadas' },
  { estado: 'EN_REVISION', texto: 'En revisión', vacio: 'No tienes constancias en revisión' },
  { estado: 'COMPLETADO', texto: 'Completados', vacio: 'Aún no tienes cursos completados' },
];

export default function MisCursos() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['mis-cursos', 'lista'], queryFn: async () => (await api.get<MiCurso[]>('/mis-cursos')).data });
  const [elegida, setElegida] = useState<EstadoCurso | null>(null);
  const [subir, setSubir] = useState<MiCurso | 'historico' | null>(null);
  const [ver, setVer] = useState<number | null>(null);
  const cuenta = (e: EstadoCurso) => data?.filter((c) => c.estado === e).length ?? 0;
  // Se abre en la pestaña que requiere atención: primero lo rechazado, luego lo pendiente
  const pestana = elegida ?? (cuenta('RECHAZADO') > 0 ? 'RECHAZADO' : 'PENDIENTE');
  const visibles = data?.filter((c) => c.estado === pestana) ?? [];
  const actual = PESTANAS.find((p) => p.estado === pestana)!;

  return (
    <>
      <Encabezado titulo="Mis cursos" descripcion="Al concluir un curso, sube tu constancia en PDF. El Área de Capacitación la revisa y te avisa el resultado.">
        <Boton icono={<History className="size-4" />} onClick={() => setSubir('historico')}>Registrar curso de años anteriores</Boton>
      </Encabezado>
      <Panel sinRelleno>
        <div className="flex gap-1 overflow-x-auto border-b border-borde px-3 pt-2" role="tablist">
          {PESTANAS.map((p) => (
            <button key={p.estado} role="tab" aria-selected={pestana === p.estado} onClick={() => setElegida(p.estado)}
              className={cx('border-b-2 px-3 py-2 text-sm whitespace-nowrap', pestana === p.estado ? 'border-marca font-semibold text-marca' : 'border-transparent text-suave hover:text-texto')}>
              {p.texto} <span className="tabular-nums">({cuenta(p.estado)})</span>
            </button>
          ))}
        </div>
        {isLoading ? <Cargando /> : isError ? <Vacio titulo="No se pudieron cargar tus cursos">Revisa tu conexión y vuelve a intentarlo.</Vacio>
          : visibles.length === 0 ? (
            <Vacio titulo={actual.vacio}>{pestana === 'PENDIENTE' && 'Cuando te asignen un curso aparecerá aquí y recibirás una notificación.'}</Vacio>
          ) : (
            <ul className="divide-y divide-borde">
              {visibles.map((c) => <Tarjeta key={c.id} c={c} subir={() => setSubir(c)} ver={setVer} />)}
            </ul>
          )}
      </Panel>
      {subir && <SubirConstancia seguimiento={subir === 'historico' ? undefined : subir} historico={subir === 'historico'} cerrar={() => setSubir(null)} />}
      <Modal abierto={ver !== null} titulo="Mi constancia" cerrar={() => setVer(null)} ancho="lg">
        {ver !== null && <VisorPdf idEvidencia={ver} className="h-[70dvh]" />}
      </Modal>
    </>
  );
}
