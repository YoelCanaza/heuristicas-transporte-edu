import { describe, expect, it } from 'vitest';
import { crearAleatorio, EJEMPLO_TAHA, generarProblema } from '../src/core/ejemplos';
import { resolverMetodo } from '../src/core/metodos';
import type { MetodoInicial } from '../src/core/metodos';
import { analizarMiopia, describirPrecio, describirRutaCara, rutasCaras } from '../src/core/miopia';

const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];

describe('el precio de la miopía', () => {
  it('mide en el ejemplo de Taha cuánto le costaron a cada método sus decisiones', () => {
    const precios = METODOS.map((k) => {
      const r = resolverMetodo(EJEMPLO_TAHA, k);
      return analizarMiopia(r.problema, r.pasos).precio;
    });
    expect(precios).toEqual([85, 40, 40]);
  });

  it('en Costo Mínimo sobre Taha encuentra la ruta cara del final y la decisión que la provocó', () => {
    const r = resolverMetodo(EJEMPLO_TAHA, 'costoMinimo');
    const rutas = rutasCaras(r.problema, r.pasos);
    expect(rutas.length).toBeGreaterThan(0);
    for (const ruta of rutas) {
      // La alternativa comparte fila o columna, es más barata y su otra línea se cerró antes.
      expect(ruta.alternativa.i === ruta.celda.i || ruta.alternativa.j === ruta.celda.j).toBe(true);
      expect(ruta.diferencia).toBeGreaterThan(0);
      expect(ruta.cierre).toBeLessThan(ruta.paso);
      // La decisión responsable asignó una cantidad positiva y dejó la línea en 0.
      const cierre = r.pasos[ruta.cierre];
      expect(cierre.tipo).toBe('asignacion');
      expect(cierre.x[ruta.celdaCierre.i][ruta.celdaCierre.j]).toBeGreaterThan(0);
      const restante =
        ruta.linea.tipo === 'columna' ? cierre.demandaRestante![ruta.linea.k] : cierre.ofertaRestante![ruta.linea.k];
      expect(restante).toBe(0);
    }
    // D2 se agota al asignar 15 a (O1, D2), no en la asignación de ε a (O2, D2) que la tacha después.
    const d2 = rutas.find((x) => x.alternativa.i === 1 && x.alternativa.j === 1)!;
    expect(d2.celdaCierre).toEqual({ i: 0, j: 1 });
    const texto = describirRutaCara(r.problema, rutas[0]);
    expect(texto).toMatch(/^Paso \d+: \(O\d, D\d\) recibe/);
    expect(texto).toContain('ya no estaba disponible');
    expect(describirPrecio(r.problema, analizarMiopia(r.problema, r.pasos), r.solucion.x)).toContain('costaron 40');
  });

  it('las rutas caras vienen ordenadas por el costo de más en total', () => {
    const rand = crearAleatorio(5);
    for (let k = 0; k < 30; k++) {
      const p = generarProblema(rand);
      for (const m of METODOS) {
        const r = resolverMetodo(p, m);
        const rutas = rutasCaras(r.problema, r.pasos);
        const totales = rutas.map((x) => x.diferencia * x.cantidad);
        expect(totales).toEqual([...totales].sort((a, b) => b - a));
        const a = analizarMiopia(r.problema, r.pasos);
        expect(a.precio).not.toBeNull();
        expect(a.precio!).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('una solución inicial óptima no tiene precio', () => {
    const p = {
      ofertas: [10, 10],
      demandas: [10, 10],
      costos: [
        [1, 9],
        [9, 1],
      ],
      origenes: ['O1', 'O2'],
      destinos: ['D1', 'D2'],
    };
    const r = resolverMetodo(p, 'costoMinimo');
    const a = analizarMiopia(r.problema, r.pasos);
    expect(a.precio).toBe(0);
    expect(rutasCaras(r.problema, r.pasos)).toEqual([]);
    expect(describirPrecio(r.problema, a, r.solucion.x)).toContain('ya es óptima');
  });

  it('en maximización habla de lo que se dejó de ganar', () => {
    const p = {
      ofertas: [10, 10],
      demandas: [10, 10],
      costos: [
        [8, 7],
        [6, 1],
      ],
      origenes: ['O1', 'O2'],
      destinos: ['D1', 'D2'],
      objetivo: 'max' as const,
    };
    const r = resolverMetodo(p, 'costoMinimo');
    const a = analizarMiopia(r.problema, r.pasos);
    // Costo Mínimo toma primero la mayor utilidad (O1, D1) y queda obligado a usar (O2, D2): 90 frente a 130.
    expect(a.inicial).toBe(90);
    expect(a.optimo).toBe(130);
    expect(a.precio).toBe(40);
    expect(describirPrecio(r.problema, a, r.solucion.x)).toContain('dejaron de ganar 40');
    const rutas = rutasCaras(r.problema, r.pasos);
    expect(rutas[0].celda).toEqual({ i: 1, j: 1 });
    expect(describirRutaCara(r.problema, rutas[0])).toContain('costo de oportunidad');
  });
});
