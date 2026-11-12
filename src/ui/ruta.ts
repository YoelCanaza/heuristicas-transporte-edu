import { useEffect, useState } from 'react';
import type { MetodoInicial } from '../core/metodos';

export type Vista = 'inicio' | 'problema' | 'aprender' | 'laboratorio' | 'teoria';

export interface Ruta {
  vista: Vista;
  metodo: MetodoInicial;
}

const VISTAS: Vista[] = ['inicio', 'problema', 'aprender', 'laboratorio', 'teoria'];
const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];

/** Interpreta direcciones como `#/aprender/vogel`; lo desconocido cae en el inicio. */
export function leerRuta(hash: string): Ruta {
  const [vista, metodo] = hash.replace(/^#\/?/, '').split('/');
  return {
    vista: VISTAS.includes(vista as Vista) ? (vista as Vista) : 'inicio',
    metodo: METODOS.includes(metodo as MetodoInicial) ? (metodo as MetodoInicial) : 'noroeste',
  };
}

export function escribirRuta(r: Ruta): string {
  return r.vista === 'aprender' ? `#/aprender/${r.metodo}` : `#/${r.vista}`;
}

/** Pantalla actual según la dirección; cambiarla actualiza la URL y permite usar atrás/adelante. */
export function useRuta(): [Ruta, (r: Partial<Ruta>) => void] {
  const [ruta, setRuta] = useState(() => leerRuta(window.location.hash));

  useEffect(() => {
    const alCambiar = () => setRuta(leerRuta(window.location.hash));
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  const ir = (cambio: Partial<Ruta>) => {
    const nueva = { ...ruta, ...cambio };
    if (nueva.vista !== ruta.vista) window.scrollTo({ top: 0 });
    window.location.hash = escribirRuta(nueva);
  };

  return [ruta, ir];
}
