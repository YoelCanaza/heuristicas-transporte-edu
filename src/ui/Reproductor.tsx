import { useEffect, useState } from 'react';
import type { Celda, Paso, Problema } from '../core/tipos';
import { fmt, nombreCelda } from '../core/util';
import { TextoConGlosario } from './Glosa';
import { Leyenda, TablaTransporte } from './TablaTransporte';

export interface Fase {
  /** Índice del primer paso de la fase. */
  desde: number;
  etiqueta: string;
  tipo: 'construccion' | 'optimizacion';
}

interface Props {
  problema: Problema;
  pasos: Paso[];
  fases: Fase[];
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
  limite: 'Sin confirmar',
};

const VELOCIDADES = [
  { etiqueta: 'Lenta', ms: 2500 },
  { etiqueta: 'Normal', ms: 1400 },
  { etiqueta: 'Rápida', ms: 600 },
];

function Icono({ d }: { d: string }) {
  return (
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
      <path d={d} />
    </svg>
  );
}

export function Reproductor({ problema, pasos, fases, practica = false }: Props) {
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

  /** Navegación manual: además de moverse, detiene la reproducción automática. */
  const ir = (k: number) => {
    setIdx(Math.max(0, Math.min(ultimo, k)));
    setFeedback(null);
    setMarcada(null);
    setReproduciendo(false);
  };

  // La reproducción se pausa sola al final o cuando el modo práctica espera una respuesta.
  const avanzando = reproduciendo && idx < ultimo && pregunta === null;

  useEffect(() => {
    if (!avanzando) return;
    const t = setTimeout(() => {
      setIdx((k) => Math.min(ultimo, k + 1));
      setFeedback(null);
      setMarcada(null);
    }, ms);
    return () => clearTimeout(t);
  }, [avanzando, idx, ultimo, ms]);

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
      setFeedback({
        ok: false,
        texto: 'No es esa celda. Revisa el criterio del método e inténtalo otra vez, o pulsa "Mostrar respuesta".',
      });
    }
  };

  const faseDe = (k: number) => [...fases].reverse().find((f) => k >= f.desde) ?? fases[0];

  return (
    <div className="reproductor">
      <div className="reproductor-cuerpo">
        <section className="tarjeta tabla-tarjeta" aria-label="Tabla de transporte">
          <TablaTransporte
            problema={problema}
            paso={paso}
            onCeldaClick={pregunta ? responder : undefined}
            marcada={marcada}
          />
          <Leyenda paso={paso} />
        </section>

        <aside className="tarjeta explicacion" aria-live="polite">
          <div className="explicacion-cabecera">
            <span className={`etiqueta etiqueta-${paso.tipo}`}>{ETIQUETA_TIPO[paso.tipo]}</span>
            <span className="contador">
              Paso {idx + 1} de {pasos.length}
            </span>
          </div>
          <div className="explicacion-cuerpo" key={idx}>
            <h2>{paso.titulo}</h2>
            <TextoConGlosario texto={paso.explicacion} />
            {paso.ciclo && <Formula problema={problema} paso={paso} />}
          </div>
          {pregunta && <p className="pregunta">{pregunta}</p>}
          {feedback && <p className={feedback.ok ? 'feedback ok' : 'feedback error'}>{feedback.texto}</p>}
          {practica && puntaje.intentos > 0 && (
            <p className="puntaje">
              Aciertos: {puntaje.aciertos} de {puntaje.intentos}
            </p>
          )}
          <div className="costo-grande">
            Costo actual <strong>{fmt(paso.costoTotal)}</strong>
          </div>
        </aside>
      </div>

      <section className="tarjeta controles" aria-label="Controles de reproducción">
        <div className="controles-botones">
          <button className="boton-icono" onClick={() => ir(0)} disabled={idx === 0} aria-label="Primer paso">
            <Icono d="M17 6l-6 6 6 6M7 6v12" />
          </button>
          <button className="boton-icono" onClick={() => ir(idx - 1)} disabled={idx === 0} aria-label="Paso anterior">
            <Icono d="M15 6l-6 6 6 6" />
          </button>
          {pregunta ? (
            <button className="primario" onClick={() => ir(idx + 1)}>
              Mostrar respuesta
            </button>
          ) : (
            <button className="primario" onClick={() => ir(idx + 1)} disabled={idx === ultimo}>
              Siguiente
              <Icono d="M9 6l6 6-6 6" />
            </button>
          )}
          <button className="boton-icono" onClick={() => ir(ultimo)} disabled={idx === ultimo} aria-label="Último paso">
            <Icono d="M7 6l6 6-6 6M17 6v12" />
          </button>
          <button onClick={() => setReproduciendo(!avanzando)} disabled={idx === ultimo}>
            {avanzando ? (
              <Icono d="M8 5v14M16 5v14" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4l13 8-13 8z" />
              </svg>
            )}
            {avanzando ? 'Pausar' : 'Reproducir'}
          </button>
          <select value={ms} onChange={(e) => setMs(Number(e.target.value))} aria-label="Velocidad">
            {VELOCIDADES.map((v) => (
              <option key={v.ms} value={v.ms}>
                {v.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="linea-tiempo">
          <div className="segmentos" style={{ gap: pasos.length > 40 ? 1 : 3 }}>
            {pasos.map((p, k) => (
              <button
                key={k}
                className={`segmento ${faseDe(k).tipo} ${k < idx ? 'hecho' : k === idx ? 'actual' : ''}`}
                onClick={() => ir(k)}
                aria-label={`Ir al paso ${k + 1}: ${p.titulo}`}
                title={`${k + 1}. ${p.titulo}`}
              />
            ))}
          </div>
          <div className="fases-etiquetas">
            {fases.map((f) => (
              <span key={f.desde}>{f.etiqueta}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Costo marginal del camino cerrado con sus signos y, al entrar una celda, el cálculo de θ. */
function Formula({ problema: p, paso }: { problema: Problema; paso: Paso }) {
  const ciclo = paso.ciclo!;
  const marginal = ciclo.reduce((t, c, k) => t + (k % 2 === 0 ? 1 : -1) * p.costos[c.i][c.j], 0);
  const negativas = ciclo.filter((_, k) => k % 2 === 1).map((c) => paso.x[c.i][c.j]);
  return (
    <div className="formula">
      <div>
        <span className="eyebrow">Costo marginal de {nombreCelda(p, ciclo[0])}</span>
        <strong>
          {ciclo.map((c, k) => (
            <span key={k} className={k % 2 === 0 ? 't-mas' : 't-menos'}>
              {k % 2 === 0 ? '+' : '−'}
              {fmt(p.costos[c.i][c.j])}{' '}
            </span>
          ))}
          = <span className={marginal < 0 ? 't-menos' : ''}>{fmt(marginal)}</span>
        </strong>
      </div>
      {paso.tipo === 'ciclo' && (
        <div>
          <span className="eyebrow">Cantidad que se mueve</span>
          <strong>
            θ = min({negativas.map(fmt).join(', ')}) = {fmt(Math.min(...negativas))}
          </strong>
        </div>
      )}
    </div>
  );
}
