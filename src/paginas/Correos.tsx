// Correos automáticos (RF07): plantillas configurables, historial de envíos y prueba de la configuración
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, RotateCcw, Send } from 'lucide-react';
import { api, leerError } from '../lib/api';
import { useLista } from '../lib/consultas';
import { fechaHora } from '../lib/formato';
import type { EnvioCorreo, Plantilla } from '../lib/tipos';
import { Alerta, AreaTexto, Boton, Cargando, Encabezado, Entrada, Insignia, Modal, Paginacion, Panel, Vacio } from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';
import { useSesion } from '../contexto/Sesion';

const NOMBRES: Record<string, { titulo: string; cuando: string }> = {
  ASIGNACION: { titulo: 'Asignación de curso', cuando: 'Se envía al personal cuando asignas un curso o reenvías el aviso.' },
  EVIDENCIA_APROBADA: { titulo: 'Constancia aprobada', cuando: 'Se envía al empleado cuando apruebas su constancia.' },
  EVIDENCIA_RECHAZADA: { titulo: 'Constancia rechazada', cuando: 'Se envía al empleado con el motivo del rechazo.' },
  RECUPERACION: { titulo: 'Recuperación de contraseña', cuando: 'Se envía cuando alguien usa «Olvidé mi contraseña».' },
  BIENVENIDA: { titulo: 'Cuenta nueva', cuando: 'Se envía al crear la cuenta de un empleado, con el enlace para definir su contraseña.' },
};
const EJEMPLO: Record<string, string> = {
  nombre: 'María', curso: 'Súmate al Protocolo', dependencia: 'INMUJERES', trimestre: '2026-IV', fechaLimite: '15/12/2026', urlCurso: 'https://ejemplo.gob.mx/curso',
  urlSistema: '#', enlace: '#', vigencia: '30 minutos', comentario: 'La constancia no muestra tu nombre completo.', identificador: 'maria.lopez@becasbenitojuarez.gob.mx',
};
const vistaPrevia = (texto: string) => texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, clave: string) => EJEMPLO[clave] ?? '');

function Editor({ plantilla, cerrar }: { plantilla: Plantilla; cerrar: () => void }) {
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [asunto, setAsunto] = useState(plantilla.asunto);
  const [cuerpoHtml, setCuerpoHtml] = useState(plantilla.cuerpoHtml);
  const [error, setError] = useState('');
  const alGuardar = (texto: string) => { avisos.exito(texto); void consultas.invalidateQueries({ queryKey: ['correos'] }); cerrar(); };
  const guardar = useMutation({
    mutationFn: () => api.put(`/correos/plantillas/${plantilla.id}`, { asunto, cuerpoHtml }),
    onSuccess: () => alGuardar('Plantilla guardada.'),
    onError: async (err) => setError((await leerError(err)).mensaje),
  });
  const restaurar = useMutation({
    mutationFn: () => api.post(`/correos/plantillas/${plantilla.id}/restaurar`),
    onSuccess: () => alGuardar('Se restauró el texto original de la plantilla.'),
    onError: avisos.falla,
  });
  const enviar = (e: FormEvent) => { e.preventDefault(); setError(''); guardar.mutate(); };

  return (
    <Modal abierto titulo={`Plantilla: ${NOMBRES[plantilla.nombre]?.titulo ?? plantilla.nombre}`} cerrar={cerrar} ancho="xl"
      pie={<>
        <Boton variante="sutil" icono={<RotateCcw className="size-4" />} cargando={restaurar.isPending} onClick={() => restaurar.mutate()} className="mr-auto">Restaurar texto original</Boton>
        <Boton onClick={cerrar}>Cancelar</Boton>
        <Boton variante="primario" type="submit" form="form-plantilla" cargando={guardar.isPending}>Guardar plantilla</Boton>
      </>}>
      <div className="grid gap-5 lg:grid-cols-2">
        <form id="form-plantilla" onSubmit={enviar} className="space-y-4" noValidate>
          {error && <Alerta>{error}</Alerta>}
          <Entrada etiqueta="Asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={200} />
          <AreaTexto etiqueta="Cuerpo del mensaje (HTML)" rows={16} className="font-mono text-[0.8125rem] leading-relaxed" spellCheck={false}
            value={cuerpoHtml} onChange={(e) => setCuerpoHtml(e.target.value)} />
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium">Datos que puedes insertar</p>
            <div className="flex flex-wrap gap-1.5">
              {plantilla.variables.map((v) => <code key={v} className="rounded border border-borde bg-realce px-1.5 py-0.5 text-xs">{`{{${v}}}`}</code>)}
            </div>
            <p className="mt-1.5 text-[0.8125rem] text-suave">Escríbelos tal cual, con las llaves dobles. Al enviar se sustituyen por el dato de cada persona.</p>
          </div>
        </form>
        <div>
          <p className="mb-1 text-[0.8125rem] font-medium">Vista previa con datos de ejemplo</p>
          <p className="mb-2 rounded-md border border-borde bg-realce px-3 py-2 text-sm"><span className="text-suave">Asunto:</span> {vistaPrevia(asunto)}</p>
          <iframe title="Vista previa del correo" sandbox="" srcDoc={vistaPrevia(cuerpoHtml)} className="h-[26rem] w-full rounded-md border border-borde bg-white" />
        </div>
      </div>
    </Modal>
  );
}

const TONO = { ENVIADO: 'verde', PENDIENTE: 'dorado', ERROR: 'rojo' } as const;
const TEXTO = { ENVIADO: 'Enviado', PENDIENTE: 'Enviando', ERROR: 'Con error' } as const;

export default function Correos() {
  const avisos = useAvisos();
  const { usuario } = useSesion();
  const [editar, setEditar] = useState<Plantilla | null>(null);
  const [pagina, setPagina] = useState(1);
  const [para, setPara] = useState(usuario?.correoInstitucional ?? usuario?.correoRespaldo ?? '');
  const plantillas = useQuery({ queryKey: ['correos', 'plantillas'], queryFn: async () => (await api.get<Plantilla[]>('/correos/plantillas')).data });
  const envios = useLista<EnvioCorreo>('correos', '/correos/envios', { pagina, porPagina: 10 });
  const probar = useMutation({
    mutationFn: async () => (await api.post<{ ok: boolean; mensaje: string }>('/correos/prueba', { para })).data,
    onSuccess: (r) => (r.ok ? avisos.exito(r.mensaje) : avisos.error(r.mensaje)),
    onError: avisos.falla,
  });

  return (
    <>
      <Encabezado titulo="Correos" descripcion="El sistema envía los avisos desde el servidor. Aquí ajustas el texto de cada mensaje y revisas qué se ha enviado." />
      <div className="space-y-5">
        <Panel titulo="Plantillas" sinRelleno>
          {plantillas.isLoading ? <Cargando /> : (
            <ul className="divide-y divide-borde">
              {plantillas.data?.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{NOMBRES[p.nombre]?.titulo ?? p.nombre}</p>
                    <p className="text-sm text-suave">{NOMBRES[p.nombre]?.cuando}</p>
                    <p className="mt-0.5 truncate text-[0.8125rem] text-suave">Asunto: {p.asunto}</p>
                  </div>
                  <Boton chico icono={<Pencil className="size-4" />} onClick={() => setEditar(p)}>Editar</Boton>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo="Probar la configuración de correo">
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); probar.mutate(); }}>
            <Entrada etiqueta="Enviar un correo de prueba a" type="email" value={para} onChange={(e) => setPara(e.target.value)} contenedor="w-full sm:w-80" />
            <Boton type="submit" icono={<Send className="size-4" />} cargando={probar.isPending} disabled={!para.includes('@')}>Enviar prueba</Boton>
          </form>
          <p className="mt-2 text-[0.8125rem] text-suave">Si falla, revisa los datos SMTP (servidor, puerto, usuario y contraseña) en el archivo .env del backend.</p>
        </Panel>

        <Panel titulo="Envíos de avisos de asignación" sinRelleno>
          {envios.isLoading ? <Cargando /> : envios.data?.datos.length === 0 ? (
            <Vacio titulo="Aún no se han enviado avisos">Al asignar un curso con la casilla de correo marcada, el envío aparecerá aquí.</Vacio>
          ) : (
            <table className="tabla">
              <thead><tr><th>Curso</th><th>Destinatarios</th><th>Fecha</th><th className="text-right">Correos enviados</th><th>Estado</th></tr></thead>
              <tbody>
                {envios.data?.datos.map((e) => (
                  <tr key={e.id}>
                    <td className="principal">{e.asignacion?.curso.nombre ?? '—'}</td>
                    <td data-etiqueta="Destinatarios">{e.asignacion ? (e.asignacion.esGeneral ? 'General' : e.asignacion.sede?.clave) : '—'}</td>
                    <td data-etiqueta="Fecha" className="num">{fechaHora(e.fechaEnvio)}</td>
                    <td data-etiqueta="Correos enviados" className="num text-right">{e.totalDestinatarios}</td>
                    <td data-etiqueta="Estado"><Insignia tono={TONO[e.estado]}>{TEXTO[e.estado]}</Insignia></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {envios.data && <Paginacion pagina={pagina} porPagina={envios.data.porPagina} total={envios.data.total} cambiar={setPagina} />}
        </Panel>
      </div>
      {editar && <Editor plantilla={editar} cerrar={() => setEditar(null)} />}
    </>
  );
}
