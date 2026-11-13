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

### Modo práctica

En la pantalla Aprender, el modo práctica convierte la demostración en ejercicio:

- El estudiante predice qué celda elegirá el método. En Vogel debe calcular él mismo las
  penalizaciones: la tabla no las muestra hasta que pide la segunda pista.
- En el Camino de las Piedras predice qué celda entra a la base y después **traza a mano su
  camino cerrado**, haciendo clic en las celdas donde gira. Con MODI, la tabla muestra u y v
  y el estudiante calcula costo − u − v para decidir qué celda entra.
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

96 pruebas automatizadas. Entre ellas:

- El ejemplo de Taha da los valores del libro: Esquina Noroeste 520, Costo Mínimo 475,
  Vogel 475 y óptimo 435.
- En 200 problemas aleatorios, las tres heurísticas dan soluciones factibles con m + n − 1
  celdas básicas y el Camino de las Piedras llega al mismo óptimo desde las tres.
- MODI y el Camino de las Piedras calculan los mismos costos marginales, recorren las mismas
  soluciones y llegan al mismo óptimo: dos cálculos distintos que se verifican entre sí.
- El comparador: los recorridos del ejemplo de Taha (520 → 475 → 475 → 435 desde Esquina
  Noroeste), que el costo nunca sube entre iteraciones y los avisos con rutas prohibidas.
- La aplicación no declara óptima una solución si se detuvo por el límite de iteraciones.
- El diagnóstico de errores y la validación del trazado del camino cerrado.
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
