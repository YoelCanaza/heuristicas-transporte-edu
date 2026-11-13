import { describe, expect, it } from 'vitest';
import {
  MAX_ENTRADAS,
  agregarEntrada,
  brechaPropia,
  crearEntrada,
  describirProblemas,
  esBitacora,
  informeMarkdown,
} from '../src/core/bitacora';
import type { EntradaBitacora } from '../src/core/bitacora';
import { TRAMOS_BRECHA, comparar, crearExperimento } from '../src/core/comparacion';
import { crearAleatorio, generarProblema } from '../src/core/ejemplos';
import type { Familia, Tamano } from '../src/core/ejemplos';
import {
  CONFIG_INICIAL,
  calcularPuntajes,
  describir,
  equivalencia,
  selectorPersonalizado,
} from '../src/core/heuristica';
import type { ConfigHeuristica, Pesos } from '../src/core/heuristica';
import { SELECTOR, resolverInicial } from '../src/core/metodos';
import type { MetodoInicial } from '../src/core/metodos';
import { validar } from '../src/core/validacion';

const suma = (v: number[]) => v.reduce((a, b) => a + b, 0);
const conPesos = (pesos: Partial<Pesos>, extra: Partial<ConfigHeuristica> = {}): ConfigHeuristica => ({
  ...CONFIG_INICIAL,
  modo: 'puntaje',
  pesos: { costo: 0, relativo: 0, urgencia: 0, cantidad: 0, ...pesos },
  ...extra,
});
const competidores = (['noroeste', 'costoMinimo', 'vogel'] as MetodoInicial[]).map((id) => ({
  id,
  nombre: id,
  selector: SELECTOR[id],
}));

describe('familias de problemas', () => {
  const FAMILIAS: Familia[] = ['uniforme', 'geografico', 'desbalanceado', 'degenerado'];
  const TAMANOS: [Tamano, number, number][] = [
    ['pequeno', 3, 4],
    ['mediano', 5, 6],
    ['grande', 7, 8],
  ];

  it.each(FAMILIAS)('%s: genera problemas válidos del tamaño pedido', (familia) => {
    for (const [tamano, min, max] of TAMANOS) {
      const rand = crearAleatorio(11);
      for (let t = 0; t < 60; t++) {
        const p = generarProblema(rand, { familia, tamano });
        expect(validar(p)).toEqual([]);
        expect(p.ofertas.length).toBeGreaterThanOrEqual(min);
        expect(p.ofertas.length).toBeLessThanOrEqual(max);
        expect(p.demandas.length).toBeGreaterThanOrEqual(min);
        expect(p.demandas.length).toBeLessThanOrEqual(max);
        expect(p.costos.flat().every((c) => c >= 1)).toBe(true);
        expect([...p.ofertas, ...p.demandas].every((v) => v > 0)).toBe(true);
      }
    }
  });

  it('solo la familia desbalanceada rompe el balance', () => {
    for (const familia of FAMILIAS) {
      const rand = crearAleatorio(5);
      for (let t = 0; t < 60; t++) {
        const p = generarProblema(rand, { familia, tamano: 'mediano' });
        expect(suma(p.ofertas) === suma(p.demandas)).toBe(familia !== 'desbalanceado');
      }
    }
  });

  it('la familia con empates usa múltiplos de 10', () => {
    const p = generarProblema(crearAleatorio(3), { familia: 'degenerado', tamano: 'grande' });
    expect([...p.ofertas, ...p.demandas].every((v) => v % 10 === 0)).toBe(true);
  });

  it('la misma semilla produce el mismo problema', () => {
    const opciones = { familia: 'geografico', tamano: 'mediano' } as const;
    expect(generarProblema(crearAleatorio(9), opciones)).toEqual(generarProblema(crearAleatorio(9), opciones));
  });
});

describe('heurística de puntaje ponderado', () => {
  const problemas = Array.from({ length: 60 }, (_, k) => generarProblema(crearAleatorio(100 + k)));

  it('con solo el peso del costo reproduce el Costo Mínimo', () => {
    const config = conPesos({ costo: 7 });
    expect(equivalencia(config)).toBe('Costo Mínimo');
    for (const p of problemas) {
      const propia = resolverInicial(p, selectorPersonalizado(config), 'propia');
      expect(propia.solucion.x).toEqual(resolverInicial(p, SELECTOR.costoMinimo, 'cm').solucion.x);
    }
  });

  it('siempre da soluciones factibles con m+n−1 celdas básicas, con cualquier combinación de pesos', () => {
    const combinaciones: Partial<Pesos>[] = [
      {},
      { urgencia: 10 },
      { cantidad: 10 },
      { relativo: 3, cantidad: 2 },
      { costo: 5, relativo: 1, urgencia: 5, cantidad: 1 },
    ];
    for (const pesos of combinaciones) {
      for (const p of problemas) {
        const r = resolverInicial(p, selectorPersonalizado(conPesos(pesos)), 'propia');
        expect(r.solucion.basica.flat().filter(Boolean).length).toBe(p.ofertas.length + p.demandas.length - 1);
        p.ofertas.forEach((o, i) => expect(suma(r.solucion.x[i])).toBe(o));
        p.demandas.forEach((d, j) => expect(suma(r.solucion.x.map((f) => f[j]))).toBe(d));
      }
    }
  });

  it('los puntajes van de 0 a 1 y el paso de análisis los muestra', () => {
    const p = problemas[0];
    const r = resolverInicial(p, selectorPersonalizado(conPesos({ costo: 5, urgencia: 5 })), 'propia');
    const analisis = r.pasos.find((s) => s.tipo === 'penalizaciones')!;
    const valores = analisis.puntajes!.flat().filter((v): v is number => v !== null);
    expect(valores.length).toBe(p.ofertas.length * p.demandas.length);
    expect(Math.min(...valores)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...valores)).toBeLessThanOrEqual(1);
  });

  it('una línea con una sola celda disponible no tiene urgencia', () => {
    // Queda solo la columna D2: sin la corrección, el costo 9 contaría como "penalización" y ganaría.
    const estado = {
      costos: [
        [1, 2],
        [1, 9],
      ],
      oferta: [5, 5],
      demanda: [0, 10],
      filaTachada: [false, false],
      columnaTachada: [true, false],
    };
    const puntajes = calcularPuntajes(estado, { costo: 0, relativo: 0, urgencia: 10, cantidad: 0 });
    expect(puntajes.map((x) => x.puntaje)).toEqual([0, 0]);
  });

  it('describe la regla y avisa cuando todos los pesos son 0', () => {
    expect(describir(conPesos({ costo: 5, urgencia: 5 }))).toMatch(
      /costo bajo \(peso 5\), urgencia de la línea \(peso 5\)/,
    );
    expect(describir(conPesos({}))).toMatch(/decide solo el desempate/);
    expect(equivalencia(conPesos({ costo: 5, urgencia: 1 }))).toBeNull();
  });
});

describe('experimento comparativo', () => {
  const propia = {
    id: 'propia',
    nombre: 'propia',
    selector: selectorPersonalizado(conPesos({ costo: 5, urgencia: 5 })),
  };
  const todos = [propia, ...competidores];

  it('ejecutarlo por partes da el mismo resultado que de una vez', () => {
    const opciones = { familia: 'geografico', tamano: 'mediano' } as const;
    const experimento = crearExperimento(todos, 40, 21, opciones);
    let vueltas = 0;
    while (!experimento.avanzar(0)) vueltas++;
    expect(vueltas).toBeGreaterThan(1);
    expect(experimento.hechas()).toBe(40);
    expect(experimento.resultado()).toEqual(comparar(todos, 40, 21, opciones));
  });

  it('las estadísticas son coherentes entre sí', () => {
    const r = comparar(todos, 80, 4, { familia: 'uniforme', tamano: 'pequeno' });
    expect(r.instancias + r.sinConfirmar).toBe(80);
    for (const f of r.filas) {
      expect(suma(f.distribucion)).toBe(r.instancias);
      expect(f.distribucion.length).toBe(TRAMOS_BRECHA.length + 1);
      expect(f.vecesOptimo).toBe(f.distribucion[0]);
      expect(f.brechaMediana).toBeLessThanOrEqual(f.brechaPeor);
      expect(f.brechaPromedio).toBeLessThanOrEqual(f.brechaPeor + 1e-9);
      expect(f.brechaPromedio).toBeGreaterThanOrEqual(0);
    }
    for (const d of r.duelos) expect(d.gana + d.empata + d.pierde).toBe(r.instancias);
    expect(r.duelos.map((d) => d.rival)).toEqual(['noroeste', 'costoMinimo', 'vogel']);
  });

  it('el peor caso corresponde a la mayor brecha de la heurística de referencia', () => {
    const r = comparar(todos, 80, 4, { familia: 'desbalanceado', tamano: 'pequeno' });
    const peor = r.peorCaso!;
    expect(peor.brecha).toBeCloseTo(r.filas[0].brechaPeor);
    expect(peor.costo).toBe(peor.costos.propia);
    // Reproducible: al resolver de nuevo ese problema se obtiene el mismo costo.
    expect(resolverInicial(peor.problema, propia.selector, 'propia').costo).toBe(peor.costo);
    expect(peor.brecha).toBeCloseTo(((peor.costo - peor.optimo) / peor.optimo) * 100);
  });

  it('una heurística comparada consigo misma empata siempre', () => {
    const r = comparar([competidores[2], { ...competidores[2], id: 'copia' }], 30, 8);
    expect(r.duelos[0]).toMatchObject({ gana: 0, empata: 30, pierde: 0 });
  });

  it('en problemas desbalanceados el Costo Mínimo empeora frente a Vogel', () => {
    const r = comparar(competidores, 150, 2026, { familia: 'desbalanceado', tamano: 'pequeno' });
    const brecha = (id: string) => r.filas.find((f) => f.id === id)!.brechaPromedio;
    expect(brecha('costoMinimo')).toBeGreaterThan(3 * brecha('vogel'));
  });
});

describe('bitácora', () => {
  const config = conPesos({ costo: 5, urgencia: 5 }, { nombre: '  Mezcla  ' });
  const propia = { id: 'propia', nombre: 'Mezcla', selector: selectorPersonalizado(config) };
  const resultado = comparar([propia, ...competidores], 40, 7, { familia: 'geografico', tamano: 'pequeno' });
  const entrada = crearEntrada(config, resultado, ' La urgencia ayuda ', '', new Date('2026-11-13T10:00:00Z'));

  it('resume el experimento y el puesto de la heurística propia', () => {
    expect(entrada).toMatchObject({
      nombre: 'Mezcla',
      hipotesis: 'La urgencia ayuda',
      conclusion: '',
      familia: 'geografico',
      tamano: 'pequeno',
      instancias: resultado.instancias,
      semilla: 7,
      competidores: 4,
    });
    const brechas = entrada.brechas.map((b) => b.brecha);
    expect(brechas).toEqual([...brechas].sort((a, b) => a - b));
    expect(entrada.brechas[entrada.puesto - 1].id).toBe('propia');
    expect(brechaPropia(entrada)).toBeCloseTo(resultado.filas[0].brechaPromedio);
    expect(describirProblemas(entrada)).toMatch(/problemas pequeños .*costos geográficos.*semilla 7/);
  });

  it('guarda primero lo más reciente y limita el tamaño', () => {
    let bitacora: EntradaBitacora[] = [];
    for (let k = 0; k < MAX_ENTRADAS + 5; k++) bitacora = agregarEntrada(bitacora, { ...entrada, id: k });
    expect(bitacora.length).toBe(MAX_ENTRADAS);
    expect(bitacora[0].id).toBe(MAX_ENTRADAS + 4);
  });

  it('reconoce una bitácora guardada y rechaza datos dañados', () => {
    expect(esBitacora(JSON.parse(JSON.stringify([entrada])))).toBe(true);
    expect(esBitacora([])).toBe(true);
    expect(esBitacora(null)).toBe(false);
    expect(esBitacora([{ ...entrada, familia: 'otra' }])).toBe(false);
    expect(esBitacora([{ ...entrada, brechas: [{ id: 'propia' }] }])).toBe(false);
  });

  it('el informe lista los intentos del más antiguo al más reciente', () => {
    const segunda = { ...entrada, id: 2, nombre: 'Segunda', conclusion: 'Mejoró' };
    const informe = informeMarkdown(agregarEntrada([entrada], segunda));
    expect(informe.indexOf('Intento 1: Mezcla')).toBeGreaterThan(0);
    expect(informe.indexOf('Intento 2: Segunda')).toBeGreaterThan(informe.indexOf('Intento 1: Mezcla'));
    expect(informe).toContain('**Hipótesis:** La urgencia ayuda');
    expect(informe).toContain('**Conclusión:** (sin conclusión)');
    expect(informe).toContain('**Conclusión:** Mejoró');
    expect(informe).toContain('| **Mezcla** |');
  });
});
