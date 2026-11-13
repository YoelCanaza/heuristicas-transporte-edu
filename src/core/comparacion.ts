import { optimizar } from './caminoPiedras';
import type { Selector } from './constructivo';
import { crearAleatorio, generarProblema } from './ejemplos';
import type { Familia, Tamano } from './ejemplos';
import { resolverInicial } from './metodos';
import type { Problema } from './tipos';
import { EPS } from './util';

export interface Competidor {
  id: string;
  nombre: string;
  selector: Selector;
}

/** Límites superiores (en %) de los tramos de brecha; el último tramo es "más de 20 %". */
export const TRAMOS_BRECHA = [0, 2, 5, 10, 20];
export const ETIQUETA_TRAMO = ['Óptimo', 'Hasta 2 %', 'Hasta 5 %', 'Hasta 10 %', 'Hasta 20 %', 'Más de 20 %'];

export interface FilaComparacion {
  id: string;
  nombre: string;
  costoPromedio: number;
  /** Brecha respecto del óptimo, en %. */
  brechaPromedio: number;
  brechaMediana: number;
  brechaPeor: number;
  vecesOptimo: number;
  /** Veces que obtuvo la mejor solución inicial entre los competidores (empates cuentan). */
  vecesMejor: number;
  iteracionesPromedio: number;
  /** Cantidad de problemas en cada tramo de brecha (ver TRAMOS_BRECHA). */
  distribucion: number[];
}

/** Resultado del competidor de referencia frente a otro, problema por problema. */
export interface Duelo {
  rival: string;
  nombre: string;
  gana: number;
  empata: number;
  pierde: number;
}

export interface PeorCaso {
  problema: Problema;
  brecha: number;
  costo: number;
  optimo: number;
  /** Costo inicial de cada competidor en ese problema, por id. */
  costos: Record<string, number>;
}

export interface ResultadoComparacion {
  /** Problemas con óptimo confirmado, sobre los que se calculan las estadísticas. */
  instancias: number;
  /** Problemas descartados porque la optimización se detuvo sin confirmar el óptimo. */
  sinConfirmar: number;
  semilla: number;
  familia: Familia;
  tamano: Tamano | null;
  filas: FilaComparacion[];
  /** Duelos del competidor de referencia (el primero) contra cada uno de los demás. */
  duelos: Duelo[];
  /** Problema donde el competidor de referencia tuvo la mayor brecha. */
  peorCaso: PeorCaso | null;
}

export interface OpcionesExperimento {
  familia?: Familia;
  tamano?: Tamano | null;
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[medio] : (v[medio - 1] + v[medio]) / 2;
}

/**
 * Experimento comparativo que puede ejecutarse por partes, para no bloquear la interfaz.
 * El primer competidor es la referencia de los duelos y del peor caso.
 */
export function crearExperimento(
  competidores: Competidor[],
  instancias: number,
  semilla: number,
  opciones: OpcionesExperimento = {},
) {
  const familia = opciones.familia ?? 'uniforme';
  const tamano = opciones.tamano ?? null;
  const rand = crearAleatorio(semilla);
  const acum = competidores.map(() => ({ costo: 0, brechas: [] as number[], vecesMejor: 0, iteraciones: 0 }));
  const duelos = competidores.slice(1).map((c) => ({ rival: c.id, nombre: c.nombre, gana: 0, empata: 0, pierde: 0 }));
  let peorCaso: PeorCaso | null = null;
  let hechas = 0;
  let sinConfirmar = 0;

  const unaInstancia = () => {
    const p = generarProblema(rand, { familia, tamano: tamano ?? undefined });
    const corridas = competidores.map((c) => {
      const inicial = resolverInicial(p, c.selector, c.nombre);
      const opt = optimizar(inicial.problema, inicial.solucion);
      return { costo: inicial.costo, optimo: opt.optimo ? opt.costo : null, iteraciones: opt.iteraciones };
    });
    hechas++;

    const confirmados = corridas.flatMap((r) => (r.optimo === null ? [] : [r.optimo]));
    if (confirmados.length === 0) {
      sinConfirmar++;
      return;
    }
    const optimo = Math.min(...confirmados);
    const mejorInicial = Math.min(...corridas.map((r) => r.costo));
    const brecha = (costo: number) => (optimo > 0 ? ((costo - optimo) / optimo) * 100 : 0);

    corridas.forEach((r, k) => {
      const a = acum[k];
      a.costo += r.costo;
      a.brechas.push(brecha(r.costo));
      a.iteraciones += r.iteraciones;
      if (r.costo <= mejorInicial + EPS) a.vecesMejor++;
    });

    const propia = corridas[0].costo;
    duelos.forEach((d, k) => {
      const rival = corridas[k + 1].costo;
      if (propia < rival - EPS) d.gana++;
      else if (propia > rival + EPS) d.pierde++;
      else d.empata++;
    });
    if (!peorCaso || brecha(propia) > peorCaso.brecha + EPS) {
      peorCaso = {
        problema: p,
        brecha: brecha(propia),
        costo: propia,
        optimo,
        costos: Object.fromEntries(competidores.map((c, k) => [c.id, corridas[k].costo])),
      };
    }
  };

  return {
    /** Procesa problemas durante `ms` milisegundos como máximo; devuelve true al terminar. */
    avanzar(ms = Infinity): boolean {
      const limite = performance.now() + ms;
      while (hechas < instancias) {
        unaInstancia();
        if (performance.now() >= limite) break;
      }
      return hechas >= instancias;
    },
    hechas: () => hechas,
    resultado(): ResultadoComparacion {
      const evaluadas = hechas - sinConfirmar;
      const div = Math.max(evaluadas, 1);
      return {
        instancias: evaluadas,
        sinConfirmar,
        semilla,
        familia,
        tamano,
        duelos,
        peorCaso,
        filas: competidores.map((c, k) => {
          const a = acum[k];
          const distribucion = Array<number>(TRAMOS_BRECHA.length + 1).fill(0);
          for (const b of a.brechas) {
            const tramo = TRAMOS_BRECHA.findIndex((limite) => b <= limite + EPS);
            distribucion[tramo === -1 ? TRAMOS_BRECHA.length : tramo]++;
          }
          return {
            id: c.id,
            nombre: c.nombre,
            costoPromedio: a.costo / div,
            brechaPromedio: a.brechas.reduce((x, y) => x + y, 0) / div,
            brechaMediana: mediana(a.brechas),
            brechaPeor: a.brechas.length > 0 ? Math.max(...a.brechas) : 0,
            vecesOptimo: distribucion[0],
            vecesMejor: a.vecesMejor,
            iteracionesPromedio: a.iteraciones / div,
            distribucion,
          };
        }),
      };
    },
  };
}

/** Ejecuta el experimento completo de una vez. */
export function comparar(
  competidores: Competidor[],
  instancias: number,
  semilla: number,
  opciones: OpcionesExperimento = {},
): ResultadoComparacion {
  const experimento = crearExperimento(competidores, instancias, semilla, opciones);
  experimento.avanzar();
  return experimento.resultado();
}
