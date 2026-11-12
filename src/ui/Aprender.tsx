import { useMemo, useState } from 'react';
import { optimizar } from '../core/caminoPiedras';
import { NOMBRE_METODO, resolverMetodo } from '../core/metodos';
import type { MetodoInicial } from '../core/metodos';
import type { Problema } from '../core/tipos';
import { TEORIA } from '../contenido/teoria';
import type { Teoria } from '../contenido/teoria';
import { Reproductor } from './Reproductor';
import type { Fase } from './Reproductor';

const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];

interface Props {
  problema: Problema;
  metodo: MetodoInicial;
  onMetodo: (m: MetodoInicial) => void;
}

export function Aprender({ problema, metodo, onMetodo }: Props) {
  const [optimizarOn, setOptimizarOn] = useState(true);
  const [detallado, setDetallado] = useState(false);
  const [practica, setPractica] = useState(false);

  const { balanceado, pasos, fases } = useMemo(() => {
    const inicial = resolverMetodo(problema, metodo);
    const pasos = [...inicial.pasos];
    const fases: Fase[] = [{ desde: 0, etiqueta: `Construcción · ${NOMBRE_METODO[metodo]}`, tipo: 'construccion' }];
    if (optimizarOn) {
      fases.push({ desde: pasos.length, etiqueta: 'Optimización · Camino de las Piedras', tipo: 'optimizacion' });
      pasos.push(...optimizar(inicial.problema, inicial.solucion, { detallado }).pasos);
    }
    return { balanceado: inicial.problema, pasos, fases };
  }, [problema, metodo, optimizarOn, detallado]);

  return (
    <section className="vista">
      <header className="vista-cabecera">
        <div>
          <p className="eyebrow">02 — Aprender</p>
          <h1>Aprende paso a paso</h1>
          <p className="vista-descripcion">
            Elige un método y avanza con los controles o las flechas del teclado. Cada paso explica qué se hizo y por
            qué.
          </p>
        </div>
        <div className="segmentado" role="radiogroup" aria-label="Método">
          {METODOS.map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={metodo === k}
              className={metodo === k ? 'activo' : ''}
              onClick={() => onMetodo(k)}
            >
              {NOMBRE_METODO[k]}
            </button>
          ))}
        </div>
      </header>

      <div className="chips">
        <label className="chip-check">
          <input type="checkbox" checked={optimizarOn} onChange={(e) => setOptimizarOn(e.target.checked)} />
          Optimizar con Camino de las Piedras
        </label>
        <label className="chip-check">
          <input
            type="checkbox"
            checked={detallado}
            disabled={!optimizarOn}
            onChange={(e) => setDetallado(e.target.checked)}
          />
          Evaluar cada celda vacía
        </label>
        <label className="chip-check">
          <input type="checkbox" checked={practica} onChange={(e) => setPractica(e.target.checked)} />
          Modo práctica
        </label>
      </div>

      <div className="teorias">
        <TarjetaTeoria teoria={TEORIA[metodo]} />
        {optimizarOn && <TarjetaTeoria teoria={TEORIA.piedras} />}
      </div>

      <Reproductor
        key={`${metodo}-${optimizarOn}-${detallado}-${practica}-${JSON.stringify(problema)}`}
        problema={balanceado}
        pasos={pasos}
        fases={fases}
        practica={practica}
      />
    </section>
  );
}

export function TarjetaTeoria({ teoria }: { teoria: Teoria }) {
  return (
    <details className="teoria">
      <summary>Teoría: {teoria.titulo}</summary>
      <p>{teoria.idea}</p>
      <ol>
        {teoria.pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <p>
        <strong>Ventajas:</strong> {teoria.ventajas}
      </p>
      <p>
        <strong>Limitaciones:</strong> {teoria.limitaciones}
      </p>
      <p>
        <strong>Convenciones:</strong> {teoria.convenciones.join(' ')}
      </p>
    </details>
  );
}
