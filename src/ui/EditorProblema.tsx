import { useState } from 'react';
import { balancear } from '../core/balanceo';
import { EJEMPLO_TAHA, crearAleatorio, generarProblema, nombres } from '../core/ejemplos';
import type { Problema } from '../core/tipos';
import { fmt, suma } from '../core/util';
import { validar } from '../core/validacion';

interface Props {
  problema: Problema;
  onChange: (p: Problema) => void;
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

function Numero({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={Number.isFinite(valor) ? valor : ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  );
}

export function EditorProblema({ problema: p, onChange }: Props) {
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

  return (
    <section className="panel">
      <h2>Define el problema</h2>
      <p className="ayuda">
        Ingresa los costos unitarios de transporte de cada origen a cada destino, la oferta de cada origen y la demanda
        de cada destino. El objetivo es enviar todo a costo total mínimo.
      </p>

      <div className="barra">
        <label>
          Orígenes (m)
          <select value={m} onChange={(e) => onChange(redimensionar(p, Number(e.target.value), n))}>
            {Array.from({ length: MAX - MIN + 1 }, (_, k) => k + MIN).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          Destinos (n)
          <select value={n} onChange={(e) => onChange(redimensionar(p, m, Number(e.target.value)))}>
            {Array.from({ length: MAX - MIN + 1 }, (_, k) => k + MIN).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <button onClick={() => onChange(EJEMPLO_TAHA)}>Ejemplo de Taha</button>
        <button onClick={aleatorio}>Problema aleatorio</button>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla-editor">
          <thead>
            <tr>
              <th />
              {p.destinos.map((d) => (
                <th key={d}>{d}</th>
              ))}
              <th className="total">Oferta</th>
            </tr>
          </thead>
          <tbody>
            {p.origenes.map((o, i) => (
              <tr key={o}>
                <th>{o}</th>
                {p.destinos.map((d, j) => (
                  <td key={d}>
                    <Numero valor={p.costos[i][j]} onChange={(v) => setCosto(i, j, v)} />
                  </td>
                ))}
                <td className="total">
                  <Numero valor={p.ofertas[i]} onChange={(v) => setOferta(i, v)} />
                </td>
              </tr>
            ))}
            <tr>
              <th className="total">Demanda</th>
              {p.destinos.map((d, j) => (
                <td key={d} className="total">
                  <Numero valor={p.demandas[j]} onChange={(v) => setDemanda(j, v)} />
                </td>
              ))}
              <td className="total suma">
                {fmt(suma(p.ofertas))} / {fmt(suma(p.demandas))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {errores.length > 0 ? (
        <ul className="aviso error">
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : (
        <p className={balance!.ficticio ? 'aviso' : 'aviso ok'}>{balance!.explicacion}</p>
      )}
    </section>
  );
}
