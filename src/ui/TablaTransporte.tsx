import type { Celda, Paso, Problema } from '../core/tipos';
import { fmt } from '../core/util';

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
            <th className="total">Oferta</th>
            {conPenal && <th className="penal">Valor</th>}
          </tr>
        </thead>
        <tbody>
          {p.origenes.map((o, i) => (
            <tr key={o}>
              <th className={paso.filaTachada?.[i] ? 'tachada' : ''}>{o}</th>
              {p.destinos.map((d, j) => {
                const signo = signos.get(`${i},${j}`);
                const actual = paso.celda?.i === i && paso.celda?.j === j;
                const tachada = paso.filaTachada?.[i] || paso.columnaTachada?.[j];
                const marginal = paso.marginales?.[i][j];
                const clases = [
                  'celda',
                  tachada && !paso.basica[i][j] ? 'tachada' : '',
                  paso.basica[i][j] ? 'basica' : '',
                  actual ? 'actual' : '',
                  signo === '+' ? 'mas' : signo === '−' ? 'menos' : '',
                  marcada?.i === i && marcada?.j === j ? 'marcada' : '',
                  onCeldaClick ? 'clicable' : '',
                ];
                return (
                  <td
                    key={d}
                    className={clases.filter(Boolean).join(' ')}
                    onClick={onCeldaClick ? () => onCeldaClick({ i, j }) : undefined}
                    title={`${o} → ${d}: costo ${fmt(p.costos[i][j])}`}
                  >
                    <span className="costo">{fmt(p.costos[i][j])}</span>
                    {signo && <span className="signo">{signo}</span>}
                    <span className="valor">
                      {paso.basica[i][j] ? (
                        paso.x[i][j] === 0 ? 'ε' : fmt(paso.x[i][j])
                      ) : marginal != null ? (
                        <span className={marginal < 0 ? 'marginal negativo' : 'marginal'}>{fmt(marginal)}</span>
                      ) : null}
                    </span>
                  </td>
                );
              })}
              <td className={`total ${paso.filaTachada?.[i] ? 'tachada' : ''}`}>
                <Cantidad original={p.ofertas[i]} restante={paso.ofertaRestante?.[i]} />
              </td>
              {conPenal && <td className="penal">{paso.penalFila![i] != null ? fmt(paso.penalFila![i]!) : ''}</td>}
            </tr>
          ))}
          <tr>
            <th className="total">Demanda</th>
            {p.destinos.map((d, j) => (
              <td key={d} className={`total ${paso.columnaTachada?.[j] ? 'tachada' : ''}`}>
                <Cantidad original={p.demandas[j]} restante={paso.demandaRestante?.[j]} />
              </td>
            ))}
            <td className="total" />
            {conPenal && <td className="penal" />}
          </tr>
          {conPenal && (
            <tr>
              <th className="penal">Valor</th>
              {p.destinos.map((d, j) => (
                <td key={d} className="penal">
                  {paso.penalColumna![j] != null ? fmt(paso.penalColumna![j]!) : ''}
                </td>
              ))}
              <td className="penal" />
              <td className="penal" />
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
      <span className="original">{fmt(original)}</span> <span className="restante">{fmt(restante)}</span>
    </>
  );
}
