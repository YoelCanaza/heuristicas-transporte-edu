import { useEffect, useMemo, useState } from 'react';
import { optimizar } from '../core/caminoPiedras';
import { comparar } from '../core/comparacion';
import type { FilaComparacion, ResultadoComparacion } from '../core/comparacion';
import {
  CONFIG_INICIAL,
  ETIQUETA_CELDA,
  ETIQUETA_DESEMPATE,
  ETIQUETA_LINEA,
  ETIQUETA_MODO,
  PRESETS,
  describir,
  equivalencia,
  selectorPersonalizado,
} from '../core/heuristica';
import type { ConfigHeuristica, CriterioCelda, CriterioLinea, Desempate, ModoSeleccion } from '../core/heuristica';
import { NOMBRE_METODO, SELECTOR, resolverInicial } from '../core/metodos';
import type { MetodoInicial } from '../core/metodos';
import type { Problema } from '../core/tipos';
import { fmt } from '../core/util';
import { Reproductor } from './Reproductor';

const CLAVE_GUARDADO = 'heuristrans.heuristica';

function cargarConfig(): ConfigHeuristica {
  try {
    const guardada = localStorage.getItem(CLAVE_GUARDADO);
    if (guardada) return { ...CONFIG_INICIAL, ...JSON.parse(guardada) };
  } catch {
    // almacenamiento no disponible: se usa la configuración inicial
  }
  return CONFIG_INICIAL;
}

function Opciones<T extends string>({ etiquetas, valor, onChange }: { etiquetas: Record<T, string>; valor: T; onChange: (v: T) => void }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value as T)}>
      {(Object.keys(etiquetas) as T[]).map((k) => (
        <option key={k} value={k}>
          {etiquetas[k]}
        </option>
      ))}
    </select>
  );
}

export function Laboratorio({ problema }: { problema: Problema }) {
  const [config, setConfig] = useState<ConfigHeuristica>(cargarConfig);
  const [optimizarOn, setOptimizarOn] = useState(false);
  const [instancias, setInstancias] = useState(100);
  const [semilla, setSemilla] = useState(2026);
  const [resultado, setResultado] = useState<ResultadoComparacion | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(config));
    } catch {
      // sin almacenamiento la heurística simplemente no se recuerda
    }
  }, [config]);

  const actualizar = (cambio: Partial<ConfigHeuristica>) => {
    setConfig((c) => ({ ...c, ...cambio }));
    setResultado(null);
  };

  const equivale = equivalencia(config);
  const nombre = config.nombre.trim() || 'Mi heurística';

  const { balanceado, pasos } = useMemo(() => {
    const inicial = resolverInicial(problema, selectorPersonalizado(config), nombre);
    const pasos = [...inicial.pasos];
    if (optimizarOn) pasos.push(...optimizar(inicial.problema, inicial.solucion).pasos);
    return { balanceado: inicial.problema, pasos };
  }, [problema, config, nombre, optimizarOn]);

  const ejecutarComparacion = () => {
    const clasicos = (['noroeste', 'costoMinimo', 'vogel'] as MetodoInicial[]).map((id) => ({
      id,
      nombre: NOMBRE_METODO[id],
      selector: SELECTOR[id],
    }));
    const n = Math.max(1, Math.min(1000, instancias));
    setResultado(comparar([{ id: 'propia', nombre, selector: selectorPersonalizado(config) }, ...clasicos], n, semilla));
  };

  return (
    <section className="panel">
      <h2>Laboratorio: diseña tu propia heurística</h2>

      <article className="etapa">
        <h3>
          <span className="numero">1</span> Reflexiona
        </h3>
        <p>
          Toda heurística constructiva del problema de transporte responde a una sola pregunta:{' '}
          <strong>¿qué celda lleno ahora?</strong> Observa qué información usa cada método clásico:
        </p>
        <div className="tabla-contenedor">
          <table className="tabla-simple">
            <thead>
              <tr>
                <th>Método</th>
                <th>¿Mira los costos?</th>
                <th>¿Mira el costo de oportunidad?</th>
                <th>¿Mira las cantidades?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Esquina Noroeste</td>
                <td>No</td>
                <td>No</td>
                <td>Solo para asignar</td>
              </tr>
              <tr>
                <td>Costo Mínimo</td>
                <td>Sí, el menor de toda la tabla</td>
                <td>No</td>
                <td>Solo para desempatar</td>
              </tr>
              <tr>
                <td>Vogel</td>
                <td>Sí</td>
                <td>Sí: diferencia entre los dos menores costos</td>
                <td>Solo para desempatar</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="preguntas">
          <li>¿Por qué el Costo Mínimo puede terminar usando rutas muy caras al final?</li>
          <li>¿Qué otra medida, además de la penalización de Vogel, podría indicar que una fila o columna es "urgente"?</li>
          <li>¿Conviene más llenar primero las celdas que permiten mover muchas unidades?</li>
        </ul>
      </article>

      <article className="etapa">
        <h3>
          <span className="numero">2</span> Diseña tu regla
        </h3>
        <div className="formulario">
          <label>
            Nombre
            <input type="text" value={config.nombre} onChange={(e) => actualizar({ nombre: e.target.value })} />
          </label>
          <label>
            ¿Cómo eliges la celda?
            <Opciones<ModoSeleccion> etiquetas={ETIQUETA_MODO} valor={config.modo} onChange={(modo) => actualizar({ modo })} />
          </label>
          {config.modo === 'linea' && (
            <label>
              Criterio para elegir la fila o columna
              <Opciones<CriterioLinea>
                etiquetas={ETIQUETA_LINEA}
                valor={config.criterioLinea}
                onChange={(criterioLinea) => actualizar({ criterioLinea })}
              />
            </label>
          )}
          <label>
            Criterio para elegir la celda
            <Opciones<CriterioCelda>
              etiquetas={ETIQUETA_CELDA}
              valor={config.criterioCelda}
              onChange={(criterioCelda) => actualizar({ criterioCelda })}
            />
          </label>
          <label>
            Si hay empate, elegir…
            <Opciones<Desempate> etiquetas={ETIQUETA_DESEMPATE} valor={config.desempate} onChange={(desempate) => actualizar({ desempate })} />
          </label>
        </div>
        <div className="barra">
          <span className="ayuda">Explora cómo se escriben los métodos clásicos con estos bloques:</span>
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
            <button key={k} onClick={() => actualizar({ ...PRESETS[k], nombre: `${PRESETS[k].nombre} (copia)` })}>
              {PRESETS[k].nombre}
            </button>
          ))}
        </div>
        <p className="descripcion-regla">
          <strong>{nombre}:</strong> {describir(config)}
        </p>
        {equivale && (
          <p className="aviso">
            Esta configuración equivale a <strong>{equivale}</strong>. ¡Modifica algún criterio para crear algo nuevo!
          </p>
        )}
      </article>

      <article className="etapa">
        <h3>
          <span className="numero">3</span> Pruébala en el problema actual
        </h3>
        <label className="check">
          <input type="checkbox" checked={optimizarOn} onChange={(e) => setOptimizarOn(e.target.checked)} />
          Continuar con Camino de las Piedras
        </label>
        <Reproductor key={`${JSON.stringify(config)}-${optimizarOn}-${JSON.stringify(problema)}`} problema={balanceado} pasos={pasos} />
      </article>

      <article className="etapa">
        <h3>
          <span className="numero">4</span> Compárala
        </h3>
        <p className="ayuda">
          Se generan problemas aleatorios (3–5 orígenes, 3–6 destinos, costos de 1 a 20). Cada uno se resuelve con tu
          heurística y con los métodos clásicos; el óptimo se obtiene con el Camino de las Piedras. La misma semilla
          produce siempre los mismos problemas.
        </p>
        <div className="barra">
          <label>
            Problemas
            <input type="number" min={1} max={1000} value={instancias} onChange={(e) => setInstancias(Number(e.target.value))} />
          </label>
          <label>
            Semilla
            <input type="number" value={semilla} onChange={(e) => setSemilla(Number(e.target.value))} />
          </label>
          <button className="primario" onClick={ejecutarComparacion}>
            Comparar
          </button>
        </div>
        {resultado && <ResultadosComparacion resultado={resultado} config={config} />}
      </article>
    </section>
  );
}

function ResultadosComparacion({ resultado, config }: { resultado: ResultadoComparacion; config: ConfigHeuristica }) {
  const filas = [...resultado.filas].sort((a, b) => a.brechaPromedio - b.brechaPromedio);
  const maxBrecha = Math.max(...filas.map((f) => f.brechaPromedio), 1);
  const pct = (v: number) => `${fmt((v / resultado.instancias) * 100)} %`;

  return (
    <>
      <div className="tabla-contenedor">
        <table className="tabla-simple resultados">
          <thead>
            <tr>
              <th>Heurística</th>
              <th>Brecha promedio vs. óptimo</th>
              <th>Costo promedio</th>
              <th>Alcanza el óptimo</th>
              <th>Mejor solución inicial</th>
              <th>Iteraciones hasta el óptimo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className={f.id === 'propia' ? 'propia' : ''}>
                <td>{f.nombre}</td>
                <td>
                  <div className="barra-dato">
                    <span style={{ width: `${(f.brechaPromedio / maxBrecha) * 100}%` }} />
                    <em>{fmt(f.brechaPromedio)} %</em>
                  </div>
                </td>
                <td>{fmt(f.costoPromedio)}</td>
                <td>{pct(f.vecesOptimo)}</td>
                <td>{pct(f.vecesMejor)}</td>
                <td>{fmt(f.iteracionesPromedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="interpretacion">{interpretar(filas, config)}</p>
    </>
  );
}

function interpretar(filas: FilaComparacion[], config: ConfigHeuristica): string {
  const propia = filas.find((f) => f.id === 'propia')!;
  const vogel = filas.find((f) => f.id === 'vogel')!;
  const minimo = filas.find((f) => f.id === 'costoMinimo')!;
  const puesto = filas.indexOf(propia) + 1;
  const partes = [`Tu heurística quedó en el puesto ${puesto} de ${filas.length} por brecha promedio (${fmt(propia.brechaPromedio)} %).`];

  const diferencia = propia.brechaPromedio - vogel.brechaPromedio;
  if (diferencia < -0.05) partes.push(`¡Supera a Vogel en ${fmt(-diferencia)} puntos porcentuales en promedio!`);
  else if (diferencia <= 0.05) partes.push('Rinde prácticamente igual que Vogel.');
  else if (propia.brechaPromedio < minimo.brechaPromedio) partes.push('Mejora al Costo Mínimo, pero Vogel todavía es mejor.');
  else partes.push('Todavía no supera al Costo Mínimo.');

  if (config.criterioCelda === 'noroeste') partes.push('Pista: tu regla elige la celda sin mirar los costos.');
  else if (config.modo === 'celda' && config.criterioCelda === 'menorCosto')
    partes.push('Pista: elegir siempre la celda más barata es miope; prueba a medir la urgencia de cada fila o columna.');
  else if (config.criterioCelda === 'mayorCantidad')
    partes.push('Pista: mover muchas unidades no sirve de mucho si la ruta es cara; combina la cantidad con el costo.');

  return partes.join(' ');
}
