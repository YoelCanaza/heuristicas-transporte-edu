import { useMemo, useState } from 'react';
import { NOMBRE_OPTIMIZADOR, optimizar } from '../core/caminoPiedras';
import type { Optimizador } from '../core/caminoPiedras';
import { NOMBRE_METODO, resolverMetodo } from '../core/metodos';
import type { MetodoInicial } from '../core/metodos';
import type { Problema } from '../core/tipos';
import { TEORIA } from '../contenido/teoria';
import type { Teoria } from '../contenido/teoria';
import { Reproductor } from './Reproductor';
import type { Fase } from './Reproductor';

const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];
const OPTIMIZADORES: Optimizador[] = ['piedras', 'modi'];

interface Props {
  problema: Problema;
  metodo: MetodoInicial;
  optimizador: Optimizador;
  onMetodo: (m: MetodoInicial) => void;
  onOptimizador: (o: Optimizador) => void;
  /** Abre el reto inicial: repartir sin seguir ningún método. */
  onReparto: () => void;
}

export function Aprender({ problema, metodo, optimizador, onMetodo, onOptimizador, onReparto }: Props) {
  const [optimizarOn, setOptimizarOn] = useState(true);
  const [detallado, setDetallado] = useState(false);
  const [practica, setPractica] = useState(false);
  const [completa, setCompleta] = useState(true);
  const [red, setRed] = useState(false);

  const { balanceado, pasos, fases } = useMemo(() => {
    const inicial = resolverMetodo(problema, metodo);
    const pasos = [...inicial.pasos];
    const fases: Fase[] = [{ desde: 0, etiqueta: `Construcción · ${NOMBRE_METODO[metodo]}`, tipo: 'construccion' }];
    if (optimizarOn) {
      fases.push({
        desde: pasos.length,
        etiqueta: `Optimización · ${NOMBRE_OPTIMIZADOR[optimizador]}`,
        tipo: 'optimizacion',
      });
      pasos.push(...optimizar(inicial.problema, inicial.solucion, { metodo: optimizador, detallado }).pasos);
    }
    return { balanceado: inicial.problema, pasos, fases };
  }, [problema, metodo, optimizador, optimizarOn, detallado]);

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
          <button
            role="radio"
            aria-checked={false}
            title="Reto inicial: reparte sin seguir ningún método y compárate con el óptimo"
            onClick={onReparto}
          >
            Tu reparto
          </button>
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
          Optimizar con
        </label>
        <div className="segmentado" role="radiogroup" aria-label="Método de optimización">
          {OPTIMIZADORES.map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={optimizador === k}
              className={optimizador === k ? 'activo' : ''}
              disabled={!optimizarOn}
              onClick={() => onOptimizador(k)}
            >
              {NOMBRE_OPTIMIZADOR[k]}
            </button>
          ))}
        </div>
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
        <label className="chip-check" title="Dibuja bajo la tabla la misma solución como red de orígenes y destinos">
          <input type="checkbox" checked={red} onChange={(e) => setRed(e.target.checked)} />
          Vista de red
        </label>
        {practica && (
          <label
            className="chip-check"
            title="Además de la celda: la cantidad, la línea que se tacha, θ y la celda que sale"
          >
            <input type="checkbox" checked={completa} onChange={(e) => setCompleta(e.target.checked)} />
            Preguntar cada decisión
          </label>
        )}
      </div>

      <div className="teorias">
        <TarjetaTeoria teoria={TEORIA[metodo]} />
        {optimizarOn && <TarjetaTeoria teoria={TEORIA[optimizador]} />}
      </div>

      <Reproductor
        key={`${metodo}-${optimizador}-${optimizarOn}-${detallado}-${practica}-${completa}-${JSON.stringify(problema)}`}
        problema={balanceado}
        pasos={pasos}
        fases={fases}
        practica={practica}
        completa={completa}
        red={red}
        metodo={metodo}
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
