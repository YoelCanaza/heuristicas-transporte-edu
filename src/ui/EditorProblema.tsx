import { useState } from 'react';
import { balancear } from '../core/balanceo';
import { EJEMPLO_TAHA, crearAleatorio, generarProblema, nombres } from '../core/ejemplos';
import { codificarProblema } from '../core/enlace';
import type { Problema } from '../core/tipos';
import { fmt, suma } from '../core/util';
import { validar } from '../core/validacion';
import { enlaceProblema } from './ruta';
import type { Vista } from './ruta';

const DESTINOS_ENLACE: { vista: Vista; etiqueta: string }[] = [
  { vista: 'aprender', etiqueta: 'Aprender (paso a paso)' },
  { vista: 'reparto', etiqueta: 'Tu reparto (reto inicial)' },
  { vista: 'comparar', etiqueta: 'Comparar métodos' },
  { vista: 'problema', etiqueta: 'Problema (para editarlo)' },
];

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
    objetivo: p.objetivo,
    prohibidas:
      p.prohibidas &&
      Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => p.prohibidas![i]?.[j] ?? false)),
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
  const [marcando, setMarcando] = useState(false);
  const maximizar = p.objetivo === 'max';
  const valor = maximizar ? 'Utilidad' : 'Costo';
  const prohibida = (i: number, j: number) => p.prohibidas?.[i]?.[j] ?? false;
  const cuantasProhibidas = p.prohibidas?.flat().filter(Boolean).length ?? 0;
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const errores = validar(p);
  const balance = errores.length === 0 ? balancear(p) : null;

  const setCosto = (i: number, j: number, v: number) =>
    onChange({ ...p, costos: p.costos.map((f, a) => (a === i ? f.map((c, b) => (b === j ? v : c)) : f)) });
  const setOferta = (i: number, v: number) => onChange({ ...p, ofertas: p.ofertas.map((o, a) => (a === i ? v : o)) });
  const setDemanda = (j: number, v: number) =>
    onChange({ ...p, demandas: p.demandas.map((d, b) => (b === j ? v : d)) });

  const alternarProhibida = (i: number, j: number) => {
    const prohibidas = p.costos.map((fila, a) => fila.map((_, b) => prohibida(a, b) !== (a === i && b === j)));
    onChange({ ...p, prohibidas: prohibidas.some((fila) => fila.some(Boolean)) ? prohibidas : undefined });
  };

  const aleatorio = () => {
    onChange({ ...generarProblema(crearAleatorio(semilla), { m, n }), objetivo: p.objetivo });
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
            Ingresa {maximizar ? 'la utilidad que deja' : 'el costo de'} enviar una unidad desde cada origen a cada
            destino, la oferta de cada origen y la demanda de cada destino. El objetivo es enviarlo todo{' '}
            {maximizar ? 'con la mayor utilidad total' : 'al menor costo total'}.
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

          <div className="editor-barra">
            <div className="segmentado" role="radiogroup" aria-label="Objetivo">
              <button
                role="radio"
                aria-checked={!maximizar}
                className={maximizar ? '' : 'activo'}
                onClick={() => onChange({ ...p, objetivo: undefined })}
              >
                Minimizar costo
              </button>
              <button
                role="radio"
                aria-checked={maximizar}
                className={maximizar ? 'activo' : ''}
                onClick={() => onChange({ ...p, objetivo: 'max' })}
              >
                Maximizar utilidad
              </button>
            </div>
            <label className="chip-check">
              <input type="checkbox" checked={marcando} onChange={(e) => setMarcando(e.target.checked)} />
              Marcar rutas prohibidas
            </label>
          </div>
          {marcando && (
            <p className="ayuda">
              Haz clic en una celda para prohibir esa ruta (se muestra como M) o para volver a permitirla.
            </p>
          )}

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
                        {marcando || prohibida(i, j) ? (
                          <button
                            className={prohibida(i, j) ? 'celda-ruta prohibida' : 'celda-ruta'}
                            aria-pressed={prohibida(i, j)}
                            aria-label={`Ruta de ${o} a ${d}: ${prohibida(i, j) ? 'prohibida' : 'permitida'}`}
                            title={
                              prohibida(i, j) ? 'Ruta prohibida: clic para permitirla' : 'Clic para prohibir esta ruta'
                            }
                            onClick={() => alternarProhibida(i, j)}
                          >
                            {prohibida(i, j) ? 'M' : fmt(p.costos[i][j])}
                          </button>
                        ) : (
                          <Numero
                            valor={p.costos[i][j]}
                            etiqueta={`${valor} de ${o} a ${d}`}
                            onChange={(v) => setCosto(i, j, v)}
                          />
                        )}
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
            <dt>Objetivo</dt>
            <dd>{maximizar ? 'Maximizar' : 'Minimizar'}</dd>
            {cuantasProhibidas > 0 && (
              <>
                <dt>Rutas prohibidas</dt>
                <dd>{cuantasProhibidas}</dd>
              </>
            )}
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
          <Compartir problema={p} deshabilitado={errores.length > 0} />
          <button className="primario" onClick={onContinuar} disabled={errores.length > 0}>
            Resolver paso a paso
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </aside>
      </div>
    </section>
  );
}

/** Copia un enlace que abre la pantalla elegida con este mismo problema. */
function Compartir({ problema, deshabilitado }: { problema: Problema; deshabilitado: boolean }) {
  const [vista, setVista] = useState<Vista>('aprender');
  const [estado, setEstado] = useState<'' | 'copiado' | 'manual'>('');
  const enlace = enlaceProblema(window.location.origin + window.location.pathname, vista, codificarProblema(problema));

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setEstado('copiado');
    } catch {
      // Sin permiso para el portapapeles (o sin conexión segura): se muestra el enlace para copiarlo a mano.
      setEstado('manual');
    }
  };

  return (
    <div className="compartir">
      <h3>Compartir este problema</h3>
      <p className="ayuda">
        El enlace lleva los datos del problema: quien lo abra verá exactamente esta tabla, sin cuentas ni servidor.
      </p>
      <label>
        Abrir en
        <select
          value={vista}
          onChange={(e) => {
            setVista(e.target.value as Vista);
            setEstado('');
          }}
        >
          {DESTINOS_ENLACE.map((d) => (
            <option key={d.vista} value={d.vista}>
              {d.etiqueta}
            </option>
          ))}
        </select>
      </label>
      <button className="secundario" onClick={copiar} disabled={deshabilitado}>
        Copiar enlace
      </button>
      {estado === 'copiado' && (
        <p className="ayuda" role="status">
          Enlace copiado. Pégalo donde quieras compartirlo.
        </p>
      )}
      {estado === 'manual' && (
        <input
          type="text"
          readOnly
          value={enlace}
          aria-label="Enlace para compartir"
          onFocus={(e) => e.target.select()}
          autoFocus
        />
      )}
    </div>
  );
}
