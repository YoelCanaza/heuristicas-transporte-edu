import { cantidadAsignable, celdasDisponibles, columnasActivas, filasActivas } from './constructivo';
import type { EstadoConstruccion, Seleccion, Selector } from './constructivo';
import type { Celda } from './tipos';
import { elegirMejor, fmt, fmtCosto, matriz, nombreCelda } from './util';
import { penalizacion } from './metodos';

export type ModoSeleccion = 'celda' | 'linea' | 'puntaje';

/** Importancia (0 a 10) de cada criterio en el modo de puntaje. */
export interface Pesos {
  costo: number;
  relativo: number;
  urgencia: number;
  cantidad: number;
}
export type CriterioLinea = 'penalizacion' | 'rango' | 'mayorCantidad' | 'menorCostoMinimo';
export type CriterioCelda = 'noroeste' | 'menorCosto' | 'menorCostoRelativo' | 'mayorCantidad';
export type Desempate = 'mayorCantidad' | 'menorCosto' | 'orden';

export interface ConfigHeuristica {
  nombre: string;
  modo: ModoSeleccion;
  criterioLinea: CriterioLinea;
  criterioCelda: CriterioCelda;
  desempate: Desempate;
  pesos: Pesos;
}

export const ETIQUETA_MODO: Record<ModoSeleccion, string> = {
  celda: 'Elegir directamente la celda',
  linea: 'Elegir primero una fila o columna y luego la celda',
  puntaje: 'Combinar varios criterios con pesos (puntaje)',
};

export const ETIQUETA_PESO: Record<keyof Pesos, { titulo: string; ayuda: string }> = {
  costo: { titulo: 'Costo bajo', ayuda: 'Prefiere las celdas más baratas de la tabla.' },
  relativo: {
    titulo: 'Costo relativo bajo',
    ayuda: 'Prefiere las celdas baratas en comparación con lo mejor de su fila y de su columna.',
  },
  urgencia: {
    titulo: 'Urgencia de la línea',
    ayuda: 'Prefiere las celdas de la fila o columna con mayor penalización, como hace Vogel.',
  },
  cantidad: { titulo: 'Cantidad grande', ayuda: 'Prefiere las celdas que permiten mover más unidades.' },
};

export const PESOS_INICIALES: Pesos = { costo: 5, relativo: 0, urgencia: 5, cantidad: 0 };

export const ETIQUETA_LINEA: Record<CriterioLinea, string> = {
  penalizacion: 'Mayor penalización (diferencia entre sus dos menores costos)',
  rango: 'Mayor rango (costo máximo − costo mínimo)',
  mayorCantidad: 'Mayor oferta o demanda restante',
  menorCostoMinimo: 'Contiene el menor costo',
};

export const ETIQUETA_CELDA: Record<CriterioCelda, string> = {
  noroeste: 'Más arriba y a la izquierda (noroeste)',
  menorCosto: 'Menor costo',
  menorCostoRelativo: 'Menor costo relativo (costo − mín. de su fila − mín. de su columna)',
  mayorCantidad: 'Permite asignar más unidades',
};

export const ETIQUETA_DESEMPATE: Record<Desempate, string> = {
  mayorCantidad: 'La que permite asignar más unidades',
  menorCosto: 'La de menor costo',
  orden: 'La primera en orden (fila, columna)',
};

export const PRESETS: Record<'noroeste' | 'costoMinimo' | 'vogel', ConfigHeuristica> = {
  noroeste: {
    nombre: 'Esquina Noroeste',
    modo: 'celda',
    criterioLinea: 'penalizacion',
    criterioCelda: 'noroeste',
    desempate: 'orden',
    pesos: PESOS_INICIALES,
  },
  costoMinimo: {
    nombre: 'Costo Mínimo',
    modo: 'celda',
    criterioLinea: 'penalizacion',
    criterioCelda: 'menorCosto',
    desempate: 'mayorCantidad',
    pesos: PESOS_INICIALES,
  },
  vogel: {
    nombre: 'Vogel',
    modo: 'linea',
    criterioLinea: 'penalizacion',
    criterioCelda: 'menorCosto',
    desempate: 'mayorCantidad',
    pesos: PESOS_INICIALES,
  },
};

export const CONFIG_INICIAL: ConfigHeuristica = {
  nombre: 'Mi heurística',
  modo: 'celda',
  criterioLinea: 'rango',
  criterioCelda: 'menorCostoRelativo',
  desempate: 'mayorCantidad',
  pesos: PESOS_INICIALES,
};

const CLAVES_PESO = ['costo', 'relativo', 'urgencia', 'cantidad'] as const;

function pesosActivos(c: ConfigHeuristica): (keyof Pesos)[] {
  return CLAVES_PESO.filter((k) => c.pesos[k] > 0);
}

/** Indica a qué método clásico equivale la configuración, si a alguno. */
export function equivalencia(c: ConfigHeuristica): string | null {
  if (c.modo === 'puntaje') {
    const activos = pesosActivos(c);
    return activos.length === 1 && activos[0] === 'costo' && c.desempate === 'mayorCantidad' ? 'Costo Mínimo' : null;
  }
  if (c.modo === 'celda' && c.criterioCelda === 'noroeste') return 'Esquina Noroeste';
  if (c.modo === 'celda' && c.criterioCelda === 'menorCosto' && c.desempate === 'mayorCantidad') return 'Costo Mínimo';
  if (
    c.modo === 'linea' &&
    c.criterioLinea === 'penalizacion' &&
    c.criterioCelda === 'menorCosto' &&
    c.desempate === 'mayorCantidad'
  )
    return 'Aproximación de Vogel';
  return null;
}

export function describir(c: ConfigHeuristica): string {
  const celda = ETIQUETA_CELDA[c.criterioCelda].toLowerCase();
  const desempate = ETIQUETA_DESEMPATE[c.desempate].toLowerCase();
  if (c.modo === 'puntaje') {
    const activos = pesosActivos(c);
    const criterios = activos.map((k) => `${ETIQUETA_PESO[k].titulo.toLowerCase()} (peso ${c.pesos[k]})`).join(', ');
    return activos.length === 0
      ? `Todos los pesos están en 0, así que en cada iteración decide solo el desempate: ${desempate}.`
      : `En cada iteración: dar a cada celda disponible un puntaje que combina ${criterios}; elegir la de mejor puntaje (empate: ${desempate}); asignarle lo máximo posible y tachar la línea agotada. Repetir hasta tachar todo.`;
  }
  const pasoSeleccion =
    c.modo === 'celda'
      ? `elegir, entre todas las celdas disponibles, la de criterio "${celda}" (empate: ${desempate})`
      : `elegir la fila o columna con "${ETIQUETA_LINEA[c.criterioLinea].toLowerCase()}" y, dentro de ella, la celda de criterio "${celda}" (empate: ${desempate})`;
  return `En cada iteración: ${pasoSeleccion}; asignarle lo máximo posible y tachar la línea agotada. Repetir hasta tachar todo.`;
}

function costosDisponiblesFila(e: EstadoConstruccion, i: number): number[] {
  return columnasActivas(e).map((j) => e.costos[i][j]);
}

function costosDisponiblesColumna(e: EstadoConstruccion, j: number): number[] {
  return filasActivas(e).map((i) => e.costos[i][j]);
}

function valorCelda(e: EstadoConstruccion, criterio: CriterioCelda | Desempate, c: Celda): number {
  switch (criterio) {
    case 'noroeste':
      return c.i * 1e6 + c.j;
    case 'orden':
      return 0; // los candidatos ya vienen en orden fila-columna
    case 'menorCosto':
      return e.costos[c.i][c.j];
    case 'menorCostoRelativo':
      return (
        e.costos[c.i][c.j] - Math.min(...costosDisponiblesFila(e, c.i)) - Math.min(...costosDisponiblesColumna(e, c.j))
      );
    case 'mayorCantidad':
      return -cantidadAsignable(e, c);
  }
}

function valorLinea(e: EstadoConstruccion, criterio: CriterioLinea, tipo: 'fila' | 'columna', k: number): number {
  const costos = tipo === 'fila' ? costosDisponiblesFila(e, k) : costosDisponiblesColumna(e, k);
  switch (criterio) {
    case 'penalizacion':
      return penalizacion(costos);
    case 'rango':
      return Math.max(...costos) - Math.min(...costos);
    case 'mayorCantidad':
      return tipo === 'fila' ? e.oferta[k] : e.demanda[k];
    case 'menorCostoMinimo':
      return -Math.min(...costos);
  }
}

/** Diferencia entre los dos menores costos; 0 si la línea ya no tiene alternativa. */
function urgencia(costos: number[]): number {
  return costos.length >= 2 ? penalizacion(costos) : 0;
}

/**
 * Puntaje de cada celda disponible, entre 0 (la mejor en todos los criterios activos) y 1 (la peor).
 * Cada criterio se normaliza entre las celdas disponibles para que los pesos sean comparables.
 */
export function calcularPuntajes(e: EstadoConstruccion, pesos: Pesos): { celda: Celda; puntaje: number }[] {
  const celdas = celdasDisponibles(e);
  const urgFila = new Map(filasActivas(e).map((i) => [i, urgencia(costosDisponiblesFila(e, i))]));
  const urgColumna = new Map(columnasActivas(e).map((j) => [j, urgencia(costosDisponiblesColumna(e, j))]));
  // Valores "cuanto menor, mejor" de cada criterio.
  const crudos: Record<keyof Pesos, number[]> = {
    costo: celdas.map((c) => e.costos[c.i][c.j]),
    relativo: celdas.map((c) => valorCelda(e, 'menorCostoRelativo', c)),
    urgencia: celdas.map((c) => -Math.max(urgFila.get(c.i)!, urgColumna.get(c.j)!)),
    cantidad: celdas.map((c) => -cantidadAsignable(e, c)),
  };
  const total = CLAVES_PESO.reduce((t, k) => t + pesos[k], 0);
  return celdas.map((celda, n) => {
    let puntaje = 0;
    for (const k of CLAVES_PESO) {
      if (pesos[k] === 0) continue;
      const min = Math.min(...crudos[k]);
      const max = Math.max(...crudos[k]);
      puntaje += (pesos[k] / total) * (max > min ? (crudos[k][n] - min) / (max - min) : 0);
    }
    return { celda, puntaje };
  });
}

function selectorPuntaje(c: ConfigHeuristica): Selector {
  return (e, p) => {
    const evaluadas = calcularPuntajes(e, c.pesos);
    const mejor = elegirMejor(evaluadas, (x) => [x.puntaje, valorCelda(e, c.desempate, x.celda)]);
    const empatadas = evaluadas.filter((x) => Math.abs(x.puntaje - mejor.puntaje) < 1e-9).length;
    const puntajes = matriz<number | null>(e.oferta.length, e.demanda.length, null);
    for (const x of evaluadas) puntajes[x.celda.i][x.celda.j] = x.puntaje;
    const activos = pesosActivos(c);
    return {
      celda: mejor.celda,
      analisis:
        activos.length === 0
          ? undefined
          : {
              explicacion:
                `Se calcula el puntaje de cada celda disponible combinando ${activos
                  .map((k) => `${ETIQUETA_PESO[k].titulo.toLowerCase()} (peso ${c.pesos[k]})`)
                  .join(', ')}. ` +
                'El puntaje va de 0 (la mejor en todo) a 1 (la peor en todo). ' +
                `El menor es ${fmt(mejor.puntaje)}, en ${nombreCelda(p, mejor.celda)}.` +
                (empatadas > 1
                  ? ` Hay ${empatadas} celdas empatadas; decide el desempate: ${ETIQUETA_DESEMPATE[c.desempate].toLowerCase()}.`
                  : ''),
              puntajes,
            },
      motivo: `Según tu regla, la celda de mejor puntaje es ${nombreCelda(p, mejor.celda)} (puntaje ${fmt(mejor.puntaje)}, costo ${fmtCosto(p, e.costos[mejor.celda.i][mejor.celda.j])}).`,
    };
  };
}

export function selectorPersonalizado(c: ConfigHeuristica): Selector {
  if (c.modo === 'puntaje') return selectorPuntaje(c);
  return (e, p) => {
    const filas = filasActivas(e);
    const cols = columnasActivas(e);
    let candidatas = celdasDisponibles(e);
    let motivoLinea = '';
    let analisis: Seleccion['analisis'];

    if (c.modo === 'linea' && filas.length > 1 && cols.length > 1) {
      const lineas = [
        ...filas.map((k) => ({ tipo: 'fila' as const, k })),
        ...cols.map((k) => ({ tipo: 'columna' as const, k })),
      ].map((l) => ({
        ...l,
        valor: valorLinea(e, c.criterioLinea, l.tipo, l.k),
        minCosto: -valorLinea(e, 'menorCostoMinimo', l.tipo, l.k),
      }));
      // Empate entre líneas: la que contiene el menor costo (como en Vogel).
      const linea = elegirMejor(lineas, (l) => [-l.valor, l.minCosto]);
      const nombre = linea.tipo === 'fila' ? p.origenes[linea.k] : p.destinos[linea.k];
      candidatas = candidatas.filter((cel) => (linea.tipo === 'fila' ? cel.i : cel.j) === linea.k);
      motivoLinea = `Según tu regla, la línea elegida es la ${linea.tipo} ${nombre} (valor ${fmtCosto(p, linea.valor)}). `;

      const penalFila: (number | null)[] = e.filaTachada.map(() => null);
      const penalColumna: (number | null)[] = e.columnaTachada.map(() => null);
      for (const l of lineas) (l.tipo === 'fila' ? penalFila : penalColumna)[l.k] = l.valor;
      analisis = {
        explicacion: `Se calcula para cada fila y columna sin tachar el valor de "${ETIQUETA_LINEA[c.criterioLinea]}". Se elige la ${linea.tipo} ${nombre}, con el mayor valor (${fmtCosto(p, linea.valor)}).`,
        penalFila,
        penalColumna,
        linea: { tipo: linea.tipo, k: linea.k },
      };
    }

    const celda = elegirMejor(candidatas, (cel) => [
      valorCelda(e, c.criterioCelda, cel),
      valorCelda(e, c.desempate, cel),
    ]);
    return {
      celda,
      analisis,
      motivo: `${motivoLinea}La celda elegida por "${ETIQUETA_CELDA[c.criterioCelda].toLowerCase()}" es ${nombreCelda(p, celda)} (costo ${fmtCosto(p, e.costos[celda.i][celda.j])}).`,
    };
  };
}
