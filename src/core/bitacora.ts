import type { ResultadoComparacion } from './comparacion';
import { ETIQUETA_FAMILIA, ETIQUETA_TAMANO } from './ejemplos';
import type { Familia, Tamano } from './ejemplos';
import { describir } from './heuristica';
import type { ConfigHeuristica } from './heuristica';
import { fmt } from './util';

/** Un intento registrado en la bitácora: la regla, lo que se esperaba, lo que se midió y lo que se concluyó. */
export interface EntradaBitacora {
  id: number;
  /** Fecha y hora en formato ISO. */
  fecha: string;
  nombre: string;
  regla: string;
  hipotesis: string;
  conclusion: string;
  familia: Familia;
  tamano: Tamano | null;
  instancias: number;
  semilla: number;
  /** Puesto de la heurística propia por brecha promedio (1 = la mejor). */
  puesto: number;
  competidores: number;
  /** Brecha promedio (%) de cada competidor, de mejor a peor. */
  brechas: { id: string; nombre: string; brecha: number }[];
}

export const MAX_ENTRADAS = 50;

export function crearEntrada(
  config: ConfigHeuristica,
  resultado: ResultadoComparacion,
  hipotesis: string,
  conclusion: string,
  ahora: Date = new Date(),
): EntradaBitacora {
  const orden = [...resultado.filas].sort((a, b) => a.brechaPromedio - b.brechaPromedio);
  return {
    id: ahora.getTime(),
    fecha: ahora.toISOString(),
    nombre: config.nombre.trim() || 'Mi heurística',
    regla: describir(config),
    hipotesis: hipotesis.trim(),
    conclusion: conclusion.trim(),
    familia: resultado.familia,
    tamano: resultado.tamano,
    instancias: resultado.instancias,
    semilla: resultado.semilla,
    puesto: orden.findIndex((f) => f.id === 'propia') + 1,
    competidores: orden.length,
    brechas: orden.map((f) => ({ id: f.id, nombre: f.nombre, brecha: f.brechaPromedio })),
  };
}

/** Añade la entrada al principio y conserva solo las más recientes. */
export function agregarEntrada(bitacora: EntradaBitacora[], entrada: EntradaBitacora): EntradaBitacora[] {
  return [entrada, ...bitacora].slice(0, MAX_ENTRADAS);
}

export function brechaPropia(e: EntradaBitacora): number {
  return e.brechas.find((b) => b.id === 'propia')?.brecha ?? 0;
}

export function describirProblemas(e: Pick<EntradaBitacora, 'familia' | 'tamano' | 'instancias' | 'semilla'>): string {
  const tamano = e.tamano ? ETIQUETA_TAMANO[e.tamano].toLowerCase() : 'de tamaño variado';
  return `${e.instancias} problemas ${tamano}, familia "${ETIQUETA_FAMILIA[e.familia].titulo.toLowerCase()}", semilla ${e.semilla}`;
}

/** Comprueba que un dato leído del almacenamiento tenga forma de bitácora. */
export function esBitacora(dato: unknown): dato is EntradaBitacora[] {
  return (
    Array.isArray(dato) &&
    dato.every((e: unknown) => {
      if (typeof e !== 'object' || e === null) return false;
      const x = e as Record<string, unknown>;
      return (
        typeof x.id === 'number' &&
        typeof x.fecha === 'string' &&
        typeof x.nombre === 'string' &&
        typeof x.regla === 'string' &&
        typeof x.hipotesis === 'string' &&
        typeof x.conclusion === 'string' &&
        typeof x.familia === 'string' &&
        x.familia in ETIQUETA_FAMILIA &&
        (x.tamano === null || (typeof x.tamano === 'string' && x.tamano in ETIQUETA_TAMANO)) &&
        typeof x.instancias === 'number' &&
        typeof x.semilla === 'number' &&
        typeof x.puesto === 'number' &&
        typeof x.competidores === 'number' &&
        Array.isArray(x.brechas) &&
        x.brechas.every(
          (b: unknown) =>
            typeof b === 'object' &&
            b !== null &&
            typeof (b as Record<string, unknown>).id === 'string' &&
            typeof (b as Record<string, unknown>).nombre === 'string' &&
            typeof (b as Record<string, unknown>).brecha === 'number',
        )
      );
    })
  );
}

/** Informe de la bitácora en Markdown, del intento más antiguo al más reciente. */
export function informeMarkdown(bitacora: EntradaBitacora[]): string {
  const lineas = [
    '# Bitácora del laboratorio de heurísticas',
    '',
    'Informe generado con HeurisTrans. La brecha es el porcentaje en que el costo de la solución inicial supera al costo óptimo; cuanto menor, mejor.',
    '',
  ];
  [...bitacora].reverse().forEach((e, k) => {
    lineas.push(
      `## Intento ${k + 1}: ${e.nombre}`,
      '',
      `- **Fecha:** ${e.fecha.slice(0, 16).replace('T', ' ')} UTC`,
      `- **Regla:** ${e.regla}`,
      `- **Experimento:** ${describirProblemas(e)}.`,
      `- **Puesto:** ${e.puesto} de ${e.competidores} por brecha promedio.`,
      '',
      '| Heurística | Brecha promedio |',
      '| --- | --- |',
      ...e.brechas.map((b) => `| ${b.id === 'propia' ? `**${b.nombre}**` : b.nombre} | ${fmt(b.brecha)} % |`),
      '',
      `**Hipótesis:** ${e.hipotesis || '(sin hipótesis)'}`,
      '',
      `**Conclusión:** ${e.conclusion || '(sin conclusión)'}`,
      '',
    );
  });
  return lineas.join('\n');
}
