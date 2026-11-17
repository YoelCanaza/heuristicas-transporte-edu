import { useEffect, useMemo, useState } from 'react';
import { REFLEXION } from '../contenido/reflexion';
import { celdasAlternativas, mismaSolucion, pasarAOptimoAlternativo } from '../core/alternativos';
import {
  diagnosticarAsignacion,
  diagnosticarCantidad,
  diagnosticarEntrada,
  diagnosticarPenalizacion,
  diagnosticarSalida,
  diagnosticarTachado,
  diagnosticarTheta,
  ejemploPenalizacion,
  empataSalida,
  recordarCriterio,
  restantes,
  validarTrazo,
} from '../core/diagnostico';
import type { Tachado } from '../core/diagnostico';
import type { MetodoInicial } from '../core/metodos';
import { analizarMiopia, describirPrecio, describirRutaCara } from '../core/miopia';
import type { Celda, Linea, Paso, Problema } from '../core/tipos';
import { fmt, fmtCosto, fmtTotal, nombreCelda, total } from '../core/util';
import type { PenalEditable } from './TablaTransporte';
import { TextoConGlosario } from './Glosa';
import { Leyenda, TablaTransporte } from './TablaTransporte';
import { VistaRed } from './VistaRed';
import { useValorAnimado } from './movimiento';

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
  /** En modo práctica, preguntar también la cantidad, la línea que se tacha, θ y la celda que sale. */
  completa?: boolean;
  /** Dibujar, bajo la tabla, el mismo estado como red de orígenes y destinos. */
  red?: boolean;
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

const TEXTO_MIOPIA: Record<MetodoInicial | 'propia', { titulo: string; intro: string }> = {
  costoMinimo: {
    titulo: 'El precio de la miopía',
    intro:
      'Costo Mínimo toma en cada paso la ruta más barata que queda, sin mirar adelante. Al principio ahorra; al final puede quedar obligado a usar rutas caras.',
  },
  noroeste: {
    titulo: 'El precio de no mirar los costos',
    intro:
      'Esquina Noroeste recorre la tabla en orden sin mirar los costos: algunas asignaciones caen en rutas caras mientras otras más baratas quedan cerradas.',
  },
  vogel: {
    titulo: 'Lo que Vogel no pudo evitar',
    intro:
      'Vogel atiende primero las filas y columnas donde equivocarse cuesta más, pero tampoco mira todo el problema a la vez: algunas decisiones siguen cerrando rutas baratas.',
  },
  propia: {
    titulo: 'El precio de las decisiones tempranas',
    intro:
      'Cada asignación agota una fila o una columna y cierra sus rutas. Una decisión barata al principio puede obligar a usar rutas caras después.',
  },
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

/**
 * Preguntas de un mismo paso, en orden. En una asignación: (penal →) celda → cantidad → tachar;
 * 'penal' solo existe en Vogel, cuando hay penalizaciones que calcular.
 * Al entrar una celda a la base: celda → trazo → theta → salida.
 */
type FaseEjercicio = 'penal' | 'celda' | 'cantidad' | 'tachar' | 'trazo' | 'theta' | 'salida';

/** Estado del ejercicio de práctica asociado a un paso; al cambiar de paso se descarta solo. */
interface Ejercicio {
  idx: number;
  fase: FaseEjercicio;
  trazo: Celda[];
  /** Texto escrito en la casilla de respuesta (cantidad o θ). */
  texto: string;
  /** Penalizaciones escritas a mano, por línea ("fila-0", "columna-2"). */
  penal: Record<string, { texto: string; estado: '' | 'ok' | 'mal' }>;
  /** true cuando el estudiante ya calculó las penalizaciones de este paso. */
  penalHechas: boolean;
  pistas: number;
  fallos: number;
  marcada: Celda | null;
  aviso: Aviso | null;
}

const ejercicioNuevo = (idx: number, aviso: Aviso | null = null): Ejercicio => ({
  idx,
  fase: 'celda',
  trazo: [],
  texto: '',
  penal: {},
  penalHechas: false,
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

export function Reproductor({
  problema,
  pasos,
  fases,
  practica = false,
  completa = false,
  red = false,
  metodo,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [ms, setMs] = useState(VELOCIDADES[1].ms);
  const [ejercicio, setEjercicio] = useState(() => ejercicioNuevo(0));
  const [puntaje, setPuntaje] = useState({ resueltas: 0, sinAyuda: 0 });
  // Óptimos alternativos visitados desde el paso óptimo `idx`; se descartan al cambiar de paso.
  const [exploracion, setExploracion] = useState<{ idx: number; pasos: Paso[]; aviso: string | null }>({
    idx: -1,
    pasos: [],
    aviso: null,
  });

  const ultimo = pasos.length - 1;
  const explorados = exploracion.idx === idx ? exploracion.pasos : [];
  const paso = explorados[explorados.length - 1] ?? pasos[idx];
  const alternativas = celdasAlternativas(problema, paso);
  // Soluciones distintas vistas (sin contar los cambios de base con θ = 0).
  const distintas = [pasos[idx], ...explorados].filter(
    (s, k, todas) => todas.findIndex((t) => mismaSolucion(t.x, s.x)) === k,
  ).length;
  const ej = ejercicio.idx === idx ? ejercicio : ejercicioNuevo(idx);

  const objetivo = practica ? buscarObjetivo(pasos, idx) : null;
  const meta = objetivo === null ? null : pasos[objetivo];
  // Paso con las penalizaciones que justifican la elección (Vogel), si existe.
  const analisis = paso.tipo === 'penalizaciones' ? paso : objetivo === idx + 2 ? pasos[idx + 1] : null;

  // Líneas cuya penalización escribe el estudiante: las que no están tachadas ni contienen el costo M.
  const lineasPenal: Linea[] =
    completa && meta?.tipo === 'asignacion' && analisis && analisis !== paso
      ? [
          ...analisis.penalFila!.map((v, k) => ({ tipo: 'fila' as const, k, v })),
          ...analisis.penalColumna!.map((v, k) => ({ tipo: 'columna' as const, k, v })),
        ].filter((l) => l.v != null && fmtCosto(problema, l.v) === fmt(l.v))
      : [];
  const fase: FaseEjercicio = ej.fase === 'celda' && lineasPenal.length > 0 && !ej.penalHechas ? 'penal' : ej.fase;
  const clave = (l: Linea) => `${l.tipo}-${l.k}`;

  const nombreMeta = meta ? nombreCelda(problema, meta.celda!) : '';
  const resto = meta ? restantes(problema, paso, meta.celda!) : null;
  const origenMeta = meta ? problema.origenes[meta.celda!.i] : '';
  const destinoMeta = meta ? problema.destinos[meta.celda!.j] : '';

  const PREGUNTAS: Record<FaseEjercicio, string> = {
    celda:
      meta?.tipo === 'ciclo'
        ? '¿Qué celda entrará a la base? Haz clic en ella.'
        : '¿Qué celda elegirá el método ahora? Haz clic en ella.',
    penal: 'Calcula la penalización de cada fila y columna sin tachar y escríbela en su casilla.',
    cantidad: `¿Cuántas unidades se asignan a ${nombreMeta}?`,
    tachar: `Después de asignar en ${nombreMeta}, ¿qué se tacha?`,
    trazo: `Traza el camino cerrado de ${nombreMeta}: haz clic, en orden, en las piedras donde gira.`,
    theta: '¿Cuánto vale θ, la cantidad que se moverá por el camino?',
    salida: '¿Qué celda saldrá de la base? Haz clic en ella.',
  };
  const pregunta = meta ? PREGUNTAS[fase] : null;

  const pistasDe = (): string[] => {
    if (!meta || !resto) return [];
    const q = Math.min(resto.oferta, resto.demanda);
    switch (fase) {
      case 'penal':
        return [
          'La penalización de una línea es la diferencia entre sus dos menores costos, contando solo las celdas sin tachar.',
          `Un ejemplo: ${ejemploPenalizacion(problema, paso, lineasPenal[0])}`,
        ];
      case 'cantidad':
        return [
          'No se puede enviar más de lo que le queda al origen ni más de lo que le falta al destino. Se envía lo máximo posible.',
          `A ${origenMeta} le quedan ${fmt(resto.oferta)} y a ${destinoMeta} le faltan ${fmt(resto.demanda)}.`,
        ];
      case 'tachar':
        return [
          'Se tacha la línea que quedó en 0 después de asignar. Si las dos quedan en 0 a la vez, solo se tacha una: la fila, salvo que sea la última.',
          `Después de asignar, a ${origenMeta} le quedan ${fmt(resto.oferta - q)} y a ${destinoMeta} le faltan ${fmt(resto.demanda - q)}.`,
        ];
      case 'trazo':
        return [
          'Parte de la celda que entra y salta solo a celdas básicas, alternando un movimiento horizontal y uno vertical, hasta poder volver al inicio.',
          `El camino tiene ${meta.ciclo!.length} celdas, contando la inicial.`,
        ];
      case 'theta':
        return [
          'θ es lo máximo que se puede restar en todas las celdas con signo − sin que ninguna quede negativa.',
          `Las celdas con signo − tienen: ${meta
            .ciclo!.filter((_, k) => k % 2 === 1)
            .map((c) => fmt(paso.x[c.i][c.j]))
            .join(', ')}.`,
        ];
      case 'salida':
        return [
          `Resta θ = ${fmt(meta.theta!)} en cada celda con signo −. Sale la que queda en 0.`,
          `La celda que sale está en la fila ${problema.origenes[meta.sale!.i]}.`,
        ];
      case 'celda':
        return meta.tipo === 'ciclo'
          ? [
              meta.u
                ? 'Calcula costo − u − v en cada celda vacía con los valores que muestra la tabla. Entra la de resultado más negativo.'
                : 'Calcula el costo marginal de cada celda vacía recorriendo su camino cerrado. Entra la de marginal más negativo.',
              'Ahora la tabla muestra el costo marginal de cada celda vacía.',
            ]
          : [
              metodo ? recordarCriterio(metodo, !analisis) : 'Aplica el criterio del método a las celdas sin tachar.',
              analisis && ej.penalHechas
                ? 'Busca la mayor penalización entre las que calculaste; si hay empate, la línea que contiene el menor costo.'
                : analisis
                  ? 'Ahora la tabla muestra el valor de cada fila y columna.'
                  : `La celda está en la fila ${origenMeta}.`,
            ];
    }
  };
  const textosPista = pistasDe();

  // Lo que muestra la tabla: el paso actual más las ayudas del ejercicio.
  let visible = paso;
  if (meta && fase === 'trazo') {
    visible = { ...paso, celda: meta.celda, ciclo: ej.trazo, marginales: meta.marginales };
  } else if (meta && (fase === 'theta' || fase === 'salida')) {
    visible = { ...paso, celda: meta.celda, ciclo: meta.ciclo, marginales: meta.marginales };
  } else if (meta && (fase === 'cantidad' || fase === 'tachar')) {
    // La celda ya se acertó: se muestra el análisis que la justifica y, al tachar, la cantidad ya asignada.
    visible = {
      ...(fase === 'tachar' ? { ...paso, x: meta.x, basica: meta.basica } : paso),
      celda: meta.celda,
      penalFila: analisis?.penalFila,
      penalColumna: analisis?.penalColumna,
      lineaElegida: analisis?.lineaElegida,
    };
  } else if (meta && analisis && (fase === 'penal' || ej.penalHechas)) {
    visible = { ...paso, penalFila: analisis.penalFila, penalColumna: analisis.penalColumna };
  } else if (meta && ej.pistas >= 2) {
    if (meta.tipo === 'ciclo') visible = { ...paso, marginales: meta.marginales };
    else if (analisis) visible = { ...paso, penalFila: analisis.penalFila, penalColumna: analisis.penalColumna };
  }
  const conClic = meta !== null && (fase === 'celda' || fase === 'trazo' || fase === 'salida');
  const explorable = !conClic && (alternativas.length > 0 || explorados.length > 0);

  const alExplorar = (c: Celda) => {
    if (!alternativas.some((a) => a.i === c.i && a.j === c.j)) {
      const basica = paso.basica[c.i][c.j];
      setExploracion({
        idx,
        pasos: explorados,
        aviso: basica
          ? `${nombreCelda(problema, c)} ya está en la base. Elige una de las celdas marcadas.`
          : `${nombreCelda(problema, c)} tiene costo marginal ${fmtCosto(problema, paso.marginales?.[c.i][c.j] ?? 0)}: hacerla entrar ${problema.utilidades ? 'bajaría la utilidad' : 'subiría el costo'}. Elige una celda con marginal 0.`,
      });
      return;
    }
    setExploracion({ idx, pasos: [...explorados, pasarAOptimoAlternativo(problema, paso, c)], aviso: null });
  };
  const avisoExploracion = exploracion.idx === idx ? exploracion.aviso : null;

  // Al terminar la construcción: qué rutas caras se usaron por decisiones anteriores y cuánto costó.
  const enFin = paso.tipo === 'fin';
  const miopia = useMemo(
    () => (enFin ? analizarMiopia(problema, pasos.slice(0, idx + 1)) : null),
    [enFin, problema, pasos, idx],
  );
  const rutasMostradas = miopia?.rutas.slice(0, 3) ?? [];
  const textoMiopia = TEXTO_MIOPIA[metodo ?? 'propia'];

  // Preguntas de reflexión: al terminar la construcción, las del método; al terminar la optimización, las de MODI o de Piedras.
  const preguntasReflexion =
    pregunta !== null
      ? null
      : enFin && metodo
        ? REFLEXION[metodo]
        : (paso.tipo === 'optimo' || paso.tipo === 'limite') && idx === ultimo
          ? REFLEXION[pasos[idx].u ? 'modi' : 'piedras']
          : null;

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

  const fallar = (texto: string, c: Celda | null = null) =>
    setEjercicio({ ...ej, fallos: ej.fallos + 1, marcada: c, aviso: { ok: false, texto } });

  /** Pasa a la siguiente pregunta del mismo paso, con pistas y fallos en cero. */
  const pasarA = (fase: FaseEjercicio, texto: string, trazo: Celda[] = []) =>
    setEjercicio({ ...ejercicioNuevo(idx, { ok: true, texto }), fase, trazo, penalHechas: ej.penalHechas });

  const alClic = (c: Celda) => {
    if (!meta || objetivo === null) return;
    const limpio = ej.fallos === 0 && ej.pistas === 0;

    if (fase === 'trazo') {
      const r = validarTrazo(paso.basica, meta.ciclo!, ej.trazo, c);
      if (!r.ok) return fallar(r.motivo, c);
      if (!r.completo) return setEjercicio({ ...ej, trazo: [...ej.trazo, c], marcada: null, aviso: null });
      contarResuelta(limpio);
      const texto = '¡Camino cerrado correcto! Fíjate en los signos: + donde se suma θ y − donde se resta.';
      return completa ? pasarA('theta', texto) : ir(objetivo, { ok: true, texto });
    }

    if (fase === 'salida') {
      if (empataSalida(meta, c)) {
        // Empate en θ: su respuesta es válida, aunque la traza saque otra de las empatadas.
        contarResuelta(limpio);
        return ir(objetivo, {
          ok: true,
          texto:
            `¡Correcto! ${nombreCelda(problema, c)} queda en 0. También queda en 0 ${nombreCelda(problema, meta.sale!)}: ` +
            `cualquiera de las dos puede salir, pero solo una. Aquí sale ${nombreCelda(problema, meta.sale!)} y la otra sigue en la base con ε.`,
        });
      }
      const error = diagnosticarSalida(problema, meta, c);
      if (error) return fallar(error, c);
      contarResuelta(limpio);
      return ir(objetivo, { ok: true, texto: `¡Correcto! ${nombreCelda(problema, c)} queda en 0 y sale de la base.` });
    }

    const correcta = meta.celda!;
    if (c.i === correcta.i && c.j === correcta.j) {
      contarResuelta(limpio);
      if (meta.tipo === 'ciclo') return pasarA('trazo', '¡Correcto! Esa es la celda que entra a la base.', [c]);
      return completa
        ? pasarA('cantidad', '¡Correcto! Esa es la celda que elige el método.')
        : ir(objetivo, { ok: true, texto: '¡Correcto!' });
    }

    fallar(
      meta.tipo === 'ciclo'
        ? diagnosticarEntrada(problema, paso, meta.marginales!, correcta, c)
        : metodo
          ? diagnosticarAsignacion(problema, paso, analisis, correcta, c, metodo)
          : 'No es esa celda. Revisa el criterio del método.',
      c,
    );
  };

  /** Respuesta escrita: la cantidad a asignar o el valor de θ. */
  const alResponderNumero = () => {
    if (!meta || ej.texto.trim() === '') return;
    const valor = Number(ej.texto.trim().replace(',', '.'));
    const limpio = ej.fallos === 0 && ej.pistas === 0;
    const error =
      fase === 'cantidad'
        ? diagnosticarCantidad(problema, paso, meta.celda!, valor)
        : diagnosticarTheta(problema, meta, valor);
    if (error) return fallar(error);
    contarResuelta(limpio);
    if (fase === 'cantidad') return pasarA('tachar', `¡Correcto! Se asignan ${fmt(valor)} unidades.`);
    pasarA('salida', `¡Correcto! θ = ${fmt(valor)}.`);
  };

  const penalEditable: PenalEditable | undefined =
    fase !== 'penal'
      ? undefined
      : {
          casilla: (l) =>
            lineasPenal.some((x) => clave(x) === clave(l)) ? (ej.penal[clave(l)] ?? { texto: '', estado: '' }) : null,
          onCambio: (l, texto) =>
            setEjercicio({ ...ej, penal: { ...ej.penal, [clave(l)]: { texto, estado: '' } }, marcada: null }),
          onRevisar: (l) => {
            const actual = ej.penal[clave(l)];
            // Solo se revisa lo recién escrito: salir de una casilla ya revisada no cuenta otro error.
            if (!actual || actual.estado !== '' || actual.texto.trim() === '') return;
            const error = diagnosticarPenalizacion(problema, paso, l, Number(actual.texto.trim().replace(',', '.')));
            const penal = {
              ...ej.penal,
              [clave(l)]: { ...actual, estado: error ? ('mal' as const) : ('ok' as const) },
            };
            if (error) {
              return setEjercicio({ ...ej, penal, fallos: ej.fallos + 1, aviso: { ok: false, texto: error } });
            }
            if (!lineasPenal.every((x) => penal[clave(x)]?.estado === 'ok')) {
              return setEjercicio({ ...ej, penal, aviso: null });
            }
            contarResuelta(ej.fallos === 0 && ej.pistas === 0);
            setEjercicio({
              ...ejercicioNuevo(idx, { ok: true, texto: '¡Correcto! Esas son las penalizaciones. Ahora úsalas.' }),
              penalHechas: true,
            });
          },
        };

  const alTachar = (respuesta: Tachado) => {
    if (!meta || objetivo === null) return;
    const error = diagnosticarTachado(problema, paso, meta, respuesta);
    if (error) return fallar(error);
    contarResuelta(ej.fallos === 0 && ej.pistas === 0);
    ir(objetivo, { ok: true, texto: '¡Correcto! Así queda la tabla después de la asignación.' });
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
            onCeldaClick={conClic ? alClic : explorable ? alExplorar : undefined}
            marcada={ej.marcada}
            penalEditable={penalEditable}
            resaltadas={explorable ? alternativas : enFin ? rutasMostradas.map((r) => r.celda) : undefined}
          />
          {red && <VistaRed problema={problema} paso={visible} pulso={idx} />}
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
          {explorable && (
            <div className="explorador">
              <p className="pregunta">Óptimos alternativos</p>
              <p>
                {alternativas.length > 0
                  ? `Las celdas marcadas tienen costo marginal 0: pueden entrar a la base sin cambiar ${problema.utilidades ? 'la utilidad' : 'el costo'}. Haz clic en una para ver otra solución óptima.`
                  : 'En esta base ninguna celda tiene marginal 0.'}
              </p>
              {avisoExploracion && <p className="feedback error">{avisoExploracion}</p>}
              {explorados.length > 0 && (
                <>
                  <p className="ayuda">
                    Soluciones óptimas distintas vistas: {distintas}. Cambios de base: {explorados.length}.
                  </p>
                  <div className="respuesta">
                    <button onClick={() => setExploracion({ idx, pasos: explorados.slice(0, -1), aviso: null })}>
                      Deshacer
                    </button>
                    <button onClick={() => setExploracion({ idx, pasos: [], aviso: null })}>
                      Volver a la solución del método
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {miopia && !pregunta && (
            <div className="explorador">
              <p className="pregunta">{textoMiopia.titulo}</p>
              <p>{textoMiopia.intro}</p>
              <p>{describirPrecio(problema, miopia, paso.x)}</p>
              {rutasMostradas.length > 0 ? (
                <>
                  <p className="ayuda">
                    {rutasMostradas.length === 1
                      ? 'La celda marcada en la tabla usó una ruta cara porque una decisión anterior cerró otra más barata:'
                      : `Las ${rutasMostradas.length} celdas marcadas en la tabla usaron rutas caras porque decisiones anteriores cerraron otras más baratas${miopia.rutas.length > rutasMostradas.length ? ` (se muestran las ${rutasMostradas.length} que más pesan de ${miopia.rutas.length})` : ''}:`}
                  </p>
                  <ol className="lista-miopia">
                    {rutasMostradas.map((r) => (
                      <li key={r.paso}>
                        {describirRutaCara(problema, r)}{' '}
                        <button className="enlace" onClick={() => ir(r.cierre)}>
                          Ver el paso {r.cierre + 1}
                        </button>
                      </li>
                    ))}
                  </ol>
                  <p className="ayuda">
                    El costo de más por unidad es una pista, no el precio exacto: corregir una ruta cambia otras. El
                    precio real es la distancia al óptimo.
                  </p>
                </>
              ) : (
                <p className="ayuda">
                  Ninguna asignación tuvo que usar una ruta más cara de su fila o columna por una decisión anterior.
                </p>
              )}
            </div>
          )}
          {pregunta && (
            <div className="ejercicio">
              <p className="pregunta">{pregunta}</p>
              {(fase === 'cantidad' || fase === 'theta') && (
                <form
                  className="respuesta"
                  onSubmit={(e) => {
                    e.preventDefault();
                    alResponderNumero();
                  }}
                >
                  <input
                    key={fase}
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={ej.texto}
                    onChange={(e) => setEjercicio({ ...ej, texto: e.target.value })}
                    aria-label={fase === 'cantidad' ? 'Cantidad que se asigna' : 'Valor de θ'}
                  />
                  <button className="primario" disabled={ej.texto.trim() === ''}>
                    Comprobar
                  </button>
                </form>
              )}
              {fase === 'tachar' && (
                <div className="respuesta">
                  <button onClick={() => alTachar('fila')}>Fila {origenMeta}</button>
                  <button onClick={() => alTachar('columna')}>Columna {destinoMeta}</button>
                  <button onClick={() => alTachar('ambas')}>Las dos</button>
                </div>
              )}
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
            {problema.utilidades ? 'Utilidad actual' : 'Costo actual'} <TotalAnimado problema={problema} x={paso.x} />
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

      {preguntasReflexion && (
        <section className="tarjeta reflexion" aria-label="Preguntas para pensar">
          <h2 className="titulo-seccion">Para pensar</h2>
          <p className="ayuda">Intenta responder antes de abrir cada respuesta.</p>
          {preguntasReflexion.map((q) => (
            <details key={q.pregunta} className="teoria">
              <summary>{q.pregunta}</summary>
              <p>{q.respuesta}</p>
            </details>
          ))}
        </section>
      )}
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

/**
 * Total de la solución, que cuenta hasta su nuevo valor al cambiar de paso. Los lectores de
 * pantalla reciben solo el valor final, no los intermedios.
 */
function TotalAnimado({ problema, x }: { problema: Problema; x: number[][] }) {
  const texto = fmtTotal(problema, x);
  const valor = total(problema, x);
  const animado = useValorAnimado(valor);
  // Con rutas prohibidas en uso el total se escribe con la letra M y no se puede contar.
  const numerico = texto === fmt(valor);
  const entero = Number.isInteger(valor);
  return (
    <strong>
      <span aria-hidden="true">{numerico ? fmt(entero ? Math.round(animado) : animado) : texto}</span>
      <span className="solo-lector">{texto}</span>
    </strong>
  );
}
