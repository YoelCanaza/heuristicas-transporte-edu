import type { Paso } from './tipos';

/** Ruta origen → destino que la vista de red debe dibujar en un paso. */
export interface AristaRed {
  i: number;
  j: number;
  /** Unidades enviadas; 0 con `basica` = true es una asignación ε. */
  cantidad: number;
  basica: boolean;
  /** Signo en el camino cerrado del paso, si la ruta pertenece a él. */
  signo: '+' | '−' | null;
  /** true si es la celda protagonista del paso. */
  actual: boolean;
}

/**
 * Rutas que se ven en la red: las celdas básicas, las del camino cerrado y la celda actual.
 * Es la misma información que muestra la tabla, leída como flujos entre nodos.
 */
export function aristasRed(paso: Paso): AristaRed[] {
  const signos = new Map<string, '+' | '−'>();
  paso.ciclo?.forEach((c, k) => signos.set(`${c.i},${c.j}`, k % 2 === 0 ? '+' : '−'));
  const aristas: AristaRed[] = [];
  paso.x.forEach((fila, i) =>
    fila.forEach((cantidad, j) => {
      const basica = paso.basica[i][j];
      const signo = signos.get(`${i},${j}`) ?? null;
      const actual = paso.celda?.i === i && paso.celda?.j === j;
      if (basica || signo || actual) aristas.push({ i, j, cantidad, basica, signo, actual });
    }),
  );
  return aristas;
}

/** Grosor del trazo de una ruta, proporcional a lo que envía respecto del mayor envío. */
export function grosorArista(cantidad: number, mayor: number): number {
  if (cantidad <= 0 || mayor <= 0) return 1.5;
  return 2.5 + 7.5 * (cantidad / mayor);
}
