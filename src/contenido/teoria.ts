export interface Teoria {
  titulo: string;
  idea: string;
  pasos: string[];
  ventajas: string;
  limitaciones: string;
}

export const TEORIA: Record<'noroeste' | 'costoMinimo' | 'vogel' | 'piedras', Teoria> = {
  noroeste: {
    titulo: 'Esquina Noroeste',
    idea: 'Llena la tabla desde la esquina superior izquierda hacia la inferior derecha, como quien lee un texto. No mira los costos.',
    pasos: [
      'Toma la celda de la esquina noroeste de la tabla sin tachar.',
      'Asígnale lo máximo posible: el mínimo entre la oferta y la demanda restantes.',
      'Tacha la fila o la columna que se agotó y repite.',
    ],
    ventajas: 'Es la más simple y rápida; siempre da una solución factible.',
    limitaciones: 'Al ignorar los costos suele dar soluciones caras, que requieren muchas iteraciones para optimizarse.',
  },
  costoMinimo: {
    titulo: 'Costo Mínimo',
    idea: 'En cada paso aprovecha la ruta más barata que todavía esté disponible. Es una estrategia voraz (greedy).',
    pasos: [
      'Busca la celda disponible de menor costo (empate: la que permite asignar más).',
      'Asígnale lo máximo posible.',
      'Tacha la línea agotada y repite.',
    ],
    ventajas: 'Considera los costos; suele ser mucho mejor que la Esquina Noroeste.',
    limitaciones: 'Es miope: tomar hoy la celda más barata puede obligar a usar rutas muy caras al final.',
  },
  vogel: {
    titulo: 'Aproximación de Vogel (VAM)',
    idea: 'Mira el costo de oportunidad: prioriza las filas o columnas donde equivocarse sería más caro.',
    pasos: [
      'Para cada fila y columna sin tachar calcula su penalización: la diferencia entre sus dos menores costos.',
      'Elige la línea con la mayor penalización.',
      'En esa línea asigna lo máximo posible a la celda de menor costo.',
      'Tacha la línea agotada, recalcula las penalizaciones y repite.',
    ],
    ventajas: 'Suele dar soluciones muy cercanas al óptimo (a veces óptimas).',
    limitaciones: 'Requiere más cálculos por iteración.',
  },
  piedras: {
    titulo: 'Camino de las Piedras (Stepping Stone)',
    idea: 'Mejora una solución inicial probando, para cada celda vacía, qué pasaría si se enviara una unidad por ella.',
    pasos: [
      'Verifica que haya m + n − 1 celdas básicas (si faltan, agrega ε).',
      'Para cada celda vacía, forma un camino cerrado saltando solo por celdas básicas (las "piedras"), con giros en ángulo recto y signos alternos + y −.',
      'Costo marginal = suma de costos con esos signos. Si todos son ≥ 0, la solución es óptima.',
      'Si no, entra la celda de marginal más negativo. θ = menor asignación entre las celdas con signo −.',
      'Suma θ en las celdas + y réstalo en las −. Sale la celda − que quedó en 0. Repite.',
    ],
    ventajas: 'Es intuitivo y muestra claramente por qué una solución mejora.',
    limitaciones: 'Evaluar cada celda vacía es laborioso en problemas grandes (el método MODI lo agiliza).',
  },
};
