import { cantidadAsignable, celdasDisponibles, columnasActivas, filasActivas } from './constructivo';
import type { EstadoConstruccion, Seleccion, Selector } from './constructivo';
import type { Celda } from './tipos';
import { elegirMejor, fmt, nombreCelda } from './util';
import { penalizacion } from './metodos';

export type ModoSeleccion = 'celda' | 'linea';
export type CriterioLinea = 'penalizacion' | 'rango' | 'mayorCantidad' | 'menorCostoMinimo';
export type CriterioCelda = 'noroeste' | 'menorCosto' | 'menorCostoRelativo' | 'mayorCantidad';
export type Desempate = 'mayorCantidad' | 'menorCosto' | 'orden';

export interface ConfigHeuristica {
  nombre: string;
  modo: ModoSeleccion;
  criterioLinea: CriterioLinea;
  criterioCelda: CriterioCelda;
  desempate: Desempate;
}

export const ETIQUETA_MODO: Record<ModoSeleccion, string> = {
  celda: 'Elegir directamente la celda',
  linea: 'Elegir primero una fila o columna y luego la celda',
};

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
  },
  costoMinimo: {
    nombre: 'Costo Mínimo',
    modo: 'celda',
    criterioLinea: 'penalizacion',
    criterioCelda: 'menorCosto',
    desempate: 'mayorCantidad',
  },
  vogel: {
    nombre: 'Vogel',
    modo: 'linea',
    criterioLinea: 'penalizacion',
    criterioCelda: 'menorCosto',
    desempate: 'mayorCantidad',
  },
};

export const CONFIG_INICIAL: ConfigHeuristica = {
  nombre: 'Mi heurística',
  modo: 'celda',
  criterioLinea: 'rango',
  criterioCelda: 'menorCostoRelativo',
  desempate: 'mayorCantidad',
};

/** Indica a qué método clásico equivale la configuración, si a alguno. */
export function equivalencia(c: ConfigHeuristica): string | null {
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

export function selectorPersonalizado(c: ConfigHeuristica): Selector {
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
      motivoLinea = `Según tu regla, la línea elegida es la ${linea.tipo} ${nombre} (valor ${fmt(linea.valor)}). `;

      const penalFila: (number | null)[] = e.filaTachada.map(() => null);
      const penalColumna: (number | null)[] = e.columnaTachada.map(() => null);
      for (const l of lineas) (l.tipo === 'fila' ? penalFila : penalColumna)[l.k] = l.valor;
      analisis = {
        explicacion: `Se calcula para cada fila y columna sin tachar el valor de "${ETIQUETA_LINEA[c.criterioLinea]}". Se elige la ${linea.tipo} ${nombre}, con el mayor valor (${fmt(linea.valor)}).`,
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
      motivo: `${motivoLinea}La celda elegida por "${ETIQUETA_CELDA[c.criterioCelda].toLowerCase()}" es ${nombreCelda(p, celda)} (costo ${fmt(e.costos[celda.i][celda.j])}).`,
    };
  };
}
