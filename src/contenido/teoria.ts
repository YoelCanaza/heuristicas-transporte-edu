export interface Teoria {
  titulo: string;
  idea: string;
  pasos: string[];
  ventajas: string;
  limitaciones: string;
  /** Decisiones que los libros resuelven de formas distintas y que esta aplicación fija así. */
  convenciones: string[];
  errores: string[];
}

export type TemaTeoria = 'noroeste' | 'costoMinimo' | 'vogel' | 'piedras';

export const TEORIA: Record<TemaTeoria, Teoria> = {
  noroeste: {
    titulo: 'Esquina Noroeste',
    idea: 'Llena la tabla desde la esquina superior izquierda hacia la inferior derecha, como quien lee un texto. No mira los costos.',
    pasos: [
      'Toma la celda de la esquina noroeste de la tabla sin tachar.',
      'Asígnale lo máximo posible: el mínimo entre la oferta y la demanda restantes.',
      'Tacha la fila o la columna que se agotó y repite.',
    ],
    ventajas: 'Es la más simple y rápida; siempre da una solución factible.',
    limitaciones:
      'Al ignorar los costos suele dar soluciones caras, que requieren muchas iteraciones para optimizarse.',
    convenciones: [
      'Si la oferta y la demanda se agotan a la vez, se tacha solo la fila (la columna, si es la última fila). La otra línea queda con 0 y recibe una asignación ε.',
    ],
    errores: [
      'Tachar la fila y la columna a la vez cuando ambas se agotan: se pierde una celda básica y luego no se pueden cerrar los caminos.',
      'Esperar una buena solución: el método nunca consulta los costos.',
    ],
  },
  costoMinimo: {
    titulo: 'Costo Mínimo',
    idea: 'En cada paso aprovecha la ruta más barata que todavía esté disponible. Es una estrategia voraz (greedy).',
    pasos: [
      'Busca la celda disponible de menor costo en toda la tabla.',
      'Asígnale lo máximo posible.',
      'Tacha la línea agotada y repite.',
    ],
    ventajas: 'Considera los costos; suele ser mucho mejor que la Esquina Noroeste.',
    limitaciones: 'Es miope: tomar hoy la celda más barata puede obligar a usar rutas muy caras al final.',
    convenciones: [
      'Empate de costo: se elige la celda que permite asignar más unidades.',
      'Si el empate continúa: la primera celda en orden de fila y luego de columna.',
    ],
    errores: [
      'Buscar el menor costo solo dentro de una fila, en lugar de en toda la tabla disponible.',
      'Olvidar descontar la oferta y la demanda después de cada asignación.',
    ],
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
    convenciones: [
      'Empate de penalización: se elige la línea que contiene el menor costo; si persiste, las filas antes que las columnas, en orden.',
      'Dentro de la línea: la celda de menor costo; en empate, la que permite asignar más.',
      'Cuando solo queda una fila o una columna sin tachar, ya no se calculan penalizaciones: se asigna por costo mínimo.',
    ],
    errores: [
      'No recalcular las penalizaciones después de tachar una línea.',
      'Calcular la penalización como costo mayor menos costo menor, en lugar de la diferencia entre los dos menores.',
    ],
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
    convenciones: [
      'Entra la celda de costo marginal más negativo; en empate, la primera en orden de fila y columna.',
      'Si varias celdas con signo − quedan en 0, sale la primera que aparece al recorrer el camino; las demás siguen en la base con ε.',
      'Si faltan celdas básicas, ε se coloca en la celda vacía de menor costo que no forme un camino cerrado con las básicas.',
    ],
    errores: [
      'Usar una celda vacía como esquina del camino: solo se puede girar en celdas básicas.',
      'Tomar θ como la menor asignación de todo el camino, en lugar de solo entre las celdas con signo −.',
    ],
  },
};

export const CONVENCIONES_GENERALES = [
  'Si la oferta total y la demanda total no coinciden, se agrega un origen o un destino ficticio con costo 0.',
  'Los orígenes son las filas (O1, O2, …) y los destinos las columnas (D1, D2, …).',
  'Si tu libro usa otros criterios de desempate, puedes obtener otra solución inicial igualmente válida; el costo óptimo final es el mismo.',
];
