import { balancear } from './balanceo';
import { cantidadAsignable, celdasDisponibles, columnasActivas, construir, filasActivas } from './constructivo';
import type { EstadoConstruccion, Selector } from './constructivo';
import { convertir } from './conversion';
import type { Paso, Problema, Resultado } from './tipos';
import {
  desgloseCosto,
  elegirMejor,
  fmtCosto,
  fmtTotal,
  matriz,
  nombreCelda,
  palabraTotal,
  prohibidasUsadas,
  total,
} from './util';

export type MetodoInicial = 'noroeste' | 'costoMinimo' | 'vogel';

export const NOMBRE_METODO: Record<MetodoInicial, string> = {
  noroeste: 'Esquina Noroeste',
  costoMinimo: 'Costo Mínimo',
  vogel: 'Aproximación de Vogel',
};

export const selectorNoroeste: Selector = (e, p) => {
  const celda = { i: e.filaTachada.indexOf(false), j: e.columnaTachada.indexOf(false) };
  return {
    celda,
    motivo: `La esquina superior izquierda (noroeste) de la tabla sin tachar es ${nombreCelda(p, celda)}; el costo no se considera.`,
  };
};

export const selectorCostoMinimo: Selector = (e, p) => {
  const disponibles = celdasDisponibles(e);
  const celda = elegirMejor(disponibles, (c) => [e.costos[c.i][c.j], -cantidadAsignable(e, c)]);
  const costo = e.costos[celda.i][celda.j];
  const empates = disponibles.filter((c) => e.costos[c.i][c.j] === costo).length;
  return {
    celda,
    motivo:
      `La celda disponible de menor costo es ${nombreCelda(p, celda)} con costo ${fmtCosto(p, costo)}.` +
      (empates > 1 ? ` Hay ${empates} celdas empatadas; se elige la que permite asignar más unidades.` : ''),
  };
};

/** Diferencia entre los dos menores valores (con uno solo, el propio valor). */
export function penalizacion(costos: number[]): number {
  const v = [...costos].sort((a, b) => a - b);
  return v.length >= 2 ? v[1] - v[0] : v[0];
}

interface LineaVogel {
  tipo: 'fila' | 'columna';
  k: number;
  penal: number;
  minCosto: number;
}

function costosLinea(e: EstadoConstruccion, tipo: 'fila' | 'columna', k: number): number[] {
  return tipo === 'fila' ? columnasActivas(e).map((j) => e.costos[k][j]) : filasActivas(e).map((i) => e.costos[i][k]);
}

export const selectorVogel: Selector = (e, p) => {
  const filas = filasActivas(e);
  const cols = columnasActivas(e);
  if (filas.length === 1 || cols.length === 1) {
    const sel = selectorCostoMinimo(e, p);
    return {
      ...sel,
      motivo: `Solo queda una ${filas.length === 1 ? 'fila' : 'columna'} sin tachar, así que ya no se calculan penalizaciones. ${sel.motivo}`,
    };
  }

  const lineas: LineaVogel[] = [
    ...filas.map((i) => ({ tipo: 'fila' as const, k: i, costos: costosLinea(e, 'fila', i) })),
    ...cols.map((j) => ({ tipo: 'columna' as const, k: j, costos: costosLinea(e, 'columna', j) })),
  ].map(({ tipo, k, costos }) => ({ tipo, k, penal: penalizacion(costos), minCosto: Math.min(...costos) }));

  const penalFila: (number | null)[] = e.filaTachada.map(() => null);
  const penalColumna: (number | null)[] = e.columnaTachada.map(() => null);
  for (const l of lineas) (l.tipo === 'fila' ? penalFila : penalColumna)[l.k] = l.penal;

  const linea = elegirMejor(lineas, (l) => [-l.penal, l.minCosto]);
  const empatadas = lineas.filter((l) => l.penal === linea.penal).length;
  const nombreLinea = linea.tipo === 'fila' ? p.origenes[linea.k] : p.destinos[linea.k];

  const enLinea = celdasDisponibles(e).filter((c) => (linea.tipo === 'fila' ? c.i : c.j) === linea.k);
  const celda = elegirMejor(enLinea, (c) => [e.costos[c.i][c.j], -cantidadAsignable(e, c)]);

  return {
    celda,
    analisis: {
      explicacion:
        'Para cada fila y columna sin tachar se calcula su penalización: la diferencia entre sus dos costos más bajos. ' +
        'Indica cuánto se perdería si no se usara su celda más barata. ' +
        `La mayor penalización es ${fmtCosto(p, linea.penal)}, en la ${linea.tipo} ${nombreLinea}.` +
        (empatadas > 1 ? ` Hay ${empatadas} líneas empatadas; se elige la que contiene el menor costo.` : ''),
      penalFila,
      penalColumna,
      linea: { tipo: linea.tipo, k: linea.k },
    },
    motivo: `En la ${linea.tipo} ${nombreLinea} (penalización ${fmtCosto(p, linea.penal)}) la celda de menor costo es ${nombreCelda(p, celda)} con costo ${fmtCosto(p, e.costos[celda.i][celda.j])}.`,
  };
};

export const SELECTOR: Record<MetodoInicial, Selector> = {
  noroeste: selectorNoroeste,
  costoMinimo: selectorCostoMinimo,
  vogel: selectorVogel,
};

/** Balancea el problema y construye la solución inicial con el selector, registrando todos los pasos. */
export function resolverInicial(original: Problema, selector: Selector, nombreMetodo: string): Resultado {
  const { problema: balanceado, ficticio, explicacion } = balancear(original);
  const { problema, explicacion: conversion } = convertir(balanceado);
  const m = problema.ofertas.length;
  const n = problema.demandas.length;
  const vacio: Paso = {
    tipo: 'inicio',
    titulo: `Método: ${nombreMetodo}`,
    explicacion: `Se parte de la tabla vacía. ${ficticio ? '' : explicacion}`,
    x: matriz(m, n, 0),
    basica: matriz(m, n, false),
    ofertaRestante: [...problema.ofertas],
    demandaRestante: [...problema.demandas],
    filaTachada: Array(m).fill(false),
    columnaTachada: Array(n).fill(false),
    costoTotal: 0,
  };
  const pasos: Paso[] = [vacio];
  if (ficticio) pasos.push({ ...vacio, tipo: 'balanceo', titulo: 'Balancear el problema', explicacion });
  if (conversion)
    pasos.push({
      ...vacio,
      tipo: 'conversion',
      titulo: problema.utilidades ? 'Convertir a un problema de minimización' : 'Rutas prohibidas: costo M',
      explicacion: conversion,
    });

  const { solucion, pasos: construccion } = construir(problema, selector);
  pasos.push(...construccion);

  const costo = total(problema, solucion.x);
  const palabra = palabraTotal(problema);
  const usadas = prohibidasUsadas(problema, solucion.x);
  const ultimo = pasos[pasos.length - 1];
  pasos.push({
    ...ultimo,
    tipo: 'fin',
    titulo: `Solución inicial: ${palabra} ${fmtTotal(problema, solucion.x)}`,
    explicacion:
      `${nombreMetodo} terminó con ${m + n - 1} celdas básicas (m + n − 1). ` +
      `${problema.utilidades ? 'Utilidad total = Σ utilidad·x' : 'Costo total = Σ c·x'} = ${desgloseCosto(problema, solucion.x)}.` +
      (usadas.length > 0
        ? ` Atención: esta solución envía por ${usadas.length === 1 ? 'la ruta prohibida' : 'las rutas prohibidas'} ${usadas.map((c) => nombreCelda(problema, c)).join(', ')}, así que todavía no es válida. La optimización la corregirá si existe una alternativa.`
        : ''),
    celda: undefined,
  });

  return { problema, pasos, solucion, costo };
}

export function resolverMetodo(p: Problema, metodo: MetodoInicial): Resultado {
  return resolverInicial(p, SELECTOR[metodo], NOMBRE_METODO[metodo]);
}
