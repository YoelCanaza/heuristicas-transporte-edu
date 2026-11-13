import type { Optimizador } from '../core/caminoPiedras';
import type { MetodoInicial } from '../core/metodos';

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
  return (
    <section>
      <div className="hero">
        <div className="hero-texto">
          <p className="eyebrow">Software educativo · Investigación de Operaciones</p>
          <div className="hero-titulo-envoltura">
            <div className="franja" aria-hidden="true" />
            <h1 className="hero-titulo">
              HEURIS
              <br />
              TRANS<span className="punto">.</span>
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
          <svg className="red" viewBox="0 0 600 500" aria-hidden="true">
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
          <div className="chip-flotante" style={{ left: '34%', top: '50%' }}>
            O2 → D3 · 15 unidades
          </div>
          <div className="chip-flotante chip-optimo">
            <span className="eyebrow">Costo óptimo</span>
            <strong>435</strong>
            <span>Ejemplo de Taha, cap. 5</span>
          </div>
        </div>
      </div>

      <div className="modulos-cabecera">
        <h2>Qué vas a aprender</h2>
        <p>Seis módulos, del método más simple a tu propia heurística</p>
      </div>
      <div className="modulos">
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
