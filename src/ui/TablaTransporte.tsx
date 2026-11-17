import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { Celda, Linea, Paso, Problema } from '../core/tipos';
import { EPS, fmt, fmtCosto } from '../core/util';

interface Props {
  problema: Problema;
  paso: Paso;
  onCeldaClick?: (c: Celda) => void;
  /** Celda marcada por el usuario en modo práctica. */
  marcada?: Celda | null;
  /** Si está presente, las penalizaciones se escriben a mano en lugar de mostrarse. */
  penalEditable?: PenalEditable;
  /** Si está presente, cada celda permitida tiene una casilla para escribir la cantidad. */
  cantidadEditable?: CantidadEditable;
  /** Celdas que se resaltan como elegibles (p. ej. las de marginal 0 en el explorador de óptimos). */
  resaltadas?: Celda[];
}

/** Casillas para que el estudiante escriba cuánto envía por cada ruta. */
export interface CantidadEditable {
  texto: (c: Celda) => string;
  /** Lo escrito no es una cantidad válida. */
  invalida: (c: Celda) => boolean;
  onCambio: (c: Celda, texto: string) => void;
}

/** Casillas para que el estudiante escriba las penalizaciones de Vogel. */
export interface PenalEditable {
  /** Texto escrito y resultado de la revisión; null si la línea no se pregunta (se muestra su valor). */
  casilla: (l: Linea) => { texto: string; estado: '' | 'ok' | 'mal' } | null;
  onCambio: (l: Linea, texto: string) => void;
  /** Se llama al salir de la casilla o al pulsar Intro. */
  onRevisar: (l: Linea) => void;
}

export function TablaTransporte({
  problema: p,
  paso,
  onCeldaClick,
  marcada,
  penalEditable,
  cantidadEditable,
  resaltadas,
}: Props) {
  const penal = (tipo: Linea['tipo'], k: number, nombre: string) => {
    const valor = (tipo === 'fila' ? paso.penalFila : paso.penalColumna)![k];
    if (valor == null) return '';
    const casilla = penalEditable?.casilla({ tipo, k });
    if (!casilla) return fmtCosto(p, valor);
    return (
      <input
        className={`penal-entrada ${casilla.estado}`}
        type="text"
        inputMode="decimal"
        value={casilla.texto}
        readOnly={casilla.estado === 'ok'}
        aria-label={`Penalización de la ${tipo} ${nombre}`}
        aria-invalid={casilla.estado === 'mal'}
        onChange={(e) => penalEditable!.onCambio({ tipo, k }, e.target.value)}
        onBlur={() => penalEditable!.onRevisar({ tipo, k })}
        onKeyDown={(e) => e.key === 'Enter' && penalEditable!.onRevisar({ tipo, k })}
      />
    );
  };
  const contenedor = useRef<HTMLDivElement>(null);
  const signos = new Map<string, '+' | '−'>();
  const orden = new Map<string, number>();
  paso.ciclo?.forEach((c, k) => {
    signos.set(`${c.i},${c.j}`, k % 2 === 0 ? '+' : '−');
    orden.set(`${c.i},${c.j}`, k);
  });
  const cerrado = esCerrado(paso.ciclo);
  // Los signos aparecen en el orden del recorrido; si el estudiante lo traza a mano, responden al instante.
  const escalonado = cerrado && !onCeldaClick;
  const conPenal = !!paso.penalFila;
  const conUV = !!paso.u && !!paso.v;
  const elegida = (tipo: 'fila' | 'columna', k: number) =>
    paso.lineaElegida?.tipo === tipo && paso.lineaElegida.k === k;

  return (
    <div className="tabla-contenedor" ref={contenedor}>
      <table className="tabla-transporte">
        <thead>
          <tr>
            <th />
            {p.destinos.map((d, j) => (
              <th key={d} className={paso.columnaTachada?.[j] ? 'tachada' : ''}>
                <span className="nombre-linea">{d}</span>
              </th>
            ))}
            <th>OFERTA</th>
            {conPenal && <th className="penal">VALOR</th>}
            {conUV && <th className="penal potencial">u</th>}
          </tr>
        </thead>
        <tbody>
          {p.origenes.map((o, i) => (
            <tr key={o}>
              <th className={paso.filaTachada?.[i] ? 'tachada' : ''}>
                <span className="nombre-linea">{o}</span>
              </th>
              {p.destinos.map((d, j) => {
                const signo = signos.get(`${i},${j}`);
                const basica = paso.basica[i][j];
                const marginal = paso.marginales?.[i][j];
                const puntaje = paso.puntajes?.[i][j];
                const prohibida = p.prohibidas?.[i]?.[j] ?? false;
                const clases = [
                  'celda',
                  basica ? 'basica' : '',
                  (paso.filaTachada?.[i] || paso.columnaTachada?.[j]) && !basica ? 'tachada' : '',
                  signo === '+' ? 'mas' : signo === '−' ? 'menos' : '',
                  paso.celda?.i === i && paso.celda?.j === j ? 'actual' : '',
                  marcada?.i === i && marcada?.j === j ? 'marcada' : '',
                  prohibida ? 'prohibida' : '',
                  resaltadas?.some((c) => c.i === i && c.j === j) ? 'resaltada' : '',
                ];
                return (
                  <td
                    key={d}
                    className={clases.filter(Boolean).join(' ')}
                    data-celda={`${i}-${j}`}
                    style={escalonado && signo ? ({ '--orden': orden.get(`${i},${j}`) } as CSSProperties) : undefined}
                    title={
                      prohibida
                        ? `${o} → ${d}: ruta prohibida (costo M = ${fmt(p.costos[i][j])})`
                        : p.utilidades
                          ? `${o} → ${d}: utilidad ${fmt(p.utilidades[i][j])}, costo de oportunidad ${fmt(p.costos[i][j])}`
                          : `${o} → ${d}: ${p.objetivo === 'max' ? 'utilidad' : 'costo'} ${fmt(p.costos[i][j])}`
                    }
                  >
                    <span className="costo">{prohibida ? 'M' : fmt(p.costos[i][j])}</span>
                    {signo && <span className="signo">{signo}</span>}
                    {cantidadEditable ? (
                      prohibida ? null : (
                        <input
                          className={`cantidad-entrada ${cantidadEditable.invalida({ i, j }) ? 'mal' : ''}`}
                          type="text"
                          inputMode="decimal"
                          value={cantidadEditable.texto({ i, j })}
                          aria-label={`Unidades de ${o} a ${d}`}
                          aria-invalid={cantidadEditable.invalida({ i, j })}
                          onChange={(e) => cantidadEditable.onCambio({ i, j }, e.target.value)}
                        />
                      )
                    ) : basica ? (
                      <span className="valor">{paso.x[i][j] === 0 ? 'ε' : fmt(paso.x[i][j])}</span>
                    ) : marginal != null ? (
                      <span className={marginal < 0 ? 'marginal negativo' : 'marginal'}>{fmtCosto(p, marginal)}</span>
                    ) : puntaje != null ? (
                      <span className="marginal puntaje">{puntaje.toFixed(2)}</span>
                    ) : null}
                    {onCeldaClick && (
                      <button
                        className="celda-boton"
                        aria-label={`Elegir (${o}, ${d})`}
                        onClick={() => onCeldaClick({ i, j })}
                      />
                    )}
                  </td>
                );
              })}
              <td className={`total ${paso.filaTachada?.[i] ? 'tachada' : ''} ${exceso(paso.ofertaRestante?.[i])}`}>
                <Cantidad original={p.ofertas[i]} restante={paso.ofertaRestante?.[i]} />
              </td>
              {conPenal && <td className={elegida('fila', i) ? 'penal elegida' : 'penal'}>{penal('fila', i, o)}</td>}
              {conUV && <td className="penal potencial">{fmtCosto(p, paso.u![i])}</td>}
            </tr>
          ))}
          <tr className="fila-demanda">
            <th className="etiqueta-fila">DEMANDA</th>
            {p.destinos.map((d, j) => (
              <td key={d} className={`total ${paso.columnaTachada?.[j] ? 'tachada' : ''}`}>
                <Cantidad original={p.demandas[j]} restante={paso.demandaRestante?.[j]} />
              </td>
            ))}
            <td className="vacio" />
            {conPenal && <td className="vacio" />}
            {conUV && <td className="vacio" />}
          </tr>
          {conUV && (
            <tr className="fila-demanda">
              <th className="etiqueta-fila potencial">v</th>
              {p.destinos.map((d, j) => (
                <td key={d} className="penal potencial">
                  {fmtCosto(p, paso.v![j])}
                </td>
              ))}
              <td className="vacio" />
              <td className="vacio" />
            </tr>
          )}
          {conPenal && (
            <tr className="fila-demanda">
              <th className="etiqueta-fila">VALOR</th>
              {p.destinos.map((d, j) => (
                <td key={d} className={elegida('columna', j) ? 'penal elegida' : 'penal'}>
                  {penal('columna', j, d)}
                </td>
              ))}
              <td className="vacio" />
              <td className="vacio" />
            </tr>
          )}
        </tbody>
      </table>
      {paso.ciclo && paso.ciclo.length >= 2 && (
        <CaminoCerrado
          contenedor={contenedor}
          ciclo={paso.ciclo}
          cerrado={cerrado}
          conTheta={cerrado && paso.theta !== undefined}
        />
      )}
    </div>
  );
}

/** true si las celdas forman un camino cerrado: cada una comparte fila o columna con la siguiente. */
function esCerrado(ciclo?: Celda[]): boolean {
  if (!ciclo || ciclo.length < 4) return false;
  return ciclo.every((c, k) => {
    const s = ciclo[(k + 1) % ciclo.length];
    return c.i === s.i || c.j === s.j;
  });
}

/** Distancia del trazo a la esquina inferior izquierda de cada celda: ahí no tapa ningún número. */
const SANGRIA = 9;

interface Trazo {
  puntos: { x: number; y: number }[];
  ancho: number;
  alto: number;
}

/**
 * El camino cerrado dibujado sobre la tabla, de celda en celda. Cuando ya se conoce θ, una
 * marca lo recorre desde la celda que entra para mostrar por dónde se mueven las unidades.
 */
function CaminoCerrado({
  contenedor,
  ciclo,
  cerrado,
  conTheta,
}: {
  contenedor: RefObject<HTMLDivElement>;
  ciclo: Celda[];
  cerrado: boolean;
  conTheta: boolean;
}) {
  const [trazo, setTrazo] = useState<Trazo | null>(null);
  const clave = ciclo.map((c) => `${c.i}-${c.j}`).join('|');

  useLayoutEffect(() => {
    const caja = contenedor.current;
    if (!caja) return;
    const medir = () => {
      const base = caja.getBoundingClientRect();
      const puntos: Trazo['puntos'] = [];
      for (const celda of clave.split('|')) {
        const td = caja.querySelector(`[data-celda="${celda}"]`);
        if (!td) return setTrazo(null);
        const r = td.getBoundingClientRect();
        puntos.push({
          x: r.left - base.left + caja.scrollLeft + SANGRIA,
          y: r.bottom - base.top + caja.scrollTop - SANGRIA,
        });
      }
      setTrazo({ puntos, ancho: caja.scrollWidth, alto: caja.scrollHeight });
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(caja);
    return () => observador.disconnect();
  }, [contenedor, clave]);

  if (!trazo) return null;
  const d = trazo.puntos.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') + (cerrado ? ' Z' : '');

  return (
    <svg
      key={clave}
      className={cerrado ? 'camino-cerrado cerrado' : 'camino-cerrado'}
      width={trazo.ancho}
      height={trazo.alto}
      aria-hidden="true"
    >
      <path className="camino-linea" d={d} pathLength={1} />
      {trazo.puntos.map((p, k) => (
        <circle
          key={k}
          className={k % 2 === 0 ? 'camino-vertice mas' : 'camino-vertice menos'}
          cx={p.x}
          cy={p.y}
          r={4.5}
          style={{ '--orden': k } as CSSProperties}
        />
      ))}
      {conTheta && (
        <g className="camino-theta" style={{ offsetPath: `path('${d}')` }}>
          <circle r={11} />
          <text y={4.5}>θ</text>
        </g>
      )}
    </svg>
  );
}

/** Clase de un total de oferta o demanda del que se repartió más de lo que hay. */
function exceso(restante?: number): string {
  return restante !== undefined && restante < -EPS ? 'exceso' : '';
}

function Cantidad({ original, restante }: { original: number; restante?: number }) {
  if (restante === undefined || restante === original) return <>{fmt(original)}</>;
  return (
    <>
      <span className="original">{fmt(original)}</span>
      {fmt(restante)}
    </>
  );
}

/** Leyenda de los símbolos y colores de la tabla, según lo que muestra el paso. */
export function Leyenda({ paso, problema }: { paso: Paso; problema?: Problema }) {
  return (
    <div className="leyenda">
      <span>
        <span className="muestra actual" />
        Celda actual
      </span>
      <span>
        <span className="muestra basica" />
        Celda básica
      </span>
      {paso.ciclo && (
        <>
          <span>
            <span className="muestra mas">+</span>Se suma θ
          </span>
          <span>
            <span className="muestra menos">−</span>Se resta θ
          </span>
        </>
      )}
      {paso.marginales && <span>Número en celda vacía = costo marginal</span>}
      {paso.puntajes && <span>Número en celda vacía = puntaje de tu regla (el menor gana)</span>}
      {paso.penalFila && (
        <span>
          <span className="muestra penal" />
          Valor de la fila o columna
        </span>
      )}
      {paso.u && (
        <span>
          <span className="muestra potencial" />u y v: en cada celda básica, u + v = costo
        </span>
      )}
      <span>ε = asignación cero (degeneración)</span>
      {problema?.utilidades && <span>Número pequeño de cada celda = costo de oportunidad</span>}
      {problema?.M !== undefined && <span>M = {fmt(problema.M)}: costo de una ruta prohibida</span>}
    </div>
  );
}
