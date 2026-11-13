import { useEffect, useRef, useState } from 'react';
import { enumerar } from '../core/comparador';
import type { ComparacionMetodos } from '../core/comparador';
import { fmt } from '../core/util';

const ALTO = 340;
const MARGEN = { izq: 58, der: 28, arriba: 44, abajo: 44 };
/** Franja superior reservada para las soluciones que usan rutas prohibidas (su total contiene M). */
const FRANJA_M = 30;

/** Marcas "redondas" para un eje: como mucho `cuantas` + 1 valores entre min y max. */
export function marcasEje(min: number, max: number, cuantas = 4): number[] {
  const rango = max - min;
  if (rango <= 0) return [min];
  const bruto = rango / cuantas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 5, 10].map((k) => k * potencia).find((k) => k >= bruto)!;
  const marcas: number[] = [];
  for (let v = Math.ceil(min / paso) * paso; v <= max + paso * 1e-9; v += paso) marcas.push(Math.round(v * 1e6) / 1e6);
  return marcas;
}

/** Marca de cada serie: color y forma fijos por método, para no depender solo del color. */
export function MarcaSerie({ serie, x, y, grande }: { serie: number; x?: number; y?: number; grande?: boolean }) {
  const forma =
    serie === 0 ? (
      <circle r="5" />
    ) : serie === 1 ? (
      <rect x="-4.5" y="-4.5" width="9" height="9" rx="1.5" />
    ) : (
      <path d="M0 -6 L5.6 4.2 L-5.6 4.2 Z" />
    );
  if (x !== undefined && y !== undefined) {
    return (
      <g className={`marca-serie serie-${serie}`} transform={`translate(${x} ${y})${grande ? ' scale(1.7)' : ''}`}>
        {forma}
      </g>
    );
  }
  return (
    <svg
      className={`marca-serie suelta serie-${serie}`}
      width="14"
      height="14"
      viewBox="-7 -7 14 14"
      aria-hidden="true"
    >
      {forma}
    </svg>
  );
}

export function GraficoTrayectorias({ comparacion }: { comparacion: ComparacionMetodos }) {
  const { problema, filas, optimo } = comparacion;
  const [activa, setActiva] = useState<number | null>(null);

  // El gráfico se dibuja en píxeles reales del ancho disponible: así llena la tarjeta y el
  // texto conserva su tamaño en cualquier pantalla, sin barras de desplazamiento.
  const lienzo = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(720);
  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo) return;
    const medir = () => setAncho(Math.max(280, Math.round(nodo.clientWidth)));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);
  const angosto = ancho < 480;

  const palabra = problema.utilidades ? 'Utilidad' : 'Costo';

  const maxIter = Math.max(1, ...filas.map((f) => f.iteraciones));
  const puntos = filas.flatMap((f) => f.trayectoria);
  const comparables = puntos.filter((q) => !q.prohibida).map((q) => q.valor);
  if (optimo !== null) comparables.push(optimo);
  const hayM = puntos.some((q) => q.prohibida);

  // Dominio vertical: solo los totales comparables, con un margen para que nada toque el borde.
  const minimo = comparables.length > 0 ? Math.min(...comparables) : 0;
  const maximo = comparables.length > 0 ? Math.max(...comparables) : 1;
  const holgura = (maximo - minimo || Math.abs(maximo) || 1) * 0.08;
  // Se deja espacio extra donde van los rótulos: el del óptimo queda del lado al que las líneas no llegan
  // (debajo al minimizar, encima al maximizar) y, al maximizar, los de las series van bajo su punto.
  const sube = !!problema.utilidades;
  const [y0, y1] = sube ? [minimo - holgura * 2.2, maximo + holgura * 2.2] : [minimo - holgura * 2.2, maximo + holgura];

  const izq = MARGEN.izq;
  const der = ancho - MARGEN.der;
  const arriba = MARGEN.arriba + (hayM ? FRANJA_M : 0);
  const abajo = ALTO - MARGEN.abajo;
  const px = (k: number) => izq + (k / maxIter) * (der - izq);
  const py = (v: number) => abajo - ((v - y0) / (y1 - y0)) * (abajo - arriba);
  const yM = MARGEN.arriba + 6;
  const yDe = (q: { valor: number; prohibida: boolean }) => (q.prohibida ? yM : py(q.valor));

  // Cuando dos métodos coinciden en un tramo, el de encima se dibuja a trazos y la marca de
  // debajo más grande, para que se vean los dos.
  const clave = (s: number, k: number) => {
    const q = filas[s].trayectoria[k];
    return q ? `${k}:${Math.round(yDe(q) * 10)}` : null;
  };
  const tramoRepetido = (s: number, k: number) =>
    filas.some((_, t) => t < s && clave(t, k) === clave(s, k) && clave(t, k + 1) === clave(s, k + 1));
  const puntoTapado = (s: number, k: number) => filas.some((_, t) => t > s && clave(t, k) === clave(s, k));

  const pasoX = Math.ceil(maxIter / Math.max(2, Math.floor((der - izq) / 44)));
  const marcasX = Array.from({ length: maxIter + 1 }, (_, k) => k).filter((k) => k % pasoX === 0 || k === maxIter);

  // Etiquetas directas en el punto de partida; las series que parten del mismo total comparten etiqueta.
  const grupos = new Map<number, string[]>();
  filas.forEach((f) => {
    const y = Math.round(yDe(f.trayectoria[0]));
    grupos.set(y, [...(grupos.get(y) ?? []), f.nombre]);
  });
  const etiquetas = [...grupos.entries()]
    .map(([y, nombres]) => ({ y: sube ? y + 22 : y - 12, texto: enumerar(nombres) }))
    .sort((a, b) => (sube ? a.y - b.y : b.y - a.y));
  etiquetas.forEach((e, k) => {
    const previa = etiquetas[k - 1];
    if (!previa) return;
    if (sube && e.y < previa.y + 15) e.y = previa.y + 15;
    if (!sube && e.y > previa.y - 15) e.y = previa.y - 15;
  });

  return (
    <div className="grafico">
      <ul className="grafico-leyenda">
        {filas.map((f, k) => (
          <li key={f.metodo}>
            <MarcaSerie serie={k} />
            {f.nombre}
          </li>
        ))}
        {optimo !== null && (
          <li>
            <span className="muestra-optimo" aria-hidden="true" />
            Óptimo
          </li>
        )}
      </ul>

      <div className="grafico-lienzo" ref={lienzo}>
        <svg
          width={ancho}
          height={ALTO}
          viewBox={`0 0 ${ancho} ${ALTO}`}
          role="img"
          aria-label={`${palabra} total después de cada iteración de la optimización, para cada método. ${comparacion.interpretacion}`}
          onMouseLeave={() => setActiva(null)}
        >
          {marcasEje(y0, y1).map((v) => (
            <g key={v}>
              <line className="grafico-rejilla" x1={izq} x2={der} y1={py(v)} y2={py(v)} />
              <text className="grafico-eje" x={izq - 10} y={py(v)} textAnchor="end" dominantBaseline="middle">
                {fmt(v)}
              </text>
            </g>
          ))}
          {hayM && (
            <>
              <line className="grafico-rejilla" x1={izq} x2={der} y1={yM} y2={yM} />
              <text className="grafico-eje" x={izq - 10} y={yM} textAnchor="end" dominantBaseline="middle">
                con M
              </text>
            </>
          )}
          <line className="grafico-base" x1={izq} x2={der} y1={abajo} y2={abajo} />
          {marcasX.map((k) => (
            <text key={k} className="grafico-eje" x={px(k)} y={abajo + 18} textAnchor="middle">
              {k}
            </text>
          ))}
          <text className="grafico-eje" x={(izq + der) / 2} y={ALTO - 6} textAnchor="middle">
            {angosto ? 'Iteración (0 = solución inicial)' : 'Iteración de la optimización (0 = solución inicial)'}
          </text>

          {optimo !== null && (
            <>
              <line className="grafico-optimo" x1={izq} x2={der} y1={py(optimo)} y2={py(optimo)} />
              <text className="grafico-eje fuerte" x={der} y={py(optimo) + (sube ? -8 : 16)} textAnchor="end">
                Óptimo {fmt(optimo)}
              </text>
            </>
          )}

          {activa !== null && (
            <line className="grafico-cursor" x1={px(activa)} x2={px(activa)} y1={MARGEN.arriba} y2={abajo} />
          )}

          {filas.map((f, s) =>
            f.trayectoria
              .slice(1)
              .map((q, k) => (
                <line
                  key={`${f.metodo}-${k}`}
                  className={`grafico-linea serie-${s} ${tramoRepetido(s, k) ? 'repetida' : ''}`}
                  x1={px(k)}
                  y1={yDe(f.trayectoria[k])}
                  x2={px(k + 1)}
                  y2={yDe(q)}
                />
              )),
          )}
          {/* Las etiquetas van debajo de las marcas para no tapar ningún punto. */}
          {etiquetas.map((e) => (
            <text key={e.texto} className="grafico-etiqueta" x={izq + 10} y={e.y}>
              {e.texto}
            </text>
          ))}

          {filas.map((f, s) =>
            f.trayectoria.map((q, k) => (
              <MarcaSerie key={`${f.metodo}-${k}`} serie={s} x={px(k)} y={yDe(q)} grande={puntoTapado(s, k)} />
            )),
          )}

          {Array.from({ length: maxIter + 1 }, (_, k) => {
            const ancho = (der - izq) / maxIter;
            return (
              <rect
                key={k}
                className="grafico-zona"
                x={px(k) - ancho / 2}
                y={MARGEN.arriba - 10}
                width={ancho}
                height={abajo - MARGEN.arriba + 10}
                onMouseEnter={() => setActiva(k)}
                onClick={() => setActiva(k)}
              />
            );
          })}
        </svg>

        {activa !== null && (
          <div
            className={`grafico-tooltip ${angosto ? 'debajo' : activa > maxIter / 2 ? 'a-la-izquierda' : ''}`}
            style={angosto ? undefined : { left: px(activa) }}
            role="status"
          >
            <strong>{activa === 0 ? 'Solución inicial' : `Iteración ${activa}`}</strong>
            {filas.map((f, s) => {
              const q = f.trayectoria[Math.min(activa, f.trayectoria.length - 1)];
              return (
                <span key={f.metodo}>
                  <MarcaSerie serie={s} />
                  {f.nombre}
                  <b>{q.texto}</b>
                  {activa > f.iteraciones && <em>ya terminó</em>}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
