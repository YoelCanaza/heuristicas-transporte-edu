import { describe, expect, it } from 'vitest';
import { balancear } from '../src/core/balanceo';
import { buscarCiclo, optimizar } from '../src/core/caminoPiedras';
import { comparar } from '../src/core/comparacion';
import { EJEMPLO_TAHA, crearAleatorio, generarProblema, nombres } from '../src/core/ejemplos';
import { PRESETS, selectorPersonalizado } from '../src/core/heuristica';
import { SELECTOR, resolverMetodo } from '../src/core/metodos';
import type { MetodoInicial } from '../src/core/metodos';
import { resolverInicial } from '../src/core/metodos';
import type { Problema, Solucion } from '../src/core/tipos';

const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];

function contarBasicas(s: Solucion): number {
  return s.basica.flat().filter(Boolean).length;
}

function esFactible(p: Problema, s: Solucion): boolean {
  const ok = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  return (
    p.ofertas.every((o, i) => ok(s.x[i].reduce((a, b) => a + b, 0), o)) &&
    p.demandas.every((d, j) => ok(s.x.reduce((a, f) => a + f[j], 0), d)) &&
    s.x.flat().every((v) => v >= 0)
  );
}

describe('ejemplo de Taha', () => {
  it.each([
    ['noroeste', 520],
    ['costoMinimo', 475],
    ['vogel', 475],
  ] as const)('%s da costo %i', (metodo, costo) => {
    const r = resolverMetodo(EJEMPLO_TAHA, metodo);
    expect(r.costo).toBe(costo);
    expect(contarBasicas(r.solucion)).toBe(6);
    expect(esFactible(r.problema, r.solucion)).toBe(true);
  });

  it.each(METODOS)('optimizar desde %s llega a 435', (metodo) => {
    const r = resolverMetodo(EJEMPLO_TAHA, metodo);
    const opt = optimizar(r.problema, r.solucion, { detallado: true });
    expect(opt.costo).toBe(435);
    expect(opt.pasos.at(-1)?.tipo).toBe('optimo');
    expect(esFactible(r.problema, opt.solucion)).toBe(true);
  });
});

describe('balanceo', () => {
  const base = { costos: [[1, 2], [3, 4]], origenes: nombres('O', 2), destinos: nombres('D', 2) };

  it('agrega destino ficticio si sobra oferta', () => {
    const b = balancear({ ...base, ofertas: [30, 20], demandas: [10, 25] });
    expect(b.ficticio).toBe('destino');
    expect(b.problema.demandas).toEqual([10, 25, 15]);
    expect(b.problema.costos[0]).toEqual([1, 2, 0]);
  });

  it('agrega origen ficticio si falta oferta', () => {
    const b = balancear({ ...base, ofertas: [10, 5], demandas: [10, 25] });
    expect(b.ficticio).toBe('origen');
    expect(b.problema.ofertas).toEqual([10, 5, 20]);
  });
});

describe('degeneración', () => {
  it('Esquina Noroeste mantiene m+n−1 básicas cuando oferta y demanda se agotan juntas', () => {
    const p: Problema = {
      ofertas: [10, 10, 10],
      demandas: [10, 10, 10],
      costos: [[1, 5, 9], [4, 2, 8], [7, 6, 3]],
      origenes: nombres('O', 3),
      destinos: nombres('D', 3),
    };
    const r = resolverMetodo(p, 'noroeste');
    expect(contarBasicas(r.solucion)).toBe(5);
    expect(r.costo).toBe(60);
    expect(optimizar(r.problema, r.solucion).costo).toBe(60);
  });
});

describe('camino cerrado', () => {
  it('encuentra el ciclo de una celda no básica en la solución de Esquina Noroeste', () => {
    const r = resolverMetodo(EJEMPLO_TAHA, 'noroeste');
    const ciclo = buscarCiclo(r.solucion.basica, { i: 0, j: 2 })!;
    expect(ciclo).toEqual([
      { i: 0, j: 2 },
      { i: 0, j: 1 },
      { i: 1, j: 1 },
      { i: 1, j: 2 },
    ]);
  });
});

describe('propiedades en instancias aleatorias', () => {
  const rand = crearAleatorio(2026);
  const problemas = Array.from({ length: 200 }, () => generarProblema(rand));

  it('todas las heurísticas son factibles, con m+n−1 básicas, y convergen al mismo óptimo', () => {
    for (const p of problemas) {
      const optimos = METODOS.map((metodo) => {
        const r = resolverMetodo(p, metodo);
        expect(esFactible(r.problema, r.solucion)).toBe(true);
        expect(contarBasicas(r.solucion)).toBe(p.ofertas.length + p.demandas.length - 1);
        const opt = optimizar(r.problema, r.solucion);
        expect(opt.costo).toBeLessThanOrEqual(r.costo + 1e-9);
        expect(esFactible(r.problema, opt.solucion)).toBe(true);
        return opt.costo;
      });
      expect(optimos[1]).toBeCloseTo(optimos[0]);
      expect(optimos[2]).toBeCloseTo(optimos[0]);
    }
  });

  it('los presets de la heurística del usuario reproducen los métodos clásicos', () => {
    for (const p of problemas.slice(0, 50)) {
      for (const metodo of METODOS) {
        const clasico = resolverInicial(p, SELECTOR[metodo], metodo);
        const propio = resolverInicial(p, selectorPersonalizado(PRESETS[metodo]), metodo);
        expect(propio.solucion.x).toEqual(clasico.solucion.x);
      }
    }
  });
});

describe('comparación', () => {
  it('es reproducible con la misma semilla', () => {
    const competidores = METODOS.map((id) => ({ id, nombre: id, selector: SELECTOR[id] }));
    const a = comparar(competidores, 30, 7);
    const b = comparar(competidores, 30, 7);
    expect(a).toEqual(b);
    expect(a.filas.find((f) => f.id === 'noroeste')!.brechaPromedio).toBeGreaterThan(
      a.filas.find((f) => f.id === 'vogel')!.brechaPromedio,
    );
  });
});
