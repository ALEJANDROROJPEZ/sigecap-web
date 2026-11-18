// Sincroniza la especificación OpenAPI y el historial de cambios de sigecap-api y sigecap-web
// hacia sigecap-web/public para que se publiquen juntos en GitHub Pages.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(webDir, '../sigecap-api');
const publicDir = path.join(webDir, 'public');
const apiDocsDir = path.join(publicDir, 'api-docs');

fs.mkdirSync(apiDocsDir, { recursive: true });

function gitInfo(dir, nombreRepo, urlDefault) {
  if (!fs.existsSync(dir) || !fs.existsSync(path.join(dir, '.git'))) {
    return {
      nombre: nombreRepo,
      disponible: false,
      url: urlDefault,
      ramaActual: 'main',
      ramas: ['main'],
      ultimoCommit: null,
      commits: [],
      archivosRecientes: [],
    };
  }

  const run = (cmd) => {
    try {
      return execSync(cmd, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };

  const remoteUrl = run('git remote get-url origin')
    .replace(/\.git$/, '')
    .replace(/^git@github\.com:/, 'https://github.com/') || urlDefault;
  const ramaActual = run('git rev-parse --abbrev-ref HEAD') || 'main';
  const ramasRaw = run('git branch -a --format="%(refname:short)"');
  const ramas = [...new Set(
    ramasRaw
      .split('\n')
      .map((r) => r.trim().replace(/^origin\//, ''))
      .filter((r) => r && r !== 'HEAD' && !r.includes('->'))
  )];

  // Obtener últimos 15 commits de todas las ramas locales/remotas
  const logRaw = run('git log --all -n 15 --date=iso-strict --pretty=format:"%H|%h|%an|%ad|%D|%s"');
  const commits = logRaw
    ? logRaw.split('\n').filter(Boolean).map((line) => {
        const [sha, corto, autor, fecha, refs, ...msgParts] = line.split('|');
        return {
          sha,
          corto,
          autor,
          fecha,
          refs: refs ? refs.split(',').map((r) => r.trim()).filter(Boolean) : [],
          mensaje: msgParts.join('|'),
        };
      })
    : [];

  const archivosRaw = run('git show --name-status --oneline HEAD');
  const archivosRecientes = archivosRaw
    ? archivosRaw
        .split('\n')
        .slice(1)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 25)
    : [];

  return {
    nombre: nombreRepo,
    disponible: true,
    url: remoteUrl,
    ramaActual,
    ramas: ramas.length ? ramas : [ramaActual],
    ultimoCommit: commits[0] ?? null,
    commits,
    archivosRecientes,
  };
}

// 1. Copiar openapi.json desde sigecap-api si está disponible
const openapiOrigen = path.join(apiDir, 'src/docs/openapi.json');
const openapiDestino = path.join(apiDocsDir, 'openapi.json');

let resumenApi = { titulo: 'SIGECAP API', version: '1.0.0', totalRutas: 0, totalOperaciones: 0, tags: [] };

if (fs.existsSync(openapiOrigen)) {
  fs.copyFileSync(openapiOrigen, openapiDestino);
  console.log('✓ OpenAPI sincronizado desde sigecap-api/src/docs/openapi.json');
} else if (fs.existsSync(openapiDestino)) {
  console.log('ℹ Usando openapi.json previamente sincronizado en public/api-docs/openapi.json');
}

if (fs.existsSync(openapiDestino)) {
  try {
    const spec = JSON.parse(fs.readFileSync(openapiDestino, 'utf8'));
    const paths = Object.entries(spec.paths ?? {});
    let totalOperaciones = 0;
    for (const [, metodos] of paths) {
      totalOperaciones += Object.keys(metodos ?? {}).filter((m) =>
        ['get', 'post', 'put', 'patch', 'delete'].includes(m.toLowerCase())
      ).length;
    }
    resumenApi = {
      titulo: spec.info?.title ?? 'SIGECAP API',
      version: spec.info?.version ?? '1.0.0',
      descripcion: spec.info?.description ?? '',
      totalRutas: paths.length,
      totalOperaciones,
      tags: (spec.tags ?? []).map((t) => t.name),
    };
  } catch (e) {
    console.warn('No se pudo analizar openapi.json:', e);
  }
}

// 2. Generar visor Swagger UI independiente en public/api-docs/index.html
const swaggerHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SIGECAP API – Documentación OpenAPI (Swagger)</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
    <style>
      body { margin: 0; background: #faf8f5; font-family: system-ui, -apple-system, sans-serif; }
      .barra-institucional {
        background: #611232;
        color: #fff;
        padding: 0.75rem 1.5rem;
        display: flex;
         flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        border-bottom: 3px solid #d4af37;
      }
      .barra-institucional a {
        color: #f3e5ab;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
      }
      .barra-institucional a:hover { text-decoration: underline; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <header class="barra-institucional">
      <div>
        <strong style="font-size: 1.125rem; letter-spacing: -0.01em;">SIGECAP API</strong>
        <span style="margin-left: 0.75rem; font-size: 0.85rem; opacity: 0.85;">Documentación interactiva OpenAPI 3.0 (sincronizada desde sigecap-api)</span>
      </div>
      <div style="display: flex; gap: 1.25rem; align-items: center;">
        <a href="../">← Volver a SIGECAP Web</a>
        <a href="https://github.com/ALEJANDROROJPEZ/sigecap-api" target="_blank" rel="noreferrer">Repositorio sigecap-api ↗</a>
        <a href="https://github.com/ALEJANDROROJPEZ/sigecap-web" target="_blank" rel="noreferrer">Repositorio sigecap-web ↗</a>
      </div>
    </header>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
    <script>
      window.addEventListener('load', async () => {
        let specUrl = './openapi.json';
        try {
          const r = await fetch('https://raw.githubusercontent.com/ALEJANDROROJPEZ/sigecap-api/rama1/src/docs/openapi.json');
          if (r.ok) specUrl = 'https://raw.githubusercontent.com/ALEJANDROROJPEZ/sigecap-api/rama1/src/docs/openapi.json';
        } catch {}
        SwaggerUIBundle({
          url: specUrl,
          dom_id: '#swagger-ui',
          deepLinking: true,
          docExpansion: 'list',
          filter: true,
          persistAuthorization: true,
        });
      });
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(apiDocsDir, 'index.html'), swaggerHtml, 'utf8');

// 3. Generar metadatos de ambos repositorios en public/repos-meta.json
const meta = {
  sincronizadoEn: new Date().toISOString(),
  resumenApi,
  repositorios: {
    api: gitInfo(apiDir, 'sigecap-api', 'https://github.com/ALEJANDROROJPEZ/sigecap-api'),
    web: gitInfo(webDir, 'sigecap-web', 'https://github.com/ALEJANDROROJPEZ/sigecap-web'),
  },
};

fs.writeFileSync(path.join(publicDir, 'repos-meta.json'), JSON.stringify(meta, null, 2), 'utf8');
console.log('✓ Metadatos de sigecap-api y sigecap-web generados en public/repos-meta.json');
