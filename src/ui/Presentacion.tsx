import { useEffect, useState } from 'react';

/**
 * Modo presentación de una pantalla: intenta ocupar toda la pantalla y se cierra con Esc o al
 * salir de la pantalla completa. Devuelve si está activo y cómo cambiarlo.
 */
export function usePresentacion(): [boolean, (activo: boolean) => void] {
  const [presentacion, setPresentacion] = useState(false);

  useEffect(() => {
    if (!presentacion) return;
    document.documentElement.requestFullscreen?.().catch(() => {
      // sin pantalla completa el modo funciona igual, dentro de la ventana
    });
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresentacion(false);
    };
    const alCambiar = () => {
      if (!document.fullscreenElement) setPresentacion(false);
    };
    window.addEventListener('keydown', tecla);
    document.addEventListener('fullscreenchange', alCambiar);
    return () => {
      window.removeEventListener('keydown', tecla);
      document.removeEventListener('fullscreenchange', alCambiar);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    };
  }, [presentacion]);

  return [presentacion, setPresentacion];
}

/** Franja superior del modo presentación: qué se está viendo y cómo salir. */
export function BarraPresentacion({ titulo, ayuda, onSalir }: { titulo: string; ayuda?: string; onSalir: () => void }) {
  return (
    <div className="presentacion-barra">
      <strong>{titulo}</strong>
      {ayuda && <span className="ayuda">{ayuda}</span>}
      <button onClick={onSalir}>Salir (Esc)</button>
    </div>
  );
}

/** Botón que abre el modo presentación. */
export function BotonPresentacion({ onAbrir }: { onAbrir: () => void }) {
  return (
    <button className="chip-boton" title="A pantalla completa y con letra grande, para proyectar" onClick={onAbrir}>
      Modo presentación
    </button>
  );
}
