# HeurisTrans

Software educativo web para aprender las heurísticas del Problema de Transporte
(Esquina Noroeste, Costo Mínimo y Aproximación de Vogel), optimizar con el Camino de
las Piedras y diseñar heurísticas propias.

Versión actual: **0.5.0**. Funciona por completo en el navegador: no necesita servidor
ni conexión a internet una vez cargado.

## Qué ofrece

| Pantalla    | Para qué sirve                                                                                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio      | Presentación y acceso directo a cada método.                                                                                                                                                                           |
| Problema    | Editar costos, ofertas y demandas (de 2×2 a 8×8), cargar el ejemplo de Taha o generar un problema aleatorio. El problema se guarda en el navegador y se balancea solo si hace falta.                                   |
| Aprender    | Ver cada método paso a paso, con la explicación de cada decisión, y continuar con la optimización, por el Camino de las Piedras o por MODI (u-v): costo marginal, camino cerrado, θ, celda que entra y celda que sale. |
| Comparar    | El mismo problema resuelto con las tres heurísticas: costo inicial, brecha respecto del óptimo, iteraciones necesarias y un gráfico del costo después de cada iteración.                                               |
| Laboratorio | Diseñar una heurística propia, ejecutarla paso a paso, plantear una hipótesis y ponerla a prueba contra los métodos clásicos y el óptimo en cientos de problemas reproducibles.                                        |
| Teoría      | Idea, pasos, ventajas, limitaciones y errores frecuentes de cada método; convenciones de desempate que usa la aplicación; glosario.                                                                                    |

### Maximización y rutas prohibidas

En la pantalla Problema se puede cambiar el objetivo a **maximizar utilidades** y **marcar
rutas prohibidas**. Los métodos no cambian: antes de empezar, un paso de conversión explica
cómo se llega a un problema de minimización equivalente.

- Las utilidades se cambian por su costo de oportunidad (la mayor utilidad menos la de la
  celda). El total que se muestra sigue siendo la utilidad real.
- Las rutas prohibidas reciben el costo M, un número mayor que cualquier costo alcanzable.
  La tabla y las explicaciones lo escriben con la letra: «M», «−M + 7», «5M + 290».
  Si no existe solución sin usarlas, la aplicación lo dice en lugar de declarar un óptimo.

La página de Teoría explica ambas variantes, con sus pasos y errores frecuentes.

### Reto inicial: reparte a tu manera

Antes de ver ningún método, el estudiante puede intentarlo solo. En Aprender, la opción
«Tu reparto» muestra la tabla con una casilla por ruta: se escribe cuánto se envía y la
aplicación solo revisa que no se pase de la oferta ni de la demanda. Con el reparto completo,
lo compara con el óptimo y con la solución inicial de cada método: cuánto de más costó, a
qué métodos igualó o superó y en qué rutas difiere de un reparto óptimo.

### El precio de la miopía

Al terminar la construcción, el paso «Solución inicial» dice cuánto más cuesta esa solución
que el óptimo y marca las asignaciones que usaron una ruta cara porque una decisión anterior
cerró otra más barata de su fila o columna. Cada una explica qué ruta barata ya no estaba
disponible, qué asignación la cerró y permite ir a ese paso. En Costo Mínimo se titula «El
precio de la miopía»; en los otros métodos y en el laboratorio cambia el título.

### Preguntas para pensar

Al terminar la construcción, bajo el reproductor aparecen cuatro preguntas sobre el método
(por qué funciona, qué ignora, qué pasa si cambia el orden de la tabla…), cada una con su
respuesta desplegable. Al terminar la optimización aparecen las del Camino de las Piedras o
las de MODI.

### Óptimos alternativos

Cuando la solución óptima tiene celdas vacías con costo marginal 0, el último paso de Aprender
las marca en la tabla. Al hacer clic en una, esa celda entra a la base: se ve otra solución
con el mismo costo, el camino cerrado que se usó y cuántas unidades se movieron. Se puede
seguir explorando, deshacer o volver a la solución del método. Si θ = 0, la aplicación aclara
que es la misma solución con otra base (degeneración), no un óptimo distinto.

### Vista de red

En la pantalla Aprender, la opción «Vista de red» dibuja bajo la tabla la misma solución
como una red de orígenes y destinos. El grosor de cada ruta es la cantidad que envía, junto
a cada nodo aparece lo que le queda por enviar o recibir y, en la optimización, el camino
cerrado se ve con sus signos + y −. La red cambia con cada paso, igual que la tabla.

### Modo práctica

En la pantalla Aprender, el modo práctica convierte la demostración en ejercicio:

- El estudiante predice qué celda elegirá el método. En Vogel debe calcular él mismo las
  penalizaciones: con «Preguntar cada decisión» las **escribe en la tabla**, casilla por
  casilla, y cada una se corrige al salir de ella; sin esa opción, la tabla no las muestra
  hasta que pide la segunda pista.
- En el Camino de las Piedras predice qué celda entra a la base y después **traza a mano su
  camino cerrado**, haciendo clic en las celdas donde gira. Con MODI, la tabla muestra u y v
  y el estudiante calcula costo − u − v para decidir qué celda entra.
- Con «Preguntar cada decisión» (activado por omisión) el estudiante resuelve el paso
  entero: tras elegir la celda escribe **cuántas unidades se asignan** y dice **qué línea se
  tacha**; tras trazar el camino cerrado calcula **θ** y señala **qué celda sale de la
  base**. Así puede resolver un problema completo a mano, de la tabla vacía al óptimo.
- Cada error recibe un diagnóstico: la aplicación reconoce qué regla siguió el estudiante
  (por ejemplo, elegir la celda más barata en Esquina Noroeste) y explica la diferencia.
- Hay dos pistas graduadas por ejercicio y un contador de ejercicios resueltos sin ayuda.

### Laboratorio

El laboratorio sigue los pasos de una pequeña investigación:

- **Diseñar la regla.** Además de combinar criterios fijos, el estudiante puede dar un peso
  de 0 a 10 a cuatro criterios (costo, costo relativo, urgencia de la línea y cantidad). La
  tabla muestra el puntaje que su regla da a cada celda en cada iteración.
- **Experimentar.** Elige la familia de problemas (costos al azar, geográficos,
  desbalanceados o con muchos empates), el tamaño, la cantidad y la semilla. El cálculo
  avanza por partes, con barra de progreso, sin congelar la pantalla.
- **Analizar.** Brecha promedio, mediana y peor caso; distribución de las brechas por
  tramos; duelos problema por problema contra cada método clásico; y el problema donde peor
  le fue a su regla, que puede abrir para recorrerlo paso a paso.
- **Bitácora.** Antes del experimento escribe su hipótesis y después su conclusión. Cada
  intento queda guardado en el navegador, con un gráfico de su evolución, y la bitácora se
  descarga como informe en Markdown.

## Uso

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5180 (o el siguiente puerto libre)
npm test           # pruebas automatizadas
npm run lint       # revisión estática (ESLint)
npm run formato    # da formato al código (Prettier)
npm run verificar  # lint + formato + pruebas + build; lo mismo que ejecuta la integración continua
npm run build      # versión estática en dist/, publicable en cualquier alojamiento de archivos
```

Cada pantalla tiene su dirección, por ejemplo `#/aprender/vogel` o `#/laboratorio`, así que
se pueden compartir enlaces directos.

## Estructura

- `src/core/` — núcleo algorítmico en TypeScript puro, sin dependencias de la interfaz:
  - `balanceo.ts`, `constructivo.ts`, `metodos.ts`: balanceo y las tres heurísticas, que
    comparten un mismo algoritmo constructivo y solo difieren en la regla que elige la celda;
  - `caminoPiedras.ts`: optimización, con manejo de la degeneración;
  - `modi.ts`: valores u y v del método MODI, la otra forma de obtener los costos marginales;
  - `comparador.ts`: las tres heurísticas sobre un mismo problema, con el costo tras cada iteración;
  - `conversion.ts`: maximización (costos de oportunidad) y rutas prohibidas (costo M);
  - `heuristica.ts`, `comparacion.ts`, `bitacora.ts`: heurística del usuario, experimento
    comparativo y bitácora de intentos;
  - `diagnostico.ts`: diagnóstico de errores y validación del trazado en el modo práctica;
  - `validacion.ts`, `ejemplos.ts`, `tipos.ts`, `util.ts`.
- `src/ui/` — componentes React: pantallas, tabla de transporte, reproductor de pasos,
  glosario contextual y rutas.
- `src/contenido/` — textos teóricos, convenciones de desempate y glosario.
- `tests/` — pruebas Vitest.
- `.github/workflows/ci.yml` — integración continua: verifica cada subida a `main`.

Los algoritmos no devuelven solo el resultado: generan una lista de pasos, cada uno con el
estado de la tabla y su explicación. La interfaz se limita a reproducir esa lista, lo que
permite probar toda la lógica sin interfaz.

## Pruebas

139 pruebas automatizadas. Entre ellas:

- El ejemplo de Taha da los valores del libro: Esquina Noroeste 520, Costo Mínimo 475,
  Vogel 475 y óptimo 435.
- En 200 problemas aleatorios, las tres heurísticas dan soluciones factibles con m + n − 1
  celdas básicas y el Camino de las Piedras llega al mismo óptimo desde las tres.
- MODI y el Camino de las Piedras calculan los mismos costos marginales, recorren las mismas
  soluciones y llegan al mismo óptimo: dos cálculos distintos que se verifican entre sí.
- El comparador: los recorridos del ejemplo de Taha (520 → 475 → 475 → 435 desde Esquina
  Noroeste), que el costo nunca sube entre iteraciones y los avisos con rutas prohibidas.
- El reto inicial: reconoce el reparto óptimo del ejemplo de Taha, mide la diferencia de uno
  peor, señala dónde se envió de más y ningún reparto válido queda mejor que el óptimo.
- Óptimos alternativos: cada cambio de base conserva ofertas, demandas, el total y la
  optimalidad; volver por la celda que salió recupera la solución, y MODI da los mismos
  marginales que el Camino de las Piedras.
- El precio de la miopía: en el ejemplo de Taha cada método queda a 85, 40 y 40 del óptimo,
  y cada ruta cara apunta a la asignación que de verdad agotó la línea (no a una de ε posterior).
- La aplicación no declara óptima una solución si se detuvo por el límite de iteraciones.
- El diagnóstico de errores (penalizaciones, celda, cantidad, línea que se tacha, θ y celda
  que sale) y la
  validación del trazado del camino cerrado.
- Maximización: un caso 2×2 resuelto a mano y, en problemas aleatorios, la misma utilidad
  óptima desde los tres métodos. Rutas prohibidas: el óptimo las evita, coincide con poner
  a mano un costo enorme y se avisa cuando no hay solución sin ellas.
- Las cuatro familias de problemas generan datos válidos y reproducibles; el puntaje con
  solo el peso del costo reproduce el Costo Mínimo; el experimento por partes da el mismo
  resultado que de una vez.

## Dependencias de terceros y licencias

| Componente                                 | Uso                    | Licencia                  |
| ------------------------------------------ | ---------------------- | ------------------------- |
| React, React DOM                           | Interfaz               | MIT                       |
| Unbounded (vía @fontsource)                | Tipografía de títulos  | SIL Open Font License 1.1 |
| Manrope (vía @fontsource)                  | Tipografía de texto    | SIL Open Font License 1.1 |
| Vite, Vitest, TypeScript (solo desarrollo) | Construcción y pruebas | MIT / Apache-2.0          |
| ESLint, Prettier (solo desarrollo)         | Calidad del código     | MIT                       |

Las fuentes se distribuyen dentro de la aplicación (no se cargan desde internet). Todos los gráficos (logotipo,
red de transporte de la portada, íconos) son originales y están dibujados con código.
