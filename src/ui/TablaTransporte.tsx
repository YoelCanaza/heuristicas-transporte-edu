import type { Celda, Paso, Problema } from '../core/tipos';
import { fmt, fmtCosto } from '../core/util';

interface Props {
  problema: Problema;
  paso: Paso;
  onCeldaClick?: (c: Celda) => void;
  /** Celda marcada por el usuario en modo práctica. */
  marcada?: Celda | null;
}

export function TablaTransporte({ problema: p, paso, onCeldaClick, marcada }: Props) {
  const signos = new Map<string, '+' | '−'>();
  paso.ciclo?.forEach((c, k) => signos.set(`${c.i},${c.j}`, k % 2 === 0 ? '+' : '−'));
  const conPenal = !!paso.penalFila;
  const conUV = !!paso.u && !!paso.v;
  const elegida = (tipo: 'fila' | 'columna', k: number) =>
    paso.lineaElegida?.tipo === tipo && paso.lineaElegida.k === k;

  return (
    <div className="tabla-contenedor">
      <table className="tabla-transporte">
        <thead>
          <tr>
            <th />
            {p.destinos.map((d, j) => (
              <th key={d} className={paso.columnaTachada?.[j] ? 'tachada' : ''}>
                {d}
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
              <th className={paso.filaTachada?.[i] ? 'tachada' : ''}>{o}</th>
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
                ];
                return (
                  <td
                    key={d}
                    className={clases.filter(Boolean).join(' ')}
                    title={
                      prohibida
                        ? `${o} → ${d}: ruta prohibida (costo M = ${fmt(p.costos[i][j])})`
                        : p.utilidades
                          ? `${o} → ${d}: utilidad ${fmt(p.utilidades[i][j])}, costo de oportunidad ${fmt(p.costos[i][j])}`
                          : `${o} → ${d}: costo ${fmt(p.costos[i][j])}`
                    }
                  >
                    <span className="costo">{prohibida ? 'M' : fmt(p.costos[i][j])}</span>
                    {signo && <span className="signo">{signo}</span>}
                    {basica ? (
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
              <td className={`total ${paso.filaTachada?.[i] ? 'tachada' : ''}`}>
                <Cantidad original={p.ofertas[i]} restante={paso.ofertaRestante?.[i]} />
              </td>
              {conPenal && (
                <td className={elegida('fila', i) ? 'penal elegida' : 'penal'}>
                  {paso.penalFila![i] != null ? fmtCosto(p, paso.penalFila![i]!) : ''}
                </td>
              )}
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
                  {paso.penalColumna![j] != null ? fmtCosto(p, paso.penalColumna![j]!) : ''}
                </td>
              ))}
              <td className="vacio" />
              <td className="vacio" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
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
