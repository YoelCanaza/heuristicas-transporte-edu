import { describe, expect, it } from 'vitest';
import { codificarProblema, decodificarProblema, mismoProblema } from '../src/core/enlace';
import { crearAleatorio, EJEMPLO_TAHA, generarProblema } from '../src/core/ejemplos';
import type { Problema } from '../src/core/tipos';
import { enlaceProblema, leerCompartido, leerRuta, sinCompartido } from '../src/ui/ruta';

describe('compartir un problema por enlace', () => {
  it('codificar y decodificar devuelven el mismo problema', () => {
    expect(decodificarProblema(codificarProblema(EJEMPLO_TAHA))).toEqual(EJEMPLO_TAHA);
    const rand = crearAleatorio(9);
    for (let k = 0; k < 30; k++) {
      const p = generarProblema(rand);
      expect(decodificarProblema(codificarProblema(p))).toEqual(p);
    }
  });

  it('conserva la maximización, las rutas prohibidas, los decimales y los nombres con tildes', () => {
    const p: Problema = {
      ofertas: [12.5, 30],
      demandas: [20, 22.5],
      costos: [
        [8, 2.25],
        [3, 9],
      ],
      origenes: ['Puno', 'Juliaca'],
      destinos: ['Ilave', 'Ayaviri ñ'],
      objetivo: 'max',
      prohibidas: [
        [false, true],
        [false, false],
      ],
    };
    expect(decodificarProblema(codificarProblema(p))).toEqual(p);
  });

  it('el código solo usa caracteres que no hay que escapar en una dirección', () => {
    expect(codificarProblema(EJEMPLO_TAHA)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('un 8×8 cabe en un enlace razonable', () => {
    const p = generarProblema(crearAleatorio(1), { m: 8, n: 8 });
    expect(codificarProblema(p).length).toBeLessThan(800);
  });

  it.each([
    ['texto cualquiera', 'hola'],
    ['vacío', ''],
    ['JSON sin versión', btoa('{"o":[1,2],"d":[1,2]}')],
    ['ruta prohibida fuera de la tabla', null],
    ['demasiado grande', null],
  ])('rechaza un enlace dañado: %s', (caso, codigo) => {
    let c = codigo;
    if (caso === 'ruta prohibida fuera de la tabla') {
      c = btoa(
        JSON.stringify({
          v: 1,
          o: [1, 1],
          d: [1, 1],
          c: [
            [1, 1],
            [1, 1],
          ],
          x: [[5, 0]],
        }),
      );
    }
    if (caso === 'demasiado grande') {
      const k = 9;
      c = btoa(JSON.stringify({ v: 1, o: Array(k).fill(1), d: Array(k).fill(1), c: Array(k).fill(Array(k).fill(1)) }));
    }
    expect(decodificarProblema(c!)).toBeNull();
  });

  it('distingue problemas distintos y reconoce el mismo', () => {
    expect(mismoProblema(EJEMPLO_TAHA, JSON.parse(JSON.stringify(EJEMPLO_TAHA)))).toBe(true);
    expect(mismoProblema(EJEMPLO_TAHA, { ...EJEMPLO_TAHA, ofertas: [15, 25, 11] })).toBe(false);
  });

  it('la dirección lleva la pantalla y el problema, y se puede limpiar después', () => {
    const codigo = codificarProblema(EJEMPLO_TAHA);
    const url = enlaceProblema('https://ejemplo.org/app/', 'reparto', codigo);
    expect(url).toBe(`https://ejemplo.org/app/#/reparto?p=${codigo}`);
    const hash = url.slice(url.indexOf('#'));
    expect(leerRuta(hash).vista).toBe('reparto');
    expect(leerCompartido(hash)).toBe(codigo);
    expect(sinCompartido(hash)).toBe('#/reparto');
    expect(leerCompartido('#/aprender/vogel')).toBeNull();
    expect(enlaceProblema('', 'aprender', codigo)).toBe(`#/aprender/noroeste?p=${codigo}`);
  });
});
