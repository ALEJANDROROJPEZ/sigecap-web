// Catálogos: sedes (ORE y SARE), áreas, dependencias y temas del Comité de Ética
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { api, leerError } from '../lib/api';
import { useCatalogos } from '../lib/consultas';
import { cx } from '../lib/formato';
import type { Catalogos as Datos } from '../lib/tipos';
import { Alerta, Boton, Cargando, Encabezado, Entrada, Modal, Panel, Selector, Vacio } from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';

type Fila = Record<string, string | number> & { id: number; usos: number };
interface Definicion {
  clave: 'sedes' | 'areas' | 'dependencias' | 'temas-etica';
  pestana: string; singular: string; uso: string; ayuda: string;
  campos: { nombre: string; etiqueta: string; max: number; opciones?: string[]; ayuda?: string }[];
  filas: (d: Datos) => Fila[];
}

const DEFINICIONES: Definicion[] = [
  {
    clave: 'sedes', pestana: 'Sedes', singular: 'sede', uso: 'empleados',
    ayuda: 'La Oficina de Representación Estatal (ORE) y las Sedes Auxiliares (SARE). La clave es la que se usa al asignar cursos y al importar empleados.',
    campos: [{ nombre: 'clave', etiqueta: 'Clave', max: 20, ayuda: 'Por ejemplo, SARE-01' }, { nombre: 'nombre', etiqueta: 'Nombre', max: 120 }, { nombre: 'tipo', etiqueta: 'Tipo', max: 4, opciones: ['ORE', 'SARE'] }],
    filas: (d) => d.sedes.map((s) => ({ id: s.id, clave: s.clave, nombre: s.nombre, tipo: s.tipo, usos: s._count?.empleados ?? 0 })),
  },
  {
    clave: 'areas', pestana: 'Áreas', singular: 'área', uso: 'empleados', ayuda: 'Áreas de adscripción del personal.',
    campos: [{ nombre: 'nombre', etiqueta: 'Nombre', max: 120 }],
    filas: (d) => d.areas.map((a) => ({ id: a.id, nombre: a.nombre, usos: a._count?.empleados ?? 0 })),
  },
  {
    clave: 'dependencias', pestana: 'Dependencias', singular: 'dependencia', uso: 'cursos',
    ayuda: 'Instituciones que imparten los cursos. Las siglas agrupan las columnas del Concentrado de constancias.',
    campos: [{ nombre: 'siglas', etiqueta: 'Siglas', max: 30 }, { nombre: 'nombre', etiqueta: 'Nombre', max: 200 }],
    filas: (d) => d.dependencias.map((x) => ({ id: x.id, siglas: x.siglas, nombre: x.nombre, usos: x._count?.cursos ?? 0 })),
  },
  {
    clave: 'temas-etica', pestana: 'Temas del Comité de Ética', singular: 'tema', uso: 'cursos',
    ayuda: 'Códigos del catálogo del Comité de Ética (por ejemplo «07», «09» o «99») con su descripción oficial. Aparecen en la columna «Tema» del formulario trimestral.',
    campos: [{ nombre: 'codigo', etiqueta: 'Código', max: 20 }, { nombre: 'descripcion', etiqueta: 'Descripción', max: 250 }],
    filas: (d) => d.temasEtica.map((t) => ({ id: t.id, codigo: t.codigo, descripcion: t.descripcion, usos: t._count?.cursos ?? 0 })),
  },
];

function Formulario({ def, fila, cerrar }: { def: Definicion; fila: Fila | null; cerrar: () => void }) {
  const consultas = useQueryClient();
  const avisos = useAvisos();
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(def.campos.map((c) => [c.nombre, fila ? String(fila[c.nombre]) : c.opciones?.[1] ?? ''])));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState('');
  const guardar = useMutation({
    mutationFn: () => (fila ? api.put(`/catalogos/${def.clave}/${fila.id}`, valores) : api.post(`/catalogos/${def.clave}`, valores)),
    onSuccess: () => { avisos.exito(fila ? 'Cambios guardados.' : 'Registro agregado.'); void consultas.invalidateQueries({ queryKey: ['catalogos'] }); cerrar(); },
    onError: async (err) => {
      const r = await leerError(err);
      setErrores(r.campos);
      setGeneral(r.estado === 409 ? `Ya existe ${def.singular === 'área' ? 'un área' : `un registro de ${def.singular}`} con ese valor.` : r.mensaje);
    },
  });
  const enviar = (e: FormEvent) => { e.preventDefault(); setGeneral(''); guardar.mutate(); };

  return (
    <Modal abierto titulo={`${fila ? 'Editar' : 'Agregar'} ${def.singular}`} cerrar={cerrar} ancho="sm"
      pie={<><Boton onClick={cerrar}>Cancelar</Boton><Boton variante="primario" type="submit" form="form-catalogo" cargando={guardar.isPending}>{fila ? 'Guardar cambios' : 'Agregar'}</Boton></>}>
      <form id="form-catalogo" onSubmit={enviar} className="space-y-4" noValidate>
        {general && <Alerta>{general}</Alerta>}
        {def.campos.map((c) => c.opciones ? (
          <Selector key={c.nombre} etiqueta={c.etiqueta} value={valores[c.nombre]} error={errores[c.nombre]} onChange={(e) => setValores((v) => ({ ...v, [c.nombre]: e.target.value }))}>
            {c.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
          </Selector>
        ) : (
          <Entrada key={c.nombre} etiqueta={c.etiqueta} maxLength={c.max} ayuda={c.ayuda} value={valores[c.nombre]} error={errores[c.nombre]}
            onChange={(e) => setValores((v) => ({ ...v, [c.nombre]: e.target.value }))} />
        ))}
      </form>
    </Modal>
  );
}

export default function Catalogos() {
  const { data, isLoading } = useCatalogos();
  const [activa, setActiva] = useState(0);
  const [editar, setEditar] = useState<Fila | null | 'nuevo'>(null);
  const def = DEFINICIONES[activa]!;
  const filas = data ? def.filas(data) : [];

  return (
    <>
      <Encabezado titulo="Catálogos" descripcion="Listas que alimentan los formularios y los reportes. Los registros no se eliminan para conservar el historial; puedes corregir su nombre." />
      <Panel sinRelleno>
        <div className="flex gap-1 overflow-x-auto border-b border-borde px-3 pt-2" role="tablist">
          {DEFINICIONES.map((d, i) => (
            <button key={d.clave} role="tab" aria-selected={activa === i} onClick={() => setActiva(i)}
              className={cx('border-b-2 px-3 py-2 text-sm whitespace-nowrap', activa === i ? 'border-marca font-semibold text-marca' : 'border-transparent text-suave hover:text-texto')}>
              {d.pestana}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borde p-3">
          <p className="max-w-[72ch] text-sm text-suave">{def.ayuda}</p>
          <Boton variante="primario" icono={<Plus className="size-4" />} onClick={() => setEditar('nuevo')}>Agregar {def.singular}</Boton>
        </div>
        {isLoading ? <Cargando /> : filas.length === 0 ? (
          <Vacio titulo={`Aún no hay registros en ${def.pestana.toLowerCase()}`}>Agrega el primero para poder usarlo en los formularios.</Vacio>
        ) : (
          <table className="tabla">
            <thead><tr>{def.campos.map((c) => <th key={c.nombre}>{c.etiqueta}</th>)}<th className="text-right">En uso por</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  {def.campos.map((c, i) => <td key={c.nombre} className={i === 0 ? 'principal' : 'ajusta'} data-etiqueta={c.etiqueta}>{f[c.nombre]}</td>)}
                  <td data-etiqueta="En uso por" className="num text-right">{f.usos} {def.uso}</td>
                  <td className="acciones"><div className="flex justify-end"><Boton chico variante="sutil" icono={<Pencil className="size-4" />} onClick={() => setEditar(f)}>Editar</Boton></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {editar && <Formulario key={def.clave} def={def} fila={editar === 'nuevo' ? null : editar} cerrar={() => setEditar(null)} />}
    </>
  );
}
