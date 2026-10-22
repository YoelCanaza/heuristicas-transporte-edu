import type { Celda, Paso, Problema, Solucion } from './tipos';
import { EPS, copiar, costoTotal, desgloseCosto, fmt, matriz, nombreCelda } from './util';

/**
 * Si hay menos de m+n−1 celdas básicas, agrega celdas ε (x = 0) de menor costo que unan
 * componentes distintas del grafo filas–columnas, sin formar ciclos. Modifica `sol`.
 */
export function completarBase(p: Problema, sol: Solucion): Celda[] {
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const padre = Array.from({ length: m + n }, (_, k) => k);
  const raiz = (k: number): number => (padre[k] === k ? k : (padre[k] = raiz(padre[k])));

  let basicas = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (sol.basica[i][j]) {
        padre[raiz(i)] = raiz(m + j);
        basicas++;
      }
    }
  }

  const agregadas: Celda[] = [];
  while (basicas < m + n - 1) {
    let mejor: Celda | null = null;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (sol.basica[i][j] || raiz(i) === raiz(m + j)) continue;
        if (!mejor || p.costos[i][j] < p.costos[mejor.i][mejor.j]) mejor = { i, j };
      }
    }
    if (!mejor) break;
    sol.basica[mejor.i][mejor.j] = true;
    sol.x[mejor.i][mejor.j] = 0;
    padre[raiz(mejor.i)] = raiz(m + mejor.j);
    agregadas.push(mejor);
    basicas++;
  }
  return agregadas;
}

/**
 * Camino cerrado de una celda no básica: la celda más el único camino, en el árbol de
 * celdas básicas, que une su fila con su columna. Los signos alternan desde + en la entrada.
 */
export function buscarCiclo(basica: boolean[][], entrada: Celda): Celda[] | null {
  const m = basica.length;
  const n = basica[0].length;
  // Nodos: filas 0..m−1, columnas m..m+n−1; cada celda básica es una arista.
  const inicio = m + entrada.j;
  const meta = entrada.i;
  const previo = new Map<number, { nodo: number; celda: Celda }>([[inicio, { nodo: -1, celda: entrada }]]);
  const cola = [inicio];
  while (cola.length > 0 && !previo.has(meta)) {
    const u = cola.shift()!;
    const vecinos: { v: number; celda: Celda }[] = [];
    if (u < m) {
      for (let j = 0; j < n; j++) if (basica[u][j]) vecinos.push({ v: m + j, celda: { i: u, j } });
    } else {
      for (let i = 0; i < m; i++) if (basica[i][u - m]) vecinos.push({ v: i, celda: { i, j: u - m } });
    }
    for (const { v, celda } of vecinos) {
      if (previo.has(v)) continue;
      previo.set(v, { nodo: u, celda });
      cola.push(v);
    }
  }
  if (!previo.has(meta)) return null;

  const ciclo = [entrada];
  for (let v = meta; v !== inicio; ) {
    const { nodo, celda } = previo.get(v)!;
    ciclo.push(celda);
    v = nodo;
  }
  return ciclo;
}

export function costoMarginal(p: Problema, ciclo: Celda[]): number {
  return ciclo.reduce((t, c, k) => t + (k % 2 === 0 ? 1 : -1) * p.costos[c.i][c.j], 0);
}

function expresionMarginal(p: Problema, ciclo: Celda[]): string {
  return ciclo
    .map((c, k) => `${k === 0 ? '' : k % 2 === 0 ? ' + ' : ' − '}${fmt(p.costos[c.i][c.j])}`)
    .join('');
}

function ruta(p: Problema, ciclo: Celda[]): string {
  return [...ciclo, ciclo[0]].map((c) => nombreCelda(p, c)).join(' → ');
}

export interface OpcionesOptimizacion {
  /** Registrar un paso por cada celda vacía evaluada. */
  detallado?: boolean;
  maxIteraciones?: number;
}

export interface ResultadoOptimizacion {
  pasos: Paso[];
  solucion: Solucion;
  costo: number;
  iteraciones: number;
}

export function optimizar(p: Problema, inicial: Solucion, opciones: OpcionesOptimizacion = {}): ResultadoOptimizacion {
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const { detallado = false, maxIteraciones = 50 * (m + n) } = opciones;
  const sol: Solucion = { x: copiar(inicial.x), basica: copiar(inicial.basica) };
  const pasos: Paso[] = [];
  const foto = (parcial: Omit<Paso, 'x' | 'basica' | 'costoTotal'>): Paso => ({
    x: copiar(sol.x),
    basica: copiar(sol.basica),
    costoTotal: costoTotal(p.costos, sol.x),
    ...parcial,
  });

  pasos.push(
    foto({
      tipo: 'inicio',
      titulo: 'Camino de las Piedras',
      explicacion:
        `Se parte de la solución inicial (costo ${fmt(costoTotal(p.costos, sol.x))}). ` +
        'Para cada celda vacía se forma un camino cerrado que salta solo por celdas básicas, ' +
        'alternando signos + y −. La suma de costos con esos signos es el costo marginal: ' +
        'cuánto cambiaría el costo total por cada unidad enviada por esa celda.',
    }),
  );

  const agregadas = completarBase(p, sol);
  if (agregadas.length > 0) {
    pasos.push(
      foto({
        tipo: 'degeneracion',
        titulo: 'Solución degenerada: se agrega ε',
        explicacion:
          `La solución tiene menos de m + n − 1 = ${m + n - 1} celdas básicas, por lo que algunos caminos no se podrían cerrar. ` +
          `Se agrega ε (asignación 0) en ${agregadas.map((c) => nombreCelda(p, c)).join(', ')}.`,
        celda: agregadas[0],
      }),
    );
  }

  let iteraciones = 0;
  for (;;) {
    const marginales = matriz<number | null>(m, n, null);
    const ciclos = matriz<Celda[] | null>(m, n, null);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (sol.basica[i][j]) continue;
        const ciclo = buscarCiclo(sol.basica, { i, j });
        if (!ciclo) continue;
        const valor = costoMarginal(p, ciclo);
        marginales[i][j] = valor;
        ciclos[i][j] = ciclo;
        if (detallado) {
          pasos.push(
            foto({
              tipo: 'evaluacion',
              titulo: `Evaluar ${nombreCelda(p, { i, j })}`,
              explicacion:
                `Camino cerrado: ${ruta(p, ciclo)}. ` +
                `Costo marginal = ${expresionMarginal(p, ciclo)} = ${fmt(valor)}. ` +
                (valor < -EPS
                  ? 'Es negativo: enviar por esta celda reduciría el costo.'
                  : 'No es negativo: usar esta celda no mejora la solución.'),
              celda: { i, j },
              ciclo,
              marginales: copiar(marginales),
            }),
          );
        }
      }
    }

    let entrada: { i: number; j: number } | null = null;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        const v = marginales[i][j];
        if (v !== null && v < -EPS && (!entrada || v < marginales[entrada.i][entrada.j]! - EPS)) entrada = { i, j };
      }
    }

    if (!entrada || iteraciones >= maxIteraciones) {
      const ceros = marginales.flatMap((fila, i) =>
        fila.flatMap((v, j) => (v !== null && Math.abs(v) <= EPS ? [nombreCelda(p, { i, j })] : [])),
      );
      pasos.push(
        foto({
          tipo: 'optimo',
          titulo: `Solución óptima: costo ${fmt(costoTotal(p.costos, sol.x))}`,
          explicacion:
            (entrada
              ? `Se alcanzó el límite de ${maxIteraciones} iteraciones. `
              : 'Todos los costos marginales son mayores o iguales a 0: ninguna celda vacía puede reducir el costo. ') +
            `Costo total = ${desgloseCosto(p, sol.x)}.` +
            (ceros.length > 0
              ? ` Las celdas ${ceros.join(', ')} tienen marginal 0: existen soluciones óptimas alternativas.`
              : ''),
          marginales,
        }),
      );
      break;
    }

    iteraciones++;
    const ciclo = ciclos[entrada.i][entrada.j]!;
    const marginal = marginales[entrada.i][entrada.j]!;
    const negativas = ciclo.filter((_, k) => k % 2 === 1);
    const theta = Math.min(...negativas.map((c) => sol.x[c.i][c.j]));
    const costoAntes = costoTotal(p.costos, sol.x);

    pasos.push(
      foto({
        tipo: 'ciclo',
        titulo: `Iteración ${iteraciones}: entra ${nombreCelda(p, entrada)}`,
        explicacion:
          `La celda ${nombreCelda(p, entrada)} tiene el costo marginal más negativo (${fmt(marginal)}). ` +
          `θ es el menor valor entre las celdas con signo −: min(${negativas.map((c) => fmt(sol.x[c.i][c.j])).join(', ')}) = ${fmt(theta)}. ` +
          'Se suma θ en las celdas + y se resta en las celdas −; así se conservan ofertas y demandas.',
        celda: entrada,
        ciclo,
        marginales,
      }),
    );

    ciclo.forEach((c, k) => {
      const nuevo = sol.x[c.i][c.j] + (k % 2 === 0 ? theta : -theta);
      sol.x[c.i][c.j] = Math.abs(nuevo) <= EPS ? 0 : nuevo;
    });
    sol.basica[entrada.i][entrada.j] = true;
    const salida = negativas.find((c) => sol.x[c.i][c.j] === 0)!;
    sol.basica[salida.i][salida.j] = false;

    pasos.push(
      foto({
        tipo: 'pivoteo',
        titulo: `Nueva solución: costo ${fmt(costoTotal(p.costos, sol.x))}`,
        explicacion:
          `Sale de la base ${nombreCelda(p, salida)}, que quedó en 0. ` +
          `Nuevo costo = ${fmt(costoAntes)} + θ·marginal = ${fmt(costoAntes)} + ${fmt(theta)}·(${fmt(marginal)}) = ${fmt(costoTotal(p.costos, sol.x))}.` +
          (theta === 0 ? ' Como θ = 0 (degeneración), el costo no cambia, pero la base sí.' : ''),
        celda: entrada,
      }),
    );
  }

  return { pasos, solucion: sol, costo: costoTotal(p.costos, sol.x), iteraciones };
}
