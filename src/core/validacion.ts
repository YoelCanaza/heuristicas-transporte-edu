import type { Problema } from './tipos';
import { suma } from './util';

export function validar(p: Problema): string[] {
  const errores: string[] = [];
  const todos = [...p.ofertas, ...p.demandas, ...p.costos.flat()];
  if (todos.some((v) => !Number.isFinite(v))) errores.push('Todos los valores deben ser numéricos.');
  if (todos.some((v) => v < 0)) errores.push('No se admiten valores negativos.');
  if (suma(p.ofertas) <= 0) errores.push('La oferta total debe ser mayor que 0.');
  if (suma(p.demandas) <= 0) errores.push('La demanda total debe ser mayor que 0.');
  return errores;
}

/** Comprueba que un dato externo (p. ej. leído del almacenamiento) tenga la forma de un Problema. */
export function esProblema(x: unknown): x is Problema {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Partial<Problema>;
  const numeros = (v: unknown): v is number[] =>
    Array.isArray(v) && v.every((n) => typeof n === 'number' && Number.isFinite(n));
  const textos = (v: unknown, k: number) => Array.isArray(v) && v.length === k && v.every((t) => typeof t === 'string');
  if (!numeros(p.ofertas) || !numeros(p.demandas) || !Array.isArray(p.costos)) return false;
  const m = p.ofertas.length;
  const n = p.demandas.length;
  return (
    m >= 2 &&
    n >= 2 &&
    p.costos.length === m &&
    p.costos.every((fila) => numeros(fila) && fila.length === n) &&
    textos(p.origenes, m) &&
    textos(p.destinos, n)
  );
}
