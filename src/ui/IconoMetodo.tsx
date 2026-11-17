import type { TemaTeoria } from '../contenido/teoria';

/** Lado de cada celda y separación de la mini tabla de 3 × 3 sobre la que se dibuja cada método. */
const LADO = 12;
const PASO = 15;
const pos = (k: number) => 3 + k * PASO;
const centro = (k: number) => pos(k) + LADO / 2;

function Rejilla({ llenas = [] }: { llenas?: [number, number][] }) {
  return (
    <>
      {[0, 1, 2].map((i) =>
        [0, 1, 2].map((j) => (
          <rect
            key={`${i}-${j}`}
            className={llenas.some(([a, b]) => a === i && b === j) ? 'ic-celda llena' : 'ic-celda'}
            x={pos(j)}
            y={pos(i)}
            width={LADO}
            height={LADO}
            rx={3}
          />
        )),
      )}
    </>
  );
}

/**
 * Dibujo pequeño que resume la idea de cada método sobre una tabla de 3 × 3: es decorativo,
 * el nombre del método siempre lo acompaña.
 */
export function IconoMetodo({ tema }: { tema: TemaTeoria | 'propia' }) {
  return (
    <svg className={`icono-metodo ic-${tema}`} viewBox="0 0 48 48" aria-hidden="true">
      {tema === 'noroeste' && (
        // Escalera desde la esquina superior izquierda hasta la inferior derecha.
        <>
          <Rejilla
            llenas={[
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 2],
              [2, 2],
            ]}
          />
          <circle className="ic-acento" cx={centro(0)} cy={centro(0)} r={2.6} />
        </>
      )}
      {tema === 'costoMinimo' && (
        // Un punto por costo: el más pequeño es el elegido.
        <>
          <Rejilla llenas={[[1, 0]]} />
          {[
            [4, 3.2, 4.4],
            [2.2, 3.8, 3],
            [3.4, 4.6, 3],
          ].map((fila, i) =>
            fila.map((r, j) => (
              <circle
                key={`${i}-${j}`}
                className={i === 1 && j === 0 ? 'ic-acento' : 'ic-punto'}
                cx={centro(j)}
                cy={centro(i)}
                r={r}
              />
            )),
          )}
        </>
      )}
      {tema === 'vogel' && (
        // La diferencia entre los dos menores costos de una fila.
        <>
          <Rejilla
            llenas={[
              [1, 0],
              [1, 2],
            ]}
          />
          <path
            className="ic-trazo"
            d={`M${centro(0)} ${pos(1) - 3.5} V${pos(1) - 7} H${centro(2)} V${pos(1) - 3.5}`}
          />
          <circle className="ic-acento" cx={centro(1)} cy={pos(1) - 7} r={2.6} />
        </>
      )}
      {tema === 'piedras' && (
        // Camino cerrado con signos alternos en las esquinas.
        <>
          <Rejilla />
          <path className="ic-trazo" d={`M${centro(0)} ${centro(0)} H${centro(2)} V${centro(2)} H${centro(0)} Z`} />
          <circle className="ic-mas" cx={centro(0)} cy={centro(0)} r={3.2} />
          <circle className="ic-menos" cx={centro(2)} cy={centro(0)} r={3.2} />
          <circle className="ic-mas" cx={centro(2)} cy={centro(2)} r={3.2} />
          <circle className="ic-menos" cx={centro(0)} cy={centro(2)} r={3.2} />
        </>
      )}
      {tema === 'modi' && (
        // Un valor u por fila y un valor v por columna.
        <>
          {[1, 2].map((i) =>
            [1, 2].map((j) => (
              <rect
                key={`${i}-${j}`}
                className={i === 1 && j === 1 ? 'ic-celda llena' : 'ic-celda'}
                x={pos(j)}
                y={pos(i)}
                width={LADO}
                height={LADO}
                rx={3}
              />
            )),
          )}
          {[1, 2].map((k) => (
            <g key={k}>
              <circle className="ic-mas" cx={centro(0)} cy={centro(k)} r={3.2} />
              <circle className="ic-menos" cx={centro(k)} cy={centro(0)} r={3.2} />
            </g>
          ))}
        </>
      )}
      {tema === 'propia' && (
        // Tres pesos que se regulan.
        <>
          {[
            [12, 30],
            [24, 16],
            [36, 26],
          ].map(([y, x]) => (
            <g key={y}>
              <path className="ic-trazo" d={`M6 ${y} H42`} />
              <circle className="ic-acento" cx={x} cy={y} r={4} />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
