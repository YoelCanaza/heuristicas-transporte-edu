import { buscarCiclo, costoMarginal } from './caminoPiedras';
import { calcularPotenciales, marginalesModi } from './modi';
import type { Celda, Paso, Problema } from './tipos';
import { EPS, copiar, fmt, fmtTotal, nombreCelda, palabraTotal, prohibidasUsadas, total } from './util';

/** Celdas vacías con costo marginal 0 en un paso óptimo: cada una lleva a otra solución con el mismo total. */
export function celdasAlternativas(p: Problema, paso: Paso): Celda[] {
  if (paso.tipo !== 'optimo' || !paso.marginales || prohibidasUsadas(p, paso.x).length > 0) return [];
  return paso.marginales.flatMap((fila, i) =>
    fila.flatMap((v, j) => (v !== null && !paso.basica[i][j] && Math.abs(v) <= EPS ? [{ i, j }] : [])),
  );
}

/** Costos marginales de todas las celdas vacías de una base, calculados con sus caminos cerrados. */
function marginalesDe(p: Problema, basica: boolean[][]): (number | null)[][] {
  return basica.map((fila, i) =>
    fila.map((b, j) => {
      if (b) return null;
      const ciclo = buscarCiclo(basica, { i, j });
      return ciclo ? costoMarginal(p, ciclo) : null;
    }),
  );
}

export function mismaSolucion(a: number[][], b: number[][]): boolean {
  return a.every((fila, i) => fila.every((v, j) => Math.abs(v - b[i][j]) <= EPS));
}

/**
 * Hace entrar a la base una celda de marginal 0 de un paso óptimo y devuelve el paso óptimo
 * resultante. El total no cambia, y los demás marginales tampoco: la celda que sale queda con
 * marginal 0, así que siempre se puede volver.
 */
export function pasarAOptimoAlternativo(p: Problema, paso: Paso, entrada: Celda): Paso {
  const ciclo = buscarCiclo(paso.basica, entrada);
  if (!ciclo || paso.basica[entrada.i][entrada.j]) throw new Error('La celda no puede entrar a la base');
  const x = copiar(paso.x);
  const basica = copiar(paso.basica);
  const negativas = ciclo.filter((_, k) => k % 2 === 1);
  const theta = Math.min(...negativas.map((c) => x[c.i][c.j]));
  const sale = negativas.find((c) => x[c.i][c.j] - theta <= EPS)!;
  ciclo.forEach((c, k) => {
    const nuevo = x[c.i][c.j] + (k % 2 === 0 ? theta : -theta);
    x[c.i][c.j] = Math.abs(nuevo) <= EPS ? 0 : nuevo;
  });
  basica[entrada.i][entrada.j] = true;
  basica[sale.i][sale.j] = false;

  const pot = paso.u && paso.v ? calcularPotenciales(p, basica) : null;
  const marginales = pot ? marginalesModi(p, basica, pot) : marginalesDe(p, basica);
  const palabra = palabraTotal(p);
  const nombre = nombreCelda(p, entrada);
  const recorrido = [...ciclo, ciclo[0]].map((c) => nombreCelda(p, c)).join(' → ');
  const ceros = marginales.flatMap((fila, i) =>
    fila.flatMap((v, j) => (v !== null && Math.abs(v) <= EPS ? [nombreCelda(p, { i, j })] : [])),
  );

  const explicacion =
    theta <= EPS
      ? `Entra ${nombre} por el camino cerrado ${recorrido}, pero θ = 0: ninguna cantidad se mueve. ` +
        `Sale de la base ${nombreCelda(p, sale)}. Es la misma solución descrita con otra base (degeneración): no es un óptimo distinto.`
      : `Entra ${nombre} por el camino cerrado ${recorrido}. Como su costo marginal es 0, mover θ = ${fmt(theta)} unidades ` +
        `no cambia el ${palabra}: sigue siendo ${fmtTotal(p, x)}. Sale de la base ${nombreCelda(p, sale)}. ` +
        `También es óptimo mover cualquier cantidad entre 0 y ${fmt(theta)}: hay infinitas soluciones óptimas, todas mezclas de estas dos. ` +
        `Los demás costos marginales no cambian y ${nombreCelda(p, sale)} queda con marginal 0, así que se puede volver por el mismo camino.` +
        (ceros.length > 0 ? ` Celdas con marginal 0 en esta base: ${ceros.join(', ')}.` : '');

  return {
    tipo: 'optimo',
    titulo: theta <= EPS ? 'La misma solución, con otra base' : `Otra solución óptima: ${palabra} ${fmtTotal(p, x)}`,
    explicacion,
    x,
    basica,
    marginales,
    celda: entrada,
    theta,
    sale,
    ...(pot ? { u: pot.u, v: pot.v } : {}),
    costoTotal: total(p, x),
  };
}
