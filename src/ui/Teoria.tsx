import { GLOSARIO } from '../contenido/glosario';
import { CONVENCIONES_GENERALES, TEORIA, VARIANTES } from '../contenido/teoria';
import type { TemaTeoria } from '../contenido/teoria';
import type { Optimizador } from '../core/caminoPiedras';
import type { MetodoInicial } from '../core/metodos';
import { useAparicion } from './movimiento';

const TEMAS: TemaTeoria[] = ['noroeste', 'costoMinimo', 'vogel', 'piedras', 'modi'];

const esOptimizador = (tema: TemaTeoria): tema is Optimizador => tema === 'piedras' || tema === 'modi';

export function Teoria({ onPractica }: { onPractica: (metodo: MetodoInicial, optimizador: Optimizador) => void }) {
  const metodos = useAparicion<HTMLDivElement>();
  const variantes = useAparicion<HTMLDivElement>();

  return (
    <section className="vista">
      <header className="vista-cabecera">
        <div>
          <p className="eyebrow">Teoría</p>
          <h1>Los métodos, en breve</h1>
          <p className="vista-descripcion">
            La idea de cada método, sus pasos, los errores más comunes y las convenciones que usa esta aplicación cuando
            hay empates.
          </p>
        </div>
      </header>

      <div className="teoria-grid" ref={metodos}>
        {TEMAS.map((tema, k) => {
          const t = TEORIA[tema];
          return (
            <article key={tema} className="tarjeta teoria-tarjeta">
              <span className={esOptimizador(tema) ? 'modulo-numero coral' : 'modulo-numero'}>0{k + 1}</span>
              <h2>{t.titulo}</h2>
              <p className="teoria-idea">{t.idea}</p>
              <h3>Pasos</h3>
              <ol>
                {t.pasos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
              <dl className="teoria-balance">
                <dt>Ventajas</dt>
                <dd>{t.ventajas}</dd>
                <dt>Limitaciones</dt>
                <dd>{t.limitaciones}</dd>
              </dl>
              <h3>Errores frecuentes</h3>
              <ul>
                {t.errores.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <h3>Convenciones de esta aplicación</h3>
              <ul>
                {t.convenciones.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <button
                className="secundario"
                onClick={() => (esOptimizador(tema) ? onPractica('noroeste', tema) : onPractica(tema, 'piedras'))}
              >
                Verlo paso a paso
              </button>
            </article>
          );
        })}
      </div>

      <h2 className="titulo-seccion titulo-bloque">Variantes del problema</h2>
      <div className="teoria-grid" ref={variantes}>
        {VARIANTES.map((v) => (
          <article key={v.titulo} className="tarjeta teoria-tarjeta">
            <h2>{v.titulo}</h2>
            <p className="teoria-idea">{v.idea}</p>
            <h3>Pasos</h3>
            <ol>
              {v.pasos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            <h3>Errores frecuentes</h3>
            <ul>
              {v.errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
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
