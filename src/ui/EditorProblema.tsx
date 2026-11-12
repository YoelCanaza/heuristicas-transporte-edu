import { useState } from 'react';
import { balancear } from '../core/balanceo';
import { EJEMPLO_TAHA, crearAleatorio, generarProblema, nombres } from '../core/ejemplos';
import type { Problema } from '../core/tipos';
import { fmt, suma } from '../core/util';
import { validar } from '../core/validacion';

interface Props {
  problema: Problema;
  onChange: (p: Problema) => void;
  onContinuar: () => void;
}

const MIN = 2;
const MAX = 8;

function redimensionar(p: Problema, m: number, n: number): Problema {
  return {
    ofertas: Array.from({ length: m }, (_, i) => p.ofertas[i] ?? 0),
    demandas: Array.from({ length: n }, (_, j) => p.demandas[j] ?? 0),
    costos: Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => p.costos[i]?.[j] ?? 0)),
    origenes: nombres('O', m),
    destinos: nombres('D', n),
  };
}

function Numero({ valor, etiqueta, onChange }: { valor: number; etiqueta: string; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      aria-label={etiqueta}
      value={Number.isFinite(valor) ? valor : ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  );
}

export function EditorProblema({ problema: p, onChange, onContinuar }: Props) {
  const [semilla, setSemilla] = useState(() => Math.floor(Math.random() * 1e6));
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const errores = validar(p);
  const balance = errores.length === 0 ? balancear(p) : null;

  const setCosto = (i: number, j: number, v: number) =>
    onChange({ ...p, costos: p.costos.map((f, a) => (a === i ? f.map((c, b) => (b === j ? v : c)) : f)) });
  const setOferta = (i: number, v: number) => onChange({ ...p, ofertas: p.ofertas.map((o, a) => (a === i ? v : o)) });
  const setDemanda = (j: number, v: number) => onChange({ ...p, demandas: p.demandas.map((d, b) => (b === j ? v : d)) });

  const aleatorio = () => {
    onChange(generarProblema(crearAleatorio(semilla), { m, n }));
    setSemilla(Math.floor(Math.random() * 1e6));
  };

  const tamanos = Array.from({ length: MAX - MIN + 1 }, (_, k) => k + MIN);

  return (
    <section className="vista">
      <header className="vista-cabecera">
        <div>
          <p className="eyebrow">01 — Problema</p>
          <h1>Define el problema</h1>
          <p className="vista-descripcion">
            Ingresa el costo de enviar una unidad desde cada origen a cada destino, la oferta de cada origen y la demanda
            de cada destino. El objetivo es enviarlo todo al menor costo total.
          </p>
        </div>
      </header>

      <div className="problema-grid">
        <div className="tarjeta editor-tarjeta">
          <div className="editor-barra">
            <div className="barra">
              <label>
                Orígenes
                <select value={m} onChange={(e) => onChange(redimensionar(p, Number(e.target.value), n))}>
                  {tamanos.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Destinos
                <select value={n} onChange={(e) => onChange(redimensionar(p, m, Number(e.target.value)))}>
                  {tamanos.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="barra">
              <button onClick={() => onChange(EJEMPLO_TAHA)}>Ejemplo de Taha</button>
              <button onClick={aleatorio}>Problema aleatorio</button>
            </div>
          </div>

          <div className="tabla-contenedor">
            <table className="tabla-editor">
              <thead>
                <tr>
                  <th />
                  {p.destinos.map((d) => (
                    <th key={d}>{d}</th>
                  ))}
                  <th>OFERTA</th>
                </tr>
              </thead>
              <tbody>
                {p.origenes.map((o, i) => (
                  <tr key={o}>
                    <th>{o}</th>
                    {p.destinos.map((d, j) => (
                      <td key={d}>
                        <Numero valor={p.costos[i][j]} etiqueta={`Costo de ${o} a ${d}`} onChange={(v) => setCosto(i, j, v)} />
                      </td>
                    ))}
                    <td className="total">
                      <Numero valor={p.ofertas[i]} etiqueta={`Oferta de ${o}`} onChange={(v) => setOferta(i, v)} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <th className="etiqueta-fila">DEMANDA</th>
                  {p.destinos.map((d, j) => (
                    <td key={d} className="total">
                      <Numero valor={p.demandas[j]} etiqueta={`Demanda de ${d}`} onChange={(v) => setDemanda(j, v)} />
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside className="tarjeta resumen">
          <p className="eyebrow">Resumen</p>
          {errores.length > 0 ? (
            <span className="estado error">Datos incompletos</span>
          ) : balance!.ficticio ? (
            <span className="estado alerta">Desbalanceado</span>
          ) : (
            <span className="estado">Balanceado</span>
          )}
          <dl className="resumen-datos">
            <dt>Tamaño</dt>
            <dd>
              {m} × {n}
            </dd>
            <dt>Oferta total</dt>
            <dd>{fmt(suma(p.ofertas))}</dd>
            <dt>Demanda total</dt>
            <dd>{fmt(suma(p.demandas))}</dd>
          </dl>
          {errores.length > 0 ? (
            <ul className="aviso error">
              {errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : (
            balance!.ficticio && <p className="aviso">{balance!.explicacion}</p>
          )}
          <button className="primario" onClick={onContinuar} disabled={errores.length > 0}>
            Resolver paso a paso
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </aside>
      </div>
    </section>
  );
}
