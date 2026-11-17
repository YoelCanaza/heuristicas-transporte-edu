export interface Teoria {
  titulo: string;
  idea: string;
  pasos: string[];
  ventajas: string;
  limitaciones: string;
  /** Decisiones que los libros resuelven de formas distintas y que esta aplicación fija así. */
  convenciones: string[];
  errores: string[];
  /** Pregunta de comprobación: se responde antes de pasar a la práctica. */
  pregunta: Pregunta;
}

export interface Pregunta {
  texto: string;
  opciones: string[];
  /** Índice de la opción correcta. */
  correcta: number;
  /** Por qué es esa; se muestra tras responder, acierte o no. */
  explicacion: string;
}

export type TemaTeoria = 'noroeste' | 'costoMinimo' | 'vogel' | 'piedras' | 'modi';

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
    pregunta: {
      texto: '¿Qué información usa la Esquina Noroeste para elegir la celda?',
      opciones: [
        'El menor costo de la tabla',
        'Solo la posición: la celda más arriba y a la izquierda sin tachar',
        'La mayor penalización',
      ],
      correcta: 1,
      explicacion: 'Nunca consulta los costos. Por eso es la más rápida de aplicar y, casi siempre, la más cara.',
    },
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
    pregunta: {
      texto: 'Costo Mínimo eligió siempre la celda más barata. ¿Por qué su solución puede no ser la óptima?',
      opciones: [
        'Porque no respeta las ofertas y las demandas',
        'Porque al agotar las rutas baratas puede quedar obligado a usar rutas muy caras al final',
        'Porque no mira los costos',
      ],
      correcta: 1,
      explicacion:
        'Cada asignación tacha una fila o una columna. Lo que queda para el final se llena con lo que haya, cueste lo que cueste.',
    },
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
    pregunta: {
      texto: 'A una fila le quedan sin tachar los costos 4, 9 y 20. ¿Cuál es su penalización?',
      opciones: ['4', '5', '16'],
      correcta: 1,
      explicacion:
        'Es la diferencia entre sus dos menores costos: 9 − 4 = 5. Mide cuánto se pierde si no se usa la ruta más barata de la fila.',
    },
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
    pregunta: {
      texto: 'Una celda vacía tiene costo marginal −9 y θ = 5. Si entra a la base, ¿qué pasa con el costo total?',
      opciones: ['Baja 45', 'Sube 45', 'Baja 9'],
      correcta: 0,
      explicacion:
        'El costo cambia en θ · marginal = 5 · (−9) = −45. Es lo que ocurre en la primera iteración del ejemplo: de 520 a 475.',
    },
  },
  modi: {
    titulo: 'MODI (método u-v)',
    idea: 'Obtiene los mismos costos marginales que el Camino de las Piedras, pero con una cuenta por celda en lugar de un camino cerrado por celda. Para eso asigna un número u a cada fila y un número v a cada columna.',
    pasos: [
      'Verifica que haya m + n − 1 celdas básicas (si faltan, agrega ε).',
      'Fija u = 0 en la primera fila. Para cada celda básica se cumple u + v = costo: despeja los demás valores saltando de una celda básica a otra.',
      'Para cada celda vacía calcula su costo marginal: costo − u − v. Si todos son ≥ 0, la solución es óptima.',
      'Si no, entra la celda de marginal más negativo. Traza solo su camino cerrado y calcula θ, igual que en el Camino de las Piedras.',
      'Suma θ en las celdas + y réstalo en las −. Sale la celda − que quedó en 0. Recalcula u y v, y repite.',
    ],
    ventajas:
      'Mucho menos trabajo por iteración: un solo camino cerrado en vez de uno por cada celda vacía. Es el método que conviene en problemas grandes.',
    limitaciones:
      'Es menos intuitivo: u y v no se "ven" en la tabla como un camino. Conviene entender primero el Camino de las Piedras.',
    convenciones: [
      'Se fija u = 0 en la primera fila. Con otro punto de partida cambian u y v, pero los costos marginales son los mismos.',
      'La celda que entra, θ y la celda que sale se eligen igual que en el Camino de las Piedras, así que ambos métodos recorren las mismas soluciones.',
      'u y v pueden ser negativos; al restarlos, menos por menos da más.',
    ],
    errores: [
      'Usar una celda vacía para despejar u o v: la igualdad u + v = costo solo vale en las celdas básicas.',
      'Seguir con los u y v de la iteración anterior: hay que recalcularlos cada vez que cambia la base.',
      'Equivocarse con los signos al restar un valor negativo: 8 − (−2) es 10.',
    ],
    pregunta: {
      texto: '¿Qué condición cumplen los valores u y v en cada celda básica?',
      opciones: ['u + v = costo de la celda', 'u − v = costo de la celda', 'u + v = 0'],
      correcta: 0,
      explicacion:
        'Con esa condición se despejan todos los u y v a partir de uno fijado en 0. Después, el costo marginal de cada celda vacía es costo − u − v.',
    },
  },
};

export const CONVENCIONES_GENERALES = [
  'Si la oferta total y la demanda total no coinciden, se agrega un origen o un destino ficticio con costo 0.',
  'Los orígenes son las filas (O1, O2, …) y los destinos las columnas (D1, D2, …).',
  'M es una potencia de 10 mayor que cualquier costo total posible del problema (como mínimo 1000). La tabla y las explicaciones la escriben con la letra M.',
  'Si tu libro usa otros criterios de desempate, puedes obtener otra solución inicial igualmente válida; el costo óptimo final es el mismo.',
];

export interface Variante {
  titulo: string;
  idea: string;
  pasos: string[];
  errores: string[];
}

/** Variantes del problema que se reducen al caso estándar antes de aplicar cualquier método. */
export const VARIANTES: Variante[] = [
  {
    titulo: 'Maximizar utilidades',
    idea: 'Los métodos de esta aplicación minimizan. Un problema de utilidades se convierte primero en uno de costos de oportunidad y después se resuelve igual que siempre.',
    pasos: [
      'Balancea el problema; la línea ficticia tiene utilidad 0.',
      'Ubica la mayor utilidad de la tabla.',
      'Reemplaza cada utilidad por su costo de oportunidad: la mayor utilidad menos la utilidad de la celda.',
      'Resuelve la tabla de costos de oportunidad como un problema de minimización.',
      'Calcula la utilidad total con las utilidades originales, no con los costos de oportunidad.',
    ],
    errores: [
      'Aplicar Costo Mínimo o Vogel directamente sobre las utilidades: se elegirían las rutas que menos ganan.',
      'Informar como resultado el costo de oportunidad total en lugar de la utilidad.',
    ],
  },
  {
    titulo: 'Rutas prohibidas',
    idea: 'Cuando no se puede enviar por una ruta, se le asigna un costo muy grande, llamado M. Los métodos la evitan por sí solos porque siempre hay algo más barato.',
    pasos: [
      'Asigna el costo M a cada ruta prohibida. En un problema de maximización, hazlo después de convertir a costos de oportunidad.',
      'Aplica el método elegido sin cambiar sus reglas. M es mayor que cualquier otro costo, y M menos cualquier número sigue siendo muy grande.',
      'Optimiza. Un costo marginal como "−M + 7" es negativo: esa celda entra a la base.',
      'Revisa la solución final: si todavía envía unidades por una ruta prohibida, el problema no tiene solución con esas prohibiciones.',
    ],
    errores: [
      'Poner costo 0 a la ruta prohibida: los métodos la elegirían primero.',
      'Dar por buena una solución inicial que usa una ruta prohibida. La Esquina Noroeste puede caer en una porque no mira los costos; la optimización la saca si hay alternativa.',
    ],
  },
];
