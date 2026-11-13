import { describe, expect, it } from 'vitest';
import { buscarCiclo, completarBase, costoMarginal, optimizar } from '../src/core/caminoPiedras';
import { EJEMPLO_TAHA, crearAleatorio, generarProblema } from '../src/core/ejemplos';
import type { Familia } from '../src/core/ejemplos';
import { resolverMetodo } from '../src/core/metodos';
import type { MetodoInicial } from '../src/core/metodos';
import { calcularPotenciales, marginalesModi } from '../src/core/modi';
import type { Problema } from '../src/core/tipos';
import { copiar } from '../src/core/util';

const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];
const FAMILIAS: Familia[] = ['uniforme', 'geografico', 'desbalanceado', 'degenerado'];

/** Solución inicial con la base ya completa (m + n − 1 celdas básicas). */
function baseInicial(p: Problema, metodo: MetodoInicial) {
  const r = resolverMetodo(p, metodo);
  const sol = { x: copiar(r.solucion.x), basica: copiar(r.solucion.basica) };
  completarBase(r.problema, sol);
  return { problema: r.problema, sol };
}

describe('potenciales u y v', () => {
  it('cumplen u + v = costo en todas las celdas básicas y parten de u = 0', () => {
    const { problema, sol } = baseInicial(EJEMPLO_TAHA, 'noroeste');
    const pot = calcularPotenciales(problema, sol.basica);
    expect(pot.u[0]).toBe(0);
    sol.basica.forEach((fila, i) =>
      fila.forEach((basica, j) => {
        if (basica) expect(pot.u[i] + pot.v[j]).toBe(problema.costos[i][j]);
      }),
    );
  });

  it('dan los valores del libro para la Esquina Noroeste del ejemplo de Taha', () => {
    const { problema, sol } = baseInicial(EJEMPLO_TAHA, 'noroeste');
    const pot = calcularPotenciales(problema, sol.basica);
    expect(pot.u).toEqual([0, 5, 3]);
    expect(pot.v).toEqual([10, 2, 4, 15]);
  });

  it('explican cada valor con la celda básica que lo despeja', () => {
    const { problema, sol } = baseInicial(EJEMPLO_TAHA, 'vogel');
    const { orden } = calcularPotenciales(problema, sol.basica);
    expect(orden).toHaveLength(problema.ofertas.length + problema.demandas.length);
    expect(orden[0]).toEqual({ linea: { tipo: 'fila', k: 0 }, valor: 0, celda: null });
    orden.slice(1).forEach((d) => expect(sol.basica[d.celda!.i][d.celda!.j]).toBe(true));
  });
});

describe('MODI frente al Camino de las Piedras', () => {
  it('calcula los mismos costos marginales en problemas generados', () => {
    const rand = crearAleatorio(2026);
    for (let k = 0; k < 60; k++) {
      const p = generarProblema(rand, { familia: FAMILIAS[k % FAMILIAS.length] });
      const { problema, sol } = baseInicial(p, METODOS[k % METODOS.length]);
      const marginales = marginalesModi(problema, sol.basica, calcularPotenciales(problema, sol.basica));
      marginales.forEach((fila, i) =>
        fila.forEach((valor, j) => {
          if (sol.basica[i][j]) return expect(valor).toBeNull();
          const ciclo = buscarCiclo(sol.basica, { i, j })!;
          expect(valor).toBeCloseTo(costoMarginal(problema, ciclo), 6);
        }),
      );
    }
  });

  it('recorre las mismas soluciones y llega al mismo óptimo', () => {
    const rand = crearAleatorio(7);
    for (let k = 0; k < 60; k++) {
      const p = generarProblema(rand, { familia: FAMILIAS[k % FAMILIAS.length] });
      const r = resolverMetodo(p, METODOS[k % METODOS.length]);
      const piedras = optimizar(r.problema, r.solucion);
      const modi = optimizar(r.problema, r.solucion, { metodo: 'modi' });
      expect(modi.optimo).toBe(piedras.optimo);
      expect(modi.iteraciones).toBe(piedras.iteraciones);
      expect(modi.costo).toBeCloseTo(piedras.costo, 6);
      expect(modi.solucion).toEqual(piedras.solucion);
    }
  });

  it.each(METODOS)('optimiza el ejemplo de Taha desde %s hasta 435', (metodo) => {
    const r = resolverMetodo(EJEMPLO_TAHA, metodo);
    const opt = optimizar(r.problema, r.solucion, { metodo: 'modi', detallado: true });
    expect(opt.costo).toBe(435);
    expect(opt.pasos.at(-1)?.tipo).toBe('optimo');
  });
});

describe('pasos de MODI', () => {
  const r = resolverMetodo(EJEMPLO_TAHA, 'noroeste');
  const { pasos, iteraciones } = optimizar(r.problema, r.solucion, { metodo: 'modi' });

  it('calcula u y v una vez por base, antes de elegir la celda que entra', () => {
    expect(pasos.filter((p) => p.tipo === 'potenciales')).toHaveLength(iteraciones + 1);
    pasos.forEach((p, k) => {
      if (p.tipo === 'ciclo' || p.tipo === 'optimo') expect(pasos[k - 1].tipo).toBe('potenciales');
    });
  });

  it('el paso de u y v no adelanta los costos marginales (el modo práctica los pregunta)', () => {
    pasos
      .filter((p) => p.tipo === 'potenciales')
      .forEach((p) => {
        expect(p.u).toBeDefined();
        expect(p.v).toBeDefined();
        expect(p.marginales).toBeUndefined();
      });
  });

  it('solo traza el camino cerrado de la celda que entra', () => {
    const detallado = optimizar(r.problema, r.solucion, { metodo: 'modi', detallado: true }).pasos;
    expect(detallado.filter((p) => p.tipo === 'evaluacion').every((p) => !p.ciclo)).toBe(true);
    expect(detallado.filter((p) => p.tipo === 'ciclo').every((p) => p.ciclo && p.u && p.marginales)).toBe(true);
  });

  it('el Camino de las Piedras no muestra u ni v', () => {
    expect(optimizar(r.problema, r.solucion).pasos.every((p) => !p.u && !p.v)).toBe(true);
  });

  it('escribe con la letra M los valores u y v de un problema con rutas prohibidas', () => {
    const prohibido: Problema = {
      ...EJEMPLO_TAHA,
      prohibidas: EJEMPLO_TAHA.costos.map((fila, i) => fila.map((_, j) => i === 0 && j === 0)),
    };
    const ini = resolverMetodo(prohibido, 'noroeste');
    const primero = optimizar(ini.problema, ini.solucion, { metodo: 'modi' }).pasos.find(
      (p) => p.tipo === 'potenciales',
    )!;
    expect(primero.explicacion).toContain('M');
    expect(primero.explicacion).not.toContain(String(ini.problema.M));
  });
});
