// Reportes (RF13): formatos institucionales en Excel y listados en Excel, PDF y CSV
import { useState } from 'react';
import { Download } from 'lucide-react';
import { descargar, limpiar } from '../lib/api';
import { useAnios, useCatalogos } from '../lib/consultas';
import { ROMANOS, anioActual, trimestreActual } from '../lib/formato';
import { Boton, Encabezado, Panel, Selector } from '../componentes/ui';
import { useAvisos } from '../contexto/Avisos';

type Tipo = 'concentrado' | 'comite-etica' | 'cumplimiento' | 'rezagados';
type Formato = 'xlsx' | 'pdf' | 'csv';
const NOMBRE_FORMATO: Record<Formato, string> = { xlsx: 'Excel', pdf: 'PDF', csv: 'CSV' };

const REPORTES: { tipo: Tipo; titulo: string; descripcion: string; formatos: Formato[]; requiereTrimestre?: boolean }[] = [
  {
    tipo: 'concentrado', titulo: 'Concentrado de constancias', formatos: ['xlsx'],
    descripcion: 'Un renglón por servidor público y una columna por curso, agrupadas por dependencia. Cada celda lleva la fecha de la constancia aprobada, «NO APLICA» o «Falta Curso». Incluye una segunda hoja con la evidencia digital (1 o 0).',
  },
  {
    tipo: 'comite-etica', titulo: 'Formulario trimestral del Comité de Ética', formatos: ['xlsx'], requiereTrimestre: true,
    descripcion: 'Una hoja por curso con quienes lo acreditaron en el trimestre: fecha de inicio, número de trabajador o CURP, nombre, apellidos, tema y estatus «04 Concluido». Elige año y trimestre.',
  },
  {
    tipo: 'cumplimiento', titulo: 'Cumplimiento por empleado y curso', formatos: ['xlsx', 'pdf', 'csv'],
    descripcion: 'Detalle de cada curso asignado: empleado, sede, dependencia, periodo, estado y fecha de conclusión.',
  },
  {
    tipo: 'rezagados', titulo: 'Personal con cursos pendientes', formatos: ['xlsx', 'pdf', 'csv'],
    descripcion: 'Quién tiene cursos sin constancia o con constancia rechazada, con sus datos de contacto y la lista de cursos que le faltan.',
  },
];

export default function Reportes() {
  const catalogos = useCatalogos();
  const anios = useAnios();
  const avisos = useAvisos();
  const [filtros, setFiltros] = useState({ anio: String(anioActual()), trimestre: String(trimestreActual()), idDependencia: '', idSede: '' });
  const [generando, setGenerando] = useState('');
  const cambiar = (campo: keyof typeof filtros) => (e: React.ChangeEvent<HTMLSelectElement>) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));
  const listaAnios = [...new Set([anioActual(), ...(anios.data ?? [])])].sort((a, b) => b - a);

  async function generar(tipo: Tipo, formato: Formato) {
    setGenerando(`${tipo}-${formato}`);
    try {
      await descargar('/reportes/exportar', { tipo, formato, ...limpiar(filtros) });
      avisos.exito('Reporte generado. Revisa tu carpeta de descargas.');
    } catch (err) {
      avisos.falla(err);
    } finally {
      setGenerando('');
    }
  }

  return (
    <>
      <Encabezado titulo="Reportes" descripcion="Elige los filtros y descarga el reporte. Los formatos institucionales se generan con la estructura que hoy se llena a mano en Excel." />
      <Panel titulo="Filtros" className="mb-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Selector etiqueta="Año" value={filtros.anio} onChange={cambiar('anio')}>
            <option value="">Todos los años</option>
            {listaAnios.map((a) => <option key={a} value={a}>{a}</option>)}
          </Selector>
          <Selector etiqueta="Trimestre" value={filtros.trimestre} onChange={cambiar('trimestre')}>
            <option value="">Todos los trimestres</option>
            {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Trimestre {ROMANOS[t]}</option>)}
          </Selector>
          <Selector etiqueta="Dependencia" value={filtros.idDependencia} onChange={cambiar('idDependencia')}>
            <option value="">Todas las dependencias</option>
            {catalogos.data?.dependencias.map((d) => <option key={d.id} value={d.id}>{d.siglas}</option>)}
          </Selector>
          <Selector etiqueta="Sede" value={filtros.idSede} onChange={cambiar('idSede')}>
            <option value="">Todas las sedes</option>
            {catalogos.data?.sedes.map((s) => <option key={s.id} value={s.id}>{s.clave}</option>)}
          </Selector>
        </div>
        <p className="mt-3 text-[0.8125rem] text-suave">
          En el Concentrado y en el reporte de cumplimiento, el año y el trimestre filtran los cursos. En el Formulario del Comité de Ética indican el trimestre en que se aprobaron las constancias.
        </p>
      </Panel>

      <Panel sinRelleno>
        <ul className="divide-y divide-borde">
          {REPORTES.map((r) => {
            const falta = r.requiereTrimestre && (!filtros.anio || !filtros.trimestre);
            return (
              <li key={r.tipo} className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{r.titulo}</h2>
                  <p className="mt-1 max-w-[72ch] text-sm text-suave">{r.descripcion}</p>
                  {falta && <p className="mt-1 text-sm text-peligro">Elige un año y un trimestre para generar este formato.</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {r.formatos.map((formato, i) => (
                    <Boton key={formato} variante={i === 0 ? 'primario' : 'secundario'} icono={<Download className="size-4" />} disabled={falta || (!!generando && generando !== `${r.tipo}-${formato}`)}
                      cargando={generando === `${r.tipo}-${formato}`} onClick={() => generar(r.tipo, formato)}>
                      Descargar {NOMBRE_FORMATO[formato]}
                    </Boton>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
