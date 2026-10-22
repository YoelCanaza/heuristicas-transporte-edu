import { optimizar } from './caminoPiedras';
import type { Selector } from './constructivo';
import { crearAleatorio, generarProblema } from './ejemplos';
import { resolverInicial } from './metodos';
import { EPS } from './util';

export interface Competidor {
  id: string;
  nombre: string;
  selector: Selector;
}

export interface FilaComparacion {
  id: string;
  nombre: string;
  costoPromedio: number;
  /** Brecha promedio respecto del óptimo, en %. */
  brechaPromedio: number;
  vecesOptimo: number;
  /** Veces que obtuvo la mejor solución inicial entre los competidores (empates cuentan). */
  vecesMejor: number;
  iteracionesPromedio: number;
}

export interface ResultadoComparacion {
  instancias: number;
  semilla: number;
  filas: FilaComparacion[];
}

export function comparar(competidores: Competidor[], instancias: number, semilla: number): ResultadoComparacion {
  const rand = crearAleatorio(semilla);
  const acum = competidores.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    costo: 0,
    brecha: 0,
    vecesOptimo: 0,
    vecesMejor: 0,
    iteraciones: 0,
  }));

  for (let t = 0; t < instancias; t++) {
    const p = generarProblema(rand);
    const corridas = competidores.map((c) => {
      const inicial = resolverInicial(p, c.selector, c.nombre);
      const opt = optimizar(inicial.problema, inicial.solucion);
      return { costo: inicial.costo, optimo: opt.costo, iteraciones: opt.iteraciones };
    });
    const optimo = Math.min(...corridas.map((r) => r.optimo));
    const mejorInicial = Math.min(...corridas.map((r) => r.costo));
    corridas.forEach((r, k) => {
      const a = acum[k];
      a.costo += r.costo;
      a.brecha += optimo > 0 ? ((r.costo - optimo) / optimo) * 100 : 0;
      a.iteraciones += r.iteraciones;
      if (r.costo <= optimo + EPS) a.vecesOptimo++;
      if (r.costo <= mejorInicial + EPS) a.vecesMejor++;
    });
  }

  return {
    instancias,
    semilla,
    filas: acum.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      costoPromedio: a.costo / instancias,
      brechaPromedio: a.brecha / instancias,
      vecesOptimo: a.vecesOptimo,
      vecesMejor: a.vecesMejor,
      iteracionesPromedio: a.iteraciones / instancias,
    })),
  };
}
