import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { flushSync } from 'react-dom';

/** true si el usuario pidió al sistema reducir el movimiento: entonces nada se anima. */
export function sinMovimiento(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Aceleración suave al final, para que el número frene al llegar. */
const frenar = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Devuelve un número que avanza hasta `valor` cada vez que este cambia. La primera vez parte
 * de `desde` (si se indica); con movimiento reducido devuelve siempre el valor final.
 */
export function useValorAnimado(valor: number, ms = 450, desde?: number): number {
  const [mostrado, setMostrado] = useState(desde ?? valor);
  const actual = useRef(desde ?? valor);

  useEffect(() => {
    const origen = actual.current;
    if (origen === valor) return;
    if (sinMovimiento()) {
      actual.current = valor;
      setMostrado(valor);
      return;
    }
    let cuadro = 0;
    const inicio = performance.now();
    const avanzar = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / ms);
      actual.current = origen + (valor - origen) * frenar(t);
      setMostrado(actual.current);
      if (t < 1) cuadro = requestAnimationFrame(avanzar);
    };
    cuadro = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(cuadro);
  }, [valor, ms]);

  return mostrado;
}

/**
 * Hace aparecer los hijos directos del contenedor a medida que entran en pantalla. El contenido
 * solo se oculta si el navegador puede volver a mostrarlo: sin observador o con movimiento
 * reducido, todo queda visible desde el principio.
 */
export function useAparicion<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const contenedor = ref.current;
    if (!contenedor || sinMovimiento() || typeof IntersectionObserver === 'undefined') return;
    const hijos = Array.from(contenedor.children) as HTMLElement[];
    const observador = new IntersectionObserver(
      (entradas) => {
        // Los que entran juntos aparecen escalonados.
        let orden = 0;
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const hijo = e.target as HTMLElement;
          hijo.style.setProperty('--orden', String(orden++));
          hijo.classList.add('visto');
          observador.unobserve(hijo);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    contenedor.classList.add('aparicion');
    hijos.forEach((h) => observador.observe(h));
    return () => {
      observador.disconnect();
      contenedor.classList.remove('aparicion');
      hijos.forEach((h) => h.classList.remove('visto'));
    };
  }, []);

  return ref;
}

/**
 * Inclina levemente una escena según la posición del puntero sobre `zona`, escribiendo los
 * ángulos en las variables CSS `--giro-x` y `--giro-y`. No hace nada en pantallas táctiles ni
 * con movimiento reducido.
 */
export function useInclinacion<T extends HTMLElement>(maximo = 6): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const zona = ref.current;
    if (!zona || sinMovimiento() || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    let cuadro = 0;
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const r = zona.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        zona.style.setProperty('--giro-y', `${(x * 2 * maximo).toFixed(2)}deg`);
        zona.style.setProperty('--giro-x', `${(-y * 2 * maximo).toFixed(2)}deg`);
      });
    };
    const soltar = () => {
      cancelAnimationFrame(cuadro);
      zona.style.setProperty('--giro-x', '0deg');
      zona.style.setProperty('--giro-y', '0deg');
    };
    zona.addEventListener('pointermove', mover);
    zona.addEventListener('pointerleave', soltar);
    return () => {
      cancelAnimationFrame(cuadro);
      zona.removeEventListener('pointermove', mover);
      zona.removeEventListener('pointerleave', soltar);
    };
  }, [maximo]);

  return ref;
}

type DocumentoConTransicion = Document & { startViewTransition?: (cambio: () => void) => unknown };

/**
 * Aplica un cambio de pantalla con un fundido entre la vista anterior y la nueva, si el
 * navegador lo permite. Si no, o con movimiento reducido, el cambio es inmediato.
 */
export function conTransicion(cambio: () => void): void {
  const doc = document as DocumentoConTransicion;
  if (typeof doc.startViewTransition !== 'function' || sinMovimiento()) {
    cambio();
    return;
  }
  doc.startViewTransition(() => flushSync(cambio));
}
