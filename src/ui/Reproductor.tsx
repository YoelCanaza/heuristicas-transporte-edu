import { useEffect, useState } from 'react';
import type { Celda, Paso, Problema } from '../core/tipos';
import { fmt } from '../core/util';
import { TablaTransporte } from './TablaTransporte';

interface Props {
  problema: Problema;
  pasos: Paso[];
  practica?: boolean;
}

const ETIQUETA_TIPO: Record<Paso['tipo'], string> = {
  inicio: 'Inicio',
  balanceo: 'Balanceo',
  penalizaciones: 'Análisis',
  asignacion: 'Asignación',
  fin: 'Solución inicial',
  degeneracion: 'Degeneración',
  evaluacion: 'Evaluación',
  ciclo: 'Entra a la base',
  pivoteo: 'Nueva solución',
  optimo: 'Óptimo',
};

const VELOCIDADES = [
  { etiqueta: 'Lenta', ms: 2500 },
  { etiqueta: 'Normal', ms: 1400 },
  { etiqueta: 'Rápida', ms: 600 },
];

export function Reproductor({ problema, pasos, practica = false }: Props) {
  const [idx, setIdx] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [ms, setMs] = useState(VELOCIDADES[1].ms);
  const [feedback, setFeedback] = useState<{ ok: boolean; texto: string } | null>(null);
  const [marcada, setMarcada] = useState<Celda | null>(null);
  const [puntaje, setPuntaje] = useState({ aciertos: 0, intentos: 0 });

  const ultimo = pasos.length - 1;
  const paso = pasos[idx];
  const siguiente = pasos[idx + 1];
  const pregunta =
    practica && siguiente?.celda && (siguiente.tipo === 'asignacion' || siguiente.tipo === 'ciclo')
      ? siguiente.tipo === 'asignacion'
        ? '¿Qué celda elegirá el método ahora? Haz clic en ella.'
        : '¿Qué celda entrará a la base? Haz clic en ella.'
      : null;

  const ir = (k: number) => {
    setIdx(Math.max(0, Math.min(ultimo, k)));
    setFeedback(null);
    setMarcada(null);
  };

  useEffect(() => {
    if (!reproduciendo) return;
    if (idx >= ultimo || pregunta) {
      setReproduciendo(false);
      return;
    }
    const t = setTimeout(() => ir(idx + 1), ms);
    return () => clearTimeout(t);
  });

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight') setIdx((k) => Math.min(ultimo, k + 1));
      if (e.key === 'ArrowLeft') setIdx((k) => Math.max(0, k - 1));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ultimo]);

  const responder = (c: Celda) => {
    if (!pregunta || !siguiente.celda) return;
    const ok = c.i === siguiente.celda.i && c.j === siguiente.celda.j;
    setPuntaje((s) => ({ aciertos: s.aciertos + (ok ? 1 : 0), intentos: s.intentos + 1 }));
    if (ok) {
      ir(idx + 1);
      setFeedback({ ok: true, texto: '¡Correcto!' });
    } else {
      setMarcada(c);
      setFeedback({ ok: false, texto: 'No es esa celda. Revisa el criterio del método e inténtalo otra vez, o pulsa "Mostrar respuesta".' });
    }
  };

  return (
    <div className="reproductor">
      <div className="reproductor-cuerpo">
        <TablaTransporte problema={problema} paso={paso} onCeldaClick={pregunta ? responder : undefined} marcada={marcada} />
        <aside className="explicacion">
          <div className="explicacion-cabecera">
            <span className={`etiqueta etiqueta-${paso.tipo}`}>{ETIQUETA_TIPO[paso.tipo]}</span>
            <span className="contador">
              Paso {idx + 1} / {pasos.length}
            </span>
          </div>
          <h3>{paso.titulo}</h3>
          <p>{paso.explicacion}</p>
          <p className="costo-actual">
            Costo actual: <strong>{fmt(paso.costoTotal)}</strong>
          </p>
          {pregunta && <p className="pregunta">{pregunta}</p>}
          {feedback && <p className={feedback.ok ? 'feedback ok' : 'feedback error'}>{feedback.texto}</p>}
          {practica && puntaje.intentos > 0 && (
            <p className="puntaje">
              Aciertos: {puntaje.aciertos} / {puntaje.intentos}
            </p>
          )}
        </aside>
      </div>

      <div className="controles">
        <button onClick={() => ir(0)} disabled={idx === 0} title="Primer paso">
          ⏮
        </button>
        <button onClick={() => ir(idx - 1)} disabled={idx === 0} title="Paso anterior (←)">
          ◀
        </button>
        {pregunta ? (
          <button className="primario" onClick={() => ir(idx + 1)}>
            Mostrar respuesta
          </button>
        ) : (
          <button className="primario" onClick={() => ir(idx + 1)} disabled={idx === ultimo} title="Paso siguiente (→)">
            Siguiente ▶
          </button>
        )}
        <button onClick={() => ir(ultimo)} disabled={idx === ultimo} title="Último paso">
          ⏭
        </button>
        <button onClick={() => setReproduciendo((r) => !r)} disabled={idx === ultimo} title="Reproducción automática">
          {reproduciendo ? '⏸ Pausar' : '⏵ Reproducir'}
        </button>
        <select value={ms} onChange={(e) => setMs(Number(e.target.value))} aria-label="Velocidad">
          {VELOCIDADES.map((v) => (
            <option key={v.ms} value={v.ms}>
              {v.etiqueta}
            </option>
          ))}
        </select>
        <input
          type="range"
          min={0}
          max={ultimo}
          value={idx}
          onChange={(e) => ir(Number(e.target.value))}
          aria-label="Línea de tiempo"
        />
      </div>
    </div>
  );
}
