// Sesión del usuario: inicio y cierre de sesión, perfil y tema de la interfaz
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { alExpirarSesion, api, borrarSesion, guardarSesion, hayRefresh, renovarToken } from '../lib/api';
import type { Perfil, Tema } from '../lib/tipos';

interface Valor {
  usuario: Perfil | null;
  cargando: boolean;
  esAdmin: boolean;
  iniciarSesion: (identificador: string, contrasena: string) => Promise<Perfil>;
  cerrarSesion: () => void;
  actualizarPerfil: (perfil: Perfil) => void;
  cambiarTema: (tema: Tema) => Promise<void>;
}

const Contexto = createContext<Valor | null>(null);
const CLAVE_TEMA = 'sigecap.tema';

function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'OSCURO');
  localStorage.setItem(CLAVE_TEMA, tema);
}
// Antes de iniciar sesión se usa el último tema elegido en este navegador
aplicarTema(localStorage.getItem(CLAVE_TEMA) === 'OSCURO' ? 'OSCURO' : 'CLARO');

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(hayRefresh());
  const consultas = useQueryClient();

  const cerrarSesion = useCallback(() => {
    borrarSesion();
    setUsuario(null);
    consultas.clear();
  }, [consultas]);

  // Al abrir la aplicación se recupera la sesión con el token de renovación guardado
  useEffect(() => {
    alExpirarSesion(() => { setUsuario(null); consultas.clear(); });
    if (!hayRefresh()) return;
    renovarToken()
      .then(() => api.get<Perfil>('/auth/me'))
      .then((r) => { setUsuario(r.data); aplicarTema(r.data.tema); })
      .catch(() => borrarSesion())
      .finally(() => setCargando(false));
  }, [consultas]);

  const valor = useMemo<Valor>(() => ({
    usuario,
    cargando,
    esAdmin: usuario?.rol === 'ADMINISTRADOR',
    iniciarSesion: async (identificador, contrasena) => {
      const { data } = await api.post<{ token: string; refreshToken: string; usuario: Perfil }>('/auth/login', { identificador, contrasena });
      guardarSesion(data.token, data.refreshToken);
      setUsuario(data.usuario);
      aplicarTema(data.usuario.tema);
      return data.usuario;
    },
    cerrarSesion,
    actualizarPerfil: (perfil) => { setUsuario(perfil); aplicarTema(perfil.tema); },
    cambiarTema: async (tema) => {
      aplicarTema(tema);
      setUsuario((u) => (u ? { ...u, tema } : u));
      await api.patch('/auth/me/preferencias', { tema });
    },
  }), [usuario, cargando, cerrarSesion]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const v = useContext(Contexto);
  if (!v) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return v;
}
