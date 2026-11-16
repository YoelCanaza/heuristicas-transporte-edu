import { optimizar } from './caminoPiedras';
import { NOMBRE_METODO, resolverMetodo } from './metodos';
import type { MetodoInicial } from './metodos';
import type { Problema, Solucion } from './tipos';
import { EPS, fmt, fmtTotal, palabraTotal, prohibidasUsadas } from './util';

/** Total de una solución en un momento de la optimización (iteración 0 = solución inicial). */
export interface PuntoTrayectoria {
  /** Costo o utilidad real. Si `prohibida` es true incluye el costo M y no es comparable. */
  valor: number;
  /** El mismo total como se muestra al estudiante ("520", "5M + 470"). */
  texto: string;
  /** La solución de ese momento envía por alguna ruta prohibida. */
  prohibida: boolean;
}

export interface FilaMetodo {
  metodo: MetodoInicial;
  nombre: string;
  inicial: Solucion;
  /** Total después de cada iteración, empezando por la solución inicial. */
  trayectoria: PuntoTrayectoria[];
  /** Brecha de la solución inicial respecto del óptimo, en %; null si no se puede calcular. */
  brecha: number | null;
  iteraciones: number;
  /** La solución inicial ya tenía el total óptimo. */
  inicialOptima: boolean;
}

export interface ComparacionMetodos {
  /** Problema balanceado y convertido sobre el que trabajaron los tres métodos. */
  problema: Problema;
  filas: FilaMetodo[];
  /** Total óptimo; null si ninguna optimización lo confirmó o no hay solución sin rutas prohibidas. */
  optimo: number | null;
  /** La solución final todavía usa rutas prohibidas: el problema no tiene solución válida. */
  sinSolucion: boolean;
  /** Una solución con el total óptimo; null en los mismos casos que `optimo`. */
  solucionOptima: Solucion | null;
  interpretacion: string;
}

const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];

/** Une nombres en español: "A", "A y B", "A, B y C". */
export function enumerar(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * Resuelve el mismo problema con las tres heurísticas y optimiza cada solución inicial,
 * registrando el total después de cada iteración. Sirve para ver cuánto trabajo de
 * optimización ahorra (o no) una mejor solución inicial.
 */
export function compararMetodos(original: Problema): ComparacionMetodos {
  const punto = (p: Problema, x: number[][], valor: number): PuntoTrayectoria => ({
    valor,
    texto: fmtTotal(p, x),
    prohibida: prohibidasUsadas(p, x).length > 0,
  });

  let problema = original;
  // Se asignan dentro del recorrido; la forma `as` evita que TypeScript los dé por constantes.
  let optimo = null as number | null;
  let sinSolucion = false as boolean;
  let solucionOptima = null as Solucion | null;

  const parciales = METODOS.map((metodo) => {
    const inicial = resolverMetodo(original, metodo);
    const opt = optimizar(inicial.problema, inicial.solucion);
    problema = inicial.problema;
    const trayectoria = [
      punto(problema, inicial.solucion.x, inicial.costo),
      ...opt.pasos.filter((s) => s.tipo === 'pivoteo').map((s) => punto(problema, s.x, s.costoTotal)),
    ];
    if (opt.optimo) {
      if (trayectoria[trayectoria.length - 1].prohibida) sinSolucion = true;
      else {
        optimo = opt.costo;
        solucionOptima = opt.solucion;
      }
    }
    return {
      metodo,
      nombre: NOMBRE_METODO[metodo],
      inicial: inicial.solucion,
      trayectoria,
      iteraciones: opt.iteraciones,
    };
  });

  const filas: FilaMetodo[] = parciales.map((f) => {
    const inicio = f.trayectoria[0];
    const comparable = optimo !== null && !inicio.prohibida;
    const distancia = comparable ? Math.abs(inicio.valor - optimo!) : null;
    return {
      ...f,
      brecha:
        distancia === null ? null : distancia <= EPS ? 0 : optimo === 0 ? null : (distancia / Math.abs(optimo!)) * 100,
      inicialOptima: distancia !== null && distancia <= EPS,
    };
  });

  const resultado = { problema, filas, optimo, sinSolucion, solucionOptima };
  return { ...resultado, interpretacion: interpretar(resultado) };
}

function interpretar({ problema, filas, optimo, sinSolucion }: Omit<ComparacionMetodos, 'interpretacion'>): string {
  const palabra = palabraTotal(problema);
  if (sinSolucion) {
    return 'Con las rutas prohibidas actuales no existe ninguna solución válida: los tres métodos terminan enviando por alguna de ellas. Revisa las prohibiciones en la pantalla Problema.';
  }
  if (optimo === null) {
    return 'La optimización se detuvo sin confirmar el óptimo, así que no se puede medir la brecha de cada método en este problema.';
  }

  // Distancia al óptimo de la solución inicial; una que usa rutas prohibidas es la peor posible.
  const distancia = (f: FilaMetodo) =>
    f.trayectoria[0].prohibida ? Infinity : Math.abs(f.trayectoria[0].valor - optimo);
  const menor = Math.min(...filas.map(distancia));
  const mayor = Math.max(...filas.map(distancia));
  const mejores = filas.filter((f) => distancia(f) <= menor + EPS);
  const peores = filas.filter((f) => distancia(f) >= mayor - EPS);
  const describir = (f: FilaMetodo) =>
    f.trayectoria[0].prohibida
      ? 'usa una ruta prohibida'
      : `${palabra} ${f.trayectoria[0].texto}${f.brecha ? `, a ${fmt(f.brecha)} % del óptimo` : ''}`;
  const iteraciones = (k: number) => `${k} ${k === 1 ? 'iteración' : 'iteraciones'}`;
  const partes: string[] = [];

  if (mejores.length === filas.length) {
    partes.push(
      menor <= EPS
        ? `En este problema los tres métodos dan directamente la solución óptima (${palabra} ${fmt(optimo)}): la optimización solo lo confirma.`
        : `En este problema los tres métodos dan una solución inicial igual de buena (${describir(filas[0])}).`,
    );
  } else {
    const nombresMejores = enumerar(mejores.map((f) => f.nombre));
    partes.push(
      menor <= EPS
        ? `${nombresMejores} ${mejores.length === 1 ? 'da' : 'dan'} directamente la solución óptima (${palabra} ${fmt(optimo)}).`
        : `La mejor solución inicial es la de ${nombresMejores} (${describir(mejores[0])}).`,
    );
    partes.push(
      `La más alejada es la de ${enumerar(peores.map((f) => f.nombre))} (${describir(peores[0])}) y necesitó ${iteraciones(peores[0].iteraciones)} para llegar al óptimo, frente a ${mejores[0].iteraciones} de ${mejores[0].nombre}.`,
    );
  }

  const sorpresa = filas.find((a) =>
    filas.some((b) => distancia(a) < distancia(b) - EPS && a.iteraciones > b.iteraciones),
  );
  if (sorpresa) {
    partes.push(
      `Ojo: empezar más cerca del óptimo no garantiza menos trabajo. ${sorpresa.nombre} partió de una solución mejor que otro método y aun así necesitó más iteraciones.`,
    );
  } else if (mejores.length < filas.length) {
    partes.push(
      'Una mejor solución inicial ahorra trabajo de optimización; el óptimo final es el mismo para los tres.',
    );
  }
  return partes.join(' ');
}
