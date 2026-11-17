// Tipos de los datos que devuelve la API (sigecap-api)

export type Rol = 'ADMINISTRADOR' | 'EMPLEADO';
export type Tema = 'CLARO' | 'OSCURO';
export type TipoContratacion = 'ESTRUCTURA' | 'HONORARIOS';
export type EstadoCurso = 'PENDIENTE' | 'EN_REVISION' | 'COMPLETADO' | 'RECHAZADO';
export type EstadoEvidencia = 'EN_REVISION' | 'APROBADA' | 'RECHAZADA';

export interface Paginado<T> { total: number; pagina: number; porPagina: number; datos: T[] }

export interface Perfil {
  id: number; idEmpleado: number; rol: Rol; nombre: string; nombreCompleto: string; tema: Tema;
  cupo: string; curp: string; puesto: string; tipoContratacion: TipoContratacion;
  sede: { id: number; clave: string; nombre: string }; area: { id: number; nombre: string };
  correoInstitucional: string | null; correoRespaldo: string | null; telefono: string | null; ultimoAcceso: string | null;
}

export interface Sede { id: number; clave: string; nombre: string; tipo: 'ORE' | 'SARE'; _count?: { empleados: number } }
export interface Area { id: number; nombre: string; _count?: { empleados: number } }
export interface Dependencia { id: number; siglas: string; nombre: string; _count?: { cursos: number } }
export interface TemaEtica { id: number; codigo: string; descripcion: string; _count?: { cursos: number } }
export interface Catalogos { sedes: Sede[]; areas: Area[]; dependencias: Dependencia[]; temasEtica: TemaEtica[] }

export interface Empleado {
  id: number; cupo: string; curp: string; numTrabajadorRusp: string | null; tipoContratacion: TipoContratacion;
  nombre: string; apellidoPaterno: string; apellidoMaterno: string | null;
  correoInstitucional: string | null; correoRespaldo: string | null; telefono: string | null;
  puesto: string; idArea: number; idSede: number; activo: boolean;
  sede: Sede; area: Area; usuario: { id: number; activo: boolean; rol: { nombre: Rol } } | null;
}

export interface Curso {
  id: number; idDependencia: number; idTemaEtica: number | null; nombre: string; nombreCorto: string | null;
  ordenReporte: number | null; aplicaEstructura: boolean; aplicaHonorarios: boolean; descripcion: string | null;
  trimestre: number; anio: number; fechaInicio: string | null; fechaLimiteRegistro: string | null;
  fechaEntregaConstancia: string | null; urlPlataforma: string | null; activo: boolean;
  dependencia: Dependencia; temaEtica: TemaEtica | null; _count: { asignaciones: number; cursosEmpleado: number };
}

export interface Envio { id: number; estado: 'PENDIENTE' | 'ENVIADO' | 'ERROR'; fechaEnvio: string; totalDestinatarios: number }
export interface Asignacion {
  id: number; idCurso: number; idSede: number | null; esGeneral: boolean; fechaAsignacion: string; activo: boolean;
  curso: { id: number; nombre: string; anio: number; trimestre: number; fechaEntregaConstancia: string | null; activo: boolean; dependencia: { siglas: string } };
  sede: { id: number; clave: string; nombre: string } | null; asignadoPor: string; ultimoEnvio: Envio | null;
  avance: { total: number; completados: number; enRevision: number; pendientes: number; rechazados: number };
}
export interface AsignacionDetalle {
  id: number; esGeneral: boolean; curso: { nombre: string }; sede: { clave: string } | null;
  cursosEmpleado: { id: number; estado: EstadoCurso; empleado: { id: number; cupo: string; nombre: string; apellidoPaterno: string; apellidoMaterno: string | null; sede: { clave: string } } }[];
}

export interface EvidenciaResumen {
  id: number; nombreArchivo: string; tamanoBytes: number; fechaInicioCurso: string; fechaConclusion: string;
  estado: EstadoEvidencia; comentarioRevision: string | null; fechaSubida: string; fechaRevision: string | null;
}
export interface MiCurso {
  id: number; estado: EstadoCurso; origen: 'ASIGNACION' | 'HISTORICO';
  curso: Omit<Curso, 'dependencia' | 'temaEtica' | '_count'> & { dependencia: { siglas: string; nombre: string } };
  evidencias: EvidenciaResumen[];
}
export interface CursoCatalogo { id: number; nombre: string; anio: number; trimestre: number; dependencia: { siglas: string } }

export interface Evidencia extends EvidenciaResumen {
  cursoEmpleado: {
    curso: { id: number; nombre: string; anio: number; trimestre: number; dependencia: { siglas: string } };
    empleado: {
      id: number; cupo: string; curp: string; nombre: string; apellidoPaterno: string; apellidoMaterno: string | null;
      tipoContratacion: TipoContratacion; puesto: string; sede: { clave: string; nombre: string };
    };
  };
  revisor: { empleado: { nombre: string; apellidoPaterno: string } } | null;
}

export interface Notificacion { id: number; tipo: string; titulo: string; mensaje: string; leida: boolean; creadaEn: string }

export interface Usuario {
  id: number; activo: boolean; ultimoAcceso: string | null; rol: { nombre: Rol };
  empleado: {
    id: number; cupo: string; curp: string; nombre: string; apellidoPaterno: string; apellidoMaterno: string | null;
    correoInstitucional: string | null; correoRespaldo: string | null; activo: boolean; sede: { clave: string };
  };
}
export interface CuentaCreada { id: number; cupo?: string; nombre: string; identificador: string; contrasenaTemporal: string; correoEnviado?: boolean }

export interface Grupo { clave: string; nombre: string; total: number; completados: number; enRevision: number; pendientes: number; rechazados: number; cumplimiento: number }
export interface Dashboard {
  totales: {
    empleadosActivos: number; cursosActivos: number; seguimientos: number; completados: number; enRevision: number;
    pendientes: number; rechazados: number; cumplimiento: number; evidenciasEnRevision: number; empleadosRezagados: number;
  };
  porDependencia: Grupo[]; porSede: Grupo[]; porCurso: Grupo[]; anioSerie: number;
  serieMensual: { mes: number; completados: number }[];
  rezagados: { idEmpleado: number; cupo: string; nombre: string; sede: string; pendientes: number }[];
}

export interface Plantilla { id: number; nombre: string; asunto: string; cuerpoHtml: string; variables: string[] }
export interface EnvioCorreo extends Envio {
  plantilla: { nombre: string };
  asignacion: { id: number; esGeneral: boolean; curso: { nombre: string }; sede: { clave: string } | null } | null;
}

export interface RegistroBitacora {
  id: number; accion: string; entidad: string; idEntidad: number | null; datosAnteriores: unknown; datosNuevos: unknown;
  ipOrigen: string | null; fecha: string; usuario: { id: number; empleado: { cupo: string; nombre: string; apellidoPaterno: string } } | null;
}

export interface ResultadoImportacion {
  total: number; validas: number; nuevos: number; actualizaciones: number; areasNuevas: string[]; aplicado: boolean;
  errores: { fila: number; cupo: string; nombre: string; mensajes: string[] }[];
}
