import type { Optimizador } from '../core/caminoPiedras';
import type { MetodoInicial } from '../core/metodos';
import { useAparicion, useInclinacion, useValorAnimado } from './movimiento';

interface Props {
  onMetodo: (m: MetodoInicial, o: Optimizador) => void;
  onTeoria: () => void;
  onLaboratorio: () => void;
}

const ORIGENES = [110, 250, 390];
const DESTINOS = [80, 200, 320, 440];

/** Solución óptima del ejemplo de Taha (costo 435): [origen, destino, unidades]. */
const FLUJOS: [number, number, number][] = [
  [0, 1, 5],
  [0, 3, 10],
  [1, 1, 10],
  [1, 2, 15],
  [2, 0, 5],
  [2, 3, 5],
];

/** Costos del ejemplo de Taha: el de Esquina Noroeste, de donde parte el contador, y el óptimo. */
const COSTO_INICIAL = 520;
const COSTO_OPTIMO = 435;
/** Segundos que tarda una unidad en recorrer su ruta en la portada. */
const DURACION_VIAJE = 3.4;

const curva = (o: number, d: number) =>
  `M112 ${ORIGENES[o]} C 300 ${ORIGENES[o]}, 300 ${DESTINOS[d]}, 488 ${DESTINOS[d]}`;

const MODULOS: { titulo: string; texto: string; metodo: MetodoInicial; optimizador?: Optimizador }[] = [
  {
    titulo: 'Esquina Noroeste',
    texto: 'Llena la tabla de arriba a la izquierda hacia abajo a la derecha, sin mirar los costos.',
    metodo: 'noroeste',
  },
  {
    titulo: 'Costo Mínimo',
    texto: 'En cada paso aprovecha la ruta más barata que siga disponible.',
    metodo: 'costoMinimo',
  },
  { titulo: 'Vogel', texto: 'Prioriza las filas y columnas donde equivocarse costaría más.', metodo: 'vogel' },
  // La optimización se muestra a continuación de la construcción; Esquina Noroeste da el recorrido más largo y más ilustrativo.
  {
    titulo: 'Camino de las Piedras',
    texto: 'Mejora la solución con caminos cerrados de signos + y − hasta el óptimo.',
    metodo: 'noroeste',
  },
  {
    titulo: 'MODI (u-v)',
    texto: 'Llega al mismo óptimo con menos trabajo: un valor por fila y columna en vez de un camino por celda.',
    metodo: 'noroeste',
    optimizador: 'modi',
  },
];

export function Inicio({ onMetodo, onTeoria, onLaboratorio }: Props) {
  const hero = useInclinacion<HTMLDivElement>();
  const modulos = useAparicion<HTMLDivElement>();
  // El costo baja del que da Esquina Noroeste al óptimo: el recorrido que enseña la aplicación.
  const costo = useValorAnimado(COSTO_OPTIMO, 1600, COSTO_INICIAL);

  return (
    <section className="inicio">
      <div className="hero" ref={hero}>
        {/* Las fórmulas del problema de transporte, como marca de agua detrás de la portada. */}
        <div className="ecuaciones" aria-hidden="true">
          <span style={{ left: '43%', top: '2%' }}>
            min Z = ΣΣ c<sub>ij</sub> x<sub>ij</sub>
          </span>
          <span style={{ left: '47%', top: '34%' }}>
            Σ<sub>j</sub> x<sub>ij</sub> = a<sub>i</sub>
          </span>
          <span style={{ left: '44%', top: '58%' }}>
            Σ<sub>i</sub> x<sub>ij</sub> = b<sub>j</sub>
          </span>
          <span style={{ left: '40%', top: '86%' }}>
            u<sub>i</sub> + v<sub>j</sub> = c<sub>ij</sub>
          </span>
          <span style={{ left: '62%', top: '96%' }}>
            θ = min x<sub>ij</sub>
            <sup>−</sup>
          </span>
          <span style={{ left: '2%', top: '-6%' }}>m + n − 1</span>
          <span style={{ left: '88%', top: '-5%' }}>
            x<sub>ij</sub> ≥ 0
          </span>
        </div>
        <div className="hero-texto">
          <p className="eyebrow">Software educativo · Investigación de Operaciones</p>
          <div className="hero-titulo-envoltura">
            <div className="franja" aria-hidden="true" />
            <h1 className="hero-titulo">
              Heuris
              <br />
              <em>Trans</em>
              <span className="punto">.</span>
            </h1>
          </div>
          <p className="lead">
            Aprende paso a paso las heurísticas del Problema de Transporte —Esquina Noroeste, Costo Mínimo y Vogel—,
            optimiza con el Camino de las Piedras y diseña tu propia heurística.
          </p>
          <div className="acciones">
            <button className="primario" onClick={() => onMetodo('noroeste', 'piedras')}>
              Empezar con un ejemplo
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
            <button className="secundario" onClick={onTeoria}>
              Ver la teoría
            </button>
          </div>
        </div>

        <div className="hero-grafico">
          {/* Tres capas a distinta profundidad: rutas, nodos y rótulo. Se inclinan juntas con el puntero. */}
          <div className="escena">
            <svg className="red capa capa-rutas" viewBox="0 0 600 500" aria-hidden="true">
              <defs>
                <linearGradient id="flujo" gradientUnits="userSpaceOnUse" x1="112" y1="0" x2="488" y2="0">
                  <stop offset="0" style={{ stopColor: 'var(--azul)' }} />
                  <stop offset="1" style={{ stopColor: 'var(--coral-vivo)' }} />
                </linearGradient>
              </defs>
              {ORIGENES.map((_, o) =>
                DESTINOS.map((_, d) =>
                  FLUJOS.some(([fo, fd]) => fo === o && fd === d) ? null : (
                    <path key={`${o}-${d}`} className="ruta" d={curva(o, d)} />
                  ),
                ),
              )}
              {FLUJOS.map(([o, d, q]) => (
                <path
                  key={`${o}-${d}`}
                  className="flujo"
                  d={curva(o, d)}
                  stroke="url(#flujo)"
                  strokeWidth={2 + q * 1.1}
                />
              ))}
              {/* Una unidad en viaje por cada 5 enviadas; cada ruta va a su propio ritmo. */}
              {FLUJOS.map(([o, d, q], f) =>
                Array.from({ length: Math.ceil(q / 5) }, (_, k) => (
                  <circle
                    key={`${o}-${d}-${k}`}
                    className="particula"
                    r={Math.min(4.5, 1.6 + q * 0.2)}
                    style={{
                      offsetPath: `path('${curva(o, d)}')`,
                      animationDuration: `${DURACION_VIAJE + f * 0.35}s`,
                      animationDelay: `${-(k / Math.ceil(q / 5)) * (DURACION_VIAJE + f * 0.35) - f * 0.6}s`,
                    }}
                  />
                )),
              )}
            </svg>
            <svg className="red capa capa-nodos" viewBox="0 0 600 500" aria-hidden="true">
              {ORIGENES.map((y, o) => (
                <g key={o}>
                  <circle className="nodo-origen" cx="90" cy={y} r="26" />
                  <text className="texto-origen" x="90" y={y + 5}>
                    O{o + 1}
                  </text>
                </g>
              ))}
              {DESTINOS.map((y, d) => (
                <g key={d}>
                  <circle className="nodo-destino" cx="510" cy={y} r="24" />
                  <text className="texto-destino" x="510" y={y + 5}>
                    D{d + 1}
                  </text>
                </g>
              ))}
            </svg>
            <div className="capa capa-rotulo">
              <div className="chip-flotante" style={{ left: '34%', top: '50%' }}>
                O2 → D3 · 15 unidades
              </div>
            </div>
          </div>
          <div className="chip-flotante chip-optimo">
            <span className="eyebrow">Costo óptimo</span>
            <strong>
              <span aria-hidden="true">{Math.round(costo)}</span>
              <span className="solo-lector">{COSTO_OPTIMO}</span>
            </strong>
            <span>Ejemplo de Taha, cap. 5</span>
          </div>
        </div>
      </div>

      <div className="modulos-cabecera">
        <h2>Qué vas a aprender</h2>
        <p>Seis módulos, del método más simple a tu propia heurística</p>
      </div>
      <div className="modulos" ref={modulos}>
        {MODULOS.map((m, k) => (
          <button key={m.titulo} className="modulo" onClick={() => onMetodo(m.metodo, m.optimizador ?? 'piedras')}>
            <span className={k >= 3 ? 'modulo-numero coral' : 'modulo-numero'}>0{k + 1}</span>
            <h3>{m.titulo}</h3>
            <p>{m.texto}</p>
          </button>
        ))}
        <button className="modulo destacado" onClick={onLaboratorio}>
          <span className="modulo-numero">06</span>
          <h3>Tu propia heurística</h3>
          <p>Combina criterios, pruébala y compárala con los métodos clásicos.</p>
        </button>
      </div>
    </section>
  );
}
