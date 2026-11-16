import { compararMetodos, enumerar } from './comparador';
import type { ComparacionMetodos } from './comparador';
import type { Linea, Problema } from './tipos';
import { EPS, fmt, palabraTotal, suma, total } from './util';

/** Cómo va un reparto hecho a mano: lo que queda por repartir y lo que se pasó. */
export interface EstadoReparto {
  /** Oferta que queda en cada origen; negativa si se envió más de lo que hay. */
  ofertaRestante: number[];
  /** Demanda que falta en cada destino; negativa si se envió más de lo pedido. */
  demandaRestante: number[];
  /** Filas y columnas en las que se envió de más. */
  excesos: Linea[];
  /** Unidades que todavía faltan por repartir. */
  falta: number;
  /** Cada origen entregó toda su oferta y cada destino recibió toda su demanda. */
  completo: boolean;
  /** Rutas por las que se envía algo. */
  rutas: number;
}

/** Revisa un reparto sobre un problema balanceado. */
export function evaluarReparto(p: Problema, x: number[][]): EstadoReparto {
  const ofertaRestante = p.ofertas.map((o, i) => o - suma(x[i]));
  const demandaRestante = p.demandas.map((d, j) => d - suma(x.map((fila) => fila[j])));
  const excesos: Linea[] = [
    ...ofertaRestante.flatMap((r, k) => (r < -EPS ? [{ tipo: 'fila' as const, k }] : [])),
    ...demandaRestante.flatMap((r, k) => (r < -EPS ? [{ tipo: 'columna' as const, k }] : [])),
  ];
  return {
    ofertaRestante,
    demandaRestante,
    excesos,
    falta: suma(ofertaRestante.map((r) => Math.max(r, 0))),
    completo: [...ofertaRestante, ...demandaRestante].every((r) => Math.abs(r) <= EPS),
    rutas: x.flat().filter((v) => v > EPS).length,
  };
}

/** Un total de la tabla de posiciones: el reparto del estudiante, un método o el óptimo. */
export interface Posicion {
  nombre: string;
  /** El total como se muestra ("520", "5M + 470"). */
  texto: string;
  /** Diferencia con el óptimo, siempre ≥ 0; null si no se puede medir. */
  distancia: number | null;
  tipo: 'propia' | 'metodo' | 'optimo';
  /** El método envía por una ruta prohibida: su solución inicial no es válida. */
  prohibida: boolean;
}

export interface Veredicto {
  comparacion: ComparacionMetodos;
  /** Costo o utilidad real del reparto. */
  total: number;
  /** Diferencia con el óptimo (≥ 0) y la misma en %; null si no hay óptimo con qué comparar. */
  diferencia: number | null;
  brecha: number | null;
  esOptimo: boolean;
  /** De mejor a peor. */
  posiciones: Posicion[];
  /** Explicación para el estudiante, un párrafo por elemento. */
  mensajes: string[];
}

/**
 * Compara un reparto completo, hecho a mano sobre el problema balanceado, con el óptimo y con la
 * solución inicial de cada método. Se puede pasar la comparación ya calculada para no repetirla.
 */
export function juzgarReparto(original: Problema, x: number[][], comparacion = compararMetodos(original)): Veredicto {
  const { problema: p, optimo, filas } = comparacion;
  const palabra = palabraTotal(p);
  const maximizar = !!p.utilidades;
  const propio = total(p, x);
  const diferencia = optimo === null ? null : Math.max(0, maximizar ? optimo - propio : propio - optimo);
  const esOptimo = diferencia !== null && diferencia <= EPS;
  const brecha =
    diferencia === null ? null : esOptimo ? 0 : optimo === 0 ? null : (diferencia / Math.abs(optimo!)) * 100;

  const posiciones: Posicion[] = [
    { nombre: 'Tu reparto', texto: fmt(propio), distancia: diferencia, tipo: 'propia', prohibida: false },
    ...filas.map((f): Posicion => {
      const inicio = f.trayectoria[0];
      return {
        nombre: f.nombre,
        texto: inicio.texto,
        distancia: optimo === null || inicio.prohibida ? null : Math.abs(inicio.valor - optimo),
        tipo: 'metodo',
        prohibida: inicio.prohibida,
      };
    }),
  ];
  if (optimo !== null)
    posiciones.push({ nombre: 'Óptimo', texto: fmt(optimo), distancia: 0, tipo: 'optimo', prohibida: false });
  // El óptimo va primero entre los empatados y el reparto propio antes que los métodos.
  const orden = { optimo: 0, propia: 1, metodo: 2 };
  const lejania = (q: Posicion) => (q.prohibida ? Infinity : (q.distancia ?? Infinity));
  posiciones.sort((a, b) => {
    const d = lejania(a) - lejania(b);
    return Number.isNaN(d) || Math.abs(d) <= EPS ? orden[a.tipo] - orden[b.tipo] : d;
  });

  const mensajes: string[] = [];
  if (diferencia === null) {
    mensajes.push(
      `Tu reparto es válido y su ${palabra} es ${fmt(propio)}. La optimización se detuvo sin confirmar el óptimo, así que no se puede medir qué tan lejos quedó.`,
    );
  } else if (esOptimo) {
    mensajes.push(
      `Tu reparto es óptimo: ningún otro ${maximizar ? 'gana más' : 'cuesta menos'} que ${fmt(propio)}. ` +
        'En un problema pequeño se puede lograr probando; los métodos sirven para llegar aquí siempre, también cuando la tabla es grande, y para demostrar que ya no se puede mejorar.',
    );
  } else {
    const cuanto = `${fmt(diferencia)}${brecha === null ? '' : ` (${fmt(brecha)} %)`}`;
    mensajes.push(
      `Tu reparto es válido y su ${palabra} es ${fmt(propio)}. El óptimo es ${fmt(optimo!)}: ` +
        (maximizar ? `dejaste de ganar ${cuanto}.` : `pagaste ${cuanto} de más.`),
    );
  }

  if (diferencia !== null) {
    const metodos = posiciones.filter((q) => q.tipo === 'metodo');
    const superados = metodos.filter((q) => lejania(q) > diferencia + EPS).map((q) => q.nombre);
    const empatados = metodos.filter((q) => Math.abs(lejania(q) - diferencia) <= EPS).map((q) => q.nombre);
    const mejores = metodos.filter((q) => lejania(q) < diferencia - EPS).map((q) => q.nombre);
    const partes: string[] = [];
    if (superados.length > 0) partes.push(`superaste a ${enumerar(superados)}`);
    if (empatados.length > 0) partes.push(`empataste con ${enumerar(empatados)}`);
    if (mejores.length > 0)
      partes.push(`${enumerar(mejores)} ${mejores.length === 1 ? 'quedó' : 'quedaron'} más cerca del óptimo`);
    const frase = partes.join('; ');
    mensajes.push(`Frente a la solución inicial de cada método: ${frase}.`);
  }

  const m = p.ofertas.length;
  const n = p.demandas.length;
  const rutas = evaluarReparto(p, x).rutas;
  if (rutas > m + n - 1) {
    mensajes.push(
      `Usaste ${rutas} rutas. En este problema siempre existe un reparto óptimo con a lo sumo ${m + n - 1} (orígenes + destinos − 1): los métodos nunca usan más.`,
    );
  }

  return { comparacion, total: propio, diferencia, brecha, esOptimo, posiciones, mensajes };
}
