import { describe, expect, it } from 'vitest';
import { optimizar } from '../src/core/caminoPiedras';
import { EJEMPLO_TAHA } from '../src/core/ejemplos';
import { resolverMetodo } from '../src/core/metodos';
import { aristasRed, grosorArista } from '../src/core/red';

const p = EJEMPLO_TAHA;
const inicial = resolverMetodo(p, 'noroeste');
const { pasos } = optimizar(inicial.problema, inicial.solucion);

describe('vista de red', () => {
  it('la tabla vacía no tiene rutas', () => {
    expect(aristasRed(inicial.pasos[0])).toEqual([]);
  });

  it('tras la primera asignación hay una ruta, que es la celda actual', () => {
    expect(aristasRed(inicial.pasos[1])).toEqual([
      { i: 0, j: 0, cantidad: 5, basica: true, signo: null, actual: true },
    ]);
  });

  it('en cada paso, las rutas con envío coinciden con las celdas de la tabla y suman lo mismo', () => {
    for (const paso of [...inicial.pasos, ...pasos]) {
      const aristas = aristasRed(paso);
      const enviado = aristas.reduce((t, a) => t + a.cantidad, 0);
      expect(enviado).toBe(paso.x.flat().reduce((a, b) => a + b, 0));
      const basicas = paso.basica.flat().filter(Boolean).length;
      expect(aristas.filter((a) => a.basica)).toHaveLength(basicas);
    }
  });

  it('la solución inicial completa reparte toda la oferta y la demanda', () => {
    const aristas = aristasRed(inicial.pasos[inicial.pasos.length - 1]);
    p.ofertas.forEach((oferta, i) => {
      expect(aristas.filter((a) => a.i === i).reduce((t, a) => t + a.cantidad, 0)).toBe(oferta);
    });
    p.demandas.forEach((demanda, j) => {
      expect(aristas.filter((a) => a.j === j).reduce((t, a) => t + a.cantidad, 0)).toBe(demanda);
    });
  });

  it('al entrar una celda, su camino cerrado se marca con signos alternos y la que entra no es básica', () => {
    const entrada = pasos.find((s) => s.tipo === 'ciclo')!;
    const aristas = aristasRed(entrada);
    const delCamino = aristas.filter((a) => a.signo);
    expect(delCamino).toHaveLength(entrada.ciclo!.length);
    expect(delCamino.filter((a) => a.signo === '+')).toHaveLength(entrada.ciclo!.length / 2);
    const entra = aristas.find((a) => a.actual)!;
    expect(entra).toMatchObject({ ...entrada.celda, basica: false, signo: '+', cantidad: 0 });
    // Cada nodo del camino tiene una ruta + y una −: por eso se conservan ofertas y demandas.
    for (const a of delCamino) {
      const enFila = delCamino.filter((b) => b.i === a.i).map((b) => b.signo);
      expect(enFila.sort()).toEqual(['+', '−']);
    }
  });

  it('el grosor crece con la cantidad y las rutas sin envío son finas', () => {
    expect(grosorArista(0, 15)).toBe(1.5);
    expect(grosorArista(15, 15)).toBe(10);
    expect(grosorArista(5, 15)).toBeLessThan(grosorArista(10, 15));
  });
});
