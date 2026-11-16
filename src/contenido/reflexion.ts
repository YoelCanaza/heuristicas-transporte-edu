import type { TemaTeoria } from './teoria';

export interface Pregunta {
  pregunta: string;
  respuesta: string;
}

/** Preguntas para pensar al terminar cada método, con una respuesta que se despliega a pedido. */
export const REFLEXION: Record<TemaTeoria, Pregunta[]> = {
  noroeste: [
    {
      pregunta: '¿Por qué Esquina Noroeste siempre da una solución factible, si ni siquiera mira los costos?',
      respuesta:
        'Cada asignación es el mínimo entre la oferta y la demanda restantes, así que nunca se envía de más. Como la tabla está balanceada, al agotar todas las filas también quedan cubiertas todas las columnas. Mirar los costos influye en lo barata que sea la solución, no en que sea factible.',
    },
    {
      pregunta:
        'Si cambias el orden de las filas o de las columnas, ¿cambia la solución de Esquina Noroeste? ¿Y la de Costo Mínimo?',
      respuesta:
        'La de Esquina Noroeste sí: depende solo de la posición de las celdas. La de Costo Mínimo no, salvo en los empates: depende de los costos, que no cambian al reordenar.',
    },
    {
      pregunta: '¿En qué problemas podría Esquina Noroeste dar una buena solución?',
      respuesta:
        'Cuando las rutas baratas quedan justo sobre la «escalera» que recorre desde la esquina superior izquierda, o cuando todos los costos son parecidos. Es una coincidencia del orden de la tabla, no algo que el método busque.',
    },
    {
      pregunta: 'Entonces, ¿para qué sirve un método que no mira los costos?',
      respuesta:
        'Es el más rápido de aplicar y da siempre un punto de partida factible. La optimización (Camino de las Piedras o MODI) es la que garantiza el óptimo; empezar más lejos solo le cuesta más iteraciones.',
    },
  ],
  costoMinimo: [
    {
      pregunta: 'Costo Mínimo usa siempre la ruta más barata disponible. ¿Por qué no garantiza el óptimo?',
      respuesta:
        'Cada asignación agota una fila o una columna y cierra sus rutas. Una elección barata al principio puede dejar, al final, solo rutas caras para lo que queda por repartir. Es un método voraz: optimiza cada paso por separado, no la solución completa.',
    },
    {
      pregunta: '¿Puede Costo Mínimo dar una solución peor que Esquina Noroeste?',
      respuesta:
        'Sí. En la mayoría de los problemas es mejor, pero no siempre. Intenta construir en la pantalla Problema un caso pequeño donde ocurra: obliga a entender qué decisión temprana le sale cara.',
    },
    {
      pregunta:
        'Ante un empate de costos, esta aplicación elige la celda que permite asignar más. ¿Por qué podría tener sentido?',
      respuesta:
        'Mandar más unidades por una ruta barata deja menos unidades para rutas que podrían ser caras. Aun así es una convención: otros libros desempatan por el orden de la tabla y pueden llegar a otra solución, con otro costo.',
    },
    {
      pregunta: '¿Qué información usa Costo Mínimo que Esquina Noroeste ignora? ¿Y cuál ignoran los dos?',
      respuesta:
        'Usa el costo de cada ruta. Ninguno de los dos mira cuánto se pagaría de más si una ruta barata deja de estar disponible: esa es justamente la información que añade Vogel con las penalizaciones.',
    },
  ],
  vogel: [
    {
      pregunta: '¿Qué mide la penalización de una fila o columna?',
      respuesta:
        'La diferencia entre sus dos costos más bajos todavía disponibles: cuánto se pagaría de más por unidad si no se usa su ruta más barata y hay que pasar a la segunda.',
    },
    {
      pregunta: '¿Por qué Vogel asigna en la línea de mayor penalización y no directamente en la celda más barata?',
      respuesta:
        'Porque en esa línea equivocarse es más caro: si su ruta barata se cierra, el sobrecosto es el mayor. Atiende primero lo urgente y deja para después las líneas donde casi da igual qué ruta se use.',
    },
    {
      pregunta: 'Una fila con penalización 0, ¿es una fila que no importa?',
      respuesta:
        'No. Penalización 0 significa que tiene dos rutas igual de baratas: perder una no cuesta nada porque queda la otra. Sus costos pueden ser altos; solo indica que no hay urgencia en decidirla.',
    },
    {
      pregunta: 'Vogel suele quedar más cerca del óptimo. ¿Qué precio se paga por eso?',
      respuesta:
        'Más cálculo: en cada iteración hay que recalcular las penalizaciones de todas las líneas sin tachar. A mano, en una tabla grande, es mucho trabajo. Y aun así no garantiza el óptimo: sigue decidiendo una línea a la vez.',
    },
  ],
  piedras: [
    {
      pregunta: '¿Por qué los signos del camino cerrado alternan + y −?',
      respuesta:
        'Para conservar las ofertas y las demandas: lo que se suma en una celda se resta en otra de la misma fila, y lo mismo en cada columna. Así la nueva solución sigue siendo factible.',
    },
    {
      pregunta: '¿Qué significa un costo marginal negativo? ¿Y uno igual a 0?',
      respuesta:
        'Negativo: cada unidad enviada por esa celda baja el costo total en ese valor, así que conviene que entre a la base. Cero: el costo no cambia; si la celda puede entrar con θ mayor que 0, existe otra solución óptima con el mismo costo.',
    },
    {
      pregunta: '¿Por qué θ es el menor valor entre las celdas con signo −?',
      respuesta:
        'Es lo máximo que se puede mover sin que ninguna asignación quede negativa. La celda que llega a 0 es la que sale de la base.',
    },
    {
      pregunta: '¿Por qué hacen falta m + n − 1 celdas básicas, aunque alguna valga 0 (ε)?',
      respuesta:
        'Con menos, algunas celdas vacías no tendrían camino cerrado y no se podría calcular su costo marginal. La ε completa la base sin cambiar lo que se envía.',
    },
    {
      pregunta: '¿Cómo sabe el método que ya llegó al óptimo?',
      respuesta:
        'Cuando ninguna celda vacía tiene costo marginal negativo, ningún cambio de una sola ruta mejora el costo. La teoría de la programación lineal asegura que, en ese caso, ningún otro reparto es mejor.',
    },
  ],
  modi: [
    {
      pregunta: '¿Qué representan los valores u y v?',
      respuesta:
        'Son números para cada fila y cada columna que cumplen u + v = costo en todas las celdas básicas. Con ellos, el costo marginal de una celda vacía es costo − u − v, sin trazar su camino. En programación lineal se llaman variables duales.',
    },
    {
      pregunta: '¿Por qué se puede fijar libremente un valor en 0?',
      respuesta:
        'Hay m + n incógnitas y solo m + n − 1 ecuaciones (una por celda básica), así que una queda libre. Elegir otro valor sumaría una constante a todas las u y la restaría de todas las v: los costos marginales no cambian.',
    },
    {
      pregunta: '¿Por qué MODI da los mismos costos marginales que el Camino de las Piedras?',
      respuesta:
        'Al sumar con signos + y − los costos del camino cerrado de una celda, cada u y cada v de las celdas básicas aparece una vez sumando y otra restando, y se cancelan. Lo que queda es costo − u − v: son dos maneras de calcular lo mismo.',
    },
    {
      pregunta: '¿Qué ventaja tiene MODI frente al Camino de las Piedras?',
      respuesta:
        'Calcula todos los costos marginales con m + n valores, en vez de trazar un camino cerrado por cada celda vacía. Solo hace falta trazar el camino de la celda que entra.',
    },
  ],
};
