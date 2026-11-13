import { useEffect, useState } from 'react';
import { diagnosticarAsignacion, diagnosticarEntrada, recordarCriterio, validarTrazo } from '../core/diagnostico';
import type { MetodoInicial } from '../core/metodos';
import type { Celda, Paso, Problema } from '../core/tipos';
import { fmt, fmtCosto, fmtTotal, nombreCelda } from '../core/util';
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
  /** Método de construcción en curso; permite diagnosticar los errores del modo práctica. */
  metodo?: MetodoInicial;
}

const ETIQUETA_TIPO: Record<Paso['tipo'], string> = {
  inicio: 'Inicio',
  balanceo: 'Balanceo',
  conversion: 'Conversión',
  penalizaciones: 'Análisis',
  asignacion: 'Asignación',
  fin: 'Solución inicial',
  degeneracion: 'Degeneración',
  potenciales: 'Valores u y v',
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

interface Aviso {
  ok: boolean;
  texto: string;
}

/** Estado del ejercicio de práctica asociado a un paso; al cambiar de paso se descarta solo. */
interface Ejercicio {
  idx: number;
  fase: 'celda' | 'trazo';
  trazo: Celda[];
  pistas: number;
  fallos: number;
  marcada: Celda | null;
  aviso: Aviso | null;
}

const ejercicioNuevo = (idx: number, aviso: Aviso | null = null): Ejercicio => ({
  idx,
  fase: 'celda',
  trazo: [],
  pistas: 0,
  fallos: 0,
  marcada: null,
  aviso,
});

const MAX_PISTAS = 2;

/** Índice del próximo paso que el estudiante debe predecir (saltando el análisis previo), o null. */
function buscarObjetivo(pasos: Paso[], idx: number): number | null {
  const k = pasos[idx + 1]?.tipo === 'penalizaciones' ? idx + 2 : idx + 1;
  const s = pasos[k];
  return s?.celda && (s.tipo === 'asignacion' || s.tipo === 'ciclo') ? k : null;
}

export function Reproductor({ problema, pasos, fases, practica = false, metodo }: Props) {
  const [idx, setIdx] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [ms, setMs] = useState(VELOCIDADES[1].ms);
  const [ejercicio, setEjercicio] = useState(() => ejercicioNuevo(0));
  const [puntaje, setPuntaje] = useState({ resueltas: 0, sinAyuda: 0 });

  const ultimo = pasos.length - 1;
  const paso = pasos[idx];
  const ej = ejercicio.idx === idx ? ejercicio : ejercicioNuevo(idx);

  const objetivo = practica ? buscarObjetivo(pasos, idx) : null;
  const meta = objetivo === null ? null : pasos[objetivo];
  // Paso con las penalizaciones que justifican la elección (Vogel), si existe.
  const analisis = paso.tipo === 'penalizaciones' ? paso : objetivo === idx + 2 ? pasos[idx + 1] : null;

  const pregunta = !meta
    ? null
    : ej.fase === 'trazo'
      ? `Traza el camino cerrado de ${nombreCelda(problema, meta.celda!)}: haz clic, en orden, en las piedras donde gira.`
      : meta.tipo === 'asignacion'
        ? '¿Qué celda elegirá el método ahora? Haz clic en ella.'
        : '¿Qué celda entrará a la base? Haz clic en ella.';

  const textosPista: string[] = !meta
    ? []
    : ej.fase === 'trazo'
      ? [
          'Parte de la celda que entra y salta solo a celdas básicas, alternando un movimiento horizontal y uno vertical, hasta poder volver al inicio.',
          `El camino tiene ${meta.ciclo!.length} celdas, contando la inicial.`,
        ]
      : meta.tipo === 'ciclo'
        ? [
            meta.u
              ? 'Calcula costo − u − v en cada celda vacía con los valores que muestra la tabla. Entra la de resultado más negativo.'
              : 'Calcula el costo marginal de cada celda vacía recorriendo su camino cerrado. Entra la de marginal más negativo.',
            'Ahora la tabla muestra el costo marginal de cada celda vacía.',
          ]
        : [
            metodo ? recordarCriterio(metodo, !analisis) : 'Aplica el criterio del método a las celdas sin tachar.',
            analisis
              ? 'Ahora la tabla muestra el valor de cada fila y columna.'
              : `La celda está en la fila ${problema.origenes[meta.celda!.i]}.`,
          ];

  // Lo que muestra la tabla: el paso actual más las ayudas del ejercicio.
  let visible = paso;
  if (meta && ej.fase === 'trazo') {
    visible = { ...paso, celda: meta.celda, ciclo: ej.trazo, marginales: meta.marginales };
  } else if (meta && ej.pistas >= 2) {
    if (meta.tipo === 'ciclo') visible = { ...paso, marginales: meta.marginales };
    else if (analisis) visible = { ...paso, penalFila: analisis.penalFila, penalColumna: analisis.penalColumna };
  }

  /** Navegación manual: además de moverse, detiene la reproducción automática. */
  const ir = (k: number, aviso: Aviso | null = null) => {
    const destino = Math.max(0, Math.min(ultimo, k));
    setIdx(destino);
    setEjercicio(ejercicioNuevo(destino, aviso));
    setReproduciendo(false);
  };

  // La reproducción se pausa sola al final o cuando el modo práctica espera una respuesta.
  const avanzando = reproduciendo && idx < ultimo && meta === null;

  useEffect(() => {
    if (!avanzando) return;
    const t = setTimeout(() => setIdx((k) => Math.min(ultimo, k + 1)), ms);
    return () => clearTimeout(t);
  }, [avanzando, idx, ultimo, ms]);

  const hayPregunta = meta !== null;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      // Con una pregunta pendiente, avanzar con el teclado sería saltársela.
      if (e.key === 'ArrowRight' && !hayPregunta) setIdx((k) => Math.min(ultimo, k + 1));
      if (e.key === 'ArrowLeft') setIdx((k) => Math.max(0, k - 1));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ultimo, hayPregunta]);

  const contarResuelta = (sinAyuda: boolean) =>
    setPuntaje((s) => ({ resueltas: s.resueltas + 1, sinAyuda: s.sinAyuda + (sinAyuda ? 1 : 0) }));

  const fallar = (c: Celda, texto: string) =>
    setEjercicio({ ...ej, fallos: ej.fallos + 1, marcada: c, aviso: { ok: false, texto } });

  const alClic = (c: Celda) => {
    if (!meta || objetivo === null) return;
    const limpio = ej.fallos === 0 && ej.pistas === 0;

    if (ej.fase === 'trazo') {
      const r = validarTrazo(paso.basica, meta.ciclo!, ej.trazo, c);
      if (!r.ok) return fallar(c, r.motivo);
      if (!r.completo) return setEjercicio({ ...ej, trazo: [...ej.trazo, c], marcada: null, aviso: null });
      contarResuelta(limpio);
      return ir(objetivo, {
        ok: true,
        texto: '¡Camino cerrado correcto! Fíjate en los signos: + donde se suma θ y − donde se resta.',
      });
    }

    const correcta = meta.celda!;
    if (c.i === correcta.i && c.j === correcta.j) {
      contarResuelta(limpio);
      if (meta.tipo === 'ciclo') {
        return setEjercicio({
          ...ejercicioNuevo(idx, { ok: true, texto: '¡Correcto! Esa es la celda que entra a la base.' }),
          fase: 'trazo',
          trazo: [c],
        });
      }
      return ir(objetivo, { ok: true, texto: '¡Correcto!' });
    }

    fallar(
      c,
      meta.tipo === 'ciclo'
        ? diagnosticarEntrada(problema, paso, meta.marginales!, correcta, c)
        : metodo
          ? diagnosticarAsignacion(problema, paso, analisis, correcta, c, metodo)
          : 'No es esa celda. Revisa el criterio del método.',
    );
  };

  const mostrarRespuesta = () => {
    if (objetivo === null) return;
    contarResuelta(false);
    ir(objetivo);
  };

  const faseDe = (k: number) => [...fases].reverse().find((f) => k >= f.desde) ?? fases[0];

  return (
    <div className="reproductor">
      <div className="reproductor-cuerpo">
        <section className="tarjeta tabla-tarjeta" aria-label="Tabla de transporte">
          <TablaTransporte
            problema={problema}
            paso={visible}
            onCeldaClick={meta ? alClic : undefined}
            marcada={ej.marcada}
          />
          <Leyenda paso={visible} problema={problema} />
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
          {ej.aviso && <p className={ej.aviso.ok ? 'feedback ok' : 'feedback error'}>{ej.aviso.texto}</p>}
          {pregunta && (
            <div className="ejercicio">
              <p className="pregunta">{pregunta}</p>
              {textosPista.slice(0, ej.pistas).map((t, k) => (
                <p key={k} className="pista">
                  <strong>Pista {k + 1}.</strong> {t}
                </p>
              ))}
              {ej.pistas < MAX_PISTAS && (
                <button onClick={() => setEjercicio({ ...ej, pistas: ej.pistas + 1 })}>
                  Pedir pista ({ej.pistas + 1} de {MAX_PISTAS})
                </button>
              )}
            </div>
          )}
          {practica && puntaje.resueltas > 0 && (
            <p className="puntaje">
              Resueltas sin ayuda: {puntaje.sinAyuda} de {puntaje.resueltas}
            </p>
          )}
          <div className="costo-grande">
            {problema.utilidades ? 'Utilidad actual' : 'Costo actual'} <strong>{fmtTotal(problema, paso.x)}</strong>
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
            <button className="primario" onClick={mostrarRespuesta}>
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
              {fmtCosto(p, p.costos[c.i][c.j])}{' '}
            </span>
          ))}
          = <span className={marginal < 0 ? 't-menos' : ''}>{fmtCosto(p, marginal)}</span>
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
