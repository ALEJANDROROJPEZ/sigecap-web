// Gestión de empleados (RF03, RF04, RF17): padrón, alta y edición, baja lógica e importación desde Excel
import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileUp, KeyRound, Pencil, Plus, UserMinus, UserPlus } from 'lucide-react';
import { api, descargar, leerError } from '../lib/api';
import { useCatalogos, useLista, useRetraso } from '../lib/consultas';
import { CONTRATACION, nombreCompleto } from '../lib/formato';
import type { CuentaCreada, Empleado, ResultadoImportacion } from '../lib/tipos';
import {
  Alerta, BarraFiltros, Boton, Buscador, Cargando, Confirmar, Encabezado, Entrada, Filtro, Insignia, InsigniaActivo, MenuAcciones, Modal, Paginacion, Panel, Selector, Vacio,
} from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';
import { CuentaLista } from './Usuarios';

const VACIO = {
  cupo: '', curp: '', numTrabajadorRusp: '', tipoContratacion: 'ESTRUCTURA', nombre: '', apellidoPaterno: '', apellidoMaterno: '',
  correoInstitucional: '', correoRespaldo: '', telefono: '', puesto: '', idArea: '', idSede: '',
};
type Formulario = typeof VACIO;

function FormularioEmpleado({ empleado, cerrar }: { empleado: Empleado | null; cerrar: () => void }) {
  const catalogos = useCatalogos();
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [f, setF] = useState<Formulario>(() => empleado ? {
    cupo: empleado.cupo, curp: empleado.curp, numTrabajadorRusp: empleado.numTrabajadorRusp ?? '', tipoContratacion: empleado.tipoContratacion,
    nombre: empleado.nombre, apellidoPaterno: empleado.apellidoPaterno, apellidoMaterno: empleado.apellidoMaterno ?? '',
    correoInstitucional: empleado.correoInstitucional ?? '', correoRespaldo: empleado.correoRespaldo ?? '', telefono: empleado.telefono ?? '',
    puesto: empleado.puesto, idArea: String(empleado.idArea), idSede: String(empleado.idSede),
  } : VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState('');
  const campo = (nombre: keyof Formulario) => ({
    value: f[nombre], error: errores[nombre],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((v) => ({ ...v, [nombre]: e.target.value })),
  });

  const guardar = useMutation({
    mutationFn: () => {
      const datos = { ...f, curp: f.curp.toUpperCase(), idArea: Number(f.idArea), idSede: Number(f.idSede) };
      return empleado ? api.put(`/empleados/${empleado.id}`, datos) : api.post('/empleados', datos);
    },
    onSuccess: () => {
      avisos.exito(empleado ? 'Empleado actualizado.' : 'Empleado registrado.');
      void consultas.invalidateQueries({ queryKey: ['empleados'] });
      cerrar();
    },
    onError: async (err) => {
      const r = await leerError(err);
      setErrores(r.campos);
      setGeneral(r.estado === 409 ? 'La CUPO, la CURP o el correo institucional ya están registrados en otro empleado.' : r.mensaje);
    },
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    const faltan: Record<string, string> = {};
    if (!/^\d{6}$/.test(f.cupo)) faltan.cupo = 'La CUPO debe tener 6 dígitos';
    if (f.curp.trim().length !== 18) faltan.curp = 'La CURP debe tener 18 caracteres';
    for (const c of ['nombre', 'apellidoPaterno', 'puesto'] as const) if (!f[c].trim()) faltan[c] = 'Dato obligatorio';
    if (!f.idArea) faltan.idArea = 'Elige un área';
    if (!f.idSede) faltan.idSede = 'Elige una sede';
    if (f.correoInstitucional && !f.correoRespaldo) faltan.correoRespaldo = 'Obligatorio cuando hay correo institucional';
    if (f.correoInstitucional && !f.telefono) faltan.telefono = 'Obligatorio cuando hay correo institucional';
    setErrores(faltan);
    setGeneral('');
    if (Object.keys(faltan).length === 0) guardar.mutate();
  }

  return (
    <Modal abierto titulo={empleado ? 'Editar empleado' : 'Nuevo empleado'} cerrar={cerrar} ancho="lg"
      pie={<><Boton onClick={cerrar}>Cancelar</Boton><Boton variante="primario" type="submit" form="form-empleado" cargando={guardar.isPending}>{empleado ? 'Guardar cambios' : 'Registrar empleado'}</Boton></>}>
      <form id="form-empleado" onSubmit={enviar} noValidate className="space-y-6">
        {general && <Alerta>{general}</Alerta>}
        <fieldset>
          <legend className="mb-3 font-semibold">Identificación</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Entrada etiqueta="CUPO" inputMode="numeric" maxLength={6} ayuda="6 dígitos" {...campo('cupo')} />
            <Entrada etiqueta="CURP" maxLength={18} className="uppercase" ayuda="18 caracteres" {...campo('curp')} />
            <Entrada etiqueta="Núm. de trabajador o RUSP" opcional maxLength={20} {...campo('numTrabajadorRusp')} />
            <Entrada etiqueta="Nombre(s)" {...campo('nombre')} />
            <Entrada etiqueta="Primer apellido" {...campo('apellidoPaterno')} />
            <Entrada etiqueta="Segundo apellido" opcional {...campo('apellidoMaterno')} />
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 font-semibold">Adscripción</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Entrada etiqueta="Puesto" contenedor="sm:col-span-2" {...campo('puesto')} />
            <Selector etiqueta="Sede" {...campo('idSede')}>
              <option value="">Elige una sede</option>
              {catalogos.data?.sedes.map((s) => <option key={s.id} value={s.id}>{s.clave} – {s.nombre}</option>)}
            </Selector>
            <Selector etiqueta="Área" {...campo('idArea')}>
              <option value="">Elige un área</option>
              {catalogos.data?.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </Selector>
            <Selector etiqueta="Tipo de contratación" {...campo('tipoContratacion')}>
              <option value="ESTRUCTURA">Estructura</option>
              <option value="HONORARIOS">Honorarios</option>
            </Selector>
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-semibold">Datos de contacto</legend>
          <p className="mb-3 text-[0.8125rem] text-suave">El correo institucional es opcional. Si lo capturas, el correo de respaldo y el teléfono son obligatorios.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Entrada etiqueta="Correo institucional" type="email" opcional {...campo('correoInstitucional')} />
            <Entrada etiqueta="Correo de respaldo" type="email" opcional={!f.correoInstitucional} {...campo('correoRespaldo')} />
            <Entrada etiqueta="Teléfono" inputMode="numeric" maxLength={10} ayuda="10 dígitos" opcional={!f.correoInstitucional} {...campo('telefono')} />
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

function Importar({ cerrar }: { cerrar: () => void }) {
  const archivoRef = useRef<HTMLInputElement>(null);
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [error, setError] = useState('');

  const enviar = useMutation({
    mutationFn: async (confirmar: boolean) => {
      const datos = new FormData();
      datos.append('archivo', archivo!);
      return (await api.post<ResultadoImportacion>('/empleados/importar', datos, { params: { confirmar } })).data;
    },
    onSuccess: (r) => {
      setResultado(r);
      setError('');
      if (r.aplicado) {
        avisos.exito(`Importación aplicada: ${r.nuevos} altas y ${r.actualizaciones} actualizaciones.`);
        void consultas.invalidateQueries({ queryKey: ['empleados'] });
        void consultas.invalidateQueries({ queryKey: ['catalogos'] });
      }
    },
    onError: async (err) => { setResultado(null); setError((await leerError(err)).mensaje); },
  });
  const elegir = (f: File | null) => { setArchivo(f); setResultado(null); setError(''); };

  return (
    <Modal abierto titulo="Importar empleados desde Excel" cerrar={cerrar} ancho="lg"
      pie={resultado?.aplicado ? <Boton variante="primario" onClick={cerrar}>Cerrar</Boton> : (
        <>
          <Boton onClick={cerrar}>Cancelar</Boton>
          {!resultado && <Boton variante="primario" disabled={!archivo} cargando={enviar.isPending} onClick={() => enviar.mutate(false)}>Revisar archivo</Boton>}
          {resultado && <Boton variante="primario" disabled={resultado.validas === 0} cargando={enviar.isPending} onClick={() => enviar.mutate(true)}>
            Importar {resultado.validas} {resultado.validas === 1 ? 'registro' : 'registros'}
          </Boton>}
        </>
      )}>
      <div className="space-y-4">
        <p className="text-sm text-suave">
          Los registros nuevos se dan de alta y los que ya existen se actualizan por su CUPO. Antes de guardar verás un resumen con los errores de cada fila.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={archivoRef} type="file" accept=".xlsx" className="sr-only" onChange={(e) => elegir(e.target.files?.[0] ?? null)} />
          <Boton icono={<FileUp className="size-4" />} onClick={() => archivoRef.current?.click()}>{archivo ? 'Elegir otro archivo' : 'Elegir archivo .xlsx'}</Boton>
          <Boton variante="sutil" icono={<Download className="size-4" />} onClick={() => descargar('/empleados/plantilla').catch(avisos.falla)}>Descargar plantilla</Boton>
          {archivo && <span className="min-w-0 truncate text-sm">{archivo.name}</span>}
        </div>
        {error && <Alerta>{error}</Alerta>}
        {enviar.isPending && <Cargando texto="Revisando el archivo…" />}
        {resultado && (
          <>
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-borde bg-realce p-4 text-sm sm:grid-cols-4">
              <div><dt className="text-suave">Filas leídas</dt><dd className="text-xl font-semibold">{resultado.total}</dd></div>
              <div><dt className="text-suave">{resultado.aplicado ? 'Altas' : 'Altas nuevas'}</dt><dd className="text-xl font-semibold text-exito">{resultado.nuevos}</dd></div>
              <div><dt className="text-suave">Actualizaciones</dt><dd className="text-xl font-semibold">{resultado.actualizaciones}</dd></div>
              <div><dt className="text-suave">Con errores</dt><dd className={`text-xl font-semibold ${resultado.errores.length ? 'text-peligro' : ''}`}>{resultado.errores.length}</dd></div>
            </dl>
            {resultado.areasNuevas.length > 0 && !resultado.aplicado && (
              <Alerta tono="dorado">Se crearán estas áreas que no están en el catálogo: {resultado.areasNuevas.join(', ')}.</Alerta>
            )}
            {resultado.errores.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  {resultado.aplicado ? 'Estas filas no se importaron:' : 'Estas filas no se importarán. Corrígelas en el archivo y vuelve a cargarlo, o importa solo las válidas.'}
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-borde">
                  <table className="tabla">
                    <thead><tr><th>Fila</th><th>CUPO</th><th>Nombre</th><th>Error</th></tr></thead>
                    <tbody>
                      {resultado.errores.map((e) => (
                        <tr key={e.fila}>
                          <td data-etiqueta="Fila" className="num">{e.fila}</td>
                          <td data-etiqueta="CUPO" className="num">{e.cupo || '—'}</td>
                          <td data-etiqueta="Nombre">{e.nombre || '—'}</td>
                          <td data-etiqueta="Error" className="ajusta text-peligro">{e.mensajes.join("; ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export default function Empleados() {
  const catalogos = useCatalogos();
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [buscar, setBuscar] = useState('');
  const [filtros, setFiltros] = useState({ idSede: '', tipoContratacion: '', activo: 'true' });
  const [pagina, setPagina] = useState(1);
  const [editar, setEditar] = useState<Empleado | null | 'nuevo'>(null);
  const [importar, setImportar] = useState(false);
  const [cambio, setCambio] = useState<Empleado | null>(null);
  const [cuenta, setCuenta] = useState<CuentaCreada | null>(null);
  const texto = useRetraso(buscar);
  const { data, isLoading } = useLista<Empleado>('empleados', '/empleados', { buscar: texto, ...filtros, pagina, porPagina: 20 });
  const filtrar = (campo: keyof typeof filtros) => (e: React.ChangeEvent<HTMLSelectElement>) => { setFiltros((f) => ({ ...f, [campo]: e.target.value })); setPagina(1); };

  const estado = useMutation({
    mutationFn: (e: Empleado) => api.patch(`/empleados/${e.id}/estado`, { activo: !e.activo }),
    onSuccess: (_r, e) => {
      avisos.exito(e.activo ? `${nombreCompleto(e)} se dio de baja.` : `${nombreCompleto(e)} se reactivó.`);
      void consultas.invalidateQueries({ queryKey: ['empleados'] });
      setCambio(null);
    },
    onError: avisos.falla,
  });
  const crearCuenta = useMutation({
    mutationFn: async (e: Empleado) => (await api.post<CuentaCreada>('/usuarios', { idEmpleado: e.id })).data,
    onSuccess: (c) => { setCuenta(c); void consultas.invalidateQueries({ queryKey: ['empleados'] }); void consultas.invalidateQueries({ queryKey: ['usuarios'] }); },
    onError: avisos.falla,
  });

  return (
    <>
      <Encabezado titulo="Empleados" descripcion="Padrón del personal de la ORE y las SARE. La baja es lógica: el historial de cursos se conserva.">
        <Boton icono={<FileUp className="size-4" />} onClick={() => setImportar(true)}>Importar Excel</Boton>
        <Boton variante="primario" icono={<Plus className="size-4" />} onClick={() => setEditar('nuevo')}>Nuevo empleado</Boton>
      </Encabezado>

      <Panel sinRelleno>
        <BarraFiltros>
          <Buscador placeholder="Buscar por nombre, CUPO, CURP o correo" aria-label="Buscar empleados" value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
          <Filtro etiqueta="Sede" value={filtros.idSede} onChange={filtrar('idSede')}>
            <option value="">Todas las sedes</option>
            {catalogos.data?.sedes.map((s) => <option key={s.id} value={s.id}>{s.clave}</option>)}
          </Filtro>
          <Filtro etiqueta="Tipo de contratación" value={filtros.tipoContratacion} onChange={filtrar('tipoContratacion')}>
            <option value="">Estructura y honorarios</option>
            <option value="ESTRUCTURA">Estructura</option>
            <option value="HONORARIOS">Honorarios</option>
          </Filtro>
          <Filtro etiqueta="Estatus" value={filtros.activo} onChange={filtrar('activo')}>
            <option value="true">Activos</option>
            <option value="false">Dados de baja</option>
            <option value="">Todos</option>
          </Filtro>
        </BarraFiltros>

        {isLoading ? <Cargando /> : data?.datos.length === 0 ? (
          <Vacio titulo="No hay empleados con estos filtros">Cambia la búsqueda, registra un empleado o importa el padrón desde Excel.</Vacio>
        ) : (
          <table className="tabla">
            <thead><tr><th>Nombre</th><th>CUPO</th><th>CURP</th><th>Puesto</th><th>Sede</th><th>Contratación</th><th>Cuenta</th><th>Estatus</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {data?.datos.map((e) => (
                <tr key={e.id}>
                  <td className="principal">
                    {nombreCompleto(e)}
                    <span className="block text-[0.8125rem] font-normal text-suave">{e.correoInstitucional ?? e.correoRespaldo ?? 'Sin correo registrado'}</span>
                  </td>
                  <td data-etiqueta="CUPO" className="num">{e.cupo}</td>
                  <td data-etiqueta="CURP" className="num">{e.curp}</td>
                  <td data-etiqueta="Puesto" className="ajusta">{e.puesto}</td>
                  <td data-etiqueta="Sede">{e.sede.clave}</td>
                  <td data-etiqueta="Contratación">{CONTRATACION[e.tipoContratacion]}</td>
                  <td data-etiqueta="Cuenta">
                    {e.usuario ? <Insignia tono={e.usuario.rol.nombre === 'ADMINISTRADOR' ? 'guinda' : 'gris'}>{e.usuario.rol.nombre === 'ADMINISTRADOR' ? 'Administrador' : 'Empleado'}</Insignia>
                      : <span className="text-suave">Sin cuenta</span>}
                  </td>
                  <td data-etiqueta="Estatus"><InsigniaActivo activo={e.activo} /></td>
                  <td className="acciones">
                    <div className="flex items-center justify-end gap-1.5">
                      <Boton chico icono={<Pencil className="size-4" />} onClick={() => setEditar(e)}>Editar</Boton>
                      <MenuAcciones etiqueta={`Más acciones para ${nombreCompleto(e)}`} acciones={[
                        !e.usuario && e.activo && { texto: 'Crear cuenta de acceso', icono: <KeyRound className="size-4" />, alElegir: () => crearCuenta.mutate(e) },
                        e.activo
                          ? { texto: 'Dar de baja', icono: <UserMinus className="size-4" />, peligro: true, alElegir: () => setCambio(e) }
                          : { texto: 'Reactivar', icono: <UserPlus className="size-4" />, alElegir: () => setCambio(e) },
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

      {editar && <FormularioEmpleado empleado={editar === 'nuevo' ? null : editar} cerrar={() => setEditar(null)} />}
      {importar && <Importar cerrar={() => setImportar(false)} />}
      {cuenta && <CuentaLista cuentas={[cuenta]} cerrar={() => setCuenta(null)} />}
      <Confirmar abierto={!!cambio} titulo={cambio?.activo ? 'Dar de baja al empleado' : 'Reactivar al empleado'} peligro={cambio?.activo}
        textoBoton={cambio?.activo ? 'Dar de baja' : 'Reactivar'} cargando={estado.isPending} cerrar={() => setCambio(null)} confirmar={() => cambio && estado.mutate(cambio)}>
        {cambio?.activo
          ? <p><strong>{cambio && nombreCompleto(cambio)}</strong> ya no podrá iniciar sesión ni aparecerá en los reportes. Su historial de cursos se conserva y puedes reactivarlo después.</p>
          : <p><strong>{cambio && nombreCompleto(cambio)}</strong> volverá a aparecer en el padrón y recibirá los cursos vigentes de su sede.</p>}
      </Confirmar>
    </>
  );
}
