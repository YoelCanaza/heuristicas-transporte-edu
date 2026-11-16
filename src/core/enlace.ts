import { nombres } from './ejemplos';
import type { Problema } from './tipos';
import { esProblema } from './validacion';

/** Tamaño máximo que acepta un enlace: el mismo que permite el editor. */
export const MAX_LADO = 8;

/** Forma compacta del problema dentro del enlace. `v` permite cambiar el formato más adelante. */
interface Compacto {
  v: 1;
  o: number[];
  d: number[];
  c: number[][];
  /** Nombres, solo si no son los de siempre (O1, O2… / D1, D2…). */
  no?: string[];
  nd?: string[];
  /** Rutas prohibidas como pares [fila, columna]. */
  x?: [number, number][];
  max?: 1;
}

function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(codigo: string): string {
  const base = codigo.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(base + '='.repeat((4 - (base.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binario, (ch) => ch.charCodeAt(0)));
}

const iguales = (a: string[], b: string[]) => a.length === b.length && a.every((t, k) => t === b[k]);

/** Convierte el problema en un texto apto para la dirección (sin caracteres que haya que escapar). */
export function codificarProblema(p: Problema): string {
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const compacto: Compacto = { v: 1, o: p.ofertas, d: p.demandas, c: p.costos };
  if (!iguales(p.origenes, nombres('O', m))) compacto.no = p.origenes;
  if (!iguales(p.destinos, nombres('D', n))) compacto.nd = p.destinos;
  const prohibidas = (p.prohibidas ?? []).flatMap((fila, i) =>
    fila.flatMap((v, j) => (v ? [[i, j] as [number, number]] : [])),
  );
  if (prohibidas.length > 0) compacto.x = prohibidas;
  if (p.objetivo === 'max') compacto.max = 1;
  return aBase64Url(JSON.stringify(compacto));
}

/** Recupera el problema de un enlace; null si el texto está dañado o no describe un problema válido. */
export function decodificarProblema(codigo: string): Problema | null {
  let c: Partial<Compacto>;
  try {
    c = JSON.parse(deBase64Url(codigo)) as Partial<Compacto>;
  } catch {
    return null;
  }
  if (typeof c !== 'object' || c === null || c.v !== 1 || !Array.isArray(c.o) || !Array.isArray(c.d)) return null;
  const m = c.o.length;
  const n = c.d.length;
  if (m > MAX_LADO || n > MAX_LADO) return null;
  const parValido = (par: unknown) =>
    Array.isArray(par) &&
    par.length === 2 &&
    Number.isInteger(par[0]) &&
    Number.isInteger(par[1]) &&
    par[0] >= 0 &&
    par[0] < m &&
    par[1] >= 0 &&
    par[1] < n;
  if (c.x !== undefined && !(Array.isArray(c.x) && c.x.every(parValido))) return null;
  const problema: Problema = {
    ofertas: c.o,
    demandas: c.d,
    costos: c.c ?? [],
    origenes: c.no ?? nombres('O', m),
    destinos: c.nd ?? nombres('D', n),
  };
  if (c.x && c.x.length > 0) {
    const prohibidas = Array.from({ length: m }, () => Array<boolean>(n).fill(false));
    for (const [i, j] of c.x) prohibidas[i][j] = true;
    problema.prohibidas = prohibidas;
  }
  if (c.max === 1) problema.objetivo = 'max';
  return esProblema(problema) ? problema : null;
}

/** Dos problemas con los mismos datos (para no ofrecer «deshacer» si el enlace trae el mismo). */
export function mismoProblema(a: Problema, b: Problema): boolean {
  return codificarProblema(a) === codificarProblema(b);
}
