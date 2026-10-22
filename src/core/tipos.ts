export interface Problema {
  ofertas: number[];
  demandas: number[];
  costos: number[][];
  origenes: string[];
  destinos: string[];
}

export interface Celda {
  i: number;
  j: number;
}

export interface Solucion {
  x: number[][];
  /** Celdas básicas; una básica con x = 0 representa ε (degeneración). */
  basica: boolean[][];
}

export type TipoPaso =
  | 'inicio'
  | 'balanceo'
  | 'penalizaciones'
  | 'asignacion'
  | 'fin'
  | 'degeneracion'
  | 'evaluacion'
  | 'ciclo'
  | 'pivoteo'
  | 'optimo';

/** Fotografía del estado del algoritmo en un instante, con su explicación didáctica. */
export interface Paso {
  tipo: TipoPaso;
  titulo: string;
  explicacion: string;
  x: number[][];
  basica: boolean[][];
  ofertaRestante?: number[];
  demandaRestante?: number[];
  filaTachada?: boolean[];
  columnaTachada?: boolean[];
  penalFila?: (number | null)[];
  penalColumna?: (number | null)[];
  /** Celda protagonista del paso (asignada, evaluada o que entra a la base). */
  celda?: Celda;
  /** Camino cerrado; los signos alternan +, −, +, … empezando por ciclo[0]. */
  ciclo?: Celda[];
  marginales?: (number | null)[][];
  costoTotal: number;
}

export interface Resultado {
  /** Problema ya balanceado sobre el que se trabajó. */
  problema: Problema;
  pasos: Paso[];
  solucion: Solucion;
  costo: number;
}
