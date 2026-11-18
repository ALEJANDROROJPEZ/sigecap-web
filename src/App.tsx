// Rutas de la aplicación. Cada pantalla se carga solo cuando se visita y las de administración
// exigen el rol de administrador (la API vuelve a verificarlo en cada petición).
import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Plantilla } from './componentes/Plantilla';
import { Cargando } from './componentes/ui';
import { useSesion } from './contexto/Sesion';
import { Acceso, Olvide, Restablecer } from './paginas/Acceso';

const Inicio = lazy(() => import('./paginas/Inicio'));
const Empleados = lazy(() => import('./paginas/Empleados'));
const Cursos = lazy(() => import('./paginas/Cursos'));
const Asignaciones = lazy(() => import('./paginas/Asignaciones'));
const Constancias = lazy(() => import('./paginas/Constancias'));
const Reportes = lazy(() => import('./paginas/Reportes'));
const Usuarios = lazy(() => import('./paginas/Usuarios'));
const Catalogos = lazy(() => import('./paginas/Catalogos'));
const Correos = lazy(() => import('./paginas/Correos'));
const Bitacora = lazy(() => import('./paginas/Bitacora'));
const MisCursos = lazy(() => import('./paginas/MisCursos'));
const Notificaciones = lazy(() => import('./paginas/Notificaciones'));
const Perfil = lazy(() => import('./paginas/Perfil'));
const Repositorios = lazy(() => import('./paginas/Repositorios'));

function ConSesion() {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();
  if (cargando) return <div className="grid min-h-dvh place-items-center"><Cargando texto="Recuperando tu sesión…" /></div>;
  if (!usuario) return <Navigate to="/entrar" replace state={{ desde: ubicacion.pathname }} />;
  return <Plantilla />;
}

function SoloAdministrador() {
  const { esAdmin } = useSesion();
  return esAdmin ? <Outlet /> : <Navigate to="/mis-cursos" replace />;
}

function SinSesion() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <div className="grid min-h-dvh place-items-center"><Cargando /></div>;
  return usuario ? <Navigate to="/" replace /> : <Outlet />;
}

export function App() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route element={<SinSesion />}>
          <Route path="/entrar" element={<Acceso />} />
          <Route path="/recuperar" element={<Olvide />} />
        </Route>
        {/* El enlace del correo debe funcionar aunque haya una sesión abierta en el navegador */}
        <Route path="/restablecer" element={<Restablecer />} />
        <Route path="/repositorios" element={<Repositorios />} />

        <Route element={<ConSesion />}>
          <Route element={<SoloAdministrador />}>
            <Route index element={<Inicio />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="cursos" element={<Cursos />} />
            <Route path="asignaciones" element={<Asignaciones />} />
            <Route path="constancias" element={<Constancias />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="catalogos" element={<Catalogos />} />
            <Route path="correos" element={<Correos />} />
            <Route path="bitacora" element={<Bitacora />} />
          </Route>
          <Route path="mis-cursos" element={<MisCursos />} />
          <Route path="notificaciones" element={<Notificaciones />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
