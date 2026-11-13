import { describe, expect, it } from 'vitest';
import { compararMetodos, enumerar } from '../src/core/comparador';
import { EJEMPLO_TAHA, crearAleatorio, generarProblema } from '../src/core/ejemplos';
import type { Familia } from '../src/core/ejemplos';
import type { Problema } from '../src/core/tipos';
import { marcasEje } from '../src/ui/GraficoTrayectorias';

const FAMILIAS: Familia[] = ['uniforme', 'geografico', 'desbalanceado', 'degenerado'];
const prohibir = (p: Problema, celdas: [number, number][]): Problema => ({
  ...p,
  prohibidas: p.costos.map((fila, i) => fila.map((_, j) => celdas.some(([a, b]) => a === i && b === j))),
});
const valores = (c: ReturnType<typeof compararMetodos>, k: number) => c.filas[k].trayectoria.map((q) => q.valor);

describe('comparador de métodos: ejemplo de Taha', () => {
  const c = compararMetodos(EJEMPLO_TAHA);

  it('registra el costo después de cada iteración', () => {
    expect(c.optimo).toBe(435);
    expect(c.filas.map((f) => f.metodo)).toEqual(['noroeste', 'costoMinimo', 'vogel']);
    expect(valores(c, 0)).toEqual([520, 475, 475, 435]);
    expect(valores(c, 1)).toEqual([475, 435]);
    expect(valores(c, 2)).toEqual([475, 435]);
    expect(c.filas.map((f) => f.iteraciones)).toEqual([3, 1, 1]);
  });

  it('mide la brecha de cada solución inicial respecto del óptimo', () => {
    expect(c.filas[0].brecha).toBeCloseTo(((520 - 435) / 435) * 100, 6);
    expect(c.filas[1].brecha).toBeCloseTo(((475 - 435) / 435) * 100, 6);
    expect(c.filas.every((f) => !f.inicialOptima)).toBe(true);
  });

  it('explica cuál empieza mejor y cuál peor', () => {
    expect(c.interpretacion).toContain('La mejor solución inicial es la de Costo Mínimo y Aproximación de Vogel');
    expect(c.interpretacion).toContain('La más alejada es la de Esquina Noroeste');
    expect(c.interpretacion).toContain('3 iteraciones');
  });
});

describe('comparador de métodos: propiedades', () => {
  it('cada recorrido baja (o se mantiene) y termina en el mismo óptimo', () => {
    const rand = crearAleatorio(31);
    for (let k = 0; k < 40; k++) {
      const c = compararMetodos(generarProblema(rand, { familia: FAMILIAS[k % FAMILIAS.length] }));
      expect(c.optimo).not.toBeNull();
      for (const f of c.filas) {
        const v = f.trayectoria.map((q) => q.valor);
        expect(v).toHaveLength(f.iteraciones + 1);
        v.slice(1).forEach((x, i) => expect(x).toBeLessThanOrEqual(v[i] + 1e-6));
        expect(v.at(-1)).toBeCloseTo(c.optimo!, 6);
        expect(f.brecha === null || f.brecha >= 0).toBe(true);
        expect(f.inicialOptima).toBe(Math.abs(v[0] - c.optimo!) < 1e-6);
      }
    }
  });

  it('en maximización el recorrido sube hasta la utilidad óptima', () => {
    const c = compararMetodos({ ...EJEMPLO_TAHA, objetivo: 'max' });
    expect(c.optimo).toBe(835);
    for (const f of c.filas) {
      const v = f.trayectoria.map((q) => q.valor);
      v.slice(1).forEach((x, i) => expect(x).toBeGreaterThanOrEqual(v[i] - 1e-6));
      expect(v.at(-1)).toBe(835);
    }
    expect(c.filas[0].brecha).toBeCloseTo(((835 - 520) / 835) * 100, 6);
    expect(c.filas[1].inicialOptima).toBe(true);
    expect(c.interpretacion).toContain('dan directamente la solución óptima (utilidad 835)');
  });
});

describe('comparador de métodos: rutas prohibidas', () => {
  it('no calcula la brecha de una solución inicial que usa una ruta prohibida', () => {
    const c = compararMetodos(prohibir(EJEMPLO_TAHA, [[0, 0]]));
    const noroeste = c.filas[0];
    expect(noroeste.trayectoria[0].prohibida).toBe(true);
    expect(noroeste.trayectoria[0].texto).toBe('5M + 470');
    expect(noroeste.brecha).toBeNull();
    expect(noroeste.trayectoria.at(-1)!.prohibida).toBe(false);
    expect(c.optimo).toBe(435);
    expect(c.sinSolucion).toBe(false);
    expect(c.interpretacion).toContain('usa una ruta prohibida');
  });

  it('avisa cuando no existe solución sin rutas prohibidas', () => {
    const p: Problema = {
      ofertas: [10, 10, 10],
      demandas: [5, 10, 15],
      costos: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      origenes: ['O1', 'O2', 'O3'],
      destinos: ['D1', 'D2', 'D3'],
    };
    // O1 y O2 solo pueden enviar a D1, que pide menos de lo que ofrecen entre los dos.
    const c = compararMetodos(
      prohibir(p, [
        [0, 1],
        [0, 2],
        [1, 1],
        [1, 2],
      ]),
    );
    expect(c.sinSolucion).toBe(true);
    expect(c.optimo).toBeNull();
    expect(c.filas.every((f) => f.brecha === null)).toBe(true);
    expect(c.interpretacion).toContain('no existe ninguna solución válida');
  });
});

describe('apoyos del gráfico', () => {
  it('enumera nombres en español', () => {
    expect(enumerar(['A'])).toBe('A');
    expect(enumerar(['A', 'B'])).toBe('A y B');
    expect(enumerar(['A', 'B', 'C'])).toBe('A, B y C');
  });

  it('elige marcas redondas para el eje', () => {
    expect(marcasEje(428, 527)).toEqual([450, 500]);
    expect(marcasEje(0, 100)).toEqual([0, 50, 100]);
    expect(marcasEje(0.2, 1.1)).toEqual([0.5, 1]);
    expect(marcasEje(7, 7)).toEqual([7]);
  });
});
