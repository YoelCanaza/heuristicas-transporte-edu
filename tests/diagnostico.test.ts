import { describe, expect, it } from 'vitest';
import { optimizar } from '../src/core/caminoPiedras';
import {
  diagnosticarAsignacion,
  diagnosticarCantidad,
  diagnosticarEntrada,
  diagnosticarSalida,
  diagnosticarTachado,
  diagnosticarTheta,
  empataSalida,
  lineasTachadas,
  tachadoCorrecto,
  validarTrazo,
} from '../src/core/diagnostico';
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

describe('práctica completa: cantidad y línea que se tacha', () => {
  const { pasos } = resolverMetodo(p, 'noroeste');
  // Esquina Noroeste en el ejemplo de Taha: (O1, D1) = 5 y luego (O1, D2) = 10.
  const [inicio, primera, segunda] = pasos;

  it('acepta el menor entre la oferta y la demanda restantes', () => {
    expect(diagnosticarCantidad(p, inicio, primera.celda!, 5)).toBeNull();
    expect(diagnosticarCantidad(p, primera, segunda.celda!, 10)).toBeNull();
  });

  it('explica cada tipo de error en la cantidad', () => {
    const diag = (v: number) => diagnosticarCantidad(p, inicio, primera.celda!, v);
    expect(diag(15)).toMatch(/le quedan 15, pero D1 solo necesita 5/);
    expect(diag(8)).toMatch(/D1 solo necesita 5/);
    expect(diag(3)).toMatch(/Se puede asignar más/);
    expect(diag(NaN)).toMatch(/Escribe una cantidad/);
    // En la segunda asignación a O1 le quedan 10: responder 15 es usar la oferta original.
    expect(diagnosticarCantidad(p, primera, segunda.celda!, 15)).toMatch(/oferta original de O1.*le quedan 10/);
  });

  it('reconoce qué línea se tachó y explica el error contrario', () => {
    expect(lineasTachadas(inicio, primera)).toEqual([{ tipo: 'columna', k: 0 }]);
    expect(diagnosticarTachado(p, inicio, primera, 'columna')).toBeNull();
    expect(diagnosticarTachado(p, inicio, primera, 'fila')).toMatch(/A O1 todavía le quedan 10/);
    expect(diagnosticarTachado(p, inicio, primera, 'ambas')).toMatch(/se tacha solo su columna/);
    expect(lineasTachadas(primera, segunda)).toEqual([{ tipo: 'fila', k: 0 }]);
    expect(diagnosticarTachado(p, primera, segunda, 'columna')).toMatch(/A D2 todavía le faltan 5/);
  });

  it('en la última asignación se tachan las dos líneas', () => {
    const asignaciones = pasos.filter((s) => s.tipo === 'asignacion');
    const ultima = asignaciones[asignaciones.length - 1];
    const previo = pasos[pasos.indexOf(ultima) - 1];
    expect(tachadoCorrecto(previo, ultima)).toBe('ambas');
    expect(diagnosticarTachado(p, previo, ultima, 'fila')).toMatch(/última asignación/);
  });

  it('con degeneración solo se tacha una línea: la fila, salvo que sea la última', () => {
    const degenerado = {
      ...p,
      ofertas: [10, 20, 10],
      demandas: [10, 10, 10, 10],
    };
    const r = resolverMetodo(degenerado, 'noroeste');
    const [estado, asignacion] = r.pasos;
    expect(tachadoCorrecto(estado, asignacion)).toBe('fila');
    expect(diagnosticarTachado(degenerado, estado, asignacion, 'ambas')).toMatch(/degeneración.*menos de m \+ n − 1/);
    expect(diagnosticarTachado(degenerado, estado, asignacion, 'columna')).toMatch(/se tacha la fila O1/);
  });

  it('en cada asignación de los tres métodos la respuesta correcta coincide con la traza', () => {
    for (const metodo of ['noroeste', 'costoMinimo', 'vogel'] as const) {
      const traza = resolverMetodo(p, metodo).pasos;
      traza.forEach((s, k) => {
        if (s.tipo !== 'asignacion') return;
        const estado = traza[k - 1];
        const c = s.celda!;
        const q = s.x[c.i][c.j];
        expect(diagnosticarCantidad(p, estado, c, q)).toBeNull();
        expect(diagnosticarTachado(p, estado, s, tachadoCorrecto(estado, s))).toBeNull();
      });
    }
  });
});

describe('práctica completa: θ y celda que sale', () => {
  const inicial = resolverMetodo(p, 'noroeste');
  const { pasos } = optimizar(inicial.problema, inicial.solucion);
  const k = pasos.findIndex((s) => s.tipo === 'ciclo');
  const entrada = pasos[k];
  const negativas = entrada.ciclo!.filter((_, n) => n % 2 === 1);
  const positivas = entrada.ciclo!.filter((_, n) => n % 2 === 0 && n > 0);
  const x = (c: { i: number; j: number }) => entrada.x[c.i][c.j];

  it('el paso de entrada registra θ y la celda que sale', () => {
    expect(entrada.theta).toBe(Math.min(...negativas.map(x)));
    expect(x(entrada.sale!)).toBe(entrada.theta);
    // La celda que sale deja de ser básica en el paso siguiente.
    expect(pasos[k + 1].basica[entrada.sale!.i][entrada.sale!.j]).toBe(false);
  });

  it('diagnostica el valor de θ', () => {
    expect(diagnosticarTheta(p, entrada, entrada.theta!)).toBeNull();
    const mayor = negativas.map(x).find((v) => v > entrada.theta!)!;
    expect(diagnosticarTheta(p, entrada, mayor)).toMatch(/no el menor.*quedaría negativa/);
    expect(diagnosticarTheta(p, entrada, 9)).toMatch(/costo marginal/);
    expect(diagnosticarTheta(p, entrada, 1000)).toMatch(/quedaría negativa/);
    expect(diagnosticarTheta(p, entrada, 1)).toMatch(/Se puede mover más/);
  });

  it('diagnostica la celda que sale', () => {
    expect(diagnosticarSalida(p, entrada, entrada.sale!)).toBeNull();
    expect(diagnosticarSalida(p, entrada, entrada.celda!)).toMatch(/la celda que entra/);
    expect(diagnosticarSalida(p, entrada, positivas[0])).toMatch(/signo \+/);
    const sigue = negativas.find((c) => x(c) > entrada.theta!)!;
    expect(diagnosticarSalida(p, entrada, sigue)).toMatch(/sigue en la base/);
    const fuera = { i: 0, j: 2 };
    expect(entrada.ciclo!.some((c) => c.i === fuera.i && c.j === fuera.j)).toBe(false);
    expect(diagnosticarSalida(p, entrada, fuera)).toMatch(/vacía|no está en el camino/);
  });

  it('en un empate sale la primera celda del camino y la otra queda con ε', () => {
    const sol = {
      x: [
        [10, 0],
        [10, 10],
      ],
      basica: [
        [true, false],
        [true, true],
      ],
    };
    const q = {
      ofertas: [10, 20],
      demandas: [20, 10],
      costos: [
        [5, 1],
        [1, 5],
      ],
      origenes: ['O1', 'O2'],
      destinos: ['D1', 'D2'],
    };
    const paso = optimizar(q, sol).pasos.find((s) => s.tipo === 'ciclo')!;
    expect(paso.celda).toEqual({ i: 0, j: 1 });
    expect(paso.theta).toBe(10);
    const empatadas = paso.ciclo!.filter((_, n) => n % 2 === 1);
    expect(empatadas).toHaveLength(2);
    const otra = empatadas.find((c) => c !== paso.sale)!;
    expect(diagnosticarSalida(q, paso, otra)).toMatch(/también queda en 0.*se queda en la base con ε/);
    expect(empataSalida(paso, otra)).toBe(true);
    expect(empataSalida(paso, paso.sale!)).toBe(false);
    expect(empataSalida(paso, paso.celda!)).toBe(false);
  });
});
