import type { Celda, Linea, Problema } from './tipos';

/** Un potencial despejado: de qué línea es, cuánto vale y con qué celda básica se obtuvo. */
export interface Despeje {
  linea: Linea;
  valor: number;
  /** Celda básica usada para despejarlo; null si el valor se fijó en 0 como punto de partida. */
  celda: Celda | null;
}

export interface Potenciales {
  /** Potencial de cada fila. */
  u: number[];
  /** Potencial de cada columna. */
  v: number[];
  /** Orden en que se obtuvieron, para poder explicarlo paso a paso. */
  orden: Despeje[];
}

/**
 * Potenciales del método MODI: números u (filas) y v (columnas) tales que u + v = costo en
 * cada celda básica. Se fija u = 0 en la primera fila y el resto se despeja recorriendo
 * las celdas básicas. Con m + n − 1 básicas sin ciclos, la solución es única.
 */
export function calcularPotenciales(p: Problema, basica: boolean[][]): Potenciales {
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const u = Array<number | null>(m).fill(null);
  const v = Array<number | null>(n).fill(null);
  const orden: Despeje[] = [];

  for (let inicio = 0; inicio < m; inicio++) {
    // Con una base completa solo se entra aquí una vez; si la base estuviera partida,
    // cada grupo de celdas básicas recibe su propio punto de partida.
    if (u[inicio] !== null) continue;
    u[inicio] = 0;
    orden.push({ linea: { tipo: 'fila', k: inicio }, valor: 0, celda: null });
    const cola: Linea[] = [{ tipo: 'fila', k: inicio }];
    while (cola.length > 0) {
      const { tipo, k } = cola.shift()!;
      if (tipo === 'fila') {
        for (let j = 0; j < n; j++) {
          if (!basica[k][j] || v[j] !== null) continue;
          v[j] = p.costos[k][j] - u[k]!;
          orden.push({ linea: { tipo: 'columna', k: j }, valor: v[j]!, celda: { i: k, j } });
          cola.push({ tipo: 'columna', k: j });
        }
      } else {
        for (let i = 0; i < m; i++) {
          if (!basica[i][k] || u[i] !== null) continue;
          u[i] = p.costos[i][k] - v[k]!;
          orden.push({ linea: { tipo: 'fila', k: i }, valor: u[i]!, celda: { i, j: k } });
          cola.push({ tipo: 'fila', k: i });
        }
      }
    }
  }

  return { u: u.map((x) => x ?? 0), v: v.map((x) => x ?? 0), orden };
}

/** Costo marginal de cada celda vacía según MODI: costo − u − v. Las básicas quedan en null. */
export function marginalesModi(p: Problema, basica: boolean[][], pot: Potenciales): (number | null)[][] {
  return p.costos.map((fila, i) => fila.map((c, j) => (basica[i][j] ? null : c - pot.u[i] - pot.v[j])));
}
