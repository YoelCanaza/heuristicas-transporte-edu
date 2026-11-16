import { useEffect, useRef, useState } from 'react';
import { decodificarProblema, mismoProblema } from './core/enlace';
import { EJEMPLO_TAHA } from './core/ejemplos';
import type { Problema } from './core/tipos';
import { esProblema, validar } from './core/validacion';
import { Aprender } from './ui/Aprender';
import { Comparar } from './ui/Comparar';
import { EditorProblema } from './ui/EditorProblema';
import { Inicio } from './ui/Inicio';
import { Laboratorio } from './ui/Laboratorio';
import { Reparto } from './ui/Reparto';
import { Teoria } from './ui/Teoria';
import { leerCompartido, sinCompartido, useRuta } from './ui/ruta';
import type { Vista } from './ui/ruta';

type Tema = 'light' | 'dark';

const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: 'inicio', etiqueta: 'Inicio' },
  { id: 'problema', etiqueta: 'Problema' },
  { id: 'aprender', etiqueta: 'Aprender' },
  { id: 'comparar', etiqueta: 'Comparar' },
  { id: 'laboratorio', etiqueta: 'Laboratorio' },
  { id: 'teoria', etiqueta: 'Teoría' },
];

const CLAVE_TEMA = 'heuristrans.tema';
const CLAVE_PROBLEMA = 'heuristrans.problema';

function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch {
    // sin almacenamiento se usa la preferencia del sistema
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function problemaInicial(): Problema {
  try {
    const guardado: unknown = JSON.parse(localStorage.getItem(CLAVE_PROBLEMA) ?? 'null');
    if (esProblema(guardado)) return guardado;
  } catch {
    // dato ausente o dañado: se usa el ejemplo
  }
  return EJEMPLO_TAHA;
}

export function App() {
  const [problema, setProblema] = useState<Problema>(problemaInicial);
  const [ruta, ir] = useRuta();
  const [tema, setTema] = useState<Tema>(temaInicial);
  // Problema que llegó por enlace: el que había antes (para poder volver) o un aviso de enlace dañado.
  const [compartido, setCompartido] = useState<{ previo: Problema | null; error: boolean } | null>(null);
  const problemaActual = useRef(problema);
  problemaActual.current = problema;
  const valido = validar(problema).length === 0;
  const { vista } = ruta;
  // El reto inicial es parte de Aprender: no tiene entrada propia en el menú.
  const seccion = vista === 'reparto' ? 'aprender' : vista;

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // el tema simplemente no se recuerda
    }
  }, [tema]);

  useEffect(() => {
    const etiqueta = vista === 'reparto' ? 'Tu reparto' : VISTAS.find((v) => v.id === vista)?.etiqueta;
    document.title = etiqueta && vista !== 'inicio' ? `${etiqueta} · HeurisTrans` : 'HeurisTrans';
  }, [vista]);

  useEffect(() => {
    const revisar = () => {
      const codigo = leerCompartido(window.location.hash);
      if (codigo === null) return;
      // Se limpia la dirección para que recargar o compartir la pantalla no vuelva a cargar el problema.
      history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search + sinCompartido(window.location.hash),
      );
      const nuevo = decodificarProblema(codigo);
      if (!nuevo) {
        setCompartido({ previo: null, error: true });
        return;
      }
      const previo = problemaActual.current;
      setCompartido({ previo: mismoProblema(previo, nuevo) ? null : previo, error: false });
      setProblema(nuevo);
    };
    revisar();
    window.addEventListener('hashchange', revisar);
    return () => window.removeEventListener('hashchange', revisar);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_PROBLEMA, JSON.stringify(problema));
    } catch {
      // el problema simplemente no se recuerda
    }
  }, [problema]);

  return (
    <div className="contenedor">
      <header className="cabecera">
        <button className="marca" onClick={() => ir({ vista: 'inicio' })}>
          <span className="logo" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          HeurisTrans
        </button>
        <nav className="nav-principal" aria-label="Principal">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              className={seccion === v.id ? 'activo' : ''}
              aria-current={seccion === v.id ? 'page' : undefined}
              onClick={() => ir({ vista: v.id })}
            >
              {v.etiqueta}
            </button>
          ))}
        </nav>
        <div className="cabecera-acciones">
          <button
            className="boton-icono"
            onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}
            aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {tema === 'dark' ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main>
        {compartido && (
          <div
            className={compartido.error ? 'aviso error banda-compartido' : 'aviso ok banda-compartido'}
            role="status"
          >
            <p>
              {compartido.error
                ? 'El enlace no contiene un problema válido (puede estar incompleto). Se mantiene tu problema.'
                : compartido.previo
                  ? 'Abriste un problema compartido por enlace. Reemplazó al que tenías.'
                  : 'Abriste un problema compartido por enlace. Es el mismo que ya tenías.'}
            </p>
            <div className="acciones">
              {compartido.previo && (
                <button
                  className="secundario"
                  onClick={() => {
                    setProblema(compartido.previo!);
                    setCompartido(null);
                  }}
                >
                  Volver a mi problema anterior
                </button>
              )}
              <button onClick={() => setCompartido(null)}>Entendido</button>
            </div>
          </div>
        )}
        {vista === 'inicio' && (
          <Inicio
            onMetodo={(metodo, optimizador) => ir({ vista: 'aprender', metodo, optimizador })}
            onTeoria={() => ir({ vista: 'teoria' })}
            onLaboratorio={() => ir({ vista: 'laboratorio' })}
          />
        )}
        {vista === 'problema' && (
          <EditorProblema problema={problema} onChange={setProblema} onContinuar={() => ir({ vista: 'aprender' })} />
        )}
        {vista === 'teoria' && (
          <Teoria onPractica={(metodo, optimizador) => ir({ vista: 'aprender', metodo, optimizador })} />
        )}
        {(vista === 'aprender' || vista === 'reparto' || vista === 'comparar' || vista === 'laboratorio') &&
          (valido ? (
            vista === 'aprender' ? (
              <Aprender
                problema={problema}
                metodo={ruta.metodo}
                optimizador={ruta.optimizador}
                onMetodo={(metodo) => ir({ metodo })}
                onOptimizador={(optimizador) => ir({ optimizador })}
                onReparto={() => ir({ vista: 'reparto' })}
              />
            ) : vista === 'reparto' ? (
              <Reparto
                key={JSON.stringify(problema)}
                problema={problema}
                onMetodo={(metodo) => ir({ vista: 'aprender', metodo })}
              />
            ) : vista === 'comparar' ? (
              <Comparar problema={problema} onMetodo={(metodo) => ir({ vista: 'aprender', metodo })} />
            ) : (
              <Laboratorio problema={problema} />
            )
          ) : (
            <section className="vista">
              <div className="tarjeta aviso-vista">
                <h1>El problema tiene datos incompletos</h1>
                <p>Corrige los valores marcados en la pantalla Problema para poder resolverlo.</p>
                <button className="primario" onClick={() => ir({ vista: 'problema' })}>
                  Ir a Problema
                </button>
              </div>
            </section>
          ))}
      </main>

      <footer className="pie">
        <span>HeurisTrans v0.5</span>
        <span>Problema de Transporte · Heurísticas constructivas y optimización</span>
      </footer>
    </div>
  );
}
