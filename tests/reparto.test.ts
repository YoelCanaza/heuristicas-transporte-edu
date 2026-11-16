import { describe, expect, it } from 'vitest';
import { balancear } from '../src/core/balanceo';
import { compararMetodos } from '../src/core/comparador';
import { crearAleatorio, EJEMPLO_TAHA, generarProblema } from '../src/core/ejemplos';
import { resolverMetodo } from '../src/core/metodos';
import { evaluarReparto, juzgarReparto } from '../src/core/reparto';
import type { Problema } from '../src/core/tipos';
import { leerCantidad } from '../src/ui/Reparto';
import { leerRuta } from '../src/ui/ruta';

/** Reparto óptimo del ejemplo de Taha (costo 435). */
const OPTIMO_TAHA = [
  [0, 5, 0, 10],
  [0, 10, 15, 0],
  [5, 0, 0, 5],
];

describe('evaluarReparto', () => {
  it('con la tabla vacía falta repartir toda la oferta', () => {
    const e = evaluarReparto(EJEMPLO_TAHA, [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(e.falta).toBe(50);
    expect(e.completo).toBe(false);
    expect(e.excesos).toEqual([]);
    expect(e.rutas).toBe(0);
  });

  it('reconoce un reparto completo', () => {
    const e = evaluarReparto(EJEMPLO_TAHA, OPTIMO_TAHA);
    expect(e.completo).toBe(true);
    expect(e.falta).toBe(0);
    expect(e.rutas).toBe(6);
  });

  it('señala la fila y la columna en las que se envió de más', () => {
    const e = evaluarReparto(EJEMPLO_TAHA, [
      [10, 0, 0, 10],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(e.excesos).toEqual([
      { tipo: 'fila', k: 0 },
      { tipo: 'columna', k: 0 },
    ]);
    expect(e.ofertaRestante[0]).toBe(-5);
    expect(e.demandaRestante[0]).toBe(-5);
    expect(e.completo).toBe(false);
  });
});

describe('juzgarReparto', () => {
  it('reconoce el reparto óptimo del ejemplo de Taha', () => {
    const v = juzgarReparto(EJEMPLO_TAHA, OPTIMO_TAHA);
    expect(v.total).toBe(435);
    expect(v.esOptimo).toBe(true);
    expect(v.brecha).toBe(0);
    expect(v.posiciones.map((q) => q.nombre)).toEqual([
      'Óptimo',
      'Tu reparto',
      'Costo Mínimo',
      'Aproximación de Vogel',
      'Esquina Noroeste',
    ]);
    expect(v.mensajes[0]).toContain('óptimo');
    expect(v.mensajes[1]).toContain('superaste a Costo Mínimo, Aproximación de Vogel y Esquina Noroeste');
  });

  it('mide cuánto de más cuesta un reparto peor y contra qué métodos queda', () => {
    // Se entrega como reparto propio la solución de Esquina Noroeste (520).
    const x = resolverMetodo(EJEMPLO_TAHA, 'noroeste').solucion.x;
    const v = juzgarReparto(EJEMPLO_TAHA, x);
    expect(v.total).toBe(520);
    expect(v.diferencia).toBe(85);
    expect(v.brecha).toBeCloseTo((85 / 435) * 100);
    expect(v.esOptimo).toBe(false);
    expect(v.mensajes[0]).toContain('pagaste 85');
    expect(v.mensajes[1]).toContain('empataste con Esquina Noroeste');
    expect(v.mensajes[1]).toContain('quedaron más cerca del óptimo');
    expect(v.posiciones[0].tipo).toBe('optimo');
  });

  it('avisa cuando se usan más rutas de las necesarias', () => {
    const p: Problema = {
      ofertas: [10, 10],
      demandas: [10, 10],
      costos: [
        [1, 5],
        [5, 1],
      ],
      origenes: ['O1', 'O2'],
      destinos: ['D1', 'D2'],
    };
    const v = juzgarReparto(p, [
      [5, 5],
      [5, 5],
    ]);
    expect(v.total).toBe(60);
    expect(v.diferencia).toBe(40);
    expect(v.mensajes.some((t) => t.includes('Usaste 4 rutas') && t.includes('a lo sumo 3'))).toBe(true);
  });

  it('en maximización la diferencia es lo que se dejó de ganar', () => {
    const p: Problema = {
      ofertas: [10, 10],
      demandas: [10, 10],
      costos: [
        [8, 2],
        [3, 9],
      ],
      origenes: ['O1', 'O2'],
      destinos: ['D1', 'D2'],
      objetivo: 'max',
    };
    const v = juzgarReparto(p, [
      [0, 10],
      [10, 0],
    ]);
    expect(v.total).toBe(50);
    expect(v.diferencia).toBe(120);
    expect(v.mensajes[0]).toContain('dejaste de ganar 120');
    expect(
      juzgarReparto(p, [
        [10, 0],
        [0, 10],
      ]).esOptimo,
    ).toBe(true);
  });

  it('se reparte sobre el problema balanceado, con el ficticio incluido', () => {
    const p: Problema = { ...EJEMPLO_TAHA, ofertas: [15, 25, 20] };
    const balanceado = balancear(p).problema;
    expect(balanceado.destinos).toHaveLength(5);
    const optima = compararMetodos(p).solucionOptima!;
    const v = juzgarReparto(p, optima.x);
    expect(evaluarReparto(balanceado, optima.x).completo).toBe(true);
    expect(v.esOptimo).toBe(true);
  });

  it('ningún reparto válido mejora el óptimo: la solución de cada método nunca queda por debajo', () => {
    const rand = crearAleatorio(2026);
    for (let k = 0; k < 40; k++) {
      const p = generarProblema(rand);
      const comparacion = compararMetodos(p);
      for (const metodo of ['noroeste', 'costoMinimo', 'vogel'] as const) {
        const v = juzgarReparto(p, resolverMetodo(p, metodo).solucion.x, comparacion);
        expect(v.diferencia).not.toBeNull();
        expect(v.total).toBeGreaterThanOrEqual(comparacion.optimo! - 1e-9);
        expect(v.posiciones[0].tipo).toBe('optimo');
      }
    }
  });
});

describe('pantalla Tu reparto', () => {
  it('lee las cantidades escritas', () => {
    expect(leerCantidad('')).toBe(0);
    expect(leerCantidad(' 12 ')).toBe(12);
    expect(leerCantidad('2,5')).toBe(2.5);
    expect(leerCantidad('-3')).toBeNull();
    expect(leerCantidad('abc')).toBeNull();
  });

  it('tiene su propia dirección', () => {
    expect(leerRuta('#/reparto').vista).toBe('reparto');
  });
});
