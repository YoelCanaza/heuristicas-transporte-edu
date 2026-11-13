export interface Termino {
  termino: string;
  definicion: string;
  /** Formas en que el término aparece en los textos (para resaltarlo en las explicaciones). */
  patron?: RegExp;
}

export const GLOSARIO: Termino[] = [
  {
    termino: 'Problema balanceado',
    definicion: 'Problema en el que la oferta total es igual a la demanda total.',
    patron: /balancead[oa]/i,
  },
  {
    termino: 'Origen o destino ficticio',
    definicion:
      'Fila o columna con costo 0 que se agrega para balancear el problema. Lo asignado ahí no se envía en realidad: es oferta sobrante o demanda insatisfecha.',
    patron: /(origen|destino) ficticio/i,
  },
  {
    termino: 'Solución básica factible',
    definicion: 'Reparto que cumple todas las ofertas y demandas usando exactamente m + n − 1 celdas básicas.',
  },
  {
    termino: 'Celda básica',
    definicion:
      'Celda que forma parte de la solución. Normalmente tiene una asignación positiva; si es 0 se escribe ε.',
    patron: /celdas? básicas?/i,
  },
  {
    termino: 'Celda vacía',
    definicion: 'Celda que no forma parte de la solución (no básica). No se envía nada por ella.',
    patron: /celdas? vacías?/i,
  },
  {
    termino: 'Degeneración',
    definicion:
      'Ocurre cuando hay menos de m + n − 1 celdas con asignación positiva. Se resuelve con una celda básica de valor 0 (ε).',
    patron: /degenera(ción|da)/i,
  },
  {
    termino: 'ε (épsilon)',
    definicion: 'Asignación de valor 0 que mantiene una celda en la base para que se puedan cerrar los caminos.',
  },
  {
    termino: 'Penalización',
    definicion:
      'En Vogel, diferencia entre los dos menores costos disponibles de una fila o columna. Mide cuánto se pierde si no se usa su celda más barata.',
    patron: /penalizaci(ón|ones)/i,
  },
  {
    termino: 'Camino cerrado',
    definicion:
      'Recorrido que parte de una celda vacía, gira en ángulo recto solo en celdas básicas y vuelve al inicio. Cada celda vacía tiene exactamente uno.',
    patron: /caminos? cerrados?/i,
  },
  {
    termino: 'Costo marginal',
    definicion:
      'Cambio del costo total por cada unidad enviada por una celda vacía. Se obtiene sumando y restando alternadamente los costos de su camino cerrado.',
    patron: /costos? marginal(es)?/i,
  },
  {
    termino: 'θ (theta)',
    definicion:
      'Cantidad que se mueve por el camino cerrado: la menor asignación entre las celdas con signo −. Así ninguna celda queda negativa.',
  },
  {
    termino: 'Solución óptima',
    definicion: 'Solución de costo total mínimo. Se reconoce porque ninguna celda vacía tiene costo marginal negativo.',
  },
  {
    termino: 'Óptimos alternativos',
    definicion: 'Otras soluciones con el mismo costo mínimo. Existen cuando alguna celda vacía tiene costo marginal 0.',
    patron: /soluciones óptimas alternativas/i,
  },
  {
    termino: 'Costo de oportunidad',
    definicion:
      'En un problema de maximización, lo que se deja de ganar por cada unidad enviada por una ruta: la mayor utilidad de la tabla menos la utilidad de esa ruta.',
    patron: /costos? de oportunidad/i,
  },
  {
    termino: 'Costo M',
    definicion:
      'Costo muy grande que se asigna a una ruta prohibida para que ningún método la elija. Si la solución óptima aún la usa, el problema no tiene solución sin esa ruta.',
    patron: /costo M\b/,
  },
  {
    termino: 'Heurística',
    definicion:
      'Regla práctica que encuentra una buena solución con poco esfuerzo, sin garantizar que sea la mejor posible.',
  },
];
