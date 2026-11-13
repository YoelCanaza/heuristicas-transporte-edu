import { describe, expect, it } from 'vitest';
import { balancear } from '../src/core/balanceo';
import { optimizar } from '../src/core/caminoPiedras';
import { calcularM, convertir } from '../src/core/conversion';
import { EJEMPLO_TAHA, crearAleatorio, generarProblema } from '../src/core/ejemplos';
import { resolverMetodo } from '../src/core/metodos';
import type { MetodoInicial } from '../src/core/metodos';
import type { Problema } from '../src/core/tipos';
import { fmtCosto, fmtTotal, prohibidasUsadas, suma } from '../src/core/util';
import { esProblema, validar } from '../src/core/validacion';

const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];
const resolver = (p: Problema, metodo: MetodoInicial) => {
  const inicial = resolverMetodo(p, metodo);
  return { inicial, final: optimizar(inicial.problema, inicial.solucion) };
};
const prohibir = (p: Problema, celdas: [number, number][]): Problema => ({
  ...p,
  prohibidas: p.costos.map((fila, i) => fila.map((_, j) => celdas.some(([a, b]) => a === i && b === j))),
});

describe('maximización de utilidades', () => {
  const pequeno: Problema = {
    ofertas: [10, 10],
    demandas: [10, 10],
    costos: [
      [5, 1],
      [2, 4],
    ],
    origenes: ['O1', 'O2'],
    destinos: ['D1', 'D2'],
    objetivo: 'max',
  };

  it('resuelve a mano un caso 2×2: la utilidad máxima es 90', () => {
    for (const metodo of METODOS) {
      const { inicial, final } = resolver(pequeno, metodo);
      expect(final.optimo).toBe(true);
      expect(final.costo).toBe(90);
      expect(inicial.problema.costos).toEqual([
        [0, 4],
        [3, 1],
      ]);
      expect(inicial.problema.utilidades).toEqual(pequeno.costos);
      expect(inicial.pasos.some((s) => s.tipo === 'conversion')).toBe(true);
      expect(final.pasos.at(-1)!.titulo).toBe('Solución óptima: utilidad 90');
    }
  });

  it('en problemas aleatorios los tres métodos llegan a la misma utilidad, nunca menor que la inicial', () => {
    for (let k = 0; k < 80; k++) {
      const base = generarProblema(crearAleatorio(500 + k), { familia: k % 2 ? 'desbalanceado' : 'uniforme' });
      const p: Problema = { ...base, objetivo: 'max' };
      const corridas = METODOS.map((metodo) => resolver(p, metodo));
      const utilidad = corridas[0].final.costo;
      for (const { inicial, final } of corridas) {
        expect(final.optimo).toBe(true);
        expect(final.costo).toBeCloseTo(utilidad);
        expect(final.costo).toBeGreaterThanOrEqual(inicial.costo - 1e-9);
      }
      // Coherencia con la conversión: utilidad = mayor·flujo − costo de oportunidad mínimo.
      const trabajo = corridas[0].inicial.problema;
      const oportunidad = trabajo.costos.flat().reduce((t, c, n) => t + c * corridas[0].final.solucion.x.flat()[n], 0);
      const mayor = Math.max(...balancear(p).problema.costos.flat());
      expect(utilidad).toBeCloseTo(mayor * suma(trabajo.ofertas) - oportunidad);
      // Maximizar no puede dar menos que minimizar los mismos números.
      expect(utilidad).toBeGreaterThanOrEqual(resolver(base, 'vogel').final.costo - 1e-9);
    }
  });

  it('el pivoteo explica el cambio de utilidad con el signo correcto', () => {
    const { final } = resolver({ ...EJEMPLO_TAHA, objetivo: 'max' }, 'noroeste');
    const pivoteos = final.pasos.filter((s) => s.tipo === 'pivoteo');
    expect(pivoteos.length).toBeGreaterThan(0);
    for (const s of pivoteos) expect(s.explicacion).toMatch(/Nueva utilidad = .* − θ·marginal/);
    const totales = final.pasos.map((s) => s.costoTotal);
    expect(totales).toEqual([...totales].sort((a, b) => a - b));
  });
});

describe('formato con la letra M', () => {
  const { problema } = convertir(prohibir(EJEMPLO_TAHA, [[0, 1]]));
  const M = problema.M!;

  it('escribe con M los valores que la contienen y deja igual los demás', () => {
    expect(fmtCosto(problema, M)).toBe('M');
    expect(fmtCosto(problema, M - 7)).toBe('M − 7');
    expect(fmtCosto(problema, -M + 3)).toBe('−M + 3');
    expect(fmtCosto(problema, 2 * M + 1.5)).toBe('2M + 1.5');
    expect(fmtCosto(problema, 18)).toBe('18');
    expect(fmtCosto(problema, -6)).toBe('-6');
    expect(fmtCosto(EJEMPLO_TAHA, 1000)).toBe('1000');
  });

  it('el total solo usa M cuando la solución envía por una ruta prohibida', () => {
    const x = EJEMPLO_TAHA.costos.map((fila) => fila.map(() => 0));
    x[1][0] = 100; // costo 12 · 100 = 1200: un total grande que no debe confundirse con M
    expect(fmtTotal(problema, x)).toBe('1200');
    x[0][1] = 3;
    expect(fmtTotal(problema, x)).toBe('3M + 1200');
  });

  it('ninguna explicación muestra el valor numérico de M, salvo el paso que lo define', () => {
    for (const metodo of METODOS) {
      const { inicial, final } = resolver(
        prohibir(EJEMPLO_TAHA, [
          [0, 0],
          [1, 2],
        ]),
        metodo,
      );
      const detallado = optimizar(inicial.problema, inicial.solucion, { detallado: true });
      const pasos = [...inicial.pasos, ...final.pasos, ...detallado.pasos].filter((s) => s.tipo !== 'conversion');
      const cifras = new RegExp(`\\b${String(inicial.problema.M).slice(0, -1)}\\d\\b|\\b9{2}\\d\\b`);
      for (const s of pasos) expect(`${s.titulo} ${s.explicacion}`).not.toMatch(cifras);
      expect(pasos.some((s) => /\bM\b/.test(s.explicacion))).toBe(true);
    }
  });
});

describe('rutas prohibidas', () => {
  it('el óptimo evita la ruta prohibida y no mejora al óptimo sin prohibiciones', () => {
    // En el óptimo de Taha (435) se usa (O1, D2); al prohibirla el costo debe subir.
    const p = prohibir(EJEMPLO_TAHA, [[0, 1]]);
    for (const metodo of METODOS) {
      const { inicial, final } = resolver(p, metodo);
      expect(final.optimo).toBe(true);
      expect(prohibidasUsadas(inicial.problema, final.solucion.x)).toEqual([]);
      expect(final.costo).toBeGreaterThan(435);
      expect(final.costo).toBe(resolver(p, 'vogel').final.costo);
      expect(inicial.problema.M).toBeGreaterThan(20 * 50);
      expect(inicial.pasos.find((s) => s.tipo === 'conversion')!.titulo).toBe('Rutas prohibidas: costo M');
    }
  });

  it('coincide con poner a mano un costo enorme en esas rutas', () => {
    for (let k = 0; k < 60; k++) {
      const rand = crearAleatorio(900 + k);
      const base = generarProblema(rand, { tamano: 'pequeno' });
      const i = Math.floor(rand() * base.ofertas.length);
      const j = Math.floor(rand() * base.demandas.length);
      const conM = resolver(prohibir(base, [[i, j]]), 'vogel');
      const aMano: Problema = {
        ...base,
        costos: base.costos.map((fila, a) => fila.map((c, b) => (a === i && b === j ? 1e7 : c))),
      };
      const referencia = resolver(aMano, 'vogel');
      expect(conM.final.optimo && referencia.final.optimo).toBe(true);
      if (referencia.final.solucion.x[i][j] > 0) {
        expect(prohibidasUsadas(conM.inicial.problema, conM.final.solucion.x)).toEqual([{ i, j }]);
      } else {
        expect(conM.final.costo).toBeCloseTo(referencia.final.costo);
      }
    }
  });

  it('avisa cuando no existe solución sin usar rutas prohibidas', () => {
    const p = prohibir(
      {
        ofertas: [15, 5],
        demandas: [10, 10],
        costos: [
          [1, 2],
          [3, 4],
        ],
        origenes: ['O1', 'O2'],
        destinos: ['D1', 'D2'],
      },
      [[0, 0]],
    );
    expect(validar(p)).toEqual([]);
    const { final } = resolver(p, 'costoMinimo');
    const ultimo = final.pasos.at(-1)!;
    expect(ultimo.titulo).toBe('No hay solución sin rutas prohibidas');
    expect(ultimo.explicacion).toMatch(/\(O1, D1\)/);
  });

  it('la Esquina Noroeste avisa si su solución inicial usa una ruta prohibida', () => {
    const { inicial } = resolver(prohibir(EJEMPLO_TAHA, [[0, 0]]), 'noroeste');
    expect(inicial.pasos.at(-1)!.explicacion).toMatch(/ruta prohibida \(O1, D1\)/);
  });

  it('el balanceo conserva las prohibiciones y la línea ficticia queda permitida', () => {
    const p = prohibir({ ...EJEMPLO_TAHA, ofertas: [15, 25, 20] }, [[2, 3]]);
    const { problema } = balancear(p);
    expect(problema.prohibidas!.map((f) => f.length)).toEqual([5, 5, 5]);
    expect(problema.prohibidas![2]).toEqual([false, false, false, true, false]);
    expect(resolver(p, 'vogel').final.optimo).toBe(true);
  });

  it('combina maximización y rutas prohibidas', () => {
    const p: Problema = { ...prohibir(EJEMPLO_TAHA, [[0, 2]]), objetivo: 'max' };
    const sinProhibir = resolver({ ...EJEMPLO_TAHA, objetivo: 'max' }, 'vogel').final;
    expect(sinProhibir.solucion.x[0][2]).toBeGreaterThan(0);
    for (const metodo of METODOS) {
      const { inicial, final } = resolver(p, metodo);
      expect(prohibidasUsadas(inicial.problema, final.solucion.x)).toEqual([]);
      expect(final.costo).toBeLessThan(sinProhibir.costo);
      expect(final.costo).toBe(resolver(p, 'vogel').final.costo);
    }
  });

  it('valida los datos y la forma del problema guardado', () => {
    expect(
      validar(
        prohibir(EJEMPLO_TAHA, [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3],
        ]),
      ),
    ).toEqual(['Cada origen y cada destino necesita al menos una ruta permitida.']);
    const guardado = JSON.parse(JSON.stringify({ ...prohibir(EJEMPLO_TAHA, [[1, 1]]), objetivo: 'max' }));
    expect(esProblema(guardado)).toBe(true);
    expect(esProblema({ ...guardado, prohibidas: [[true]] })).toBe(false);
    expect(esProblema({ ...guardado, objetivo: 'otro' })).toBe(false);
  });

  it('M supera a cualquier costo alcanzable y un problema ya convertido no se convierte otra vez', () => {
    expect(calcularM([20, 3], 65)).toBe(10000);
    expect(calcularM([1], 2)).toBe(1000);
    expect(calcularM([400], 2)).toBe(10000);
    const { problema } = convertir(prohibir(EJEMPLO_TAHA, [[0, 0]]));
    expect(convertir(problema)).toEqual({ problema, explicacion: null });
    expect(convertir(EJEMPLO_TAHA).explicacion).toBeNull();
  });
});
