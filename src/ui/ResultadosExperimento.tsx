import { ETIQUETA_TRAMO } from '../core/comparacion';
import type { FilaComparacion, ResultadoComparacion } from '../core/comparacion';
import type { ConfigHeuristica } from '../core/heuristica';
import { fmt } from '../core/util';

interface Props {
  resultado: ResultadoComparacion;
  config: ConfigHeuristica;
  onAbrirPeorCaso: () => void;
}

/** Color de cada tramo de brecha: azul para el óptimo y coral cada vez más intenso. */
const colorTramo = (k: number) =>
  k === 0 ? 'var(--azul)' : `color-mix(in srgb, var(--coral-vivo) ${k * 20}%, var(--superficie-2))`;

export function ResultadosExperimento({ resultado, config, onAbrirPeorCaso }: Props) {
  const filas = [...resultado.filas].sort((a, b) => a.brechaPromedio - b.brechaPromedio);
  const maxBrecha = Math.max(...filas.map((f) => f.brechaPromedio), 1);
  const total = Math.max(resultado.instancias, 1);
  const pct = (v: number) => `${fmt((v / total) * 100)} %`;
  const peor = resultado.peorCaso;
  const nombreDe = (id: string) => resultado.filas.find((f) => f.id === id)?.nombre ?? id;

  return (
    <div className="resultados-experimento">
      <p className="interpretacion">{interpretar(filas, resultado, config)}</p>

      <div className="tabla-contenedor">
        <table className="tabla-simple">
          <thead>
            <tr>
              <th>Heurística</th>
              <th>Brecha promedio</th>
              <th>Mediana</th>
              <th>Peor caso</th>
              <th>Alcanza el óptimo</th>
              <th>Iteraciones hasta el óptimo</th>
              <th>Distribución de las brechas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className={f.id === 'propia' ? 'propia' : ''}>
                <td>{f.nombre}</td>
                <td>
                  <div className={f.id === 'propia' ? 'barra-dato propia' : 'barra-dato'}>
                    <span style={{ width: `${(f.brechaPromedio / maxBrecha) * 100}%` }} />
                    <em>{fmt(f.brechaPromedio)} %</em>
                  </div>
                </td>
                <td>{fmt(f.brechaMediana)} %</td>
                <td>{fmt(f.brechaPeor)} %</td>
                <td>{pct(f.vecesOptimo)}</td>
                <td>{fmt(f.iteracionesPromedio)}</td>
                <td>
                  <div
                    className="distribucion"
                    role="img"
                    aria-label={f.distribucion.map((n, k) => `${ETIQUETA_TRAMO[k]}: ${n}`).join('; ')}
                  >
                    {f.distribucion.map(
                      (n, k) =>
                        n > 0 && (
                          <span
                            key={k}
                            style={{ width: `${(n / total) * 100}%`, background: colorTramo(k) }}
                            title={`${ETIQUETA_TRAMO[k]}: ${n} problemas`}
                          />
                        ),
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="leyenda leyenda-tramos">
        <span>Brecha respecto del óptimo:</span>
        {ETIQUETA_TRAMO.map((t, k) => (
          <span key={t}>
            <span className="muestra" style={{ background: colorTramo(k) }} />
            {t}
          </span>
        ))}
      </div>

      <div className="resultados-detalle">
        <section>
          <h3>Tu heurística contra cada método, problema por problema</h3>
          <div className="tabla-contenedor">
            <table className="tabla-simple">
              <thead>
                <tr>
                  <th>Rival</th>
                  <th>Ganas</th>
                  <th>Empatas</th>
                  <th>Pierdes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {resultado.duelos.map((d) => (
                  <tr key={d.rival}>
                    <td>{d.nombre}</td>
                    <td>{d.gana}</td>
                    <td>{d.empata}</td>
                    <td>{d.pierde}</td>
                    <td>
                      <div className="distribucion duelo" aria-hidden="true">
                        {d.gana > 0 && (
                          <span style={{ width: `${(d.gana / total) * 100}%`, background: 'var(--azul)' }} />
                        )}
                        {d.empata > 0 && (
                          <span style={{ width: `${(d.empata / total) * 100}%`, background: 'var(--pendiente)' }} />
                        )}
                        {d.pierde > 0 && (
                          <span style={{ width: `${(d.pierde / total) * 100}%`, background: 'var(--coral-vivo)' }} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ayuda">Gana quien obtiene la solución inicial de menor costo en ese problema.</p>
        </section>

        {peor && (
          <section className="peor-caso">
            <h3>Donde peor le fue a tu heurística</h3>
            {peor.brecha <= 0 ? (
              <p>Tu heurística alcanzó el óptimo en todos los problemas de este experimento.</p>
            ) : (
              <>
                <p>
                  En un problema de {peor.problema.ofertas.length} × {peor.problema.demandas.length} obtuvo un costo de{' '}
                  <strong>{fmt(peor.costo)}</strong>, un <strong>{fmt(peor.brecha)} %</strong> por encima del óptimo (
                  {fmt(peor.optimo)}).
                </p>
                <dl className="resumen-datos">
                  {Object.entries(peor.costos)
                    .filter(([id]) => id !== 'propia')
                    .flatMap(([id, costo]) => [
                      <dt key={id}>{nombreDe(id)}</dt>,
                      <dd key={`${id}-costo`}>{fmt(costo)}</dd>,
                    ])}
                </dl>
                <p className="ayuda">
                  Ábrelo para ver, paso a paso, qué decisión de tu regla salió cara. Es la mejor pista para mejorarla.
                </p>
                <button className="secundario" onClick={onAbrirPeorCaso}>
                  Abrir este problema en la etapa 3
                </button>
              </>
            )}
          </section>
        )}
      </div>

      {resultado.sinConfirmar > 0 && (
        <p className="aviso">
          En {resultado.sinConfirmar} problemas la optimización se detuvo sin confirmar el óptimo; no se incluyen en las
          estadísticas.
        </p>
      )}
    </div>
  );
}

function interpretar(filas: FilaComparacion[], resultado: ResultadoComparacion, config: ConfigHeuristica): string {
  const propia = filas.find((f) => f.id === 'propia')!;
  const vogel = filas.find((f) => f.id === 'vogel')!;
  const minimo = filas.find((f) => f.id === 'costoMinimo')!;
  const puesto = filas.indexOf(propia) + 1;
  const partes = [
    `Tu heurística quedó en el puesto ${puesto} de ${filas.length} por brecha promedio (${fmt(propia.brechaPromedio)} %) en ${resultado.instancias} problemas.`,
  ];

  const diferencia = propia.brechaPromedio - vogel.brechaPromedio;
  if (diferencia < -0.05) partes.push(`Supera a Vogel en ${fmt(-diferencia)} puntos porcentuales en promedio.`);
  else if (diferencia <= 0.05) partes.push('Rinde prácticamente igual que Vogel.');
  else if (propia.brechaPromedio < minimo.brechaPromedio)
    partes.push('Mejora al Costo Mínimo, pero Vogel todavía es mejor.');
  else partes.push('Todavía no supera al Costo Mínimo.');

  if (config.modo === 'puntaje') {
    if (config.pesos.urgencia === 0 && diferencia > 0.05)
      partes.push('Pista: tu puntaje no mira la urgencia de las filas y columnas, que es la ventaja de Vogel.');
    else if (config.pesos.costo === 0 && config.pesos.relativo === 0)
      partes.push('Pista: tu puntaje no mira ningún costo; dale peso al costo o al costo relativo.');
  } else if (config.criterioCelda === 'noroeste') partes.push('Pista: tu regla elige la celda sin mirar los costos.');
  else if (config.modo === 'celda' && config.criterioCelda === 'menorCosto')
    partes.push(
      'Pista: elegir siempre la celda más barata es miope; prueba a medir la urgencia de cada fila o columna.',
    );
  else if (config.criterioCelda === 'mayorCantidad')
    partes.push('Pista: mover muchas unidades no sirve de mucho si la ruta es cara; combina la cantidad con el costo.');

  if (resultado.familia === 'desbalanceado' && minimo.brechaPromedio > 2 * vogel.brechaPromedio)
    partes.push(
      'Observa cuánto empeora el Costo Mínimo en problemas desbalanceados: la línea ficticia cuesta 0 y la llena primero.',
    );

  return partes.join(' ');
}
