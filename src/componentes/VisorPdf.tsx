// Visor de constancias: el PDF se pide a la API con el token de la sesión y se muestra dentro de la
// página, sin barra de descarga (ajuste acordado en la validación de interfaces).
import { useEffect, useState } from 'react';
import { api, leerError } from '../lib/api';
import { Alerta, Cargando } from './ui';

export function VisorPdf({ idEvidencia, className }: { idEvidencia: number; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    let creado: string | null = null;
    setUrl(null);
    setError('');
    api.get(`/evidencias/${idEvidencia}/archivo`, { responseType: 'blob' })
      .then((r) => {
        if (!vigente) return;
        creado = URL.createObjectURL(new Blob([r.data as Blob], { type: 'application/pdf' }));
        setUrl(creado);
      })
      .catch(async (err) => { if (vigente) setError((await leerError(err)).mensaje); });
    return () => { vigente = false; if (creado) URL.revokeObjectURL(creado); };
  }, [idEvidencia]);

  if (error) return <Alerta>{error}</Alerta>;
  if (!url) return <Cargando texto="Abriendo la constancia…" />;
  return (
    <div className={`flex flex-col ${className ?? ''}`}>
      <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title="Constancia en PDF" className="min-h-0 w-full flex-1 rounded-md border border-borde bg-white" />
      <p className="mt-1.5 shrink-0 text-[0.8125rem] text-suave">
        ¿No se muestra el documento? <a href={url} target="_blank" rel="noreferrer" className="text-marca hover:underline">Ábrelo en otra pestaña</a>.
      </p>
    </div>
  );
}
