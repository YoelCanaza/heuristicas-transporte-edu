import type { Problema } from './tipos';
import { EPS, fmt, suma } from './util';

export interface Balanceo {
  problema: Problema;
  ficticio: 'origen' | 'destino' | null;
  explicacion: string;
}

export function balancear(p: Problema): Balanceo {
  const oferta = suma(p.ofertas);
  const demanda = suma(p.demandas);
  const diferencia = oferta - demanda;
  const valor = p.objetivo === 'max' ? 'utilidad' : 'costo';

  if (Math.abs(diferencia) <= EPS) {
    return {
      problema: p,
      ficticio: null,
      explicacion: `El problema está balanceado: oferta total = demanda total = ${fmt(oferta)}.`,
    };
  }

  if (diferencia > 0) {
    return {
      problema: {
        ...p,
        demandas: [...p.demandas, diferencia],
        costos: p.costos.map((fila) => [...fila, 0]),
        destinos: [...p.destinos, 'Ficticio'],
        prohibidas: p.prohibidas?.map((fila) => [...fila, false]),
      },
      ficticio: 'destino',
      explicacion:
        `La oferta total (${fmt(oferta)}) supera a la demanda total (${fmt(demanda)}). ` +
        `Se agrega un destino ficticio con demanda ${fmt(diferencia)} y ${valor} 0: ` +
        'lo que se "envía" ahí es oferta que en realidad se queda sin despachar.',
    };
  }

  return {
    problema: {
      ...p,
      ofertas: [...p.ofertas, -diferencia],
      costos: [...p.costos.map((fila) => [...fila]), p.demandas.map(() => 0)],
      origenes: [...p.origenes, 'Ficticio'],
      prohibidas: p.prohibidas && [...p.prohibidas.map((fila) => [...fila]), p.demandas.map(() => false)],
    },
    ficticio: 'origen',
    explicacion:
      `La demanda total (${fmt(demanda)}) supera a la oferta total (${fmt(oferta)}). ` +
      `Se agrega un origen ficticio con oferta ${fmt(-diferencia)} y ${valor} 0: ` +
      'lo que "sale" de él es demanda que quedará insatisfecha.',
  };
}
