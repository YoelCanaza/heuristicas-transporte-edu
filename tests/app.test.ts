import { describe, expect, it } from 'vitest';
import { EJEMPLO_TAHA } from '../src/core/ejemplos';
import { esProblema } from '../src/core/validacion';
import { escribirRuta, leerRuta } from '../src/ui/ruta';

describe('rutas', () => {
  it('interpreta la pantalla y el método de la dirección', () => {
    expect(leerRuta('#/aprender/vogel')).toEqual({ vista: 'aprender', metodo: 'vogel', optimizador: 'piedras' });
    expect(leerRuta('#/aprender/vogel/modi')).toEqual({ vista: 'aprender', metodo: 'vogel', optimizador: 'modi' });
    expect(leerRuta('#/laboratorio')).toEqual({ vista: 'laboratorio', metodo: 'noroeste', optimizador: 'piedras' });
  });

  it('cae en el inicio ante direcciones vacías o desconocidas', () => {
    expect(leerRuta('').vista).toBe('inicio');
    expect(leerRuta('#/no-existe/otro')).toEqual({ vista: 'inicio', metodo: 'noroeste', optimizador: 'piedras' });
  });

  it('escribir y leer son inversas', () => {
    const ruta = { vista: 'aprender', metodo: 'costoMinimo', optimizador: 'piedras' } as const;
    expect(leerRuta(escribirRuta(ruta))).toEqual(ruta);
    expect(escribirRuta(ruta)).toBe('#/aprender/costoMinimo');
    const conModi = { ...ruta, optimizador: 'modi' } as const;
    expect(leerRuta(escribirRuta(conModi))).toEqual(conModi);
  });
});

describe('esProblema', () => {
  it('acepta un problema bien formado', () => {
    expect(esProblema(JSON.parse(JSON.stringify(EJEMPLO_TAHA)))).toBe(true);
  });

  it.each([
    ['nulo', null],
    ['texto', 'hola'],
    ['ofertas no numéricas', { ...EJEMPLO_TAHA, ofertas: 'x' }],
    ['matriz con filas de otro tamaño', { ...EJEMPLO_TAHA, costos: [[1], [2], [3]] }],
    ['nombres de más', { ...EJEMPLO_TAHA, origenes: ['O1'] }],
    ['un solo origen', { ofertas: [1], demandas: [1, 1], costos: [[1, 1]], origenes: ['O1'], destinos: ['D1', 'D2'] }],
    ['valores no finitos', { ...EJEMPLO_TAHA, demandas: [5, 15, 15, null] }],
  ])('rechaza %s', (_, dato) => {
    expect(esProblema(dato)).toBe(false);
  });
});
