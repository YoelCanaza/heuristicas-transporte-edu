export interface Problema {
  ofertas: number[];
  demandas: number[];
  costos: number[][];
  origenes: string[];
  destinos: string[];
  /** Rutas por las que no se puede enviar; ausente si todas están permitidas. */
  prohibidas?: boolean[][];
  /** 'max' si los valores de `costos` son utilidades que se quieren maximizar. Por omisión, 'min'. */
  objetivo?: 'min' | 'max';
  /** Solo en el problema convertido: utilidades originales (`costos` contiene costos de oportunidad). */
  utilidades?: number[][];
  /** Solo en el problema convertido: valor del costo M asignado a las rutas prohibidas. */
  M?: number;
}

export interface Celda {
  i: number;
  j: number;
}

/** Fila o columna de la tabla. */
export interface Linea {
  tipo: 'fila' | 'columna';
  k: number;
}

export interface Solucion {
  x: number[][];
  /** Celdas básicas; una básica con x = 0 representa ε (degeneración). */
  basica: boolean[][];
}

export type TipoPaso =
  | 'inicio'
  | 'balanceo'
  | 'conversion'
  | 'penalizaciones'
  | 'asignacion'
  | 'fin'
  | 'degeneracion'
  | 'evaluacion'
  | 'ciclo'
  | 'pivoteo'
  | 'optimo'
  | 'limite';

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
  /** Fila o columna elegida en el análisis (p. ej. la de mayor penalización en Vogel). */
  lineaElegida?: Linea;
  /** Puntaje de cada celda disponible según la heurística del usuario (menor es mejor). */
  puntajes?: (number | null)[][];
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
