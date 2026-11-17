import { aristasRed, grosorArista } from '../core/red';
import type { Paso, Problema } from '../core/tipos';
import { fmt, fmtCosto } from '../core/util';

interface Props {
  problema: Problema;
  paso: Paso;
  /** Cambia con cada paso: hace que las unidades vuelvan a viajar aunque la ruta sea la misma. */
  pulso?: number;
}

const ANCHO = 460;
const X_ORIGEN = 100;
const X_DESTINO = 360;
const RADIO = 22;
const PASO_NODO = 64;
const MARGEN = 36;
const ALTO_ETIQUETA = 20;
/** Posiciones a lo largo de la ruta donde se intenta poner su etiqueta, de la preferida a la última. */
const POSICIONES = [0.5, 0.38, 0.62, 0.28, 0.72, 0.2, 0.8];

/** Punto de la curva origen → destino en el parámetro t (Bézier cúbica con tangentes horizontales). */
function puntoCurva(y0: number, y1: number, t: number): { x: number; y: number } {
  const u = 1 - t;
  const x0 = X_ORIGEN + RADIO;
  const x1 = X_DESTINO - RADIO;
  const xm = (x0 + x1) / 2;
  return {
    x: u * u * u * x0 + 3 * u * u * t * xm + 3 * u * t * t * xm + t * t * t * x1,
    y: u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1,
  };
}

/**
 * El mismo estado de la tabla, dibujado como red: cada origen envía a cada destino por una
 * ruta cuyo grosor es la cantidad asignada. Se actualiza con cada paso.
 */
export function VistaRed({ problema: p, paso, pulso = 0 }: Props) {
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const alto = (Math.max(m, n) - 1) * PASO_NODO + 2 * MARGEN;
  // Cada columna de nodos se reparte en toda la altura, así la más corta queda centrada.
  const y = (k: number, total: number) => (total === 1 ? alto / 2 : MARGEN + (k * (alto - 2 * MARGEN)) / (total - 1));
  const camino = (i: number, j: number) => {
    const xm = (X_ORIGEN + X_DESTINO) / 2;
    return `M${X_ORIGEN + RADIO} ${y(i, m)} C ${xm} ${y(i, m)}, ${xm} ${y(j, n)}, ${X_DESTINO - RADIO} ${y(j, n)}`;
  };

  const aristas = aristasRed(paso);
  const mayor = Math.max(0, ...aristas.map((a) => a.cantidad));
  const enCamino = aristas.some((a) => a.signo);
  // Con pocas rutas se dibujan todas de fondo; con muchas, el fondo solo estorbaría.
  const conFondo = m * n <= 24;
  const resto = (original: number, restante: number | undefined) =>
    restante === undefined || restante === original ? fmt(original) : `${fmt(restante)} de ${fmt(original)}`;

  // Cada etiqueta toma la primera posición de su ruta donde no tapa a las ya colocadas.
  const etiquetas: { clave: string; x: number; y: number; ancho: number; texto: string; clases: string }[] = [];
  for (const a of aristas) {
    const texto = (
      (a.signo ? `${a.signo} ` : '') + (a.basica ? (a.cantidad === 0 ? 'ε' : fmt(a.cantidad)) : '')
    ).trim();
    if (texto === '') continue;
    const ancho = texto.length * 8 + 12;
    const candidatos = POSICIONES.map((t) => puntoCurva(y(a.i, m), y(a.j, n), t));
    const libre = candidatos.find((c) =>
      etiquetas.every(
        (e) => Math.abs(e.x - c.x) > (e.ancho + ancho) / 2 + 2 || Math.abs(e.y - c.y) > ALTO_ETIQUETA + 2,
      ),
    );
    etiquetas.push({
      clave: `${a.i}-${a.j}`,
      ...(libre ?? candidatos[0]),
      ancho,
      texto,
      clases: `${a.signo === '+' ? 'mas' : a.signo === '−' ? 'menos' : ''} ${a.actual ? 'actual' : ''}`,
    });
  }

  // Unidades que se ven viajar en este paso: del origen al destino en la ruta recién asignada;
  // en un camino cerrado, hacia el destino donde se suma θ y de vuelta al origen donde se resta.
  const viajes = aristas.flatMap((a) => {
    if (a.signo) return [{ a, clase: a.signo === '+' ? 'mas' : 'menos', unidades: 2 }];
    if (paso.tipo === 'asignacion' && a.actual && a.cantidad > 0)
      return [{ a, clase: 'actual', unidades: 2 + Math.round(3 * (a.cantidad / mayor)) }];
    return [];
  });

  const descripcion =
    aristas
      .filter((a) => a.cantidad > 0)
      .map((a) => `${p.origenes[a.i]} envía ${fmt(a.cantidad)} a ${p.destinos[a.j]}`)
      .join('; ') || 'todavía no hay envíos';

  return (
    <figure className="vista-red">
      <svg viewBox={`0 0 ${ANCHO} ${alto}`} role="img" aria-label={`Red de transporte: ${descripcion}.`}>
        {conFondo &&
          p.origenes.map((_, i) =>
            p.destinos.map((_, j) => <path key={`${i}-${j}`} className="red-fondo" d={camino(i, j)} />),
          )}

        {aristas.map((a) => {
          const clases = [
            'red-ruta',
            a.signo === '+' ? 'mas' : a.signo === '−' ? 'menos' : '',
            a.actual ? 'actual' : '',
            a.cantidad === 0 ? 'vacia' : '',
            enCamino && !a.signo ? 'atenuada' : '',
          ];
          return (
            <path
              key={`${a.i}-${a.j}`}
              className={clases.filter(Boolean).join(' ')}
              d={camino(a.i, a.j)}
              strokeWidth={grosorArista(a.cantidad, mayor)}
            >
              <title>
                {`${p.origenes[a.i]} → ${p.destinos[a.j]}: costo ${fmtCosto(p, p.costos[a.i][a.j])}` +
                  (a.basica ? `, envía ${a.cantidad === 0 ? 'ε' : fmt(a.cantidad)}` : '')}
              </title>
            </path>
          );
        })}

        <g key={pulso} aria-hidden="true">
          {viajes.map(({ a, clase, unidades }) =>
            Array.from({ length: unidades }, (_, k) => (
              <circle
                key={`${a.i}-${a.j}-${k}`}
                className={`red-unidad ${clase}`}
                r={5}
                style={{ offsetPath: `path('${camino(a.i, a.j)}')`, animationDelay: `${k * 130}ms` }}
              />
            )),
          )}
        </g>

        {etiquetas.map((e) => (
          <g key={e.clave} className={`red-etiqueta ${e.clases}`}>
            <rect x={e.x - e.ancho / 2} y={e.y - ALTO_ETIQUETA / 2} width={e.ancho} height={ALTO_ETIQUETA} rx={10} />
            <text x={e.x} y={e.y + 4.5}>
              {e.texto}
            </text>
          </g>
        ))}

        {p.origenes.map((nombre, i) => (
          <g key={nombre} className={`red-nodo origen ${paso.filaTachada?.[i] ? 'tachado' : ''}`}>
            <circle cx={X_ORIGEN} cy={y(i, m)} r={RADIO} />
            <text className="nombre" x={X_ORIGEN} y={y(i, m) + 4.5}>
              {nombre.length > 4 ? `${nombre.slice(0, 3)}…` : nombre}
            </text>
            <text className="cantidad" x={X_ORIGEN - RADIO - 10} y={y(i, m) + 4.5} textAnchor="end">
              {resto(p.ofertas[i], paso.ofertaRestante?.[i])}
            </text>
            <title>{`${nombre}: oferta ${fmt(p.ofertas[i])}`}</title>
          </g>
        ))}
        {p.destinos.map((nombre, j) => (
          <g key={nombre} className={`red-nodo destino ${paso.columnaTachada?.[j] ? 'tachado' : ''}`}>
            <circle cx={X_DESTINO} cy={y(j, n)} r={RADIO} />
            <text className="nombre" x={X_DESTINO} y={y(j, n) + 4.5}>
              {nombre.length > 4 ? `${nombre.slice(0, 3)}…` : nombre}
            </text>
            <text className="cantidad" x={X_DESTINO + RADIO + 10} y={y(j, n) + 4.5} textAnchor="start">
              {resto(p.demandas[j], paso.demandaRestante?.[j])}
            </text>
            <title>{`${nombre}: demanda ${fmt(p.demandas[j])}`}</title>
          </g>
        ))}
      </svg>
      <figcaption>
        La misma solución vista como red: el grosor de cada ruta es la cantidad que envía.
        {paso.ofertaRestante ? ' Junto a cada nodo, lo que le queda por enviar o recibir.' : ''}
      </figcaption>
    </figure>
  );
}
