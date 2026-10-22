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
