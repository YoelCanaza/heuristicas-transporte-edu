# HeurisTrans — aplicación (MVP)

Software educativo web para aprender las heurísticas del Problema de Transporte
(Esquina Noroeste, Costo Mínimo, Vogel), optimizar con el Camino de las Piedras y
diseñar heurísticas propias.

## Uso

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm test         # pruebas del núcleo algorítmico
npm run build    # versión estática en dist/ (publicable en GitHub Pages, Vercel, etc.)
```

## Estructura

- `src/core/` — núcleo algorítmico en TypeScript puro (sin React): balanceo, esquema
  constructivo común, métodos clásicos, Camino de las Piedras, heurística del usuario y
  comparación.
- `src/ui/` — componentes React (editor, tabla de transporte, reproductor de pasos,
  vistas Aprender y Laboratorio).
- `src/contenido/` — textos teóricos.
- `tests/` — pruebas Vitest (ejemplo de Taha y propiedades en 200 instancias aleatorias).

## Dependencias de terceros y licencias

| Componente | Uso | Licencia |
|---|---|---|
| React, React DOM | Interfaz | MIT |
| Unbounded (vía @fontsource) | Tipografía de títulos | SIL Open Font License 1.1 |
| Manrope (vía @fontsource) | Tipografía de texto | SIL Open Font License 1.1 |
| Vite, Vitest, TypeScript (solo desarrollo) | Construcción y pruebas | MIT / Apache-2.0 |

Las fuentes se distribuyen dentro de la aplicación (no se cargan desde internet). Todos los gráficos (logotipo,
red de transporte de la portada, íconos) son originales y están dibujados con código.
