import { describe, expect, it } from 'vitest';
import { celdasAlternativas, mismaSolucion, pasarAOptimoAlternativo } from '../src/core/alternativos';
import { optimizar } from '../src/core/caminoPiedras';
import type { Optimizador } from '../src/core/caminoPiedras';
import { crearAleatorio, EJEMPLO_TAHA, generarProblema } from '../src/core/ejemplos';
import { resolverMetodo } from '../src/core/metodos';
import type { Paso, Problema } from '../src/core/tipos';
import { suma } from '../src/core/util';

function pasoOptimo(p: Problema, metodo: Optimizador = 'piedras') {
  const inicial = resolverMetodo(p, 'noroeste');
  const r = optimizar(inicial.problema, inicial.solucion, { metodo });
  return { problema: inicial.problema, paso: r.pasos[r.pasos.length - 1] };
}

/** Problema 2×2 con todos los costos iguales: cualquier reparto es óptimo. */
const EMPATADO: Problema = {
  ofertas: [10, 10],
  demandas: [10, 10],
  costos: [
    [3, 3],
    [3, 3],
  ],
  origenes: ['O1', 'O2'],
  destinos: ['D1', 'D2'],
};

function comprobar(p: Problema, antes: Paso, despues: Paso) {
  expect(despues.costoTotal).toBeCloseTo(antes.costoTotal);
  despues.x.forEach((fila, i) => expect(suma(fila)).toBeCloseTo(p.ofertas[i]));
  p.demandas.forEach((d, j) => expect(suma(despues.x.map((f) => f[j]))).toBeCloseTo(d));
  expect(despues.basica.flat().filter(Boolean)).toHaveLength(p.ofertas.length + p.demandas.length - 1);
  for (const v of despues.marginales!.flat()) if (v !== null) expect(v).toBeGreaterThanOrEqual(-1e-9);
  expect(despues.marginales![despues.sale!.i][despues.sale!.j]).toBeCloseTo(0);
}

describe('óptimos alternativos', () => {
  it('en un problema con todos los costos iguales ofrece las celdas vacías y mueve θ sin cambiar el costo', () => {
    const { problema, paso } = pasoOptimo(EMPATADO);
    const celdas = celdasAlternativas(problema, paso);
    expect(celdas).toEqual([{ i: 0, j: 1 }]);
    const otro = pasarAOptimoAlternativo(problema, paso, celdas[0]);
    comprobar(problema, paso, otro);
    expect(otro.theta).toBe(10);
    expect(otro.x).toEqual([
      [0, 10],
      [10, 0],
    ]);
    expect(otro.titulo).toContain('Otra solución óptima: costo 60');
    expect(otro.explicacion).toContain('entre 0 y 10');
  });

  it('volver por la celda que salió recupera la solución de partida', () => {
    const { problema, paso } = pasoOptimo(EMPATADO);
    const otro = pasarAOptimoAlternativo(problema, paso, celdasAlternativas(problema, paso)[0]);
    const vuelta = pasarAOptimoAlternativo(problema, otro, otro.sale!);
    expect(mismaSolucion(vuelta.x, paso.x)).toBe(true);
  });

  it('el ejemplo de Taha tiene un óptimo único en valor', () => {
    const { problema, paso } = pasoOptimo(EJEMPLO_TAHA);
    for (const c of celdasAlternativas(problema, paso)) {
      expect(pasarAOptimoAlternativo(problema, paso, c).costoTotal).toBe(435);
    }
  });

  it('no ofrece nada en un paso que no es el óptimo', () => {
    const inicial = resolverMetodo(EMPATADO, 'noroeste');
    expect(celdasAlternativas(inicial.problema, inicial.pasos[0])).toEqual([]);
  });

  it('en problemas con empates, cada cambio conserva factibilidad, total y optimalidad; MODI da los mismos marginales', () => {
    const rand = crearAleatorio(77);
    let probados = 0;
    for (let k = 0; k < 80; k++) {
      const p = generarProblema(rand, { familia: 'degenerado' });
      const piedras = pasoOptimo(p, 'piedras');
      const modi = pasoOptimo(p, 'modi');
      let actual = piedras.paso;
      let actualModi = modi.paso;
      for (let paso = 0; paso < 3; paso++) {
        const celdas = celdasAlternativas(piedras.problema, actual);
        if (celdas.length === 0) break;
        const siguiente = pasarAOptimoAlternativo(piedras.problema, actual, celdas[0]);
        comprobar(piedras.problema, actual, siguiente);
        if (
          mismaSolucion(
            actual.basica.map((f) => f.map(Number)),
            actualModi.basica.map((f) => f.map(Number)),
          )
        ) {
          const siguienteModi = pasarAOptimoAlternativo(modi.problema, actualModi, celdas[0]);
          expect(siguienteModi.u).toBeDefined();
          siguienteModi.marginales!.forEach((fila, i) =>
            fila.forEach((v, j) => {
              if (v !== null) expect(v).toBeCloseTo(siguiente.marginales![i][j]!);
            }),
          );
          actualModi = siguienteModi;
        }
        actual = siguiente;
        probados++;
      }
    }
    expect(probados).toBeGreaterThan(10);
  });
});
