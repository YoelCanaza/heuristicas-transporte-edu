import { useEffect, useState } from 'react';
import { EJEMPLO_TAHA } from './core/ejemplos';
import type { Problema } from './core/tipos';
import { validar } from './core/validacion';
import { Aprender } from './ui/Aprender';
import { EditorProblema } from './ui/EditorProblema';
import { Inicio } from './ui/Inicio';
import { Laboratorio } from './ui/Laboratorio';

type Vista = 'inicio' | 'problema' | 'aprender' | 'laboratorio';
type Tema = 'light' | 'dark';

const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: 'inicio', etiqueta: 'Inicio' },
  { id: 'problema', etiqueta: 'Problema' },
  { id: 'aprender', etiqueta: 'Aprender' },
  { id: 'laboratorio', etiqueta: 'Laboratorio' },
];

const CLAVE_TEMA = 'heuristrans.tema';

function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch {
    // sin almacenamiento se usa la preferencia del sistema
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App() {
  const [problema, setProblema] = useState<Problema>(EJEMPLO_TAHA);
  const [vista, setVista] = useState<Vista>('inicio');
  const [tema, setTema] = useState<Tema>(temaInicial);
  const valido = validar(problema).length === 0;

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // el tema simplemente no se recuerda
    }
  }, [tema]);

  const ir = (v: Vista) => {
    setVista(v);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="contenedor">
      <header className="cabecera">
        <button className="marca" onClick={() => ir('inicio')}>
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
              disabled={(v.id === 'aprender' || v.id === 'laboratorio') && !valido}
              onClick={() => ir(v.id)}
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main>
        {vista === 'inicio' && (
          <Inicio onComenzar={() => ir('aprender')} onTeoria={() => ir('aprender')} onLaboratorio={() => ir('laboratorio')} />
        )}
        {vista === 'problema' && <EditorProblema problema={problema} onChange={setProblema} onContinuar={() => ir('aprender')} />}
        {vista === 'aprender' && valido && <Aprender problema={problema} />}
        {vista === 'laboratorio' && valido && <Laboratorio problema={problema} />}
      </main>

      <footer className="pie">
        <span>HeurisTrans v0.1</span>
        <span>Problema de Transporte · Heurísticas constructivas y optimización</span>
      </footer>
    </div>
  );
}
