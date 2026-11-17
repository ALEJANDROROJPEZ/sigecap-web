// Pantallas públicas: inicio de sesión, solicitud de recuperación y nueva contraseña
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, leerError } from '../lib/api';
import { Alerta, Boton, Entrada } from '../componentes/ui';
import { useSesion } from '../contexto/Sesion';

function Marco({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Panel institucional: solo en pantallas amplias */}
      <aside className="relative hidden overflow-hidden bg-guinda-700 text-white lg:flex lg:flex-col lg:justify-between lg:p-12 dark:bg-guinda-900">
        <div>
          <p className="font-serif text-2xl font-bold tracking-tight">SIGECAP</p>
          <p className="mt-1 text-sm text-guinda-200">Sistema de gestión de cursos de capacitación</p>
        </div>
        <div>
          <p className="max-w-[16ch] font-serif text-[2.75rem] leading-[1.1] font-semibold">Cada curso, con su constancia en regla.</p>
          <p className="mt-5 max-w-[42ch] text-guinda-100">
            Consulta los cursos que te asignaron, sube tu constancia en PDF y sigue su revisión desde la computadora o el teléfono.
          </p>
        </div>
        <p className="border-t border-dorado-300/40 pt-4 text-sm text-guinda-200">
          Coordinación Nacional de Becas para el Bienestar Benito Juárez<br />Coordinación de Representación Estatal en Oaxaca
        </p>
      </aside>

      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <p className="mb-8 font-serif text-2xl font-bold text-marca lg:hidden">SIGECAP</p>
          <h1 className="text-[1.75rem] font-semibold">{titulo}</h1>
          <p className="mt-1.5 mb-6 text-sm text-suave">{descripcion}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

export function Acceso() {
  const { iniciarSesion } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [identificador, setIdentificador] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const perfil = await iniciarSesion(identificador.trim(), contrasena);
      const desde = (ubicacion.state as { desde?: string } | null)?.desde;
      navegar(desde && desde !== '/entrar' ? desde : perfil.rol === 'ADMINISTRADOR' ? '/' : '/mis-cursos', { replace: true });
    } catch (err) {
      setError((await leerError(err)).mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Marco titulo="Inicia sesión" descripcion="Entra con tu correo institucional. Si aún no tienes uno, usa tu CURP.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}
        <Entrada etiqueta="Correo institucional o CURP" value={identificador} onChange={(e) => setIdentificador(e.target.value)}
          autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
        <Entrada etiqueta="Contraseña" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)}
          autoComplete="current-password" required />
        <Boton type="submit" variante="primario" className="w-full" cargando={enviando} disabled={!identificador || !contrasena}>Iniciar sesión</Boton>
        <p className="text-center text-sm"><Link to="/recuperar" className="text-marca hover:underline">Olvidé mi contraseña</Link></p>
      </form>
    </Marco>
  );
}

export function Olvide() {
  const [identificador, setIdentificador] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { data } = await api.post<{ mensaje: string }>('/auth/forgot-password', { identificador: identificador.trim() });
      setMensaje(data.mensaje);
    } catch (err) {
      setError((await leerError(err)).mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Marco titulo="Recupera tu contraseña" descripcion="Te enviaremos un enlace a tu correo institucional y a tu correo de respaldo. Vence en 30 minutos.">
      {mensaje ? (
        <div className="space-y-4">
          <Alerta tono="verde">{mensaje}</Alerta>
          <p className="text-sm text-suave">Si no tienes ningún correo registrado, pide al Área de Capacitación una contraseña temporal.</p>
          <Link to="/entrar" className="text-sm text-marca hover:underline">Volver al inicio de sesión</Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {error && <Alerta>{error}</Alerta>}
          <Entrada etiqueta="Correo institucional o CURP" value={identificador} onChange={(e) => setIdentificador(e.target.value)}
            autoCapitalize="none" spellCheck={false} required autoFocus />
          <Boton type="submit" variante="primario" className="w-full" cargando={enviando} disabled={identificador.trim().length < 5}>Enviar enlace</Boton>
          <p className="text-center text-sm"><Link to="/entrar" className="text-marca hover:underline">Volver al inicio de sesión</Link></p>
        </form>
      )}
    </Marco>
  );
}

export function Restablecer() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';
  const { cerrarSesion } = useSesion();
  const [contrasena, setContrasena] = useState('');
  const [repetir, setRepetir] = useState('');
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const distintas = repetir.length > 0 && contrasena !== repetir;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post('/auth/reset-password', { token, contrasena });
      cerrarSesion();
      setListo(true);
    } catch (err) {
      const r = await leerError(err);
      setError(r.campos.contrasena ?? r.mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Marco titulo="Crea tu contraseña" descripcion="Usa al menos 8 caracteres, con letras y números.">
      {listo ? (
        <div className="space-y-4">
          <Alerta tono="verde">Contraseña actualizada.</Alerta>
          <Link to="/entrar" className="inline-flex h-10 items-center rounded-md bg-guinda-700 px-4 text-sm font-medium text-white hover:bg-guinda-600">Iniciar sesión</Link>
        </div>
      ) : !token ? (
        <div className="space-y-4">
          <Alerta>El enlace está incompleto. Ábrelo de nuevo desde el correo o solicita otro.</Alerta>
          <Link to="/recuperar" className="text-sm text-marca hover:underline">Solicitar un enlace nuevo</Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {error && <Alerta>{error} {error.includes('expiró') && <Link to="/recuperar" className="underline">Solicitar otro</Link>}</Alerta>}
          <Entrada etiqueta="Nueva contraseña" type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="new-password" autoFocus />
          <Entrada etiqueta="Repite la contraseña" type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password"
            error={distintas ? 'Las contraseñas no coinciden' : undefined} />
          <Boton type="submit" variante="primario" className="w-full" cargando={enviando} disabled={contrasena.length < 8 || contrasena !== repetir}>Guardar contraseña</Boton>
        </form>
      )}
    </Marco>
  );
}
