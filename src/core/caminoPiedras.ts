import { calcularPotenciales } from './modi';
import type { Potenciales } from './modi';
import type { Celda, Paso, Problema, Solucion } from './tipos';
import {
  EPS,
  copiar,
  desgloseCosto,
  fmt,
  fmtCosto,
  fmtTotal,
  matriz,
  nombreCelda,
  palabraTotal,
  prohibidasUsadas,
  total,
} from './util';

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
  for (let v = meta; v !== inicio;) {
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
    .map((c, k) => `${k === 0 ? '' : k % 2 === 0 ? ' + ' : ' − '}${fmtCosto(p, p.costos[c.i][c.j])}`)
    .join('');
}

function ruta(p: Problema, ciclo: Celda[]): string {
  return [...ciclo, ciclo[0]].map((c) => nombreCelda(p, c)).join(' → ');
}

/** Forma de calcular los costos marginales: un camino cerrado por celda (piedras) o potenciales u-v (MODI). */
export type Optimizador = 'piedras' | 'modi';

export const NOMBRE_OPTIMIZADOR: Record<Optimizador, string> = {
  piedras: 'Camino de las Piedras',
  modi: 'MODI (u-v)',
};

/** Escribe un valor que se resta; los negativos van entre paréntesis: "8 − (−2)". */
function restado(p: Problema, v: number): string {
  const texto = fmtCosto(p, v).replace(/^-/, '−');
  return v < -EPS ? `(${texto})` : texto;
}

function nombrePotencial(p: Problema, tipo: 'fila' | 'columna', k: number): string {
  return tipo === 'fila' ? `u(${p.origenes[k]})` : `v(${p.destinos[k]})`;
}

/** Explica, en el orden en que se despejaron, cómo se obtuvo cada potencial. */
function explicarPotenciales(p: Problema, pot: Potenciales): string {
  return pot.orden
    .map(({ linea, valor, celda }) => {
      const nombre = nombrePotencial(p, linea.tipo, linea.k);
      if (!celda) return `${nombre} = 0`;
      const conocido = linea.tipo === 'fila' ? pot.v[celda.j] : pot.u[celda.i];
      return `${nombre} = ${fmtCosto(p, p.costos[celda.i][celda.j])} − ${restado(p, conocido)} = ${fmtCosto(p, valor)}`;
    })
    .join('; ');
}

export interface OpcionesOptimizacion {
  /** Cómo se calculan los costos marginales. Por omisión, 'piedras'. */
  metodo?: Optimizador;
  /** Registrar un paso por cada celda vacía evaluada. */
  detallado?: boolean;
  maxIteraciones?: number;
}

export interface ResultadoOptimizacion {
  pasos: Paso[];
  solucion: Solucion;
  costo: number;
  iteraciones: number;
  /** false si se detuvo por el límite de iteraciones sin confirmar la optimalidad. */
  optimo: boolean;
}

export function optimizar(p: Problema, inicial: Solucion, opciones: OpcionesOptimizacion = {}): ResultadoOptimizacion {
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const { metodo = 'piedras', detallado = false, maxIteraciones = 50 * (m + n) } = opciones;
  const modi = metodo === 'modi';
  const sol: Solucion = { x: copiar(inicial.x), basica: copiar(inicial.basica) };
  const pasos: Paso[] = [];
  const palabra = palabraTotal(p);
  const foto = (parcial: Omit<Paso, 'x' | 'basica' | 'costoTotal'>): Paso => ({
    x: copiar(sol.x),
    basica: copiar(sol.basica),
    costoTotal: total(p, sol.x),
    ...parcial,
  });

  pasos.push(
    foto({
      tipo: 'inicio',
      titulo: modi ? 'Método MODI (u-v)' : 'Camino de las Piedras',
      explicacion:
        `Se parte de la solución inicial (${palabra} ${fmtTotal(p, sol.x)}). ` +
        (modi
          ? 'MODI calcula un número u para cada fila y un número v para cada columna, de modo que u + v sea igual al costo en cada celda básica. ' +
            'Con ellos, el costo marginal de una celda vacía es costo − u − v: cuánto cambiaría el costo total por cada unidad enviada por esa celda. ' +
            'Da el mismo resultado que el Camino de las Piedras, pero solo hay que trazar un camino cerrado: el de la celda que entra.'
          : 'Para cada celda vacía se forma un camino cerrado que salta solo por celdas básicas, ' +
            'alternando signos + y −. La suma de costos con esos signos es el costo marginal: ' +
            'cuánto cambiaría el costo total por cada unidad enviada por esa celda.'),
    }),
  );

  const agregadas = completarBase(p, sol);
  if (agregadas.length > 0) {
    pasos.push(
      foto({
        tipo: 'degeneracion',
        titulo: 'Solución degenerada: se agrega ε',
        explicacion:
          `La solución tiene menos de m + n − 1 = ${m + n - 1} celdas básicas, por lo que ` +
          (modi ? 'no se podrían despejar todos los valores u y v. ' : 'algunos caminos no se podrían cerrar. ') +
          `Se agrega ε (asignación 0) en ${agregadas.map((c) => nombreCelda(p, c)).join(', ')}.`,
        celda: agregadas[0],
      }),
    );
  }

  let iteraciones = 0;
  let optimo = false;
  for (;;) {
    const marginales = matriz<number | null>(m, n, null);
    const ciclos = matriz<Celda[] | null>(m, n, null);
    const pot = modi ? calcularPotenciales(p, sol.basica) : null;
    // En MODI, los pasos de la iteración llevan u y v para que la tabla los muestre.
    const uv = pot ? { u: pot.u, v: pot.v } : {};
    if (pot) {
      pasos.push(
        foto({
          tipo: 'potenciales',
          titulo: `Calcular u y v${iteraciones > 0 ? ' de la nueva solución' : ''}`,
          explicacion:
            'En cada celda básica se cumple u + v = costo. Se fija un valor en 0 y los demás se despejan ' +
            `saltando de una celda básica a otra: ${explicarPotenciales(p, pot)}. ` +
            'Con estos valores, el costo marginal de cada celda vacía es costo − u − v.',
          ...uv,
        }),
      );
    }
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (sol.basica[i][j]) continue;
        if (pot) {
          const valor = p.costos[i][j] - pot.u[i] - pot.v[j];
          marginales[i][j] = valor;
          if (detallado) {
            pasos.push(
              foto({
                tipo: 'evaluacion',
                titulo: `Evaluar ${nombreCelda(p, { i, j })}`,
                explicacion:
                  `Costo marginal = costo − ${nombrePotencial(p, 'fila', i)} − ${nombrePotencial(p, 'columna', j)} = ` +
                  `${fmtCosto(p, p.costos[i][j])} − ${restado(p, pot.u[i])} − ${restado(p, pot.v[j])} = ${fmtCosto(p, valor)}. ` +
                  (valor < -EPS
                    ? 'Es negativo: enviar por esta celda reduciría el costo.'
                    : 'No es negativo: usar esta celda no mejora la solución.'),
                celda: { i, j },
                marginales: copiar(marginales),
                ...uv,
              }),
            );
          }
          continue;
        }
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
                `Costo marginal = ${expresionMarginal(p, ciclo)} = ${fmtCosto(p, valor)}. ` +
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

    if (!entrada) {
      const ceros = marginales.flatMap((fila, i) =>
        fila.flatMap((v, j) => (v !== null && Math.abs(v) <= EPS ? [nombreCelda(p, { i, j })] : [])),
      );
      const usadas = prohibidasUsadas(p, sol.x);
      pasos.push(
        foto({
          tipo: 'optimo',
          titulo:
            usadas.length > 0
              ? 'No hay solución sin rutas prohibidas'
              : `Solución óptima: ${palabra} ${fmtTotal(p, sol.x)}`,
          explicacion:
            'Todos los costos marginales son mayores o iguales a 0: ninguna celda vacía puede reducir el costo' +
            (p.utilidades ? ' de oportunidad, así que la utilidad ya no puede aumentar. ' : '. ') +
            (usadas.length > 0
              ? `Aun así, la solución sigue enviando por ${usadas.map((c) => nombreCelda(p, c)).join(', ')}: ` +
                'con esas prohibiciones es imposible repartir toda la oferta y la demanda. Revisa qué rutas están prohibidas. '
              : '') +
            `${p.utilidades ? 'Utilidad' : 'Costo'} total = ${desgloseCosto(p, sol.x)}.` +
            (ceros.length > 0
              ? ` ${ceros.length === 1 ? `La celda ${ceros[0]} tiene` : `Las celdas ${ceros.join(', ')} tienen`} marginal 0: puede haber soluciones óptimas alternativas.`
              : ''),
          marginales,
          ...uv,
        }),
      );
      optimo = true;
      break;
    }

    if (iteraciones >= maxIteraciones) {
      // Sin esto, una base degenerada podría hacer que el método repita bases indefinidamente.
      pasos.push(
        foto({
          tipo: 'limite',
          titulo: `Se detuvo sin confirmar el óptimo: ${palabra} ${fmtTotal(p, sol.x)}`,
          explicacion:
            `Se alcanzó el límite de ${maxIteraciones} iteraciones y todavía hay celdas con costo marginal negativo, ` +
            'así que esta solución no está confirmada como óptima. Suele ocurrir cuando la solución es degenerada ' +
            'y el método repite las mismas bases.',
          marginales,
          ...uv,
        }),
      );
      break;
    }

    iteraciones++;
    const ciclo = ciclos[entrada.i][entrada.j] ?? buscarCiclo(sol.basica, entrada)!;
    const marginal = marginales[entrada.i][entrada.j]!;
    const negativas = ciclo.filter((_, k) => k % 2 === 1);
    const theta = Math.min(...negativas.map((c) => sol.x[c.i][c.j]));
    // Si varias celdas − llegan a 0, sale la primera del camino; las demás quedan básicas con ε.
    const salida = negativas.find((c) => sol.x[c.i][c.j] - theta <= EPS)!;
    const costoAntes = fmtTotal(p, sol.x);

    pasos.push(
      foto({
        tipo: 'ciclo',
        titulo: `Iteración ${iteraciones}: entra ${nombreCelda(p, entrada)}`,
        explicacion:
          `La celda ${nombreCelda(p, entrada)} tiene el costo marginal más negativo (${fmtCosto(p, marginal)}). ` +
          (modi ? `Solo ahora se traza un camino cerrado, el de esa celda: ${ruta(p, ciclo)}. ` : '') +
          `θ es el menor valor entre las celdas con signo −: min(${negativas.map((c) => fmt(sol.x[c.i][c.j])).join(', ')}) = ${fmt(theta)}. ` +
          'Se suma θ en las celdas + y se resta en las celdas −; así se conservan ofertas y demandas.',
        celda: entrada,
        ciclo,
        marginales,
        theta,
        sale: salida,
        ...uv,
      }),
    );

    ciclo.forEach((c, k) => {
      const nuevo = sol.x[c.i][c.j] + (k % 2 === 0 ? theta : -theta);
      sol.x[c.i][c.j] = Math.abs(nuevo) <= EPS ? 0 : nuevo;
    });
    sol.basica[entrada.i][entrada.j] = true;
    sol.basica[salida.i][salida.j] = false;

    pasos.push(
      foto({
        tipo: 'pivoteo',
        titulo: `Nueva solución: ${palabra} ${fmtTotal(p, sol.x)}`,
        explicacion:
          `Sale de la base ${nombreCelda(p, salida)}, que quedó en 0. ` +
          (p.utilidades
            ? `Nueva utilidad = ${costoAntes} − θ·marginal = ${costoAntes} − ${fmt(theta)}·(${fmtCosto(p, marginal)}) = ${fmtTotal(p, sol.x)}.`
            : `Nuevo costo = ${costoAntes} + θ·marginal = ${costoAntes} + ${fmt(theta)}·(${fmtCosto(p, marginal)}) = ${fmtTotal(p, sol.x)}.`) +
          (theta === 0
            ? ` Como θ = 0 (degeneración), ${p.utilidades ? 'la utilidad' : 'el costo'} no cambia, pero la base sí.`
            : ''),
        celda: entrada,
      }),
    );
  }

  return { pasos, solucion: sol, costo: total(p, sol.x), iteraciones, optimo };
}
