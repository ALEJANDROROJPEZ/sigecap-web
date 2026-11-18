// Portal unificado de sincronización: muestra los cambios realizados en sigecap-api y sigecap-web
// (tanto en tiempo de compilación como en vivo desde la API de GitHub) y la documentación OpenAPI/Swagger.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ExternalLink, FileCode2, GitBranch, GitCommit, RefreshCw, Server } from 'lucide-react';
import { cx, fechaHora } from '../lib/formato';
import { Boton, Cargando, Insignia, Panel } from '../componentes/ui';

interface CommitInfo {
  sha: string;
  corto: string;
  autor: string;
  fecha: string;
  refs?: string[];
  mensaje: string;
  url?: string;
}

interface RepoMeta {
  nombre: string;
  disponible: boolean;
  url: string;
  ramaActual: string;
  ramas: string[];
  ultimoCommit: CommitInfo | null;
  commits: CommitInfo[];
  archivosRecientes: string[];
}

interface DatosSincronizacion {
  sincronizadoEn: string;
  resumenApi: {
    titulo: string;
    version: string;
    descripcion?: string;
    totalRutas: number;
    totalOperaciones: number;
    tags: string[];
  };
  repositorios: {
    api: RepoMeta;
    web: RepoMeta;
  };
}

interface OperacionOpenApi {
  metodo: string;
  ruta: string;
  resumen: string;
  tag: string;
  autenticado: boolean;
}

const GITHUB_OWNER = 'ALEJANDROROJPEZ';

export default function Repositorios() {
  const [meta, setMeta] = useState<DatosSincronizacion | null>(null);
  const [operaciones, setOperaciones] = useState<OperacionOpenApi[]>([]);
  const [tagFiltro, setTagFiltro] = useState('');
  const [pestana, setPestana] = useState<'cambios' | 'endpoints' | 'swagger'>('cambios');
  const [ramaApi, setRamaApi] = useState('rama1');
  const [ramaWeb, setRamaWeb] = useState('main');
  const [commitsVivoApi, setCommitsVivoApi] = useState<CommitInfo[] | null>(null);
  const [commitsVivoWeb, setCommitsVivoWeb] = useState<CommitInfo[] | null>(null);
  const [ramasVivoApi, setRamasVivoApi] = useState<string[]>([]);
  const [ramasVivoWeb, setRamasVivoWeb] = useState<string[]>([]);
  const [actualizandoVivo, setActualizandoVivo] = useState(false);
  const [ultimaConsultaVivo, setUltimaConsultaVivo] = useState<string | null>(null);

  const base = import.meta.env.BASE_URL || './';
  const urlSwagger = `${base.replace(/\/$/, '')}/api-docs/index.html`;

  // 1. Cargar metadatos locales generados en el build (repos-meta.json y openapi.json)
  useEffect(() => {
    fetch(`${base.replace(/\/$/, '')}/repos-meta.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DatosSincronizacion | null) => {
        if (d) {
          setMeta(d);
          if (d.repositorios.api.ramaActual) setRamaApi(d.repositorios.api.ramaActual);
          if (d.repositorios.web.ramaActual) setRamaWeb(d.repositorios.web.ramaActual);
        }
      })
      .catch(() => {});

    fetch(`${base.replace(/\/$/, '')}/api-docs/openapi.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((spec) => {
        if (!spec?.paths) return;
        const lista: OperacionOpenApi[] = [];
        for (const [ruta, metodos] of Object.entries(spec.paths as Record<string, Record<string, unknown>>)) {
          for (const [m, info] of Object.entries(metodos)) {
            if (!['get', 'post', 'put', 'patch', 'delete'].includes(m.toLowerCase())) continue;
            const det = info as { summary?: string; tags?: string[]; security?: unknown[] };
            lista.push({
              metodo: m.toUpperCase(),
              ruta: `/api/v1${ruta}`,
              resumen: det.summary ?? '',
              tag: det.tags?.[0] ?? 'General',
              autenticado: Array.isArray(det.security) && det.security.length > 0,
            });
          }
        }
        setOperaciones(lista);
      })
      .catch(() => {});
  }, [base]);

  // 2. Consultar en vivo la API pública de GitHub para mostrar commits y OpenAPI recién subidos sin esperar rebuild
  async function consultarGitHubEnVivo(ramaA = ramaApi, ramaW = ramaWeb) {
    setActualizandoVivo(true);
    try {
      const [resRamasApi, resRamasWeb, resCommitsApi, resCommitsWeb, resOpenApiVivo] = await Promise.allSettled([
        fetch(`https://api.github.com/repos/${GITHUB_OWNER}/sigecap-api/branches`).then((r) => (r.ok ? r.json() : null)),
        fetch(`https://api.github.com/repos/${GITHUB_OWNER}/sigecap-web/branches`).then((r) => (r.ok ? r.json() : null)),
        fetch(`https://api.github.com/repos/${GITHUB_OWNER}/sigecap-api/commits?sha=${encodeURIComponent(ramaA)}&per_page=10`).then((r) => (r.ok ? r.json() : null)),
        fetch(`https://api.github.com/repos/${GITHUB_OWNER}/sigecap-web/commits?sha=${encodeURIComponent(ramaW)}&per_page=10`).then((r) => (r.ok ? r.json() : null)),
        fetch(`https://raw.githubusercontent.com/${GITHUB_OWNER}/sigecap-api/${encodeURIComponent(ramaA)}/src/docs/openapi.json`).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (resOpenApiVivo.status === 'fulfilled' && resOpenApiVivo.value?.paths) {
        const spec = resOpenApiVivo.value;
        const lista: OperacionOpenApi[] = [];
        for (const [ruta, metodos] of Object.entries(spec.paths as Record<string, Record<string, unknown>>)) {
          for (const [m, info] of Object.entries(metodos)) {
            if (!['get', 'post', 'put', 'patch', 'delete'].includes(m.toLowerCase())) continue;
            const det = info as { summary?: string; tags?: string[]; security?: unknown[] };
            lista.push({
              metodo: m.toUpperCase(),
              ruta: `/api/v1${ruta}`,
              resumen: det.summary ?? '',
              tag: det.tags?.[0] ?? 'General',
              autenticado: Array.isArray(det.security) && det.security.length > 0,
            });
          }
        }
        setOperaciones(lista);
      }

      if (resRamasApi.status === 'fulfilled' && Array.isArray(resRamasApi.value)) {
        setRamasVivoApi(resRamasApi.value.map((b: { name: string }) => b.name));
      }
      if (resRamasWeb.status === 'fulfilled' && Array.isArray(resRamasWeb.value)) {
        setRamasVivoWeb(resRamasWeb.value.map((b: { name: string }) => b.name));
      }
      if (resCommitsApi.status === 'fulfilled' && Array.isArray(resCommitsApi.value)) {
        setCommitsVivoApi(
          resCommitsApi.value.map((c: { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } } }) => ({
            sha: c.sha,
            corto: c.sha.slice(0, 7),
            autor: c.commit.author.name,
            fecha: c.commit.author.date,
            mensaje: c.commit.message.split('\n')[0] ?? '',
            url: c.html_url,
          }))
        );
      }
      if (resCommitsWeb.status === 'fulfilled' && Array.isArray(resCommitsWeb.value)) {
        setCommitsVivoWeb(
          resCommitsWeb.value.map((c: { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } } }) => ({
            sha: c.sha,
            corto: c.sha.slice(0, 7),
            autor: c.commit.author.name,
            fecha: c.commit.author.date,
            mensaje: c.commit.message.split('\n')[0] ?? '',
            url: c.html_url,
          }))
        );
      }
      setUltimaConsultaVivo(new Date().toISOString());
    } finally {
      setActualizandoVivo(false);
    }
  }

  useEffect(() => {
    void consultarGitHubEnVivo(ramaApi, ramaWeb);
  }, [ramaApi, ramaWeb]); // eslint-disable-line react-hooks/exhaustive-deps

  const listaCommitsApi = commitsVivoApi ?? meta?.repositorios.api.commits ?? [];
  const listaCommitsWeb = commitsVivoWeb ?? meta?.repositorios.web.commits ?? [];
  const opcionesRamaApi = [...new Set([...(meta?.repositorios.api.ramas ?? ['main', 'rama1']), ...ramasVivoApi])];
  const opcionesRamaWeb = [...new Set([...(meta?.repositorios.web.ramas ?? ['main']), ...ramasVivoWeb])];

  const tonoMetodo: Record<string, 'verde' | 'dorado' | 'guinda' | 'rojo' | 'gris'> = {
    GET: 'verde',
    POST: 'guinda',
    PUT: 'dorado',
    PATCH: 'dorado',
    DELETE: 'rojo',
  };

  const operacionesFiltradas = tagFiltro ? operaciones.filter((o) => o.tag === tagFiltro) : operaciones;

  return (
    <div className="mx-auto max-w-[84rem] px-3 py-5 sm:px-6 sm:py-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-borde pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-marca hover:underline">
              <ArrowLeft className="size-4" /> Volver a SIGECAP
            </Link>
            <span className="text-suave">·</span>
            <Insignia tono="guinda">GitHub Pages Sincronizado</Insignia>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Estado de Repositorios y Documentación API</h1>
          <p className="mt-1 text-sm text-suave">
            Unificación de <strong>sigecap-api</strong> y <strong>sigecap-web</strong>. Cualquier cambio en ambos repositorios se refleja aquí automáticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Boton
            icono={<RefreshCw className={cx('size-4', actualizandoVivo && 'animate-spin')} />}
            onClick={() => consultarGitHubEnVivo(ramaApi, ramaWeb)}
            disabled={actualizandoVivo}
          >
            Actualizar desde GitHub
          </Boton>
          <a
            href={urlSwagger}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-guinda-700 px-4 text-sm font-medium text-white hover:bg-guinda-600"
          >
            <BookOpen className="size-4" /> Abrir Swagger UI completo <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-borde bg-superficie p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-suave uppercase">Backend (API REST)</span>
            <Server className="size-4 text-marca" />
          </div>
          <p className="mt-1 font-serif text-xl font-bold">sigecap-api</p>
          <p className="mt-1 text-xs text-suave">
            Rama activa: <strong>{ramaApi}</strong> · {meta?.resumenApi.totalOperaciones ?? operaciones.length} endpoints documentados
          </p>
          <a
            href="https://github.com/ALEJANDROROJPEZ/sigecap-api"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-marca hover:underline"
          >
            github.com/ALEJANDROROJPEZ/sigecap-api <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="rounded-lg border border-borde bg-superficie p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-suave uppercase">Frontend (React + Vite)</span>
            <FileCode2 className="size-4 text-marca" />
          </div>
          <p className="mt-1 font-serif text-xl font-bold">sigecap-web</p>
          <p className="mt-1 text-xs text-suave">
            Rama activa: <strong>{ramaWeb}</strong> · Interfaz compilada en GitHub Pages
          </p>
          <a
            href="https://github.com/ALEJANDROROJPEZ/sigecap-web"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-marca hover:underline"
          >
            github.com/ALEJANDROROJPEZ/sigecap-web <ExternalLink className="size-3" />
          </a>
        </div>

        <div className="rounded-lg border border-borde bg-superficie p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-suave uppercase">Sincronización</span>
            <GitCommit className="size-4 text-marca" />
          </div>
          <p className="mt-1 font-serif text-xl font-bold">
            {commitsVivoApi || commitsVivoWeb ? 'Conectado en vivo' : 'Instantánea de compilación'}
          </p>
          <p className="mt-1 text-xs text-suave">
            {ultimaConsultaVivo
              ? `Consultado en GitHub: ${fechaHora(ultimaConsultaVivo)}`
              : meta?.sincronizadoEn
                ? `Compilado: ${fechaHora(meta.sincronizadoEn)}`
                : 'Sincronizado'}
          </p>
        </div>
      </div>

      {/* Pestañas de vista */}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-borde" role="tablist">
        {[
          { id: 'cambios', texto: 'Historial de cambios (Ambos repositorios)' },
          { id: 'endpoints', texto: `Catálogo de Endpoints API (${operaciones.length})` },
          { id: 'swagger', texto: 'Visor interactivo Swagger / OpenAPI' },
        ].map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id as typeof pestana)}
            className={cx(
              'border-b-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors',
              pestana === p.id ? 'border-marca font-semibold text-marca' : 'border-transparent text-suave hover:text-texto'
            )}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {pestana === 'cambios' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Columna sigecap-api */}
          <Panel
            titulo="Cambios en sigecap-api (Backend)"
            sinRelleno
            acciones={
              <label className="flex items-center gap-1.5 text-xs text-suave">
                <GitBranch className="size-3.5" /> Rama:
                <select
                  value={ramaApi}
                  onChange={(e) => setRamaApi(e.target.value)}
                  className="rounded border border-borde bg-superficie px-2 py-1 text-xs font-medium text-texto"
                >
                  {opcionesRamaApi.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            }
          >
            {!meta && !commitsVivoApi ? (
              <Cargando />
            ) : (
              <>
                <ul className="divide-y divide-borde">
                  {listaCommitsApi.map((c) => (
                    <li key={c.sha} className="px-4 py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-texto">{c.mensaje}</p>
                        <a
                          href={c.url ?? `https://github.com/${GITHUB_OWNER}/sigecap-api/commit/${c.sha}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded bg-realce px-2 py-0.5 font-mono text-xs text-marca hover:underline"
                        >
                          {c.corto}
                        </a>
                      </div>
                      <p className="mt-1 text-xs text-suave">
                        {c.autor} · {fechaHora(c.fecha)}
                      </p>
                    </li>
                  ))}
                </ul>
                {meta?.repositorios.api.archivosRecientes && meta.repositorios.api.archivosRecientes.length > 0 && (
                  <div className="border-t border-borde bg-realce/50 px-4 py-3">
                    <p className="mb-1.5 text-xs font-semibold text-suave">Archivos modificados en el último commit local (sigecap-api):</p>
                    <pre className="max-h-36 overflow-y-auto font-mono text-xs text-suave">
                      {meta.repositorios.api.archivosRecientes.join('\n')}
                    </pre>
                  </div>
                )}
              </>
            )}
          </Panel>

          {/* Columna sigecap-web */}
          <Panel
            titulo="Cambios en sigecap-web (Frontend)"
            sinRelleno
            acciones={
              <label className="flex items-center gap-1.5 text-xs text-suave">
                <GitBranch className="size-3.5" /> Rama:
                <select
                  value={ramaWeb}
                  onChange={(e) => setRamaWeb(e.target.value)}
                  className="rounded border border-borde bg-superficie px-2 py-1 text-xs font-medium text-texto"
                >
                  {opcionesRamaWeb.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            }
          >
            {!meta && !commitsVivoWeb ? (
              <Cargando />
            ) : (
              <>
                <ul className="divide-y divide-borde">
                  {listaCommitsWeb.map((c) => (
                    <li key={c.sha} className="px-4 py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-texto">{c.mensaje}</p>
                        <a
                          href={c.url ?? `https://github.com/${GITHUB_OWNER}/sigecap-web/commit/${c.sha}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded bg-realce px-2 py-0.5 font-mono text-xs text-marca hover:underline"
                        >
                          {c.corto}
                        </a>
                      </div>
                      <p className="mt-1 text-xs text-suave">
                        {c.autor} · {fechaHora(c.fecha)}
                      </p>
                    </li>
                  ))}
                </ul>
                {meta?.repositorios.web.archivosRecientes && meta.repositorios.web.archivosRecientes.length > 0 && (
                  <div className="border-t border-borde bg-realce/50 px-4 py-3">
                    <p className="mb-1.5 text-xs font-semibold text-suave">Archivos modificados en el último commit local (sigecap-web):</p>
                    <pre className="max-h-36 overflow-y-auto font-mono text-xs text-suave">
                      {meta.repositorios.web.archivosRecientes.join('\n')}
                    </pre>
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>
      )}

      {pestana === 'endpoints' && (
        <Panel
          titulo="Endpoints de sigecap-api sincronizados desde OpenAPI 3.0"
          sinRelleno
          acciones={
            <select
              value={tagFiltro}
              onChange={(e) => setTagFiltro(e.target.value)}
              className="rounded border border-borde bg-superficie px-2.5 py-1 text-xs font-medium text-texto"
            >
              <option value="">Todos los módulos ({operaciones.length})</option>
              {meta?.resumenApi.tags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          }
        >
          <table className="tabla">
            <thead>
              <tr>
                <th>Método</th>
                <th>Ruta</th>
                <th>Módulo</th>
                <th>Descripción</th>
                <th>Seguridad</th>
              </tr>
            </thead>
            <tbody>
              {operacionesFiltradas.map((op, i) => (
                <tr key={`${op.metodo}-${op.ruta}-${i}`}>
                  <td data-etiqueta="Método">
                    <Insignia tono={tonoMetodo[op.metodo] ?? 'gris'}>{op.metodo}</Insignia>
                  </td>
                  <td data-etiqueta="Ruta" className="font-mono text-xs font-medium">{op.ruta}</td>
                  <td data-etiqueta="Módulo">{op.tag}</td>
                  <td data-etiqueta="Descripción" className="ajusta">{op.resumen}</td>
                  <td data-etiqueta="Seguridad" className="text-xs text-suave">{op.autenticado ? 'JWT Bearer' : 'Público'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {pestana === 'swagger' && (
        <Panel titulo="Documentación Interactiva Swagger UI (sigecap-api)" sinRelleno>
          <iframe
            src={urlSwagger}
            title="Swagger UI SIGECAP API"
            className="h-[78dvh] w-full rounded-b-lg border-0 bg-white"
          />
        </Panel>
      )}
    </div>
  );
}
