import type { Celda, Problema } from './tipos';

export const EPS = 1e-9;

export function matriz<T>(m: number, n: number, valor: T): T[][] {
  return Array.from({ length: m }, () => Array<T>(n).fill(valor));
}

export function copiar<T>(a: T[][]): T[][] {
  return a.map((fila) => [...fila]);
}

export function costoTotal(costos: number[][], x: number[][]): number {
  let total = 0;
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < x[i].length; j++) total += costos[i][j] * x[i][j];
  }
  return total;
}

export function suma(v: number[]): number {
  return v.reduce((a, b) => a + b, 0);
}

/** Formatea un número con hasta dos decimales. */
export function fmt(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function nombreCelda(p: Problema, c: Celda): string {
  return `(${p.origenes[c.i]}, ${p.destinos[c.j]})`;
}

/** Devuelve el elemento con la clave lexicográficamente menor; ante empate total, el primero. */
export function elegirMejor<T>(lista: T[], clave: (e: T) => number[]): T {
  let mejor = lista[0];
  let mejorClave = clave(mejor);
  for (const e of lista.slice(1)) {
    const k = clave(e);
    for (let t = 0; t < k.length; t++) {
      if (k[t] < mejorClave[t] - EPS) {
        mejor = e;
        mejorClave = k;
        break;
      }
      if (k[t] > mejorClave[t] + EPS) break;
    }
  }
  return mejor;
}

/** Desglose Σ c·x de las celdas con asignación positiva. */
export function desgloseCosto(p: Problema, x: number[][]): string {
  const terminos: string[] = [];
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < x[i].length; j++) {
      if (x[i][j] > EPS) terminos.push(`${fmt(p.costos[i][j])}·${fmt(x[i][j])}`);
    }
  }
  return `${terminos.join(' + ')} = ${fmt(costoTotal(p.costos, x))}`;
}
