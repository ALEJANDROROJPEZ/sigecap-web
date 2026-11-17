# sigecap-web

Interfaz web de SIGECAP, el sistema de gestión de cursos de capacitación de la CNBBBJ en Oaxaca.
React 18 + TypeScript + Vite + Tailwind CSS. Funciona en computadora, tablet y teléfono (desde 360 px).

## Puesta en marcha

Primero arranca el backend (`sigecap-api`, puerto 3000). Después:

```bash
npm install
npm run dev        # http://localhost:5173
```

En desarrollo no hace falta configurar nada: Vite reenvía `/api` y `/socket.io` al backend
(`vite.config.ts`). Si el backend usa otro puerto, crea un archivo `.env` con
`VITE_API_PROXY=http://localhost:PUERTO`.

Para producción:

```bash
npm run build      # genera la carpeta dist/
```

Sirve `dist/` con el servidor web de la dependencia y redirige las rutas desconocidas a `index.html`.
Si la API queda en otro dominio, define `VITE_API_URL` antes de compilar (ver `.env.example`) y agrega
la dirección del frontend en `CORS_ORIGIN` y `APP_URL` del backend.

## Estructura

```
src/
├── main.tsx              Arranque: tipografías, React Query, rutas y proveedores
├── App.tsx               Rutas y protección por rol
├── index.css             Tema (colores institucionales, modo oscuro) y tabla responsiva
├── lib/
│   ├── api.ts            Cliente HTTP, renovación del token, errores y descargas
│   ├── consultas.ts      Consultas compartidas (catálogos, listados paginados)
│   ├── formato.ts        Fechas, periodos y textos de estados
│   └── tipos.ts          Tipos de los datos de la API
├── contexto/
│   ├── Sesion.tsx        Inicio y cierre de sesión, perfil y tema
│   └── Avisos.tsx        Avisos breves de confirmación y error
├── componentes/
│   ├── Plantilla.tsx     Menú lateral, barra superior, notificaciones en tiempo real
│   ├── VisorPdf.tsx      Visor de constancias
│   └── ui.tsx            Botones, campos, tablas, ventanas modales, insignias
└── paginas/
    ├── Acceso.tsx        Inicio de sesión, recuperación y nueva contraseña
    ├── Inicio.tsx        Dashboard del administrador
    ├── Empleados.tsx     Padrón, alta y edición, importación desde Excel
    ├── Cursos.tsx        Catálogo de cursos
    ├── Asignaciones.tsx  Asignación por sedes o general y correos
    ├── Constancias.tsx   Revisión de constancias con visor PDF
    ├── Reportes.tsx      Formatos institucionales y listados
    ├── Usuarios.tsx      Cuentas y roles
    ├── Catalogos.tsx     Sedes, áreas, dependencias y temas
    ├── Correos.tsx       Plantillas, envíos y prueba de correo
    ├── Bitacora.tsx      Bitácora de auditoría
    ├── MisCursos.tsx     Cursos del empleado y carga de constancias
    ├── Notificaciones.tsx
    └── Perfil.tsx        Datos de contacto, apariencia y contraseña
```

## Pantallas por rol

- **Administrador:** todas. Como también es empleado, tiene «Mis cursos» y «Mi perfil».
- **Empleado:** Mis cursos, Notificaciones y Mi perfil. Si escribe otra dirección, regresa a «Mis cursos»;
  además la API rechaza cualquier petición que su rol no permita.

## Sesión

El token de acceso (15 min) vive en memoria y el de renovación (7 días) en `localStorage`. Cuando el
de acceso vence, se renueva solo y la petición se repite; si la renovación falla, se vuelve al inicio
de sesión.
