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

export type Familia = 'uniforme' | 'geografico' | 'desbalanceado' | 'degenerado';
export type Tamano = 'pequeno' | 'mediano' | 'grande';

export const ETIQUETA_FAMILIA: Record<Familia, { titulo: string; ayuda: string }> = {
  uniforme: {
    titulo: 'Costos al azar',
    ayuda: 'Cada costo es un número al azar entre 1 y 20, sin relación entre rutas.',
  },
  geografico: {
    titulo: 'Costos geográficos',
    ayuda: 'Orígenes y destinos son puntos en un mapa y el costo depende de la distancia, como en un caso real.',
  },
  desbalanceado: {
    titulo: 'Desbalanceados',
    ayuda: 'La oferta total y la demanda total no coinciden: aparece una fila o columna ficticia de costo 0.',
  },
  degenerado: {
    titulo: 'Con muchos empates',
    ayuda: 'Ofertas y demandas en múltiplos de 10 y pocos costos distintos: abundan los empates y la degeneración.',
  },
};

export const ETIQUETA_TAMANO: Record<Tamano, string> = {
  pequeno: 'Pequeños (3–4 por lado)',
  mediano: 'Medianos (5–6 por lado)',
  grande: 'Grandes (7–8 por lado)',
};

const LADO: Record<Tamano, [number, number]> = { pequeno: [3, 4], mediano: [5, 6], grande: [7, 8] };

export interface OpcionesGenerador {
  m?: number;
  n?: number;
  costoMax?: number;
  familia?: Familia;
  /** Sin tamaño se usa el rango histórico: 3–5 orígenes y 3–6 destinos. */
  tamano?: Tamano;
}

/** Problema aleatorio de la familia pedida. Con la misma secuencia `rand` se obtiene siempre el mismo. */
export function generarProblema(rand: () => number, opciones: OpcionesGenerador = {}): Problema {
  const entero = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const familia = opciones.familia ?? 'uniforme';
  const [ladoMin, ladoMax] = opciones.tamano ? LADO[opciones.tamano] : [3, 5];
  const m = opciones.m ?? entero(ladoMin, ladoMax);
  const n = opciones.n ?? entero(ladoMin, opciones.tamano ? ladoMax : 6);
  const costoMax = opciones.costoMax ?? (familia === 'degenerado' ? 6 : 20);

  // Reparte `total` unidades en `partes` cantidades positivas mediante cortes aleatorios.
  const repartir = (total: number, partes: number): number[] => {
    const cortes = new Set<number>();
    while (cortes.size < partes - 1) cortes.add(entero(1, total - 1));
    const puntos = [0, ...[...cortes].sort((a, b) => a - b), total];
    return puntos.slice(1).map((v, t) => v - puntos[t]);
  };

  let ofertas: number[];
  let demandas: number[];
  if (familia === 'degenerado') {
    const decenas = Array.from({ length: m }, () => entero(1, 4));
    const faltan = n - decenas.reduce((a, b) => a + b, 0);
    if (faltan > 0) decenas[0] += faltan;
    ofertas = decenas.map((d) => d * 10);
    demandas = repartir(
      decenas.reduce((a, b) => a + b, 0),
      n,
    ).map((d) => d * 10);
  } else if (familia === 'desbalanceado') {
    ofertas = Array.from({ length: m }, () => entero(10, 50));
    demandas = Array.from({ length: n }, () => entero(10, 50));
    if (ofertas.reduce((a, b) => a + b, 0) === demandas.reduce((a, b) => a + b, 0)) ofertas[0] += 5;
  } else {
    ofertas = Array.from({ length: m }, () => entero(10, 50));
    demandas = repartir(
      ofertas.reduce((a, b) => a + b, 0),
      n,
    );
  }

  let costos: number[][];
  if (familia === 'geografico') {
    const punto = () => ({ x: rand() * 100, y: rand() * 100 });
    const origenes = Array.from({ length: m }, punto);
    const destinos = Array.from({ length: n }, punto);
    costos = origenes.map((o) => destinos.map((d) => 1 + Math.round(Math.hypot(o.x - d.x, o.y - d.y) / 5)));
  } else {
    costos = Array.from({ length: m }, () => Array.from({ length: n }, () => entero(1, costoMax)));
  }

  return { ofertas, demandas, costos, origenes: nombres('O', m), destinos: nombres('D', n) };
}
