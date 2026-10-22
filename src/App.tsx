import { useState } from 'react';
import { EJEMPLO_TAHA } from './core/ejemplos';
import type { Problema } from './core/tipos';
import { validar } from './core/validacion';
import { Aprender } from './ui/Aprender';
import { EditorProblema } from './ui/EditorProblema';
import { Laboratorio } from './ui/Laboratorio';

type Vista = 'problema' | 'aprender' | 'laboratorio';

const VISTAS: { id: Vista; etiqueta: string }[] = [
  { id: 'problema', etiqueta: '1. Problema' },
  { id: 'aprender', etiqueta: '2. Aprender' },
  { id: 'laboratorio', etiqueta: '3. Laboratorio' },
];

export function App() {
  const [problema, setProblema] = useState<Problema>(EJEMPLO_TAHA);
  const [vista, setVista] = useState<Vista>('problema');
  const valido = validar(problema).length === 0;

  return (
    <>
      <header className="cabecera">
        <div className="marca">
          <img src="./icono.svg" alt="" width={28} height={28} />
          <div>
            <h1>HeurisTrans</h1>
            <span>Heurísticas del Problema de Transporte</span>
          </div>
        </div>
        <nav>
          {VISTAS.map((v) => (
            <button
              key={v.id}
              className={vista === v.id ? 'activo' : ''}
              disabled={v.id !== 'problema' && !valido}
              onClick={() => setVista(v.id)}
            >
              {v.etiqueta}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {vista === 'problema' && <EditorProblema problema={problema} onChange={setProblema} />}
        {vista === 'aprender' && valido && <Aprender problema={problema} />}
        {vista === 'laboratorio' && valido && <Laboratorio problema={problema} />}
      </main>
      <footer className="pie">HeurisTrans v0.1 — MVP</footer>
    </>
  );
}
