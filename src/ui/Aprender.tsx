import { useMemo, useState } from 'react';
import { optimizar } from '../core/caminoPiedras';
import { NOMBRE_METODO, resolverMetodo } from '../core/metodos';
import type { MetodoInicial } from '../core/metodos';
import type { Problema } from '../core/tipos';
import { TEORIA } from '../contenido/teoria';
import type { Teoria } from '../contenido/teoria';
import { Reproductor } from './Reproductor';

const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];

export function Aprender({ problema }: { problema: Problema }) {
  const [metodo, setMetodo] = useState<MetodoInicial>('noroeste');
  const [optimizarOn, setOptimizarOn] = useState(true);
  const [detallado, setDetallado] = useState(false);
  const [practica, setPractica] = useState(false);

  const { balanceado, pasos } = useMemo(() => {
    const inicial = resolverMetodo(problema, metodo);
    const pasos = [...inicial.pasos];
    if (optimizarOn) pasos.push(...optimizar(inicial.problema, inicial.solucion, { detallado }).pasos);
    return { balanceado: inicial.problema, pasos };
  }, [problema, metodo, optimizarOn, detallado]);

  return (
    <section className="panel">
      <h2>Aprende paso a paso</h2>
      <div className="barra">
        <div className="segmentado" role="radiogroup" aria-label="Método">
          {METODOS.map((k) => (
            <button key={k} role="radio" aria-checked={metodo === k} className={metodo === k ? 'activo' : ''} onClick={() => setMetodo(k)}>
              {NOMBRE_METODO[k]}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={optimizarOn} onChange={(e) => setOptimizarOn(e.target.checked)} />
          Optimizar con Camino de las Piedras
        </label>
        <label className="check">
          <input type="checkbox" checked={detallado} disabled={!optimizarOn} onChange={(e) => setDetallado(e.target.checked)} />
          Evaluar cada celda vacía
        </label>
        <label className="check">
          <input type="checkbox" checked={practica} onChange={(e) => setPractica(e.target.checked)} />
          Modo práctica
        </label>
      </div>

      <div className="teorias">
        <TarjetaTeoria teoria={TEORIA[metodo]} />
        {optimizarOn && <TarjetaTeoria teoria={TEORIA.piedras} />}
      </div>

      <Reproductor key={`${metodo}-${optimizarOn}-${detallado}-${practica}-${JSON.stringify(problema)}`} problema={balanceado} pasos={pasos} practica={practica} />
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
    </details>
  );
}
