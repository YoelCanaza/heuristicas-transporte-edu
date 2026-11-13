import { useMemo } from 'react';
import { compararMetodos } from '../core/comparador';
import type { FilaMetodo } from '../core/comparador';
import type { MetodoInicial } from '../core/metodos';
import type { Problema } from '../core/tipos';
import { fmt } from '../core/util';
import { GraficoTrayectorias, MarcaSerie } from './GraficoTrayectorias';

interface Props {
  problema: Problema;
  onMetodo: (m: MetodoInicial) => void;
}

export function Comparar({ problema, onMetodo }: Props) {
  const comparacion = useMemo(() => compararMetodos(problema), [problema]);
  const { problema: p, filas, optimo } = comparacion;
  const palabra = p.utilidades ? 'Utilidad' : 'Costo';
  const maxIteraciones = Math.max(...filas.map((f) => f.iteraciones));

  return (
    <section className="vista">
      <header className="vista-cabecera">
        <div>
          <p className="eyebrow">03 — Comparar</p>
          <h1>Compara los tres métodos</h1>
          <p className="vista-descripcion">
            El mismo problema resuelto con cada heurística: qué tan lejos del óptimo queda su solución inicial y cuántas
            iteraciones de optimización hacen falta desde ella.
          </p>
        </div>
        {optimo !== null && (
          <div className="cifra-optimo">
            <span className="eyebrow">
              {palabra} óptim{p.utilidades ? 'a' : 'o'}
            </span>
            <strong>{fmt(optimo)}</strong>
          </div>
        )}
      </header>

      <p className={comparacion.sinSolucion ? 'aviso error' : 'aviso ok'}>{comparacion.interpretacion}</p>

      <div className="comparar-grid">
        {filas.map((f, k) => (
          <article key={f.metodo} className="tarjeta metodo-tarjeta">
            <h2>
              <MarcaSerie serie={k} />
              {f.nombre}
            </h2>
            <dl className="cifras">
              <div>
                <dt>{palabra} inicial</dt>
                <dd>{f.trayectoria[0].texto}</dd>
              </div>
              <div>
                <dt>Brecha</dt>
                <dd>{f.brecha === null ? '—' : `${fmt(f.brecha)} %`}</dd>
              </div>
              <div>
                <dt>Iteraciones</dt>
                <dd>{f.iteraciones}</dd>
              </div>
            </dl>
            <p className="ayuda">{notaMetodo(f, optimo !== null)}</p>
            <TablaSolucion problema={p} fila={f} />
            <button className="secundario" onClick={() => onMetodo(f.metodo)}>
              Ver paso a paso
            </button>
          </article>
        ))}
      </div>

      <article className="tarjeta">
        <h2 className="titulo-seccion">{palabra} después de cada iteración</h2>
        {maxIteraciones === 0 ? (
          <p className="ayuda">
            Ningún método necesitó iteraciones: las tres soluciones iniciales ya eran óptimas, así que no hay recorrido
            que dibujar.
          </p>
        ) : (
          <GraficoTrayectorias comparacion={comparacion} />
        )}
        <details className="datos-grafico">
          <summary>Ver los datos en una tabla</summary>
          <div className="tabla-contenedor">
            <table className="tabla-simple">
              <thead>
                <tr>
                  <th>Iteración</th>
                  {filas.map((f) => (
                    <th key={f.metodo}>{f.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxIteraciones + 1 }, (_, k) => (
                  <tr key={k}>
                    <td>{k === 0 ? '0 (inicial)' : k}</td>
                    {filas.map((f) => (
                      <td key={f.metodo}>{f.trayectoria[k]?.texto ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ayuda">Una raya indica que ese método ya había llegado al óptimo.</p>
        </details>
      </article>
    </section>
  );
}

function notaMetodo(f: FilaMetodo, hayOptimo: boolean): string {
  if (f.trayectoria[0].prohibida)
    return 'La solución inicial envía por una ruta prohibida; la optimización debe sacarla.';
  if (!hayOptimo) return 'No se pudo confirmar el óptimo, así que no hay brecha que medir.';
  if (f.inicialOptima) {
    return f.iteraciones === 0
      ? 'La solución inicial ya es óptima.'
      : 'La solución inicial ya tiene el total óptimo; las iteraciones solo cambian de base (degeneración).';
  }
  if (f.brecha === null) return 'El óptimo es 0, así que la brecha no se puede expresar en porcentaje.';
  return `Su solución inicial queda a ${fmt(f.brecha)} % del óptimo.`;
}

/** Solución inicial en pequeño: solo las cantidades asignadas. */
function TablaSolucion({ problema: p, fila }: { problema: Problema; fila: FilaMetodo }) {
  const { x, basica } = fila.inicial;
  return (
    <div className="tabla-contenedor">
      <table className="tabla-mini" aria-label={`Solución inicial de ${fila.nombre}`}>
        <thead>
          <tr>
            <th />
            {p.destinos.map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.origenes.map((o, i) => (
            <tr key={o}>
              <th>{o}</th>
              {p.destinos.map((d, j) => {
                const usaProhibida = x[i][j] > 0 && p.prohibidas?.[i]?.[j];
                return (
                  <td key={d} className={usaProhibida ? 'basica prohibida' : basica[i][j] ? 'basica' : ''}>
                    {basica[i][j] ? (x[i][j] === 0 ? 'ε' : fmt(x[i][j])) : '·'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
