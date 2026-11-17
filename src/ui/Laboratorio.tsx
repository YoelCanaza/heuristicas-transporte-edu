import { useEffect, useMemo, useRef, useState } from 'react';
import {
  agregarEntrada,
  brechaPropia,
  crearEntrada,
  describirProblemas,
  esBitacora,
  informeMarkdown,
} from '../core/bitacora';
import type { EntradaBitacora } from '../core/bitacora';
import { optimizar } from '../core/caminoPiedras';
import { crearExperimento } from '../core/comparacion';
import type { ResultadoComparacion } from '../core/comparacion';
import { ETIQUETA_FAMILIA, ETIQUETA_TAMANO } from '../core/ejemplos';
import type { Familia, Tamano } from '../core/ejemplos';
import {
  CONFIG_INICIAL,
  ETIQUETA_CELDA,
  ETIQUETA_DESEMPATE,
  ETIQUETA_LINEA,
  ETIQUETA_MODO,
  ETIQUETA_PESO,
  PESOS_INICIALES,
  PRESETS,
  describir,
  equivalencia,
  selectorPersonalizado,
} from '../core/heuristica';
import type {
  ConfigHeuristica,
  CriterioCelda,
  CriterioLinea,
  Desempate,
  ModoSeleccion,
  Pesos,
} from '../core/heuristica';
import { NOMBRE_METODO, SELECTOR, resolverInicial } from '../core/metodos';
import type { MetodoInicial } from '../core/metodos';
import type { Problema } from '../core/tipos';
import { fmt } from '../core/util';
import { Reproductor } from './Reproductor';
import type { Fase } from './Reproductor';
import { ResultadosExperimento } from './ResultadosExperimento';

const CLAVE_GUARDADO = 'heuristrans.heuristica';
const CLAVE_BITACORA = 'heuristrans.bitacora';
const MAX_PROBLEMAS = 1000;
/** Milisegundos de cálculo entre dos repintados de la barra de progreso. */
const TROZO_MS = 30;

function cargarConfig(): ConfigHeuristica {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) ?? 'null') as Partial<ConfigHeuristica> | null;
    if (guardada && typeof guardada === 'object')
      return { ...CONFIG_INICIAL, ...guardada, pesos: { ...PESOS_INICIALES, ...guardada.pesos } };
  } catch {
    // almacenamiento no disponible o dato dañado: se usa la configuración inicial
  }
  return CONFIG_INICIAL;
}

function cargarBitacora(): EntradaBitacora[] {
  try {
    const guardada: unknown = JSON.parse(localStorage.getItem(CLAVE_BITACORA) ?? 'null');
    if (esBitacora(guardada)) return guardada;
  } catch {
    // sin almacenamiento la bitácora empieza vacía
  }
  return [];
}

function descargar(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/markdown;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

function Opciones<T extends string>({
  etiquetas,
  valor,
  onChange,
}: {
  etiquetas: Record<T, string>;
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value as T)}>
      {(Object.keys(etiquetas) as T[]).map((k) => (
        <option key={k} value={k}>
          {etiquetas[k]}
        </option>
      ))}
    </select>
  );
}

const ETAPAS = [
  { titulo: 'Reflexiona', ayuda: 'Qué mira cada método' },
  { titulo: 'Diseña', ayuda: 'Arma tu regla' },
  { titulo: 'Prueba', ayuda: 'Síguela paso a paso' },
  { titulo: 'Experimenta', ayuda: 'Cientos de problemas' },
  { titulo: 'Bitácora', ayuda: 'Anota y compara' },
];

/** Qué información consulta cada método clásico: costos, costo de oportunidad y cantidades. */
const QUE_MIRA: { metodo: string; celdas: { si: boolean; nota?: string }[] }[] = [
  { metodo: 'Esquina Noroeste', celdas: [{ si: false }, { si: false }, { si: false, nota: 'Solo para asignar' }] },
  {
    metodo: 'Costo Mínimo',
    celdas: [
      { si: true, nota: 'El menor de toda la tabla' },
      { si: false },
      { si: false, nota: 'Solo para desempatar' },
    ],
  },
  {
    metodo: 'Vogel',
    celdas: [
      { si: true },
      { si: true, nota: 'Diferencia entre los dos menores costos' },
      { si: false, nota: 'Solo para desempatar' },
    ],
  },
];

const PREGUNTAS = [
  {
    pregunta: '¿Por qué el Costo Mínimo puede terminar usando rutas muy caras al final?',
    pista:
      'Pista: cada asignación tacha una fila o una columna. Mira en Aprender qué celdas le quedan disponibles a Costo Mínimo en sus últimos pasos.',
  },
  {
    pregunta:
      '¿Qué otra medida, además de la penalización de Vogel, podría indicar que una fila o columna es «urgente»?',
    pista:
      'Pista: piensa en el rango de sus costos o en cuánta oferta o demanda le falta cubrir. En la etapa 2 puedes probar ambas.',
  },
  {
    pregunta: '¿Conviene más llenar primero las celdas que permiten mover muchas unidades?',
    pista:
      'Pista: una celda grande y cara pesa mucho en el costo total. Compruébalo: da peso solo a «Cantidad grande» y mira la brecha en la etapa 4.',
  },
];

/** La regla del estudiante como una secuencia de decisiones, para leerla de un golpe. */
function receta(c: ConfigHeuristica): { titulo: string; detalle: string }[] {
  const empate = { titulo: 'Si hay empate', detalle: ETIQUETA_DESEMPATE[c.desempate] };
  const asignar = { titulo: 'Asigna', detalle: 'Lo máximo posible, y tacha la línea agotada' };
  if (c.modo === 'puntaje') {
    const activos = (Object.keys(ETIQUETA_PESO) as (keyof Pesos)[]).filter((k) => c.pesos[k] > 0);
    return [
      {
        titulo: 'Puntúa cada celda libre',
        detalle:
          activos.length === 0
            ? 'Todos los pesos están en 0: decide solo el desempate'
            : activos.map((k) => `${ETIQUETA_PESO[k].titulo} × ${c.pesos[k]}`).join(' · '),
      },
      { titulo: 'Elige la celda', detalle: 'La de mejor puntaje' },
      empate,
      asignar,
    ];
  }
  return [
    ...(c.modo === 'linea' ? [{ titulo: 'Elige la fila o columna', detalle: ETIQUETA_LINEA[c.criterioLinea] }] : []),
    {
      titulo: c.modo === 'linea' ? 'Dentro de ella, la celda' : 'Elige la celda',
      detalle: ETIQUETA_CELDA[c.criterioCelda],
    },
    empate,
    asignar,
  ];
}

const TITULO_FAMILIA = Object.fromEntries(
  (Object.keys(ETIQUETA_FAMILIA) as Familia[]).map((k) => [k, ETIQUETA_FAMILIA[k].titulo]),
) as Record<Familia, string>;
const ETIQUETA_TAMANO_LAB: Record<Tamano | 'variado', string> = {
  variado: 'Variados (3–5 orígenes, 3–6 destinos)',
  ...ETIQUETA_TAMANO,
};

export function Laboratorio({ problema }: { problema: Problema }) {
  const [config, setConfig] = useState<ConfigHeuristica>(cargarConfig);
  const [optimizarOn, setOptimizarOn] = useState(false);
  /** Problema del peor caso abierto desde los resultados; reemplaza al problema actual en la etapa 3. */
  const [peorCaso, setPeorCaso] = useState<Problema | null>(null);
  const [instancias, setInstancias] = useState(200);
  const [semilla, setSemilla] = useState(2026);
  const [familia, setFamilia] = useState<Familia>('uniforme');
  const [tamano, setTamano] = useState<Tamano | 'variado'>('variado');
  const [hechas, setHechas] = useState<number | null>(null);
  const [resultado, setResultado] = useState<ResultadoComparacion | null>(null);
  const [hipotesis, setHipotesis] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [anotado, setAnotado] = useState(false);
  const [bitacora, setBitacora] = useState<EntradaBitacora[]>(cargarBitacora);
  const corrida = useRef(0);
  const etapaPrueba = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(config));
    } catch {
      // sin almacenamiento la heurística simplemente no se recuerda
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_BITACORA, JSON.stringify(bitacora));
    } catch {
      // sin almacenamiento la bitácora simplemente no se recuerda
    }
  }, [bitacora]);

  // Al salir de la pantalla se abandona el experimento en curso.
  useEffect(() => {
    const actual = corrida;
    return () => {
      actual.current++;
    };
  }, []);

  /** Descarta el experimento en curso y sus resultados: ya no corresponden a lo que hay en pantalla. */
  const descartarExperimento = () => {
    corrida.current++;
    setHechas(null);
    setResultado(null);
    setAnotado(false);
  };

  const actualizar = (cambio: Partial<ConfigHeuristica>) => {
    setConfig((c) => ({ ...c, ...cambio }));
    descartarExperimento();
  };
  const cambiarPeso = (k: keyof Pesos, valor: number) => actualizar({ pesos: { ...config.pesos, [k]: valor } });

  const equivale = equivalencia(config);
  const nombre = config.nombre.trim() || 'Mi heurística';
  const problemaPrueba = peorCaso ?? problema;
  const total = Math.max(1, Math.min(MAX_PROBLEMAS, Math.round(instancias) || 1));

  const { balanceado, pasos, fases, costoInicial } = useMemo(() => {
    const inicial = resolverInicial(problemaPrueba, selectorPersonalizado(config), nombre);
    const pasos = [...inicial.pasos];
    const fases: Fase[] = [{ desde: 0, etiqueta: `Construcción · ${nombre}`, tipo: 'construccion' }];
    if (optimizarOn) {
      fases.push({ desde: pasos.length, etiqueta: 'Optimización · Camino de las Piedras', tipo: 'optimizacion' });
      pasos.push(...optimizar(inicial.problema, inicial.solucion).pasos);
    }
    return { balanceado: inicial.problema, pasos, fases, costoInicial: inicial.costo };
  }, [problemaPrueba, config, nombre, optimizarOn]);

  const ejecutarComparacion = () => {
    const clasicos = (['noroeste', 'costoMinimo', 'vogel'] as MetodoInicial[]).map((id) => ({
      id,
      nombre: NOMBRE_METODO[id],
      selector: SELECTOR[id],
    }));
    const experimento = crearExperimento(
      [{ id: 'propia', nombre, selector: selectorPersonalizado(config) }, ...clasicos],
      total,
      semilla,
      { familia, tamano: tamano === 'variado' ? null : tamano },
    );
    descartarExperimento();
    const id = corrida.current;
    setHechas(0);
    // Se calcula por trozos para que la pantalla siga respondiendo y se vea el avance.
    const continuar = () => {
      if (corrida.current !== id) return;
      if (experimento.avanzar(TROZO_MS)) {
        setHechas(null);
        setResultado(experimento.resultado());
      } else {
        setHechas(experimento.hechas());
        setTimeout(continuar, 0);
      }
    };
    setTimeout(continuar, 0);
  };

  const abrirPeorCaso = () => {
    if (!resultado?.peorCaso) return;
    setPeorCaso(resultado.peorCaso.problema);
    setOptimizarOn(true);
    etapaPrueba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const anotar = () => {
    if (!resultado) return;
    setBitacora((b) => agregarEntrada(b, crearEntrada(config, resultado, hipotesis, conclusion)));
    setAnotado(true);
    setHipotesis('');
    setConclusion('');
  };

  const enCurso = hechas !== null;
  // Etapas ya recorridas: diseñar cuenta cuando la regla deja de ser un método clásico.
  const etapaAlcanzada = bitacora.length > 0 ? 5 : resultado ? 4 : equivale ? 0 : 2;

  return (
    <section className="vista">
      <header className="vista-cabecera">
        <div>
          <p className="eyebrow">04 — Laboratorio</p>
          <h1>Diseña tu propia heurística</h1>
          <p className="vista-descripcion">
            Trabaja como en una investigación: reflexiona sobre los métodos clásicos, arma tu regla, pruébala, plantea
            una hipótesis y ponla a prueba en cientos de problemas.
          </p>
        </div>
      </header>

      <nav className="riel" aria-label="Etapas del laboratorio">
        {ETAPAS.map((e, k) => (
          <button
            key={e.titulo}
            className={k < etapaAlcanzada ? 'hecha' : ''}
            onClick={() => document.getElementById(`etapa-${k + 1}`)?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span className="riel-numero">{k < etapaAlcanzada ? '✓' : k + 1}</span>
            <span>
              <strong>{e.titulo}</strong>
              <small>{e.ayuda}</small>
            </span>
          </button>
        ))}
      </nav>

      <article className="tarjeta etapa" id="etapa-1">
        <h2>
          <span className="numero">1</span> Reflexiona
        </h2>
        <p>
          Toda heurística constructiva del problema de transporte responde a una sola pregunta:{' '}
          <strong>¿qué celda lleno ahora?</strong> Observa qué información usa cada método clásico:
        </p>
        <div className="tabla-contenedor">
          <table className="tabla-simple">
            <thead>
              <tr>
                <th>Método</th>
                <th>¿Mira los costos?</th>
                <th>¿Mira el costo de oportunidad?</th>
                <th>¿Mira las cantidades?</th>
              </tr>
            </thead>
            <tbody>
              {QUE_MIRA.map((f) => (
                <tr key={f.metodo}>
                  <th scope="row">{f.metodo}</th>
                  {f.celdas.map((c, k) => (
                    <td key={k}>
                      <span className={c.si ? 'distintivo si' : 'distintivo no'}>{c.si ? 'Sí' : 'No'}</span>
                      {c.nota && <span className="distintivo-nota">{c.nota}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ayuda">Piensa cada pregunta antes de abrir su pista; las vas a responder con tu propia regla.</p>
        <div className="preguntas">
          {PREGUNTAS.map((q) => (
            <details key={q.pregunta} className="teoria">
              <summary>{q.pregunta}</summary>
              <p>{q.pista}</p>
            </details>
          ))}
        </div>
      </article>

      <article className="tarjeta etapa" id="etapa-2">
        <h2>
          <span className="numero">2</span> Diseña tu regla
        </h2>
        <div className="formulario">
          <label>
            Nombre
            <input type="text" value={config.nombre} onChange={(e) => actualizar({ nombre: e.target.value })} />
          </label>
          <label>
            ¿Cómo eliges la celda?
            <Opciones<ModoSeleccion>
              etiquetas={ETIQUETA_MODO}
              valor={config.modo}
              onChange={(modo) => actualizar({ modo })}
            />
          </label>
          {config.modo === 'linea' && (
            <label>
              Criterio para elegir la fila o columna
              <Opciones<CriterioLinea>
                etiquetas={ETIQUETA_LINEA}
                valor={config.criterioLinea}
                onChange={(criterioLinea) => actualizar({ criterioLinea })}
              />
            </label>
          )}
          {config.modo !== 'puntaje' && (
            <label>
              Criterio para elegir la celda
              <Opciones<CriterioCelda>
                etiquetas={ETIQUETA_CELDA}
                valor={config.criterioCelda}
                onChange={(criterioCelda) => actualizar({ criterioCelda })}
              />
            </label>
          )}
          <label>
            Si hay empate, elegir…
            <Opciones<Desempate>
              etiquetas={ETIQUETA_DESEMPATE}
              valor={config.desempate}
              onChange={(desempate) => actualizar({ desempate })}
            />
          </label>
        </div>

        {config.modo === 'puntaje' && (
          <div className="pesos">
            <p className="ayuda">
              Da a cada criterio una importancia de 0 (no se usa) a 10. En cada iteración gana la celda que mejor
              combina los criterios según esos pesos. Lo que cuenta es la proporción entre ellos: 5 y 5 equivale a 10 y
              10.
            </p>
            {(Object.keys(ETIQUETA_PESO) as (keyof Pesos)[]).map((k) => (
              <label key={k} className="peso">
                <span className="peso-titulo">{ETIQUETA_PESO[k].titulo}</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={config.pesos[k]}
                  onChange={(e) => cambiarPeso(k, Number(e.target.value))}
                />
                <output>{config.pesos[k]}</output>
                <span className="ayuda">{ETIQUETA_PESO[k].ayuda}</span>
              </label>
            ))}
          </div>
        )}

        <div className="barra">
          <span className="ayuda">Explora cómo se escriben los métodos clásicos con estos bloques:</span>
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
            <button key={k} onClick={() => actualizar({ ...PRESETS[k], nombre: `${PRESETS[k].nombre} (copia)` })}>
              {PRESETS[k].nombre}
            </button>
          ))}
        </div>
        <div className="receta" aria-label={`${nombre}: ${describir(config)}`}>
          <p className="eyebrow">Así decide «{nombre}» en cada iteración</p>
          <ol>
            {receta(config).map((paso) => (
              <li key={paso.titulo}>
                <strong>{paso.titulo}</strong>
                <span>{paso.detalle}</span>
              </li>
            ))}
          </ol>
          <p className="receta-repetir">↻ Se repite hasta tachar toda la tabla.</p>
        </div>
        {equivale && (
          <p className="aviso">
            Esta configuración equivale a <strong>{equivale}</strong>. ¡Modifica algún criterio para crear algo nuevo!
          </p>
        )}
      </article>

      <article className="tarjeta etapa" id="etapa-3" ref={etapaPrueba}>
        <h2>
          <span className="numero">3</span> {peorCaso ? 'Pruébala en su peor caso' : 'Pruébala en el problema actual'}
        </h2>
        {peorCaso && (
          <div className="aviso aviso-accion">
            <span>
              Este es el problema del experimento donde peor le fue a tu regla: su solución inicial cuesta{' '}
              <strong>{fmt(costoInicial)}</strong>. Sigue los pasos y busca la decisión que salió cara; la optimización
              muestra después qué cambios la corrigen.
            </span>
            <button onClick={() => setPeorCaso(null)}>Volver al problema actual</button>
          </div>
        )}
        <label className="chip-check">
          <input type="checkbox" checked={optimizarOn} onChange={(e) => setOptimizarOn(e.target.checked)} />
          Continuar con Camino de las Piedras
        </label>
        <Reproductor
          key={`${JSON.stringify(config)}-${optimizarOn}-${JSON.stringify(problemaPrueba)}`}
          problema={balanceado}
          pasos={pasos}
          fases={fases}
        />
      </article>

      <article className="tarjeta etapa" id="etapa-4">
        <h2>
          <span className="numero">4</span> Ponla a prueba
        </h2>
        <p className="ayuda">
          Se generan problemas al azar de la familia que elijas. Cada uno se resuelve con tu heurística y con los tres
          métodos clásicos; el óptimo se obtiene con el Camino de las Piedras. La misma semilla produce siempre los
          mismos problemas, así que puedes repetir el experimento tras cambiar tu regla.
        </p>

        <label className="campo-texto">
          Tu hipótesis, antes de ver los datos
          <textarea
            rows={2}
            value={hipotesis}
            onChange={(e) => setHipotesis(e.target.value)}
            placeholder="Por ejemplo: creo que dar peso a la urgencia mejorará a mi regla en los problemas desbalanceados, porque…"
          />
        </label>

        <div className="formulario">
          <label>
            Familia de problemas
            <Opciones<Familia>
              etiquetas={TITULO_FAMILIA}
              valor={familia}
              onChange={(f) => {
                setFamilia(f);
                descartarExperimento();
              }}
            />
            <span className="ayuda">{ETIQUETA_FAMILIA[familia].ayuda}</span>
          </label>
          <label>
            Tamaño
            <Opciones<Tamano | 'variado'>
              etiquetas={ETIQUETA_TAMANO_LAB}
              valor={tamano}
              onChange={(t) => {
                setTamano(t);
                descartarExperimento();
              }}
            />
          </label>
        </div>
        <div className="barra">
          <label>
            Problemas
            <input
              type="number"
              min={1}
              max={MAX_PROBLEMAS}
              value={instancias}
              onChange={(e) => setInstancias(Number(e.target.value))}
            />
          </label>
          <label>
            Semilla
            <input type="number" value={semilla} onChange={(e) => setSemilla(Number(e.target.value))} />
          </label>
          <button className="primario" onClick={ejecutarComparacion} disabled={enCurso}>
            {enCurso ? 'Calculando…' : 'Ejecutar experimento'}
          </button>
          {enCurso && <button onClick={descartarExperimento}>Cancelar</button>}
        </div>

        {enCurso && (
          <div className="progreso">
            <progress value={hechas} max={total} aria-label="Avance del experimento" />
            <span>
              {hechas} de {total} problemas
            </span>
          </div>
        )}

        {resultado && (
          <>
            <ResultadosExperimento resultado={resultado} config={config} onAbrirPeorCaso={abrirPeorCaso} />
            {anotado ? (
              <p className="aviso ok">Intento anotado en la bitácora. Cambia tu regla y vuelve a experimentar.</p>
            ) : (
              <div className="cierre-experimento">
                <label className="campo-texto">
                  Tu conclusión: ¿se cumplió la hipótesis? ¿Por qué crees que ocurrió así?
                  <textarea rows={2} value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
                </label>
                <button className="secundario" onClick={anotar}>
                  Anotar en la bitácora
                </button>
              </div>
            )}
          </>
        )}
      </article>

      <article className="tarjeta etapa" id="etapa-5">
        <h2>
          <span className="numero">5</span> Bitácora
        </h2>
        {bitacora.length === 0 ? (
          <p className="ayuda">
            Aquí quedará el historial de tus intentos: la regla, tu hipótesis, el resultado y tu conclusión. Ejecuta un
            experimento y anótalo para empezar.
          </p>
        ) : (
          <>
            <Evolucion bitacora={bitacora} />
            <ol className="bitacora" reversed>
              {bitacora.map((e) => (
                <li key={e.id}>
                  <div className="bitacora-cabecera">
                    <strong>{e.nombre}</strong>
                    <span className="bitacora-brecha">
                      {fmt(brechaPropia(e))} % · puesto {e.puesto} de {e.competidores}
                    </span>
                    <button
                      className="boton-texto"
                      onClick={() => setBitacora((b) => b.filter((x) => x.id !== e.id))}
                      aria-label={`Borrar el intento ${e.nombre} de la bitácora`}
                    >
                      Borrar
                    </button>
                  </div>
                  <p className="ayuda">
                    {new Date(e.fecha).toLocaleString('es')} · {describirProblemas(e)}
                  </p>
                  <p>{e.regla}</p>
                  <p>
                    <strong>Hipótesis:</strong> {e.hipotesis || <span className="ayuda">sin hipótesis</span>}
                  </p>
                  <p>
                    <strong>Conclusión:</strong> {e.conclusion || <span className="ayuda">sin conclusión</span>}
                  </p>
                </li>
              ))}
            </ol>
            <div className="barra">
              <button onClick={() => descargar('bitacora-heuristrans.md', informeMarkdown(bitacora))}>
                Descargar informe (.md)
              </button>
            </div>
          </>
        )}
      </article>
    </section>
  );
}

/** Brecha de la heurística propia en cada intento, del más antiguo al más reciente. */
function Evolucion({ bitacora }: { bitacora: EntradaBitacora[] }) {
  if (bitacora.length < 2) return null;
  const intentos = [...bitacora].reverse();
  const max = Math.max(...intentos.map(brechaPropia), 1);
  const mejor = Math.min(...intentos.map(brechaPropia));
  return (
    <div className="evolucion">
      <h3>Brecha promedio de tu heurística, intento a intento</h3>
      <ol>
        {intentos.map((e, k) => {
          const brecha = brechaPropia(e);
          return (
            <li key={e.id} title={`${e.nombre}: ${describirProblemas(e)}`}>
              <span className="evolucion-numero">{k + 1}</span>
              <div className={brecha <= mejor + 1e-9 ? 'barra-dato propia' : 'barra-dato'}>
                <span style={{ width: `${(brecha / max) * 100}%` }} />
                <em>{fmt(brecha)} %</em>
              </div>
              <span className="evolucion-nombre">{e.nombre}</span>
            </li>
          );
        })}
      </ol>
      <p className="ayuda">
        La barra azul marca tu mejor intento. Solo son comparables los intentos hechos con la misma familia, tamaño y
        semilla.
      </p>
    </div>
  );
}
