// Mi perfil (RF16, RF17): datos del empleado, datos de contacto, apariencia y contraseña
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Moon, Sun } from 'lucide-react';
import { api, leerError } from '../lib/api';
import { CONTRATACION, cx } from '../lib/formato';
import type { Perfil as DatosPerfil, Tema } from '../lib/tipos';
import { Alerta, Boton, Encabezado, Entrada, Panel } from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';
import { useSesion } from '../contexto/Sesion';

function Contacto({ perfil }: { perfil: DatosPerfil }) {
  const { actualizarPerfil } = useSesion();
  const avisos = useAvisos();
  const [correoRespaldo, setCorreoRespaldo] = useState(perfil.correoRespaldo ?? '');
  const [telefono, setTelefono] = useState(perfil.telefono ?? '');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState('');
  const obligatorio = !!perfil.correoInstitucional;
  const guardar = useMutation({
    mutationFn: async () => (await api.patch<DatosPerfil>('/auth/me/contacto', { correoRespaldo, telefono })).data,
    onSuccess: (p) => { actualizarPerfil(p); avisos.exito('Datos de contacto guardados.'); setErrores({}); setGeneral(''); },
    onError: async (err) => { const r = await leerError(err); setErrores(r.campos); setGeneral(Object.keys(r.campos).length ? '' : r.mensaje); },
  });
  function enviar(e: FormEvent) {
    e.preventDefault();
    const faltan: Record<string, string> = {};
    if (obligatorio && !correoRespaldo) faltan.correoRespaldo = 'Obligatorio porque tienes correo institucional';
    if (obligatorio && !telefono) faltan.telefono = 'Obligatorio porque tienes correo institucional';
    if (telefono && !/^\d{10}$/.test(telefono)) faltan.telefono = 'Escribe los 10 dígitos, sin espacios';
    setErrores(faltan);
    setGeneral('');
    if (Object.keys(faltan).length === 0) guardar.mutate();
  }
  return (
    <Panel titulo="Datos de contacto">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <p className="text-sm text-suave">
          El Área de Capacitación los usa para localizarte y enviarte avisos{perfil.correoInstitucional ? '' : '. Como no tienes correo institucional, el de respaldo es el que recibe tus avisos y el enlace para recuperar tu contraseña'}.
        </p>
        {general && <Alerta>{general}</Alerta>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Entrada etiqueta="Correo de respaldo" type="email" opcional={!obligatorio} value={correoRespaldo} onChange={(e) => setCorreoRespaldo(e.target.value)} error={errores.correoRespaldo} />
          <Entrada etiqueta="Teléfono" inputMode="numeric" maxLength={10} ayuda="10 dígitos" opcional={!obligatorio} value={telefono} onChange={(e) => setTelefono(e.target.value)} error={errores.telefono} />
        </div>
        <Boton type="submit" variante="primario" cargando={guardar.isPending}>Guardar datos de contacto</Boton>
      </form>
    </Panel>
  );
}

function Contrasena() {
  const avisos = useAvisos();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const cambiar = useMutation({
    mutationFn: () => api.post('/auth/me/contrasena', { actual, nueva }),
    onSuccess: () => { avisos.exito('Contraseña cambiada.'); setActual(''); setNueva(''); setRepetir(''); setErrores({}); },
    onError: async (err) => { const r = await leerError(err); setErrores(Object.keys(r.campos).length ? r.campos : { actual: r.mensaje }); },
  });
  function enviar(e: FormEvent) {
    e.preventDefault();
    const faltan: Record<string, string> = {};
    if (!actual) faltan.actual = 'Escribe tu contraseña actual';
    if (nueva.length < 8 || !/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) faltan.nueva = 'Usa al menos 8 caracteres, con letras y números';
    if (nueva !== repetir) faltan.repetir = 'Las contraseñas no coinciden';
    setErrores(faltan);
    if (Object.keys(faltan).length === 0) cambiar.mutate();
  }
  return (
    <Panel titulo="Contraseña">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Entrada etiqueta="Contraseña actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} error={errores.actual} contenedor="sm:max-w-xs" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Entrada etiqueta="Nueva contraseña" type="password" autoComplete="new-password" ayuda="Al menos 8 caracteres, con letras y números" value={nueva} onChange={(e) => setNueva(e.target.value)} error={errores.nueva} />
          <Entrada etiqueta="Repite la nueva contraseña" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} error={errores.repetir} />
        </div>
        <Boton type="submit" variante="primario" cargando={cambiar.isPending}>Cambiar contraseña</Boton>
      </form>
    </Panel>
  );
}

export default function Perfil() {
  const { usuario, cambiarTema } = useSesion();
  const avisos = useAvisos();
  if (!usuario) return null;
  const temas: { valor: Tema; texto: string; icono: React.ReactNode }[] = [
    { valor: 'CLARO', texto: 'Claro', icono: <Sun className="size-4" /> }, { valor: 'OSCURO', texto: 'Oscuro', icono: <Moon className="size-4" /> },
  ];
  const datos: [string, string][] = [
    ['CUPO', usuario.cupo], ['CURP', usuario.curp], ['Puesto', usuario.puesto], ['Sede', `${usuario.sede.clave}, ${usuario.sede.nombre}`],
    ['Área', usuario.area.nombre], ['Tipo de contratación', CONTRATACION[usuario.tipoContratacion]],
    ['Correo institucional', usuario.correoInstitucional ?? 'Sin correo institucional'], ['Inicias sesión con', usuario.correoInstitucional ? 'Tu correo institucional' : 'Tu CURP'],
  ];
  return (
    <>
      <Encabezado titulo="Mi perfil" descripcion="Tus datos personales solo los ven tú y el Área de Capacitación." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel titulo={usuario.nombreCompleto}>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {datos.map(([etiqueta, valor]) => <div key={etiqueta}><dt className="text-suave">{etiqueta}</dt><dd className="break-words font-medium">{valor}</dd></div>)}
          </dl>
          <p className="mt-4 border-t border-borde pt-3 text-[0.8125rem] text-suave">Si alguno de estos datos es incorrecto, pide la corrección al Área de Capacitación.</p>
        </Panel>
        <Contacto perfil={usuario} />
        <Panel titulo="Apariencia">
          <p className="mb-3 text-sm text-suave">Tu elección se guarda en tu cuenta y se aplica en cualquier dispositivo.</p>
          <div className="inline-flex rounded-lg border border-borde p-1" role="radiogroup" aria-label="Tema de la interfaz">
            {temas.map((t) => (
              <button key={t.valor} role="radio" aria-checked={usuario.tema === t.valor} onClick={() => cambiarTema(t.valor).catch(avisos.falla)}
                className={cx('inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium', usuario.tema === t.valor ? 'bg-guinda-700 text-white dark:bg-guinda-500' : 'text-suave hover:text-texto')}>
                {t.icono}{t.texto}
              </button>
            ))}
          </div>
        </Panel>
        <Contrasena />
      </div>
    </>
  );
}
