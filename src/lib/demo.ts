// Modo de demostración interactivo para GitHub Pages (sitio estático sin servidor Node.js/PostgreSQL activo).
// Permite explorar todas las pantallas de sigecap-web con datos institucionales realistas basados en sigecap-api.
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  Asignacion, AsignacionDetalle, Catalogos, Curso, Dashboard, Empleado, EnvioCorreo,
  Evidencia, MiCurso, Notificacion, Perfil, Plantilla, RegistroBitacora, Usuario,
} from './tipos';

const CLAVE_MODO_DEMO = 'sigecap.demo';
const CLAVE_ROL_DEMO = 'sigecap.demo.rol';

export function esModoDemo(): boolean {
  return localStorage.getItem(CLAVE_MODO_DEMO) === '1';
}

export function activarModoDemo(rol: 'ADMINISTRADOR' | 'EMPLEADO' = 'ADMINISTRADOR') {
  localStorage.setItem(CLAVE_MODO_DEMO, '1');
  localStorage.setItem(CLAVE_ROL_DEMO, rol);
}

export function desactivarModoDemo() {
  localStorage.removeItem(CLAVE_MODO_DEMO);
  localStorage.removeItem(CLAVE_ROL_DEMO);
}

const catalogosDemo: Catalogos = {
  sedes: [
    { id: 1, clave: 'ORE-OAX', nombre: 'Oficina de Representación Estatal Oaxaca', tipo: 'ORE', _count: { empleados: 18 } },
    { id: 2, clave: 'SARE-01', nombre: 'SARE Oaxaca de Juárez', tipo: 'SARE', _count: { empleados: 12 } },
    { id: 3, clave: 'SARE-02', nombre: 'SARE Huajuapan de León', tipo: 'SARE', _count: { empleados: 9 } },
    { id: 4, clave: 'SARE-03', nombre: 'SARE Juchitán de Zaragoza', tipo: 'SARE', _count: { empleados: 11 } },
  ],
  areas: [
    { id: 1, nombre: 'Capacitación', _count: { empleados: 6 } },
    { id: 2, nombre: 'Atención Operativa', _count: { empleados: 24 } },
    { id: 3, nombre: 'Padrones y Liquidación', _count: { empleados: 12 } },
    { id: 4, nombre: 'Jurídico y Transparencia', _count: { empleados: 8 } },
  ],
  dependencias: [
    { id: 1, siglas: 'INMUJERES', nombre: 'Instituto Nacional de las Mujeres', _count: { cursos: 2 } },
    { id: 2, siglas: 'CONAPRED', nombre: 'Consejo Nacional para Prevenir la Discriminación', _count: { cursos: 2 } },
    { id: 3, siglas: 'EBG', nombre: 'Escuela del Buen Gobierno', _count: { cursos: 2 } },
  ],
  temasEtica: [
    { id: 1, codigo: '07', descripcion: 'Igualdad de género y no discriminación', _count: { cursos: 2 } },
    { id: 2, codigo: '09', descripcion: 'Ética pública y prevención de conflictos de interés', _count: { cursos: 2 } },
    { id: 3, codigo: '12', descripcion: 'Derechos humanos en el servicio público', _count: { cursos: 2 } },
  ],
};

export const PERFIL_ADMIN_DEMO: Perfil = {
  id: 1,
  idEmpleado: 1,
  rol: 'ADMINISTRADOR',
  nombre: 'Alejandro',
  nombreCompleto: 'Alejandro Rojas Pérez',
  tema: (localStorage.getItem('sigecap.tema') === 'OSCURO' ? 'OSCURO' : 'CLARO'),
  cupo: '000001',
  curp: 'ROPA850101HOXRLA01',
  puesto: 'Enlace de Capacitación',
  tipoContratacion: 'ESTRUCTURA',
  sede: { id: 1, clave: 'ORE-OAX', nombre: 'Oficina de Representación Estatal Oaxaca' },
  area: { id: 1, nombre: 'Capacitación' },
  correoInstitucional: 'alejandro.rojas@becasbenitojuarez.gob.mx',
  correoRespaldo: 'alejandro.respaldo@correo.mx',
  telefono: '9511234567',
  ultimoAcceso: new Date().toISOString(),
};

export const PERFIL_EMPLEADO_DEMO: Perfil = {
  id: 2,
  idEmpleado: 2,
  rol: 'EMPLEADO',
  nombre: 'María Elena',
  nombreCompleto: 'María Elena López Cruz',
  tema: (localStorage.getItem('sigecap.tema') === 'OSCURO' ? 'OSCURO' : 'CLARO'),
  cupo: '000102',
  curp: 'LOCM920314MOXLRM08',
  puesto: 'Auxiliar de Atención Operativa',
  tipoContratacion: 'HONORARIOS',
  sede: { id: 2, clave: 'SARE-01', nombre: 'SARE Oaxaca de Juárez' },
  area: { id: 2, nombre: 'Atención Operativa' },
  correoInstitucional: 'maria.lopez@becasbenitojuarez.gob.mx',
  correoRespaldo: 'maria.elena@correo.mx',
  telefono: '9519876543',
  ultimoAcceso: new Date().toISOString(),
};

const empleadosDemo: Empleado[] = [
  {
    id: 1, cupo: '000001', curp: 'ROPA850101HOXRLA01', numTrabajadorRusp: 'RUSP-1001', tipoContratacion: 'ESTRUCTURA',
    nombre: 'Alejandro', apellidoPaterno: 'Rojas', apellidoMaterno: 'Pérez',
    correoInstitucional: 'alejandro.rojas@becasbenitojuarez.gob.mx', correoRespaldo: 'alejandro.respaldo@correo.mx',
    telefono: '9511234567', puesto: 'Enlace de Capacitación', idArea: 1, idSede: 1, activo: true,
    sede: catalogosDemo.sedes[0]!, area: catalogosDemo.areas[0]!,
    usuario: { id: 1, activo: true, rol: { nombre: 'ADMINISTRADOR' } },
  },
  {
    id: 2, cupo: '000102', curp: 'LOCM920314MOXLRM08', numTrabajadorRusp: null, tipoContratacion: 'HONORARIOS',
    nombre: 'María Elena', apellidoPaterno: 'López', apellidoMaterno: 'Cruz',
    correoInstitucional: 'maria.lopez@becasbenitojuarez.gob.mx', correoRespaldo: 'maria.elena@correo.mx',
    telefono: '9519876543', puesto: 'Auxiliar de Atención Operativa', idArea: 2, idSede: 2, activo: true,
    sede: catalogosDemo.sedes[1]!, area: catalogosDemo.areas[1]!,
    usuario: { id: 2, activo: true, rol: { nombre: 'EMPLEADO' } },
  },
  {
    id: 3, cupo: '000103', curp: 'GAHC880722HOXGRL02', numTrabajadorRusp: 'RUSP-1045', tipoContratacion: 'ESTRUCTURA',
    nombre: 'Carlos Alberto', apellidoPaterno: 'García', apellidoMaterno: 'Hernández',
    correoInstitucional: 'carlos.garcia@becasbenitojuarez.gob.mx', correoRespaldo: 'cgarcia@correo.mx',
    telefono: '9531122334', puesto: 'Responsable de SARE', idArea: 2, idSede: 3, activo: true,
    sede: catalogosDemo.sedes[2]!, area: catalogosDemo.areas[1]!,
    usuario: { id: 3, activo: true, rol: { nombre: 'EMPLEADO' } },
  },
  {
    id: 4, cupo: '000104', curp: 'MASL951103MOXMSA05', numTrabajadorRusp: null, tipoContratacion: 'HONORARIOS',
    nombre: 'Lucía', apellidoPaterno: 'Martínez', apellidoMaterno: 'Sánchez',
    correoInstitucional: null, correoRespaldo: 'lucia.mtz@correo.mx',
    telefono: '9714455667', puesto: 'Validadora de Padrón', idArea: 3, idSede: 4, activo: true,
    sede: catalogosDemo.sedes[3]!, area: catalogosDemo.areas[2]!,
    usuario: null,
  },
];

const anio = new Date().getFullYear();

const cursosDemo: Curso[] = [
  {
    id: 1, idDependencia: 1, idTemaEtica: 1, nombre: 'Súmate al Protocolo para la Prevención del Hostigamiento y Acoso Sexual',
    nombreCorto: 'Súmate al Protocolo', ordenReporte: 1, aplicaEstructura: true, aplicaHonorarios: true,
    descripcion: 'Curso obligatorio para la prevención, atención y sanción del hostigamiento sexual y acoso sexual en la APF.',
    trimestre: 4, anio, fechaInicio: `${anio}-10-01`, fechaLimiteRegistro: `${anio}-11-15`, fechaEntregaConstancia: `${anio}-12-15`,
    urlPlataforma: 'https://puntogenero.inmujeres.gob.mx/', activo: true,
    dependencia: catalogosDemo.dependencias[0]!, temaEtica: catalogosDemo.temasEtica[0]!,
    _count: { asignaciones: 2, cursosEmpleado: 42 },
  },
  {
    id: 2, idDependencia: 2, idTemaEtica: 3, nombre: 'El ABC de la Igualdad y la No Discriminación',
    nombreCorto: 'ABC Igualdad', ordenReporte: 2, aplicaEstructura: true, aplicaHonorarios: true,
    descripcion: 'Nociones fundamentales sobre el derecho a la igualdad y no discriminación en el servicio público.',
    trimestre: 4, anio, fechaInicio: `${anio}-10-05`, fechaLimiteRegistro: `${anio}-11-20`, fechaEntregaConstancia: `${anio}-12-10`,
    urlPlataforma: 'https://conectate.conapred.org.mx/', activo: true,
    dependencia: catalogosDemo.dependencias[1]!, temaEtica: catalogosDemo.temasEtica[2]!,
    _count: { asignaciones: 1, cursosEmpleado: 50 },
  },
  {
    id: 3, idDependencia: 3, idTemaEtica: 2, nombre: 'Código de Ética de la Administración Pública Federal',
    nombreCorto: 'Código de Ética APF', ordenReporte: 3, aplicaEstructura: true, aplicaHonorarios: false,
    descripcion: 'Principios, valores y reglas de integridad para las personas servidoras públicas federales.',
    trimestre: 3, anio, fechaInicio: `${anio}-07-01`, fechaLimiteRegistro: `${anio}-08-15`, fechaEntregaConstancia: `${anio}-09-25`,
    urlPlataforma: 'https://sicavisp.buengobierno.gob.mx/', activo: true,
    dependencia: catalogosDemo.dependencias[2]!, temaEtica: catalogosDemo.temasEtica[1]!,
    _count: { asignaciones: 1, cursosEmpleado: 35 },
  },
];

const asignacionesDemo: Asignacion[] = [
  {
    id: 1, idCurso: 1, idSede: null, esGeneral: true, fechaAsignacion: `${anio}-10-02T14:30:00Z`, activo: true,
    curso: { id: 1, nombre: cursosDemo[0]!.nombre, anio, trimestre: 4, fechaEntregaConstancia: cursosDemo[0]!.fechaEntregaConstancia, activo: true, dependencia: { siglas: 'INMUJERES' } },
    sede: null, asignadoPor: 'Alejandro Rojas',
    ultimoEnvio: { id: 1, estado: 'ENVIADO', fechaEnvio: `${anio}-10-02T14:32:00Z`, totalDestinatarios: 42 },
    avance: { total: 42, completados: 31, enRevision: 4, pendientes: 5, rechazados: 2 },
  },
  {
    id: 2, idCurso: 2, idSede: 2, esGeneral: false, fechaAsignacion: `${anio}-10-10T16:00:00Z`, activo: true,
    curso: { id: 2, nombre: cursosDemo[1]!.nombre, anio, trimestre: 4, fechaEntregaConstancia: cursosDemo[1]!.fechaEntregaConstancia, activo: true, dependencia: { siglas: 'CONAPRED' } },
    sede: { id: 2, clave: 'SARE-01', nombre: 'SARE Oaxaca de Juárez' }, asignadoPor: 'Alejandro Rojas',
    ultimoEnvio: { id: 2, estado: 'ENVIADO', fechaEnvio: `${anio}-10-10T16:02:00Z`, totalDestinatarios: 12 },
    avance: { total: 12, completados: 9, enRevision: 2, pendientes: 1, rechazados: 0 },
  },
];

const evidenciasDemo: Evidencia[] = [
  {
    id: 101, nombreArchivo: 'constancia_protocolo_maria_lopez.pdf', tamanoBytes: 348120,
    fechaInicioCurso: `${anio}-10-12`, fechaConclusion: `${anio}-11-05`,
    estado: 'EN_REVISION', comentarioRevision: null, fechaSubida: new Date(Date.now() - 3600_000 * 5).toISOString(), fechaRevision: null,
    cursoEmpleado: {
      curso: { id: 1, nombre: cursosDemo[0]!.nombre, anio, trimestre: 4, dependencia: { siglas: 'INMUJERES' } },
      empleado: {
        id: 2, cupo: '000102', curp: 'LOCM920314MOXLRM08', nombre: 'María Elena', apellidoPaterno: 'López', apellidoMaterno: 'Cruz',
        tipoContratacion: 'HONORARIOS', puesto: 'Auxiliar de Atención Operativa', sede: { clave: 'SARE-01', nombre: 'SARE Oaxaca de Juárez' },
      },
    },
    revisor: null,
  },
  {
    id: 102, nombreArchivo: 'constancia_abc_igualdad_carlos.pdf', tamanoBytes: 412890,
    fechaInicioCurso: `${anio}-10-08`, fechaConclusion: `${anio}-10-28`,
    estado: 'APROBADA', comentarioRevision: 'Constancia válida con folio verificable.',
    fechaSubida: new Date(Date.now() - 86400_000 * 4).toISOString(), fechaRevision: new Date(Date.now() - 86400_000 * 3).toISOString(),
    cursoEmpleado: {
      curso: { id: 2, nombre: cursosDemo[1]!.nombre, anio, trimestre: 4, dependencia: { siglas: 'CONAPRED' } },
      empleado: {
        id: 3, cupo: '000103', curp: 'GAHC880722HOXGRL02', nombre: 'Carlos Alberto', apellidoPaterno: 'García', apellidoMaterno: 'Hernández',
        tipoContratacion: 'ESTRUCTURA', puesto: 'Responsable de SARE', sede: { clave: 'SARE-02', nombre: 'SARE Huajuapan de León' },
      },
    },
    revisor: { empleado: { nombre: 'Alejandro', apellidoPaterno: 'Rojas' } },
  },
];

const misCursosDemo: MiCurso[] = [
  {
    id: 1, estado: 'PENDIENTE', origen: 'ASIGNACION',
    curso: {
      id: 1, idDependencia: 1, idTemaEtica: 1, nombre: cursosDemo[0]!.nombre, nombreCorto: cursosDemo[0]!.nombreCorto,
      ordenReporte: 1, aplicaEstructura: true, aplicaHonorarios: true, descripcion: cursosDemo[0]!.descripcion,
      trimestre: 4, anio, fechaInicio: cursosDemo[0]!.fechaInicio, fechaLimiteRegistro: cursosDemo[0]!.fechaLimiteRegistro,
      fechaEntregaConstancia: cursosDemo[0]!.fechaEntregaConstancia, urlPlataforma: cursosDemo[0]!.urlPlataforma, activo: true,
      dependencia: { siglas: 'INMUJERES', nombre: 'Instituto Nacional de las Mujeres' },
    },
    evidencias: [],
  },
  {
    id: 2, estado: 'EN_REVISION', origen: 'ASIGNACION',
    curso: {
      id: 2, idDependencia: 2, idTemaEtica: 3, nombre: cursosDemo[1]!.nombre, nombreCorto: cursosDemo[1]!.nombreCorto,
      ordenReporte: 2, aplicaEstructura: true, aplicaHonorarios: true, descripcion: cursosDemo[1]!.descripcion,
      trimestre: 4, anio, fechaInicio: cursosDemo[1]!.fechaInicio, fechaLimiteRegistro: cursosDemo[1]!.fechaLimiteRegistro,
      fechaEntregaConstancia: cursosDemo[1]!.fechaEntregaConstancia, urlPlataforma: cursosDemo[1]!.urlPlataforma, activo: true,
      dependencia: { siglas: 'CONAPRED', nombre: 'Consejo Nacional para Prevenir la Discriminación' },
    },
    evidencias: [evidenciasDemo[0]!],
  },
  {
    id: 3, estado: 'COMPLETADO', origen: 'ASIGNACION',
    curso: {
      id: 3, idDependencia: 3, idTemaEtica: 2, nombre: cursosDemo[2]!.nombre, nombreCorto: cursosDemo[2]!.nombreCorto,
      ordenReporte: 3, aplicaEstructura: true, aplicaHonorarios: false, descripcion: cursosDemo[2]!.descripcion,
      trimestre: 3, anio, fechaInicio: cursosDemo[2]!.fechaInicio, fechaLimiteRegistro: cursosDemo[2]!.fechaLimiteRegistro,
      fechaEntregaConstancia: cursosDemo[2]!.fechaEntregaConstancia, urlPlataforma: cursosDemo[2]!.urlPlataforma, activo: true,
      dependencia: { siglas: 'EBG', nombre: 'Escuela del Buen Gobierno' },
    },
    evidencias: [evidenciasDemo[1]!],
  },
];

const notificacionesDemo: Notificacion[] = [
  {
    id: 1, tipo: 'EVIDENCIA_RECIBIDA', titulo: 'Nueva constancia recibida',
    mensaje: 'María Elena López Cruz subió su constancia del curso «Súmate al Protocolo».',
    leida: false, creadaEn: new Date(Date.now() - 3600_000 * 2).toISOString(),
  },
  {
    id: 2, tipo: 'CURSO_ASIGNADO', titulo: 'Nuevo curso asignado',
    mensaje: 'Se asignó el curso «El ABC de la Igualdad y la No Discriminación» (CONAPRED).',
    leida: true, creadaEn: new Date(Date.now() - 86400_000 * 2).toISOString(),
  },
];

const dashboardDemo: Dashboard = {
  totales: {
    empleadosActivos: 50,
    cursosActivos: 6,
    seguimientos: 120,
    completados: 92,
    enRevision: 10,
    pendientes: 14,
    rechazados: 4,
    cumplimiento: 77,
    evidenciasEnRevision: 1,
    empleadosRezagados: 3,
  },
  porDependencia: [
    { clave: 'INMUJERES', nombre: 'Instituto Nacional de las Mujeres', total: 45, completados: 36, enRevision: 4, pendientes: 4, rechazados: 1, cumplimiento: 80 },
    { clave: 'CONAPRED', nombre: 'Consejo Nacional para Prevenir la Discriminación', total: 40, completados: 31, enRevision: 3, pendientes: 4, rechazados: 2, cumplimiento: 78 },
    { clave: 'EBG', nombre: 'Escuela del Buen Gobierno', total: 35, completados: 25, enRevision: 3, pendientes: 6, rechazados: 1, cumplimiento: 71 },
  ],
  porSede: [
    { clave: 'ORE-OAX', nombre: 'Oficina de Representación Estatal Oaxaca', total: 42, completados: 36, enRevision: 3, pendientes: 2, rechazados: 1, cumplimiento: 86 },
    { clave: 'SARE-01', nombre: 'SARE Oaxaca de Juárez', total: 30, completados: 23, enRevision: 3, pendientes: 3, rechazados: 1, cumplimiento: 77 },
    { clave: 'SARE-02', nombre: 'SARE Huajuapan de León', total: 24, completados: 17, enRevision: 2, pendientes: 4, rechazados: 1, cumplimiento: 71 },
    { clave: 'SARE-03', nombre: 'SARE Juchitán de Zaragoza', total: 24, completados: 16, enRevision: 2, pendientes: 5, rechazados: 1, cumplimiento: 67 },
  ],
  porCurso: [
    { clave: 'C-3', nombre: 'Código de Ética de la Administración Pública Federal', total: 35, completados: 25, enRevision: 3, pendientes: 6, rechazados: 1, cumplimiento: 71 },
    { clave: 'C-2', nombre: 'El ABC de la Igualdad y la No Discriminación', total: 40, completados: 31, enRevision: 3, pendientes: 4, rechazados: 2, cumplimiento: 78 },
    { clave: 'C-1', nombre: 'Súmate al Protocolo para la Prevención del Hostigamiento y Acoso Sexual', total: 45, completados: 36, enRevision: 4, pendientes: 4, rechazados: 1, cumplimiento: 80 },
  ],
  anioSerie: anio,
  serieMensual: [
    { mes: 1, completados: 6 }, { mes: 2, completados: 8 }, { mes: 3, completados: 12 }, { mes: 4, completados: 7 },
    { mes: 5, completados: 9 }, { mes: 6, completados: 14 }, { mes: 7, completados: 11 }, { mes: 8, completados: 10 },
    { mes: 9, completados: 15 }, { mes: 10, completados: 18 }, { mes: 11, completados: 14 }, { mes: 12, completados: 0 },
  ],
  rezagados: [
    { idEmpleado: 4, cupo: '000104', nombre: 'Lucía Martínez Sánchez', sede: 'SARE-03', pendientes: 2 },
    { idEmpleado: 2, cupo: '000102', nombre: 'María Elena López Cruz', sede: 'SARE-01', pendientes: 1 },
    { idEmpleado: 3, cupo: '000103', nombre: 'Carlos Alberto García Hernández', sede: 'SARE-02', pendientes: 1 },
  ],
};

const plantillasDemo: Plantilla[] = [
  {
    id: 1, nombre: 'ASIGNACION', asunto: 'Nuevo curso asignado: {{curso}} ({{dependencia}})',
    cuerpoHtml: '<div style="font-family:sans-serif;padding:16px"><h2 style="color:#611232">Hola, {{nombre}}</h2><p>Se te ha asignado el curso <strong>{{curso}}</strong> impartido por <strong>{{dependencia}}</strong> correspondiente al trimestre {{trimestre}}.</p><p>Fecha límite de entrega de constancia: <strong>{{fechaLimite}}</strong>.</p></div>',
    variables: ['nombre', 'curso', 'dependencia', 'trimestre', 'fechaLimite', 'urlCurso', 'urlSistema'],
  },
  {
    id: 2, nombre: 'EVIDENCIA_APROBADA', asunto: 'Constancia aprobada: {{curso}}',
    cuerpoHtml: '<div style="font-family:sans-serif;padding:16px"><h2 style="color:#611232">Hola, {{nombre}}</h2><p>Tu constancia del curso <strong>{{curso}}</strong> fue revisada y <strong>aprobada</strong>.</p></div>',
    variables: ['nombre', 'curso', 'dependencia', 'comentario', 'urlSistema'],
  },
  {
    id: 3, nombre: 'EVIDENCIA_RECHAZADA', asunto: 'Constancia por corregir: {{curso}}',
    cuerpoHtml: '<div style="font-family:sans-serif;padding:16px"><h2 style="color:#611232">Hola, {{nombre}}</h2><p>Tu constancia del curso <strong>{{curso}}</strong> requiere corrección: <em>{{comentario}}</em>.</p></div>',
    variables: ['nombre', 'curso', 'dependencia', 'comentario', 'urlSistema'],
  },
];

const bitacoraDemo: RegistroBitacora[] = [
  {
    id: 1, accion: 'APROBAR', entidad: 'evidencia', idEntidad: 102,
    datosAnteriores: { estado: 'EN_REVISION' }, datosNuevos: { estado: 'APROBADA', comentario: 'Constancia válida con folio verificable.' },
    ipOrigen: '189.203.14.22', fecha: new Date(Date.now() - 3600_000 * 3).toISOString(),
    usuario: { id: 1, empleado: { cupo: '000001', nombre: 'Alejandro', apellidoPaterno: 'Rojas' } },
  },
  {
    id: 2, accion: 'CREAR', entidad: 'asignacion', idEntidad: 1,
    datosAnteriores: null, datosNuevos: { idCurso: 1, esGeneral: true, empleadosAsignados: 42 },
    ipOrigen: '189.203.14.22', fecha: new Date(Date.now() - 86400_000 * 2).toISOString(),
    usuario: { id: 1, empleado: { cupo: '000001', nombre: 'Alejandro', apellidoPaterno: 'Rojas' } },
  },
  {
    id: 3, accion: 'LOGIN', entidad: 'usuario', idEntidad: 1,
    datosAnteriores: null, datosNuevos: null,
    ipOrigen: '189.203.14.22', fecha: new Date(Date.now() - 86400_000 * 3).toISOString(),
    usuario: { id: 1, empleado: { cupo: '000001', nombre: 'Alejandro', apellidoPaterno: 'Rojas' } },
  },
];

function crearPdfDemo(): Blob {
  const pdfMinimo = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length 138 >> stream
BT /F1 18 Tf 72 700 Td (SIGECAP - Constancia de Capacitacion (Vista Previa)) Tj /F1 12 Tf 0 -30 Td (Documento demostrativo en GitHub Pages) Tj ET
endstream endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000297 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
485
%%EOF`;
  return new Blob([pdfMinimo], { type: 'application/pdf' });
}

function resolverRutaDemo(config: InternalAxiosRequestConfig): AxiosResponse {
  const metodo = (config.method ?? 'get').toLowerCase();
  const url = (config.url ?? '').replace(/^.*\/api\/v1/, '');
  const rolActual = localStorage.getItem(CLAVE_ROL_DEMO) === 'EMPLEADO' ? 'EMPLEADO' : 'ADMINISTRADOR';
  const perfilActual = rolActual === 'EMPLEADO' ? PERFIL_EMPLEADO_DEMO : PERFIL_ADMIN_DEMO;

  const responder = (data: unknown, headers: Record<string, string> = {}): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers,
    config,
  });

  if (url.startsWith('/auth/login') || url.startsWith('/auth/refresh')) {
    return responder({ token: 'demo-jwt-token', refreshToken: 'demo-refresh-token', usuario: perfilActual });
  }
  if (url.startsWith('/auth/me')) {
    if (metodo === 'patch' && config.data) {
      const cambios = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      Object.assign(perfilActual, cambios);
    }
    return responder(perfilActual);
  }
  if (url.startsWith('/catalogos')) return responder(catalogosDemo);
  if (url.startsWith('/cursos/anios')) return responder([anio, anio - 1]);
  if (url.startsWith('/cursos')) {
    return responder({ total: cursosDemo.length, pagina: 1, porPagina: 20, datos: cursosDemo });
  }
  if (url.startsWith('/reportes/dashboard')) return responder(dashboardDemo);
  if (url.startsWith('/reportes/exportar') || url.startsWith('/empleados/plantilla')) {
    const csv = 'CUPO,Nombre,Sede,Curso,Estado\n000001,Alejandro Rojas Pérez,ORE-OAX,Súmate al Protocolo,COMPLETADO\n000102,María Elena López Cruz,SARE-01,Súmate al Protocolo,EN_REVISION\n';
    return responder(new Blob([csv], { type: 'text/csv;charset=utf-8' }), {
      'content-disposition': 'attachment; filename="reporte_sigecap_demo.csv"',
    });
  }
  if (url.startsWith('/empleados')) {
    const sinCuenta = (config.params as { sinCuenta?: boolean } | undefined)?.sinCuenta;
    const lista = sinCuenta ? empleadosDemo.filter((e) => !e.usuario) : empleadosDemo;
    return responder({ total: lista.length, pagina: 1, porPagina: 20, datos: lista });
  }
  if (url.startsWith('/asignaciones/')) {
    const detalle: AsignacionDetalle = {
      id: 1, esGeneral: true, curso: { nombre: cursosDemo[0]!.nombre }, sede: null,
      cursosEmpleado: empleadosDemo.map((e, i) => ({
        id: i + 1,
        estado: i === 0 ? 'COMPLETADO' : i === 1 ? 'EN_REVISION' : 'PENDIENTE',
        empleado: { id: e.id, cupo: e.cupo, nombre: e.nombre, apellidoPaterno: e.apellidoPaterno, apellidoMaterno: e.apellidoMaterno, sede: { clave: e.sede.clave } },
      })),
    };
    if (url.endsWith('/correo')) return responder({ totalDestinatarios: 5, sinCorreo: 1 });
    return responder(detalle);
  }
  if (url.startsWith('/asignaciones')) {
    if (metodo === 'post') return responder({ empleadosAsignados: 42, sedesOmitidas: 0 });
    return responder({ total: asignacionesDemo.length, pagina: 1, porPagina: 20, datos: asignacionesDemo });
  }
  if (/^\/evidencias\/\d+\/archivo/.test(url)) {
    return responder(crearPdfDemo());
  }
  if (url.startsWith('/evidencias')) {
    const estadoFiltro = (config.params as { estado?: string } | undefined)?.estado;
    const filtradas = estadoFiltro ? evidenciasDemo.filter((e) => e.estado === estadoFiltro) : evidenciasDemo;
    const enRevision = evidenciasDemo.filter((e) => e.estado === 'EN_REVISION').length;
    return responder({ total: filtradas.length, pagina: 1, porPagina: 20, datos: filtradas, enRevision });
  }
  if (url.startsWith('/mis-cursos/catalogo')) {
    return responder(cursosDemo.map((c) => ({ id: c.id, nombre: c.nombre, anio: c.anio, trimestre: c.trimestre, dependencia: { siglas: c.dependencia.siglas } })));
  }
  if (url.startsWith('/mis-cursos')) return responder(misCursosDemo);
  if (url.startsWith('/notificaciones')) {
    if (metodo === 'delete') return responder({ eliminadas: 1 });
    const noLeidas = notificacionesDemo.filter((n) => !n.leida).length;
    return responder({ total: notificacionesDemo.length, pagina: 1, porPagina: 15, datos: notificacionesDemo, noLeidas });
  }
  if (url.startsWith('/usuarios/faltantes')) {
    return responder({
      creadas: 1,
      cuentas: [{ id: 4, cupo: '000104', nombre: 'Lucía Martínez Sánchez', identificador: 'MASL951103MOXMSA05', contrasenaTemporal: 'Tmp9482Sig', correoEnviado: true }],
    });
  }
  if (url.startsWith('/usuarios') && url.endsWith('/restablecer')) {
    return responder({ id: 2, cupo: '000102', nombre: 'María Elena López Cruz', identificador: 'maria.lopez@becasbenitojuarez.gob.mx', contrasenaTemporal: 'Nueva8372Sig', correoEnviado: true });
  }
  if (url.startsWith('/usuarios')) {
    const usuarios: Usuario[] = empleadosDemo.filter((e) => e.usuario).map((e) => ({
      id: e.usuario!.id,
      activo: e.usuario!.activo,
      ultimoAcceso: new Date(Date.now() - 3600_000 * 4).toISOString(),
      rol: e.usuario!.rol,
      empleado: {
        id: e.id, cupo: e.cupo, curp: e.curp, nombre: e.nombre, apellidoPaterno: e.apellidoPaterno, apellidoMaterno: e.apellidoMaterno,
        correoInstitucional: e.correoInstitucional, correoRespaldo: e.correoRespaldo, activo: e.activo, sede: { clave: e.sede.clave },
      },
    }));
    return responder({ total: usuarios.length, pagina: 1, porPagina: 20, datos: usuarios });
  }
  if (url.startsWith('/correos/plantillas')) return responder(plantillasDemo);
  if (url.startsWith('/correos/prueba')) return responder({ ok: true, mensaje: 'Correo de prueba simulado correctamente (Modo Demo GitHub Pages).' });
  if (url.startsWith('/correos/envios')) {
    const envios: EnvioCorreo[] = asignacionesDemo.map((a) => ({
      id: a.id,
      estado: 'ENVIADO',
      fechaEnvio: a.fechaAsignacion,
      totalDestinatarios: a.avance.total,
      plantilla: { nombre: 'ASIGNACION' },
      asignacion: { id: a.id, esGeneral: a.esGeneral, curso: { nombre: a.curso.nombre }, sede: a.sede ? { clave: a.sede.clave } : null },
    }));
    return responder({ total: envios.length, pagina: 1, porPagina: 10, datos: envios });
  }
  if (url.startsWith('/bitacora/filtros')) {
    return responder({
      acciones: ['LOGIN', 'CREAR', 'ACTUALIZAR', 'APROBAR', 'RECHAZAR', 'ENVIAR_CORREO'],
      entidades: ['usuario', 'empleado', 'curso', 'asignacion', 'evidencia'],
    });
  }
  if (url.startsWith('/bitacora')) {
    return responder({ total: bitacoraDemo.length, pagina: 1, porPagina: 25, datos: bitacoraDemo });
  }

  return responder({ ok: true, mensaje: 'Operación simulada en modo demostración.' });
}

export function instalarInterceptorDemo(instancia: AxiosInstance) {
  instancia.interceptors.request.use((config) => {
    if (esModoDemo()) {
      config.adapter = async () => resolverRutaDemo(config);
    }
    return config;
  });
}
