import { optimizar } from './caminoPiedras';
import type { Celda, Linea, Paso, Problema } from './tipos';
import { EPS, fmt, fmtCosto, fmtTotal, nombreCelda, palabraTotal, prohibidasUsadas, total } from './util';

/** Una asignación que usó una ruta cara porque una decisión anterior cerró otra más barata. */
export interface RutaCara {
  /** Índice del paso de asignación (en la lista de pasos de la construcción). */
  paso: number;
  celda: Celda;
  cantidad: number;
  /** Ruta más barata de la misma fila o columna, que ya no estaba disponible. */
  alternativa: Celda;
  /** Fila o columna de la alternativa que ya estaba agotada. */
  linea: Linea;
  /** Paso cuya asignación agotó esa línea y celda que se asignó en él. */
  cierre: number;
  celdaCierre: Celda;
  cantidadCierre: number;
  /** Costo de más por unidad: costo de la celda − costo de la alternativa. */
  diferencia: number;
}

export interface Miopia {
  rutas: RutaCara[];
  /** Total de la solución inicial y total óptimo (null si no se confirmó o no hay solución válida). */
  inicial: number;
  optimo: number | null;
  /** Cuánto peor que el óptimo es la solución inicial (≥ 0); null si no se puede medir. */
  precio: number | null;
}

/**
 * Recorre los pasos de una construcción y, en cada asignación con cantidad positiva, busca la
 * ruta más barata de su fila o de su columna que ya estaba cerrada: su otro extremo había agotado
 * su oferta o su demanda. La decisión responsable es la asignación que lo agotó (no la que tachó
 * la línea, que en un caso degenerado puede ser una asignación de ε posterior).
 * Devuelve esas asignaciones, de mayor a menor costo de más en total.
 */
export function rutasCaras(p: Problema, pasos: Paso[]): RutaCara[] {
  const rutas: RutaCara[] = [];
  const prohibida = (c: Celda) => p.prohibidas?.[c.i]?.[c.j] ?? false;
  // Paso en que cada fila o columna quedó sin nada que enviar o recibir.
  const cierreFila = new Map<number, number>();
  const cierreColumna = new Map<number, number>();

  pasos.forEach((paso, k) => {
    if (paso.tipo !== 'asignacion' || !paso.celda) return;
    const { i, j } = paso.celda;
    const cantidad = paso.x[i][j];
    const costo = p.costos[i][j];
    if (cantidad > EPS) {
      const candidatas: { celda: Celda; linea: Linea; cierre: number }[] = [];
      p.destinos.forEach((_, b) => {
        if (b !== j && cierreColumna.has(b)) {
          candidatas.push({ celda: { i, j: b }, linea: { tipo: 'columna', k: b }, cierre: cierreColumna.get(b)! });
        }
      });
      p.origenes.forEach((_, a) => {
        if (a !== i && cierreFila.has(a)) {
          candidatas.push({ celda: { i: a, j }, linea: { tipo: 'fila', k: a }, cierre: cierreFila.get(a)! });
        }
      });
      let mejor: (typeof candidatas)[number] | null = null;
      for (const c of candidatas) {
        if (prohibida(c.celda)) continue;
        const valor = p.costos[c.celda.i][c.celda.j];
        if (valor < costo - EPS && (!mejor || valor < p.costos[mejor.celda.i][mejor.celda.j] - EPS)) mejor = c;
      }
      if (mejor) {
        rutas.push({
          paso: k,
          celda: paso.celda,
          cantidad,
          alternativa: mejor.celda,
          linea: mejor.linea,
          cierre: mejor.cierre,
          celdaCierre: pasos[mejor.cierre].celda!,
          cantidadCierre: pasos[mejor.cierre].x[pasos[mejor.cierre].celda!.i][pasos[mejor.cierre].celda!.j],
          diferencia: costo - p.costos[mejor.celda.i][mejor.celda.j],
        });
      }
    }
    paso.ofertaRestante?.forEach((r, a) => r <= EPS && !cierreFila.has(a) && cierreFila.set(a, k));
    paso.demandaRestante?.forEach((r, b) => r <= EPS && !cierreColumna.has(b) && cierreColumna.set(b, k));
  });

  return rutas.sort((a, b) => b.diferencia * b.cantidad - a.diferencia * a.cantidad || a.paso - b.paso);
}

/** Analiza una construcción terminada: rutas caras y distancia de la solución inicial al óptimo. */
export function analizarMiopia(p: Problema, pasos: Paso[]): Miopia {
  const fin = pasos[pasos.length - 1];
  const inicial = total(p, fin.x);
  const opt = optimizar(p, { x: fin.x, basica: fin.basica });
  const valido = opt.optimo && prohibidasUsadas(p, opt.solucion.x).length === 0;
  const optimo = valido ? opt.costo : null;
  const precio =
    optimo === null || prohibidasUsadas(p, fin.x).length > 0
      ? null
      : Math.max(0, p.utilidades ? optimo - inicial : inicial - optimo);
  return { rutas: rutasCaras(p, pasos), inicial, optimo, precio };
}

/** Explicación de una ruta cara, con números de paso contados desde 1. */
export function describirRutaCara(p: Problema, r: RutaCara): string {
  const nombreLinea =
    r.linea.tipo === 'columna' ? `la columna ${p.destinos[r.linea.k]}` : `la fila ${p.origenes[r.linea.k]}`;
  const motivo = r.linea.tipo === 'columna' ? 'ya tenía su demanda cubierta' : 'ya había agotado su oferta';
  const de = r.alternativa.i === r.celda.i ? `de ${p.origenes[r.celda.i]}` : `hacia ${p.destinos[r.celda.j]}`;
  const palabra = p.utilidades ? 'costo de oportunidad' : 'costo';
  return (
    `Paso ${r.paso + 1}: ${nombreCelda(p, r.celda)} recibe ${fmt(r.cantidad)} con ${palabra} ${fmtCosto(p, p.costos[r.celda.i][r.celda.j])}. ` +
    `La ruta más barata ${de}, ${nombreCelda(p, r.alternativa)} con ${palabra} ${fmtCosto(p, p.costos[r.alternativa.i][r.alternativa.j])}, ` +
    `ya no estaba disponible: ${nombreLinea} ${motivo} desde el paso ${r.cierre + 1}, cuando se ${r.cantidadCierre === 1 ? 'asignó 1' : `asignaron ${fmt(r.cantidadCierre)}`} a ${nombreCelda(p, r.celdaCierre)}. ` +
    `Son ${fmtCosto(p, r.diferencia)} de más por unidad.`
  );
}

/** Resumen del precio de la solución inicial frente al óptimo. */
export function describirPrecio(p: Problema, m: Miopia, finX: number[][]): string {
  const palabra = palabraTotal(p);
  if (m.precio === null) {
    return prohibidasUsadas(p, finX).length > 0
      ? 'La solución inicial envía por una ruta prohibida, así que no se puede comparar con el óptimo.'
      : 'No se pudo confirmar el óptimo, así que no se puede medir el precio de estas decisiones.';
  }
  if (m.precio <= EPS) {
    return `Esta solución inicial ya es óptima (${palabra} ${fmtTotal(p, finX)}): en este problema las decisiones tempranas no costaron nada.`;
  }
  return (
    `La solución inicial ${p.utilidades ? 'gana' : 'cuesta'} ${fmtTotal(p, finX)} y el óptimo es ${fmt(m.optimo!)}: ` +
    `estas decisiones ${p.utilidades ? 'dejaron de ganar' : 'costaron'} ${fmt(m.precio)} ` +
    `(${m.optimo ? fmt((m.precio / Math.abs(m.optimo)) * 100) : '—'} %).`
  );
}
