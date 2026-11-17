// Consultas compartidas y utilidades de formularios
import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, limpiar } from './api';
import type { Catalogos, Paginado } from './tipos';

// Catálogos (sedes, áreas, dependencias, temas): cambian poco, se conservan 5 minutos
export function useCatalogos() {
  return useQuery({
    queryKey: ['catalogos'],
    queryFn: async () => (await api.get<Catalogos>('/catalogos')).data,
    staleTime: 5 * 60_000,
  });
}

// Listado paginado con filtros; conserva los datos anteriores mientras llega la página nueva
export function useLista<T>(clave: string, ruta: string, filtros: Record<string, unknown>, opciones?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [clave, 'lista', filtros],
    queryFn: async () => (await api.get<Paginado<T>>(ruta, { params: limpiar(filtros) })).data,
    placeholderData: keepPreviousData,
    enabled: opciones?.enabled,
  });
}

// Devuelve el valor después de que deja de cambiar (para no consultar en cada tecla al buscar)
export function useRetraso<T>(valor: T, ms = 350) {
  const [estable, setEstable] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setEstable(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return estable;
}

export function useAnios() {
  return useQuery({ queryKey: ['cursos', 'anios'], queryFn: async () => (await api.get<number[]>('/cursos/anios')).data, staleTime: 60_000 });
}
