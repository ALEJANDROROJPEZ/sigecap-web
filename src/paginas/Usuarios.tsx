// Usuarios y roles (RF15): cuentas de acceso, rol, activación y contraseñas temporales
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, KeyRound, Power, ShieldCheck, UsersRound } from 'lucide-react';
import { api } from '../lib/api';
import { useLista, useRetraso } from '../lib/consultas';
import { fechaHora, nombreCompleto } from '../lib/formato';
import type { CuentaCreada, Usuario } from '../lib/tipos';
import { Alerta, BarraFiltros, Boton, Buscador, Cargando, Confirmar, Encabezado, Filtro, Insignia, InsigniaActivo, MenuAcciones, Modal, Paginacion, Panel, Vacio } from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';
import { useSesion } from '../contexto/Sesion';

// Muestra, una sola vez, las contraseñas temporales recién generadas
export function CuentaLista({ cuentas, cerrar }: { cuentas: CuentaCreada[]; cerrar: () => void }) {
  const avisos = useAvisos();
  const copiar = (c: CuentaCreada) => navigator.clipboard.writeText(`Usuario: ${c.identificador}\nContraseña temporal: ${c.contrasenaTemporal}`)
    .then(() => avisos.exito('Datos de acceso copiados.'), () => avisos.error('No se pudo copiar. Selecciona el texto y cópialo a mano.'));
  function descargarCsv() {
    const filas = [['CUPO', 'Nombre', 'Usuario', 'Contraseña temporal', 'Correo enviado'], ...cuentas.map((c) => [c.cupo ?? '', c.nombre, c.identificador, c.contrasenaTemporal, c.correoEnviado ? 'Sí' : 'No'])];
    const csv = `﻿${filas.map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'cuentas_sigecap.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const una = cuentas.length === 1 ? cuentas[0] : null;
  return (
    <Modal abierto titulo={una ? 'Datos de acceso' : `${cuentas.length} cuentas creadas`} cerrar={cerrar} ancho={una ? 'sm' : 'lg'}
      pie={<>{!una && <Boton icono={<Download className="size-4" />} onClick={descargarCsv}>Descargar lista (CSV)</Boton>}<Boton variante="primario" onClick={cerrar}>Entendido</Boton></>}>
      <div className="space-y-4 text-sm">
        <Alerta tono="dorado">Guarda estas contraseñas ahora: por seguridad no se vuelven a mostrar. Si se pierden, genera otra desde «Usuarios y roles».</Alerta>
        {una ? (
          <>
            <dl className="space-y-2 rounded-lg border border-borde bg-realce p-4">
              <div><dt className="text-suave">Empleado</dt><dd className="font-medium">{una.nombre}</dd></div>
              <div><dt className="text-suave">Usuario</dt><dd className="font-medium break-all">{una.identificador}</dd></div>
              <div><dt className="text-suave">Contraseña temporal</dt><dd className="text-lg font-semibold tracking-wider select-all">{una.contrasenaTemporal}</dd></div>
            </dl>
            <p className="text-suave">
              {una.correoEnviado === undefined ? 'Entrégale la contraseña en persona y pídele que la cambie desde «Mi perfil».'
                : una.correoEnviado ? 'También le enviamos un correo con un enlace para que defina su propia contraseña.'
                  : 'No tiene correo registrado (o el envío falló): entrégale estos datos en persona.'}
            </p>
            <Boton icono={<Copy className="size-4" />} onClick={() => copiar(una)}>Copiar datos de acceso</Boton>
          </>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-lg border border-borde">
            <table className="tabla">
              <thead><tr><th>Nombre</th><th>Usuario</th><th>Contraseña temporal</th><th>Correo</th></tr></thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id}>
                    <td className="principal">{c.nombre}</td>
                    <td data-etiqueta="Usuario" className="break-all">{c.identificador}</td>
                    <td data-etiqueta="Contraseña temporal" className="font-semibold tracking-wider select-all">{c.contrasenaTemporal}</td>
                    <td data-etiqueta="Correo">{c.correoEnviado ? 'Enviado' : 'Sin envío'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Usuarios() {
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const { usuario: yo } = useSesion();
  const [buscar, setBuscar] = useState('');
  const [filtros, setFiltros] = useState({ rol: '', activo: '' });
  const [pagina, setPagina] = useState(1);
  const [cuentas, setCuentas] = useState<CuentaCreada[] | null>(null);
  const [confirmar, setConfirmar] = useState<{ tipo: 'rol' | 'estado' | 'clave' | 'faltantes'; u?: Usuario } | null>(null);
  const texto = useRetraso(buscar);
  const { data, isLoading } = useLista<Usuario>('usuarios', '/usuarios', { buscar: texto, ...filtros, pagina, porPagina: 20 });
  const sinCuenta = useLista<unknown>('empleados', '/empleados', { sinCuenta: true, activo: true, porPagina: 1 });
  const refrescar = () => { void consultas.invalidateQueries({ queryKey: ['usuarios'] }); void consultas.invalidateQueries({ queryKey: ['empleados'] }); setConfirmar(null); };

  const actualizar = useMutation({
    mutationFn: ({ u, cambios }: { u: Usuario; cambios: { rol?: string; activo?: boolean } }) => api.patch(`/usuarios/${u.id}`, cambios),
    onSuccess: () => { avisos.exito('Cuenta actualizada.'); refrescar(); },
    onError: (e) => { avisos.falla(e); setConfirmar(null); },
  });
  const restablecer = useMutation({
    mutationFn: async (u: Usuario) => (await api.post<CuentaCreada>(`/usuarios/${u.id}/restablecer`)).data,
    onSuccess: (c) => { setCuentas([c]); setConfirmar(null); },
    onError: avisos.falla,
  });
  const faltantes = useMutation({
    mutationFn: async () => (await api.post<{ creadas: number; cuentas: CuentaCreada[] }>('/usuarios/faltantes')).data,
    onSuccess: (r) => { refrescar(); if (r.creadas > 0) setCuentas(r.cuentas); else avisos.info('Todo el personal activo ya tiene cuenta.'); },
    onError: avisos.falla,
  });
  const u = confirmar?.u;
  const nombre = u ? nombreCompleto(u.empleado) : '';
  const pendientes = sinCuenta.data?.total ?? 0;

  return (
    <>
      <Encabezado titulo="Usuarios y roles" descripcion="Cada cuenta pertenece a un empleado. El personal sin correo institucional entra con su CURP.">
        <Boton variante="primario" icono={<UsersRound className="size-4" />} disabled={pendientes === 0} onClick={() => setConfirmar({ tipo: 'faltantes' })}>
          {pendientes > 0 ? `Crear ${pendientes} ${pendientes === 1 ? 'cuenta faltante' : 'cuentas faltantes'}` : 'Todo el personal tiene cuenta'}
        </Boton>
      </Encabezado>

      <Panel sinRelleno>
        <BarraFiltros>
          <Buscador placeholder="Buscar por nombre, CUPO, CURP o correo" aria-label="Buscar usuarios" value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} />
          <Filtro etiqueta="Rol" value={filtros.rol} onChange={(e) => { setFiltros((f) => ({ ...f, rol: e.target.value })); setPagina(1); }}>
            <option value="">Todos los roles</option><option value="ADMINISTRADOR">Administradores</option><option value="EMPLEADO">Empleados</option>
          </Filtro>
          <Filtro etiqueta="Estado" value={filtros.activo} onChange={(e) => { setFiltros((f) => ({ ...f, activo: e.target.value })); setPagina(1); }}>
            <option value="">Activas y desactivadas</option><option value="true">Activas</option><option value="false">Desactivadas</option>
          </Filtro>
        </BarraFiltros>
        {isLoading ? <Cargando /> : data?.datos.length === 0 ? <Vacio titulo="No hay cuentas con estos filtros" /> : (
          <table className="tabla">
            <thead><tr><th>Empleado</th><th>Usuario</th><th>Sede</th><th>Rol</th><th>Cuenta</th><th>Último acceso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {data?.datos.map((x) => {
                const propio = x.id === yo?.id;
                return (
                  <tr key={x.id}>
                    <td className="principal">{nombreCompleto(x.empleado)}{propio && <span className="font-normal text-suave"> (tú)</span>}</td>
                    <td data-etiqueta="Usuario">{x.empleado.correoInstitucional ?? x.empleado.curp}</td>
                    <td data-etiqueta="Sede">{x.empleado.sede.clave}</td>
                    <td data-etiqueta="Rol"><Insignia tono={x.rol.nombre === 'ADMINISTRADOR' ? 'guinda' : 'gris'}>{x.rol.nombre === 'ADMINISTRADOR' ? 'Administrador' : 'Empleado'}</Insignia></td>
                    <td data-etiqueta="Cuenta"><InsigniaActivo activo={x.activo && x.empleado.activo} textos={['Activa', x.empleado.activo ? 'Desactivada' : 'Empleado de baja']} /></td>
                    <td data-etiqueta="Último acceso" className="num">{x.ultimoAcceso ? fechaHora(x.ultimoAcceso) : 'Nunca'}</td>
                    <td className="acciones">
                      <div className="flex justify-end">
                        <MenuAcciones etiqueta={`Acciones para ${nombreCompleto(x.empleado)}`} acciones={[
                          { texto: x.rol.nombre === 'ADMINISTRADOR' ? 'Quitar administrador' : 'Hacer administrador', icono: <ShieldCheck className="size-4" />, deshabilitada: propio, alElegir: () => setConfirmar({ tipo: 'rol', u: x }) },
                          { texto: 'Generar contraseña temporal', icono: <KeyRound className="size-4" />, alElegir: () => setConfirmar({ tipo: 'clave', u: x }) },
                          { texto: x.activo ? 'Desactivar cuenta' : 'Activar cuenta', icono: <Power className="size-4" />, deshabilitada: propio, peligro: x.activo, alElegir: () => setConfirmar({ tipo: 'estado', u: x }) },
                        ]} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {data && <Paginacion pagina={pagina} porPagina={data.porPagina} total={data.total} cambiar={setPagina} />}
      </Panel>

      <Confirmar abierto={confirmar?.tipo === 'rol'} titulo="Cambiar rol" textoBoton={u?.rol.nombre === 'ADMINISTRADOR' ? 'Quitar administrador' : 'Hacer administrador'}
        cargando={actualizar.isPending} cerrar={() => setConfirmar(null)}
        confirmar={() => u && actualizar.mutate({ u, cambios: { rol: u.rol.nombre === 'ADMINISTRADOR' ? 'EMPLEADO' : 'ADMINISTRADOR' } })}>
        {u?.rol.nombre === 'ADMINISTRADOR'
          ? <p><strong>{nombre}</strong> dejará de administrar el sistema y solo verá sus propios cursos.</p>
          : <p><strong>{nombre}</strong> podrá gestionar empleados, cursos, asignaciones, constancias y reportes.</p>}
      </Confirmar>
      <Confirmar abierto={confirmar?.tipo === 'estado'} titulo={u?.activo ? 'Desactivar cuenta' : 'Activar cuenta'} peligro={u?.activo} textoBoton={u?.activo ? 'Desactivar' : 'Activar'}
        cargando={actualizar.isPending} cerrar={() => setConfirmar(null)} confirmar={() => u && actualizar.mutate({ u, cambios: { activo: !u.activo } })}>
        {u?.activo ? <p><strong>{nombre}</strong> no podrá iniciar sesión hasta que actives su cuenta de nuevo.</p> : <p><strong>{nombre}</strong> podrá iniciar sesión otra vez.</p>}
      </Confirmar>
      <Confirmar abierto={confirmar?.tipo === 'clave'} titulo="Generar contraseña temporal" textoBoton="Generar contraseña" cargando={restablecer.isPending}
        cerrar={() => setConfirmar(null)} confirmar={() => u && restablecer.mutate(u)}>
        <p>La contraseña actual de <strong>{nombre}</strong> dejará de funcionar. Verás la nueva una sola vez para entregársela.</p>
      </Confirmar>
      <Confirmar abierto={confirmar?.tipo === 'faltantes'} titulo="Crear cuentas faltantes" textoBoton={`Crear ${pendientes} cuentas`} cargando={faltantes.isPending}
        cerrar={() => setConfirmar(null)} confirmar={() => faltantes.mutate()}>
        <p>Se creará una cuenta de empleado para cada persona activa que aún no tiene. Quien tenga correo recibirá un enlace para definir su contraseña; de todas verás la contraseña temporal.</p>
      </Confirmar>
      {cuentas && <CuentaLista cuentas={cuentas} cerrar={() => setCuentas(null)} />}
    </>
  );
}
