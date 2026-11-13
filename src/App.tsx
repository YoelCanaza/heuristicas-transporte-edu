import { useEffect, useState } from 'react';
import { EJEMPLO_TAHA } from './core/ejemplos';
import type { Problema } from './core/tipos';
import { esProblema, validar } from './core/validacion';
import { Aprender } from './ui/Aprender';
import { EditorProblema } from './ui/EditorProblema';
import { Inicio } from './ui/Inicio';
import { Laboratorio } from './ui/Laboratorio';
import { Teoria } from './ui/Teoria';
import { useRuta } from './ui/ruta';
import type { Vista } from './ui/ruta';

type Tema = 'light' | 'dark';

const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: 'inicio', etiqueta: 'Inicio' },
  { id: 'problema', etiqueta: 'Problema' },
  { id: 'aprender', etiqueta: 'Aprender' },
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
  const valido = validar(problema).length === 0;
  const { vista } = ruta;

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // el tema simplemente no se recuerda
    }
  }, [tema]);

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
              className={vista === v.id ? 'activo' : ''}
              aria-current={vista === v.id ? 'page' : undefined}
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
        {vista === 'inicio' && (
          <Inicio
            onMetodo={(metodo) => ir({ vista: 'aprender', metodo })}
            onTeoria={() => ir({ vista: 'teoria' })}
            onLaboratorio={() => ir({ vista: 'laboratorio' })}
          />
        )}
        {vista === 'problema' && (
          <EditorProblema problema={problema} onChange={setProblema} onContinuar={() => ir({ vista: 'aprender' })} />
        )}
        {vista === 'teoria' && <Teoria onPractica={(metodo) => ir({ vista: 'aprender', metodo })} />}
        {(vista === 'aprender' || vista === 'laboratorio') &&
          (valido ? (
            vista === 'aprender' ? (
              <Aprender problema={problema} metodo={ruta.metodo} onMetodo={(metodo) => ir({ metodo })} />
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
        <span>HeurisTrans v0.4</span>
        <span>Problema de Transporte · Heurísticas constructivas y optimización</span>
      </footer>
    </div>
  );
}
