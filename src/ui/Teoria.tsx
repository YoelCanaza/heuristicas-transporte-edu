import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { GLOSARIO } from '../contenido/glosario';
import { CONVENCIONES_GENERALES, TEORIA, VARIANTES } from '../contenido/teoria';
import type { Pregunta, TemaTeoria } from '../contenido/teoria';
import { optimizar } from '../core/caminoPiedras';
import type { Optimizador } from '../core/caminoPiedras';
import { compararMetodos } from '../core/comparador';
import { EJEMPLO_TAHA } from '../core/ejemplos';
import { resolverMetodo } from '../core/metodos';
import type { MetodoInicial } from '../core/metodos';
import type { Paso, Problema } from '../core/tipos';
import { fmt } from '../core/util';
import { TextoConGlosario } from './Glosa';
import { TablaTransporte } from './TablaTransporte';
import { useAparicion } from './movimiento';

const TEMAS: TemaTeoria[] = ['noroeste', 'costoMinimo', 'vogel', 'piedras', 'modi'];

/** Nombre corto de cada tema para las pestañas y el mapa. */
const CORTO: Record<TemaTeoria, string> = {
  noroeste: 'Esquina Noroeste',
  costoMinimo: 'Costo Mínimo',
  vogel: 'Vogel',
  piedras: 'Camino de las Piedras',
  modi: 'MODI (u-v)',
};

const esOptimizador = (tema: TemaTeoria): tema is Optimizador => tema === 'piedras' || tema === 'modi';

/** Pasos del método sobre el ejemplo de Taha; los de optimización parten de la Esquina Noroeste. */
function pasosDemo(tema: TemaTeoria): { problema: Problema; pasos: Paso[] } {
  if (!esOptimizador(tema)) {
    const r = resolverMetodo(EJEMPLO_TAHA, tema);
    return { problema: r.problema, pasos: r.pasos };
  }
  const inicial = resolverMetodo(EJEMPLO_TAHA, 'noroeste');
  return { problema: inicial.problema, pasos: optimizar(inicial.problema, inicial.solucion, { metodo: tema }).pasos };
}

export function Teoria({ onPractica }: { onPractica: (metodo: MetodoInicial, optimizador: Optimizador) => void }) {
  const [tema, setTema] = useState<TemaTeoria>('noroeste');
  const variantes = useAparicion<HTMLDivElement>();
  const t = TEORIA[tema];
  const practicar = () => (esOptimizador(tema) ? onPractica('noroeste', tema) : onPractica(tema, 'piedras'));

  return (
    <section className="vista">
      <header className="vista-cabecera">
        <div>
          <p className="eyebrow">Teoría</p>
          <h1>Los métodos, en breve</h1>
          <p className="vista-descripcion">
            Primero el mapa completo, después cada método con su idea, un ejemplo que puedes recorrer y una pregunta
            para comprobar que lo entendiste.
          </p>
        </div>
      </header>

      <Mapa tema={tema} onTema={setTema} />
      <Vistazo />

      <article className="tarjeta leccion">
        <div className="segmentado leccion-pestanas" role="tablist" aria-label="Método">
          {TEMAS.map((k, n) => (
            <button
              key={k}
              role="tab"
              id={`pestana-${k}`}
              aria-selected={tema === k}
              aria-controls="leccion-panel"
              className={tema === k ? 'activo' : ''}
              onClick={() => setTema(k)}
            >
              <span className="leccion-orden">{n + 1}</span>
              {CORTO[k]}
            </button>
          ))}
        </div>

        <div
          className="leccion-panel"
          id="leccion-panel"
          role="tabpanel"
          aria-labelledby={`pestana-${tema}`}
          key={tema}
        >
          <div className="leccion-texto">
            <p className="eyebrow">{esOptimizador(tema) ? 'Método de optimización' : 'Solución inicial'}</p>
            <h2>{t.titulo}</h2>
            <p className="leccion-idea">{t.idea}</p>

            <h3>Paso a paso</h3>
            <ol className="leccion-pasos">
              {t.pasos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>

            <div className="leccion-balance">
              <div className="balance-mas">
                <h3>A favor</h3>
                <p>{t.ventajas}</p>
              </div>
              <div className="balance-menos">
                <h3>En contra</h3>
                <p>{t.limitaciones}</p>
              </div>
            </div>
          </div>

          <div className="leccion-practica">
            <Demo tema={tema} />
            <Comprobacion pregunta={t.pregunta} />
            <button className="primario" onClick={practicar}>
              Practicarlo paso a paso
            </button>
          </div>

          <div className="leccion-notas">
            <div className="nota-error">
              <h3>Errores frecuentes</h3>
              <ul>
                {t.errores.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
            <details className="teoria">
              <summary>Convenciones de esta aplicación</summary>
              <ul>
                {t.convenciones.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </article>

      <h2 className="titulo-seccion titulo-bloque">Variantes del problema</h2>
      <div className="teoria-grid" ref={variantes}>
        {VARIANTES.map((v) => (
          <article key={v.titulo} className="tarjeta teoria-tarjeta">
            <h2>{v.titulo}</h2>
            <p className="teoria-idea">{v.idea}</p>
            <h3>Paso a paso</h3>
            <ol className="leccion-pasos">
              {v.pasos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            <div className="nota-error">
              <h3>Errores frecuentes</h3>
              <ul>
                {v.errores.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
      <p className="ayuda">
        Ambas se activan en la pantalla Problema: el selector «Maximizar utilidad» y la casilla «Marcar rutas
        prohibidas».
      </p>

      <article className="tarjeta">
        <h2 className="titulo-seccion">Convenciones generales</h2>
        <ul className="lista-simple">
          {CONVENCIONES_GENERALES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </article>

      <article className="tarjeta">
        <h2 className="titulo-seccion">Glosario</h2>
        <dl className="glosario">
          {GLOSARIO.map((g) => (
            <div key={g.termino}>
              <dt>{g.termino}</dt>
              <dd>{g.definicion}</dd>
            </div>
          ))}
        </dl>
      </article>
    </section>
  );
}

/** El recorrido completo de un problema: en qué etapa actúa cada método. */
function Mapa({ tema, onTema }: { tema: TemaTeoria; onTema: (t: TemaTeoria) => void }) {
  const boton = (k: TemaTeoria) => (
    <button key={k} className={tema === k ? 'mapa-metodo activo' : 'mapa-metodo'} onClick={() => onTema(k)}>
      {CORTO[k]}
    </button>
  );
  return (
    <nav className="tarjeta mapa" aria-label="Mapa del proceso">
      <div className="mapa-etapa">
        <span className="mapa-numero">1</span>
        <h2>Plantear</h2>
        <p>La tabla de costos, con sus ofertas y demandas, balanceada.</p>
      </div>
      <div className="mapa-etapa">
        <span className="mapa-numero">2</span>
        <h2>Construir una solución inicial</h2>
        <p>Una heurística llena la tabla. Elige una:</p>
        <div className="mapa-metodos">{TEMAS.filter((k) => !esOptimizador(k)).map(boton)}</div>
      </div>
      <div className="mapa-etapa">
        <span className="mapa-numero">3</span>
        <h2>Mejorarla hasta el óptimo</h2>
        <p>Se revisa si alguna celda vacía abarata el total. Dos formas de calcularlo:</p>
        <div className="mapa-metodos">{TEMAS.filter(esOptimizador).map(boton)}</div>
      </div>
      <div className="mapa-etapa mapa-final">
        <span className="mapa-numero">✓</span>
        <h2>Solución óptima</h2>
        <p>Ningún cambio la mejora: todos los costos marginales son ≥ 0.</p>
      </div>
    </nav>
  );
}

/** Las tres heurísticas sobre el mismo ejemplo: cuánto cuesta su solución y cuánto falta para el óptimo. */
function Vistazo() {
  const { filas, optimo } = useMemo(() => compararMetodos(EJEMPLO_TAHA), []);
  if (optimo === null) return null;
  const mayor = Math.max(...filas.map((f) => f.trayectoria[0].valor));
  return (
    <article className="tarjeta vistazo">
      <div>
        <h2 className="titulo-seccion">De un vistazo</h2>
        <p className="ayuda">
          El mismo problema (ejemplo de Taha) resuelto con cada heurística. La barra es el costo de su solución inicial;
          la marca, el costo óptimo ({fmt(optimo)}).
        </p>
      </div>
      <ul className="vistazo-barras">
        {filas.map((f) => {
          const costo = f.trayectoria[0].valor;
          return (
            <li key={f.metodo}>
              <span className="vistazo-nombre">{f.nombre}</span>
              <div className="vistazo-pista" style={{ '--optimo': `${(optimo / mayor) * 100}%` } as CSSProperties}>
                <span className="vistazo-barra" style={{ width: `${(costo / mayor) * 100}%` }} />
              </div>
              <strong>{fmt(costo)}</strong>
              <span className="vistazo-nota">
                {f.inicialOptima
                  ? 'ya es óptima'
                  : `${fmt(f.brecha ?? 0)} % sobre el óptimo · ${f.iteraciones} ${f.iteraciones === 1 ? 'mejora' : 'mejoras'}`}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

/** El método aplicado al ejemplo de Taha, para recorrerlo a mano sin salir de la teoría. */
function Demo({ tema }: { tema: TemaTeoria }) {
  const { problema, pasos } = useMemo(() => pasosDemo(tema), [tema]);
  const [k, setK] = useState(0);
  const paso = pasos[k];
  return (
    <figure className="demo">
      <figcaption>
        <span className="eyebrow">
          Ejemplo · paso {k + 1} de {pasos.length}
        </span>
        <strong>{paso.titulo}</strong>
      </figcaption>
      <TablaTransporte problema={problema} paso={paso} />
      <div className="demo-explicacion" aria-live="polite">
        <TextoConGlosario texto={paso.explicacion} />
      </div>
      <div className="demo-controles">
        <button onClick={() => setK(k - 1)} disabled={k === 0}>
          Anterior
        </button>
        <button className="secundario" onClick={() => setK(k + 1)} disabled={k === pasos.length - 1}>
          Siguiente
        </button>
        <button className="boton-texto" onClick={() => setK(0)} disabled={k === 0}>
          Reiniciar
        </button>
      </div>
    </figure>
  );
}

/** Pregunta de opción múltiple con respuesta inmediata y explicación. */
function Comprobacion({ pregunta }: { pregunta: Pregunta }) {
  const [elegida, setElegida] = useState<number | null>(null);
  const acerto = elegida === pregunta.correcta;
  return (
    <div className="comprobacion">
      <p className="eyebrow">Comprueba</p>
      <p className="comprobacion-texto">{pregunta.texto}</p>
      <div className="comprobacion-opciones" role="group" aria-label="Opciones">
        {pregunta.opciones.map((o, n) => {
          const estado = elegida === null ? '' : n === pregunta.correcta ? 'bien' : n === elegida ? 'mal' : '';
          return (
            <button key={o} className={estado} aria-pressed={elegida === n} onClick={() => setElegida(n)}>
              {o}
            </button>
          );
        })}
      </div>
      {elegida !== null && (
        <p className={acerto ? 'aviso ok' : 'aviso error'} role="status">
          <strong>{acerto ? 'Correcto. ' : 'No es esa. '}</strong>
          {pregunta.explicacion}
        </p>
      )}
    </div>
  );
}
