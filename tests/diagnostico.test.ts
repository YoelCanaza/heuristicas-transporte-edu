import { describe, expect, it } from 'vitest';
import { optimizar } from '../src/core/caminoPiedras';
import { diagnosticarAsignacion, diagnosticarEntrada, validarTrazo } from '../src/core/diagnostico';
import { EJEMPLO_TAHA } from '../src/core/ejemplos';
import { resolverMetodo } from '../src/core/metodos';

const p = EJEMPLO_TAHA;

describe('diagnóstico de la asignación', () => {
  it('Esquina Noroeste: distingue quien eligió por costo de quien se desvió de fila o columna', () => {
    const { pasos } = resolverMetodo(p, 'noroeste');
    const correcta = pasos[1].celda!;
    expect(correcta).toEqual({ i: 0, j: 0 });
    expect(diagnosticarAsignacion(p, pasos[0], null, correcta, { i: 0, j: 1 }, 'noroeste')).toMatch(
      /no mira los costos/,
    );
    expect(diagnosticarAsignacion(p, pasos[0], null, correcta, { i: 1, j: 0 }, 'noroeste')).toMatch(/columna correcta/);
    expect(diagnosticarAsignacion(p, pasos[0], null, correcta, { i: 0, j: 2 }, 'noroeste')).toMatch(/fila correcta/);
  });

  it('Costo Mínimo: reconoce la esquina noroeste y el mínimo de una sola fila', () => {
    const { pasos } = resolverMetodo(p, 'costoMinimo');
    const correcta = pasos[1].celda!;
    expect(correcta).toEqual({ i: 0, j: 1 });
    expect(diagnosticarAsignacion(p, pasos[0], null, correcta, { i: 0, j: 0 }, 'costoMinimo')).toMatch(
      /esquina noroeste/,
    );
    expect(diagnosticarAsignacion(p, pasos[0], null, correcta, { i: 2, j: 0 }, 'costoMinimo')).toMatch(
      /más barata de su fila/,
    );
    expect(diagnosticarAsignacion(p, pasos[0], null, correcta, { i: 1, j: 3 }, 'costoMinimo')).toMatch(/más baratas/);
  });

  it('Vogel: usa las penalizaciones del paso de análisis', () => {
    const { pasos } = resolverMetodo(p, 'vogel');
    const [estado, analisis, asignacion] = pasos;
    expect(analisis.tipo).toBe('penalizaciones');
    expect(analisis.lineaElegida).toEqual({ tipo: 'fila', k: 2 });
    const correcta = asignacion.celda!;
    expect(correcta).toEqual({ i: 2, j: 0 });
    expect(diagnosticarAsignacion(p, estado, analisis, correcta, { i: 0, j: 1 }, 'vogel')).toMatch(
      /como haría el Costo Mínimo/,
    );
    expect(diagnosticarAsignacion(p, estado, analisis, correcta, { i: 2, j: 1 }, 'vogel')).toMatch(/línea correcta/);
    expect(diagnosticarAsignacion(p, estado, analisis, correcta, { i: 1, j: 2 }, 'vogel')).toMatch(
      /penalización mayor/,
    );
  });

  it('avisa si la celda está en una línea tachada', () => {
    const { pasos } = resolverMetodo(p, 'noroeste');
    // Tras la primera asignación (O1, D1) = 5 queda tachada la columna D1.
    expect(diagnosticarAsignacion(p, pasos[1], null, pasos[2].celda!, { i: 1, j: 0 }, 'noroeste')).toMatch(
      /columna D1 ya está tachada/,
    );
  });
});

describe('diagnóstico de la celda que entra', () => {
  const inicial = resolverMetodo(p, 'noroeste');
  const { pasos } = optimizar(inicial.problema, inicial.solucion);
  const k = pasos.findIndex((s) => s.tipo === 'ciclo');
  const estado = pasos[k - 1];
  const entrada = pasos[k];
  const diag = (c: { i: number; j: number }) => diagnosticarEntrada(p, estado, entrada.marginales!, entrada.celda!, c);

  it('la primera celda que entra es (O3, D1) con marginal −9', () => {
    expect(entrada.celda).toEqual({ i: 2, j: 0 });
    expect(entrada.marginales![2][0]).toBe(-9);
  });

  it('explica cada tipo de error', () => {
    expect(diag({ i: 0, j: 0 })).toMatch(/ya es básica/);
    expect(diag({ i: 0, j: 2 })).toMatch(/aumentaría el costo.*\+16/);
    expect(diag({ i: 0, j: 3 })).toMatch(/también reduciría el costo \(-4/);
  });

  describe('trazado del camino cerrado', () => {
    const ciclo = entrada.ciclo!;
    const basica = estado.basica;

    it.each([
      ['en un sentido', ciclo.slice(1)],
      ['en el sentido contrario', ciclo.slice(1).reverse()],
    ])('acepta el camino completo %s', (_, clics) => {
      const trazo = [ciclo[0]];
      clics.forEach((c, n) => {
        const r = validarTrazo(basica, ciclo, trazo, c);
        expect(r).toEqual({ ok: true, completo: n === clics.length - 1 });
        trazo.push(c);
      });
    });

    it('rechaza girar en una celda vacía', () => {
      const r = validarTrazo(basica, ciclo, [ciclo[0]], { i: 2, j: 1 });
      expect(r.ok === false && r.motivo).toMatch(/vacía/);
    });

    it('rechaza un salto en diagonal', () => {
      const r = validarTrazo(basica, ciclo, [ciclo[0]], { i: 1, j: 1 });
      expect(r.ok === false && r.motivo).toMatch(/línea recta/);
    });

    it('rechaza dos movimientos seguidos en la misma dirección', () => {
      // Tras bajar o subir por la columna de la celda que entra, se intenta seguir por esa misma columna.
      const vertical = ciclo.slice(1).find((c) => c.j === ciclo[0].j)!;
      const otraEnColumna = { i: vertical.i === 0 ? 1 : 0, j: vertical.j };
      const r = validarTrazo(
        basica.map((f, i) => f.map((b, j) => b || (i === otraEnColumna.i && j === otraEnColumna.j))),
        ciclo,
        [ciclo[0], vertical],
        otraEnColumna,
      );
      expect(r.ok === false && r.motivo).toMatch(/gira en ángulo recto/);
    });

    it('rechaza una piedra alineada desde la que el camino no cierra', () => {
      // Desde (O1, D1), en la fila O1 la piedra correcta es (O1, D2); se inventa otra básica en (O1, D3).
      const vertical = ciclo.slice(1).find((c) => c.j === ciclo[0].j)!;
      const falsa = { i: vertical.i, j: 2 };
      const r = validarTrazo(
        basica.map((f, i) => f.map((b, j) => b || (i === falsa.i && j === falsa.j))),
        ciclo,
        [ciclo[0], vertical],
        falsa,
      );
      expect(r.ok === false && r.motivo).toMatch(/no se puede cerrar/);
    });

    it('rechaza repetir una celda', () => {
      const r = validarTrazo(basica, ciclo, [ciclo[0], ciclo[1]], ciclo[0]);
      expect(r.ok === false && r.motivo).toMatch(/Ya pasaste/);
    });
  });
});
