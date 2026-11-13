import type { Problema } from './tipos';
import { fmt, suma } from './util';

export interface Conversion {
  /** Problema de minimización equivalente sobre el que trabajan los métodos. */
  problema: Problema;
  /** Explicación de lo que se cambió; null si no hizo falta convertir nada. */
  explicacion: string | null;
}

/** Costo M: una potencia de 10 tan grande que ninguna solución que use una ruta prohibida puede ser mejor. */
export function calcularM(costos: number[], flujo: number): number {
  // El factor mínimo de 20 garantiza que costos, penalizaciones y marginales sin M queden lejos de M.
  const cota = (Math.max(0, ...costos) + 1) * Math.max(flujo + 1, 20);
  return Math.max(1000, 10 ** Math.ceil(Math.log10(cota)));
}

/**
 * Lleva un problema ya balanceado a la forma que resuelven los métodos: minimización con todas
 * las rutas permitidas. Las utilidades se cambian por costos de oportunidad y las rutas
 * prohibidas reciben el costo M. Un problema ya convertido se devuelve tal cual.
 */
export function convertir(p: Problema): Conversion {
  const hayProhibidas = p.prohibidas?.some((fila) => fila.some(Boolean)) ?? false;
  const maximizar = p.objetivo === 'max';
  if (p.M !== undefined || p.utilidades || (!hayProhibidas && !maximizar)) return { problema: p, explicacion: null };

  const prohibida = (i: number, j: number) => p.prohibidas?.[i]?.[j] ?? false;
  const permitidos = p.costos.flatMap((fila, i) => fila.filter((_, j) => !prohibida(i, j)));
  const partes: string[] = [];

  let costos = p.costos;
  let utilidades: number[][] | undefined;
  if (maximizar) {
    const mayor = Math.max(0, ...permitidos);
    utilidades = p.costos.map((fila, i) => fila.map((u, j) => (prohibida(i, j) ? 0 : u)));
    costos = p.costos.map((fila) => fila.map((u) => mayor - u));
    partes.push(
      `Los métodos minimizan, así que cada utilidad se cambia por su costo de oportunidad: la mayor utilidad de la tabla (${fmt(mayor)}) menos la utilidad de la celda. ` +
        'Es lo que se deja de ganar por cada unidad enviada por esa ruta. Minimizar ese costo equivale a maximizar la utilidad total; ' +
        'desde aquí la tabla muestra costos de oportunidad y el total sigue mostrando la utilidad real.',
    );
  }

  let M: number | undefined;
  if (hayProhibidas) {
    const base = costos.flatMap((fila, i) => fila.filter((_, j) => !prohibida(i, j)));
    M = calcularM(base, suma(p.ofertas));
    const valorM = M;
    costos = costos.map((fila, i) => fila.map((c, j) => (prohibida(i, j) ? valorM : c)));
    const cuantas = p.prohibidas!.flat().filter(Boolean).length;
    partes.push(
      `${cuantas === 1 ? 'La ruta prohibida recibe' : `Las ${cuantas} rutas prohibidas reciben`} el costo M = ${fmt(M)}, ` +
        'un número tan grande que cualquier solución que use una ruta prohibida resulta peor que una que no lo haga. ' +
        'Así los métodos la evitan por sí solos, sin cambiar sus reglas.',
    );
  }

  return { problema: { ...p, costos, utilidades, M }, explicacion: partes.join(' ') };
}
