import type { Problema } from './tipos';

export function nombres(prefijo: string, k: number): string[] {
  return Array.from({ length: k }, (_, t) => `${prefijo}${t + 1}`);
}

/** Taha, Investigación de Operaciones, ejemplo de SunRay Transport (cap. 5). */
export const EJEMPLO_TAHA: Problema = {
  ofertas: [15, 25, 10],
  demandas: [5, 15, 15, 15],
  costos: [
    [10, 2, 20, 11],
    [12, 7, 9, 20],
    [4, 14, 16, 18],
  ],
  origenes: nombres('O', 3),
  destinos: nombres('D', 4),
};

/** Generador pseudoaleatorio reproducible (mulberry32). */
export function crearAleatorio(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface OpcionesGenerador {
  m?: number;
  n?: number;
  costoMax?: number;
}

/** Problema balanceado aleatorio: costos 1..costoMax, ofertas 10..50 y demandas que suman lo mismo. */
export function generarProblema(rand: () => number, opciones: OpcionesGenerador = {}): Problema {
  const entero = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const m = opciones.m ?? entero(3, 5);
  const n = opciones.n ?? entero(3, 6);
  const costoMax = opciones.costoMax ?? 20;
  const ofertas = Array.from({ length: m }, () => entero(10, 50));
  const total = ofertas.reduce((a, b) => a + b, 0);

  // Reparte el total en n demandas positivas mediante cortes aleatorios.
  const cortes = new Set<number>();
  while (cortes.size < n - 1) cortes.add(entero(1, total - 1));
  const puntos = [0, ...[...cortes].sort((a, b) => a - b), total];
  const demandas = puntos.slice(1).map((v, t) => v - puntos[t]);

  return {
    ofertas,
    demandas,
    costos: Array.from({ length: m }, () => Array.from({ length: n }, () => entero(1, costoMax))),
    origenes: nombres('O', m),
    destinos: nombres('D', n),
  };
}
