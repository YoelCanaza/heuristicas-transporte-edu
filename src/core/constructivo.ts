import type { Celda, Paso, Problema, Solucion } from './tipos';
import { EPS, copiar, costoTotal, fmt, matriz, nombreCelda } from './util';

export interface EstadoConstruccion {
  costos: number[][];
  oferta: number[];
  demanda: number[];
  filaTachada: boolean[];
  columnaTachada: boolean[];
}

export interface Seleccion {
  celda: Celda;
  /** Por qué se eligió la celda. */
  motivo: string;
  /** Análisis previo a la elección (p. ej. penalizaciones de Vogel); genera un paso propio. */
  analisis?: {
    explicacion: string;
    penalFila?: (number | null)[];
    penalColumna?: (number | null)[];
  };
}

/** Regla que decide la siguiente celda: lo único que distingue a una heurística constructiva de otra. */
export type Selector = (e: EstadoConstruccion, p: Problema) => Seleccion;

export function filasActivas(e: EstadoConstruccion): number[] {
  return e.filaTachada.flatMap((t, i) => (t ? [] : [i]));
}

export function columnasActivas(e: EstadoConstruccion): number[] {
  return e.columnaTachada.flatMap((t, j) => (t ? [] : [j]));
}

/** Celdas cuya fila y columna siguen sin tachar, en orden fila-columna. */
export function celdasDisponibles(e: EstadoConstruccion): Celda[] {
  const cols = columnasActivas(e);
  return filasActivas(e).flatMap((i) => cols.map((j) => ({ i, j })));
}

export function cantidadAsignable(e: EstadoConstruccion, c: Celda): number {
  return Math.min(e.oferta[c.i], e.demanda[c.j]);
}

/** Construye una solución básica factible (m+n−1 básicas) usando el selector dado. */
export function construir(p: Problema, selector: Selector): { solucion: Solucion; pasos: Paso[] } {
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const x = matriz(m, n, 0);
  const basica = matriz(m, n, false);
  const e: EstadoConstruccion = {
    costos: p.costos,
    oferta: [...p.ofertas],
    demanda: [...p.demandas],
    filaTachada: Array(m).fill(false),
    columnaTachada: Array(n).fill(false),
  };
  const pasos: Paso[] = [];
  const foto = (parcial: Omit<Paso, 'x' | 'basica' | 'costoTotal'>): Paso => ({
    x: copiar(x),
    basica: copiar(basica),
    ofertaRestante: [...e.oferta],
    demandaRestante: [...e.demanda],
    filaTachada: [...e.filaTachada],
    columnaTachada: [...e.columnaTachada],
    costoTotal: costoTotal(p.costos, x),
    ...parcial,
  });

  while (filasActivas(e).length > 0 && columnasActivas(e).length > 0) {
    const sel = selector(e, p);
    if (sel.analisis) {
      pasos.push(
        foto({
          tipo: 'penalizaciones',
          titulo: 'Análisis de la iteración',
          explicacion: sel.analisis.explicacion,
          penalFila: sel.analisis.penalFila,
          penalColumna: sel.analisis.penalColumna,
        }),
      );
    }

    const { i, j } = sel.celda;
    const s = e.oferta[i];
    const d = e.demanda[j];
    const q = Math.min(s, d);
    x[i][j] = q;
    basica[i][j] = true;
    e.oferta[i] = s - q <= EPS ? 0 : s - q;
    e.demanda[j] = d - q <= EPS ? 0 : d - q;

    const origen = p.origenes[i];
    const destino = p.destinos[j];
    const ultimaFila = filasActivas(e).length === 1;
    const ultimaColumna = columnasActivas(e).length === 1;
    let tachado: string;
    if (e.oferta[i] === 0 && e.demanda[j] === 0) {
      if (ultimaFila && ultimaColumna) {
        e.filaTachada[i] = true;
        e.columnaTachada[j] = true;
        tachado = 'Se agotan la oferta y la demanda restantes: la construcción termina.';
      } else if (!ultimaFila) {
        e.filaTachada[i] = true;
        tachado =
          `La oferta de ${origen} y la demanda de ${destino} se agotan a la vez (degeneración). ` +
          `Solo se tacha la fila ${origen}; la columna ${destino} queda con demanda 0 y recibirá ` +
          'una asignación de 0 (ε) para conservar m+n−1 celdas básicas.';
      } else {
        e.columnaTachada[j] = true;
        tachado =
          `La oferta de ${origen} y la demanda de ${destino} se agotan a la vez (degeneración). ` +
          `Como ${origen} es la última fila, solo se tacha la columna ${destino}; ` +
          'las celdas que falten recibirán 0 (ε).';
      }
    } else if (e.oferta[i] === 0) {
      e.filaTachada[i] = true;
      tachado = `Se agota la oferta de ${origen}: se tacha su fila.`;
    } else {
      e.columnaTachada[j] = true;
      tachado = `Se satisface la demanda de ${destino}: se tacha su columna.`;
    }

    pasos.push(
      foto({
        tipo: 'asignacion',
        titulo: `Asignar ${fmt(q)} a ${nombreCelda(p, sel.celda)}`,
        explicacion: `${sel.motivo} Se asigna min(oferta ${fmt(s)}, demanda ${fmt(d)}) = ${fmt(q)}. ${tachado}`,
        celda: sel.celda,
      }),
    );
  }

  return { solucion: { x, basica }, pasos };
}
