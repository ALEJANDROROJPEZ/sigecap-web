// Estructura común de las pantallas: menú lateral (desplegable en móvil), barra superior con
// notificaciones, cambio de tema y perfil, y el área de contenido.
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  Bell, BookOpen, ClipboardCheck, FileSpreadsheet, FolderCog, GitBranch, GraduationCap, History, LayoutDashboard, LogOut, Mail, Menu, Moon,
  Send, Sun, UserCog, UserRound, Users, X,
} from 'lucide-react';
import { URL_API, api, esModoDemo, obtenerToken } from '../lib/api';
import { cx, haceCuanto } from '../lib/formato';
import type { Notificacion, Paginado } from '../lib/tipos';
import { useAvisos } from '../contexto/Avisos';
import { Cargando } from './ui';
import { useSesion } from '../contexto/Sesion';

interface Enlace { a: string; texto: string; icono: ReactNode; fin?: boolean; contador?: number }

function useNotificaciones() {
  return useQuery({
    queryKey: ['notificaciones', 'resumen'],
    queryFn: async () => (await api.get<Paginado<Notificacion> & { noLeidas: number }>('/notificaciones', { params: { porPagina: 6 } })).data,
    refetchInterval: 120_000,
  });
}

// Conexión en tiempo real: las notificaciones nuevas llegan sin recargar la página (RF11)
function useTiempoReal() {
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const { usuario } = useSesion();
  useEffect(() => {
    if (!usuario || esModoDemo()) return;
    const socket = io(URL_API || undefined, { auth: (cb) => cb({ token: obtenerToken() }), transports: ['websocket', 'polling'] });
    socket.on('notificacion:nueva', (n: Notificacion) => {
      avisos.info(`${n.titulo}. ${n.mensaje}`);
      void consultas.invalidateQueries({ queryKey: ['notificaciones'] });
      if (n.tipo === 'EVIDENCIA_RECIBIDA') void consultas.invalidateQueries({ queryKey: ['evidencias'] });
      else void consultas.invalidateQueries({ queryKey: ['mis-cursos'] });
      void consultas.invalidateQueries({ queryKey: ['dashboard'] });
    });
    socket.on('correo:resultado', (r: { curso: string; enviados: number; fallidos: number }) => {
      if (r.fallidos > 0) avisos.error(`Correos de «${r.curso}»: ${r.enviados} enviados y ${r.fallidos} con error. Revisa la configuración de correo.`);
      else avisos.exito(`Correos de «${r.curso}» enviados a ${r.enviados} ${r.enviados === 1 ? 'persona' : 'personas'}.`);
      void consultas.invalidateQueries({ queryKey: ['asignaciones'] });
      void consultas.invalidateQueries({ queryKey: ['correos'] });
    });
    return () => { socket.disconnect(); };
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Campana() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useNotificaciones();
  const consultas = useQueryClient();
  const navegar = useNavigate();
  const marcar = useMutation({
    mutationFn: () => api.patch('/notificaciones/leidas'),
    onSuccess: () => consultas.invalidateQueries({ queryKey: ['notificaciones'] }),
  });
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);
  const noLeidas = data?.noLeidas ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setAbierto((v) => !v)} aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ''}`} aria-expanded={abierto}
        className="relative rounded-md p-2 text-suave hover:bg-realce hover:text-texto">
        <Bell className="size-5" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-guinda-500 px-1 text-[0.6875rem] font-semibold text-white">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>
      {abierto && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-borde bg-superficie shadow-xl">
          <div className="flex items-center justify-between border-b border-borde px-4 py-2.5">
            <span className="font-semibold">Notificaciones</span>
            {noLeidas > 0 && <button onClick={() => marcar.mutate()} className="text-[0.8125rem] text-marca hover:underline">Marcar todas como leídas</button>}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {data?.datos.length === 0 && <li className="px-4 py-8 text-center text-sm text-suave">No tienes notificaciones.</li>}
            {data?.datos.map((n) => (
              <li key={n.id} className={cx('border-b border-borde px-4 py-2.5 last:border-b-0', !n.leida && 'bg-guinda-50/60 dark:bg-guinda-500/10')}>
                <p className="text-sm font-medium">{n.titulo}</p>
                <p className="text-[0.8125rem] text-suave">{n.mensaje}</p>
                <p className="mt-0.5 text-xs text-suave">{haceCuanto(n.creadaEn)}</p>
              </li>
            ))}
          </ul>
          <button onClick={() => { setAbierto(false); navegar('/notificaciones'); }}
            className="block w-full border-t border-borde px-4 py-2.5 text-center text-sm font-medium text-marca hover:bg-realce">
            Ver todas
          </button>
        </div>
      )}
    </div>
  );
}

export function Plantilla() {
  const { usuario, esAdmin, cerrarSesion, cambiarTema } = useSesion();
  const [menu, setMenu] = useState(false);
  const ubicacion = useLocation();
  useTiempoReal();
  useEffect(() => setMenu(false), [ubicacion.pathname]);

  const porRevisar = useQuery({
    queryKey: ['evidencias', 'contador'],
    queryFn: async () => (await api.get<{ enRevision: number }>('/evidencias', { params: { porPagina: 1, estado: 'EN_REVISION' } })).data.enRevision,
    enabled: esAdmin,
    refetchInterval: 120_000,
  });

  const ic = 'size-[1.125rem] shrink-0';
  const grupos: { titulo?: string; enlaces: Enlace[] }[] = esAdmin
    ? [
        { enlaces: [
          { a: '/', texto: 'Inicio', icono: <LayoutDashboard className={ic} />, fin: true },
          { a: '/empleados', texto: 'Empleados', icono: <Users className={ic} /> },
          { a: '/cursos', texto: 'Cursos', icono: <BookOpen className={ic} /> },
          { a: '/asignaciones', texto: 'Asignaciones', icono: <Send className={ic} /> },
          { a: '/constancias', texto: 'Constancias', icono: <ClipboardCheck className={ic} />, contador: porRevisar.data },
          { a: '/reportes', texto: 'Reportes', icono: <FileSpreadsheet className={ic} /> },
        ] },
        { titulo: 'Administración', enlaces: [
          { a: '/usuarios', texto: 'Usuarios y roles', icono: <UserCog className={ic} /> },
          { a: '/catalogos', texto: 'Catálogos', icono: <FolderCog className={ic} /> },
          { a: '/correos', texto: 'Correos', icono: <Mail className={ic} /> },
          { a: '/bitacora', texto: 'Bitácora', icono: <History className={ic} /> },
        ] },
        { titulo: 'Personal', enlaces: [
          { a: '/mis-cursos', texto: 'Mis cursos', icono: <GraduationCap className={ic} /> },
          { a: '/perfil', texto: 'Mi perfil', icono: <UserRound className={ic} /> },
          { a: '/repositorios', texto: 'API y Repositorios', icono: <GitBranch className={ic} /> },
        ] },
      ]
    : [
        { enlaces: [
          { a: '/mis-cursos', texto: 'Mis cursos', icono: <GraduationCap className={ic} /> },
          { a: '/notificaciones', texto: 'Notificaciones', icono: <Bell className={ic} /> },
          { a: '/perfil', texto: 'Mi perfil', icono: <UserRound className={ic} /> },
          { a: '/repositorios', texto: 'API y Repositorios', icono: <GitBranch className={ic} /> },
        ] },
      ];

  const navegacion = (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Principal">
      {grupos.map((g, i) => (
        <div key={i} className={i > 0 ? 'mt-5' : ''}>
          {g.titulo && <p className="mb-1.5 px-3 text-xs font-medium text-guinda-200/80">{g.titulo}</p>}
          <ul className="space-y-0.5">
            {g.enlaces.map((e) => (
              <li key={e.a}>
                <NavLink to={e.a} end={e.fin} className={({ isActive }) => cx(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-white/15 font-semibold text-white' : 'text-guinda-100 hover:bg-white/10 hover:text-white',
                )}>
                  {e.icono}
                  <span className="flex-1">{e.texto}</span>
                  {!!e.contador && <span className="rounded-full bg-dorado-300 px-1.5 text-xs font-semibold text-guinda-900">{e.contador}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const marca = (
    <Link to="/" className="block px-6 pt-5 pb-4">
      <span className="font-serif text-[1.375rem] font-bold tracking-tight text-white">SIGECAP</span>
      <span className="mt-0.5 block text-xs leading-snug text-guinda-200">Capacitación del personal<br />CNBBBJ Oaxaca</span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Menú lateral fijo (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-guinda-700 lg:flex dark:bg-guinda-900">
        {marca}
        <div className="mx-6 h-px bg-dorado-300/40" />
        {navegacion}
      </aside>

      {/* Menú desplegable (móvil y tablet) */}
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenu(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col bg-guinda-700 dark:bg-guinda-900">
            <div className="flex items-start justify-between">
              {marca}
              <button onClick={() => setMenu(false)} aria-label="Cerrar menú" className="m-3 rounded-md p-2 text-guinda-100 hover:bg-white/10"><X className="size-5" /></button>
            </div>
            <div className="mx-6 h-px bg-dorado-300/40" />
            {navegacion}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-borde bg-superficie/95 px-3 backdrop-blur sm:px-6">
        <button onClick={() => setMenu(true)} aria-label="Abrir menú" className="rounded-md p-2 text-suave hover:bg-realce lg:hidden"><Menu className="size-5" /></button>
        <span className="font-serif text-lg font-bold text-marca lg:hidden">SIGECAP</span>
        <div className="flex-1" />
        <button onClick={() => void cambiarTema(usuario?.tema === 'OSCURO' ? 'CLARO' : 'OSCURO')}
          aria-label={usuario?.tema === 'OSCURO' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="rounded-md p-2 text-suave hover:bg-realce hover:text-texto">
          {usuario?.tema === 'OSCURO' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
        <Campana />
        <Link to="/perfil" className="ml-1 hidden min-w-0 text-right leading-tight sm:block">
          <span className="block truncate text-sm font-medium">{usuario?.nombre}</span>
          <span className="block text-xs text-suave">{esAdmin ? 'Administrador' : 'Empleado'}, {usuario?.sede.clave}</span>
        </Link>
        <button onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-md p-2 text-suave hover:bg-realce hover:text-texto">
          <LogOut className="size-5" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-[84rem] px-3 py-5 sm:px-6 sm:py-7">
        <Suspense fallback={<Cargando />}><Outlet /></Suspense>
      </main>
    </div>
  );
}
