# HeurisTrans

Software educativo web para aprender las heurísticas del Problema de Transporte
(Esquina Noroeste, Costo Mínimo y Aproximación de Vogel), optimizar con el Camino de
las Piedras y diseñar heurísticas propias.

Versión actual: **0.3.0**. Funciona por completo en el navegador: no necesita servidor
ni conexión a internet una vez cargado.

## Qué ofrece

| Pantalla    | Para qué sirve                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inicio      | Presentación y acceso directo a cada método.                                                                                                                                         |
| Problema    | Editar costos, ofertas y demandas (de 2×2 a 8×8), cargar el ejemplo de Taha o generar un problema aleatorio. El problema se guarda en el navegador y se balancea solo si hace falta. |
| Aprender    | Ver cada método paso a paso, con la explicación de cada decisión, y continuar con el Camino de las Piedras: camino cerrado, costo marginal, θ, celda que entra y celda que sale.     |
| Laboratorio | Diseñar una heurística propia combinando criterios, ejecutarla paso a paso y compararla con los métodos clásicos y con el óptimo en cientos de problemas aleatorios reproducibles.   |
| Teoría      | Idea, pasos, ventajas, limitaciones y errores frecuentes de cada método; convenciones de desempate que usa la aplicación; glosario.                                                  |

### Modo práctica

En la pantalla Aprender, el modo práctica convierte la demostración en ejercicio:

- El estudiante predice qué celda elegirá el método. En Vogel debe calcular él mismo las
  penalizaciones: la tabla no las muestra hasta que pide la segunda pista.
- En el Camino de las Piedras predice qué celda entra a la base y después **traza a mano su
  camino cerrado**, haciendo clic en las celdas donde gira.
- Cada error recibe un diagnóstico: la aplicación reconoce qué regla siguió el estudiante
  (por ejemplo, elegir la celda más barata en Esquina Noroeste) y explica la diferencia.
- Hay dos pistas graduadas por ejercicio y un contador de ejercicios resueltos sin ayuda.

## Uso

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
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
  - `heuristica.ts`, `comparacion.ts`: heurística del usuario y experimento comparativo;
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

39 pruebas automatizadas. Entre ellas:

- El ejemplo de Taha da los valores del libro: Esquina Noroeste 520, Costo Mínimo 475,
  Vogel 475 y óptimo 435.
- En 200 problemas aleatorios, las tres heurísticas dan soluciones factibles con m + n − 1
  celdas básicas y el Camino de las Piedras llega al mismo óptimo desde las tres.
- La aplicación no declara óptima una solución si se detuvo por el límite de iteraciones.
- El diagnóstico de errores y la validación del trazado del camino cerrado.

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
