import { useMemo, useState } from 'react';
import { balancear } from '../core/balanceo';
import { compararMetodos } from '../core/comparador';
import { NOMBRE_METODO } from '../core/metodos';
import type { MetodoInicial } from '../core/metodos';
import { evaluarReparto, juzgarReparto } from '../core/reparto';
import type { Veredicto } from '../core/reparto';
import type { Celda, Paso, Problema } from '../core/tipos';
import { EPS, fmt, matriz, total } from '../core/util';
import { TablaTransporte } from './TablaTransporte';

const METODOS: MetodoInicial[] = ['noroeste', 'costoMinimo', 'vogel'];

interface Props {
  problema: Problema;
  onMetodo: (m: MetodoInicial) => void;
}

/** Cantidad escrita en una casilla: vacía vale 0; null si no es un número mayor o igual que 0. */
export function leerCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return 0;
  const valor = Number(limpio);
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}

/** Reto inicial: el estudiante reparte sin seguir ningún método y luego se compara con el óptimo. */
export function Reparto({ problema, onMetodo }: Props) {
  const balanceo = useMemo(() => balancear(problema), [problema]);
  const comparacion = useMemo(() => compararMetodos(problema), [problema]);
  const p = balanceo.problema;
  const m = p.ofertas.length;
  const n = p.demandas.length;
  const [textos, setTextos] = useState(() => matriz(m, n, ''));
  const [juzgado, setJuzgado] = useState(false);

  const cantidades = textos.map((fila) => fila.map(leerCantidad));
  const x = cantidades.map((fila) => fila.map((v) => v ?? 0));
  const hayInvalidas = cantidades.some((fila) => fila.includes(null));
  const estado = evaluarReparto(p, x);
  const maximizar = p.objetivo === 'max';
  const palabra = maximizar ? 'Utilidad' : 'Costo';
  const listo = estado.completo && !hayInvalidas;
  const veredicto = juzgado && listo ? juzgarReparto(problema, x, comparacion) : null;

  const paso: Paso = {
    tipo: 'inicio',
    titulo: '',
    explicacion: '',
    x,
    basica: x.map((fila) => fila.map((v) => v > EPS)),
    ofertaRestante: estado.ofertaRestante,
    demandaRestante: estado.demandaRestante,
    costoTotal: total(p, x),
  };

  const alCambiar = (c: Celda, texto: string) => {
    setTextos(textos.map((fila, i) => fila.map((t, j) => (i === c.i && j === c.j ? texto : t))));
    setJuzgado(false);
  };
  const limpiar = () => {
    setTextos(matriz(m, n, ''));
    setJuzgado(false);
  };

  const excesos = estado.excesos.map((l) =>
    l.tipo === 'fila'
      ? `${p.origenes[l.k]} envía ${fmt(-estado.ofertaRestante[l.k])} más de lo que tiene`
      : `${p.destinos[l.k]} recibe ${fmt(-estado.demandaRestante[l.k])} más de lo que pide`,
  );

  return (
    <section className="vista">
      <header className="vista-cabecera">
        <div>
          <p className="eyebrow">02 — Aprender · Reto inicial</p>
          <h1>Reparte a tu manera</h1>
          <p className="vista-descripcion">
            Antes de ver ningún método, inténtalo tú: escribe cuántas unidades envías por cada ruta hasta agotar toda la
            oferta y cubrir toda la demanda, buscando {maximizar ? 'la mayor utilidad' : 'el menor costo'}. Después
            compara tu reparto con el óptimo.
          </p>
        </div>
        <div className="segmentado" role="radiogroup" aria-label="Método">
          <button role="radio" aria-checked className="activo">
            Tu reparto
          </button>
          {METODOS.map((k) => (
            <button key={k} role="radio" aria-checked={false} onClick={() => onMetodo(k)}>
              {NOMBRE_METODO[k]}
            </button>
          ))}
        </div>
      </header>

      {balanceo.ficticio && <p className="aviso">{balanceo.explicacion}</p>}
      {comparacion.sinSolucion && (
        <p className="aviso error">
          Con las rutas prohibidas actuales no existe ningún reparto válido: no podrás completar la tabla. Revisa las
          prohibiciones en la pantalla Problema.
        </p>
      )}

      <article className="tarjeta">
        <TablaTransporte
          problema={p}
          paso={paso}
          cantidadEditable={{
            texto: (c) => textos[c.i][c.j],
            invalida: (c) => cantidades[c.i][c.j] === null,
            onCambio: alCambiar,
          }}
        />
        <div className="reparto-resumen">
          <dl className="cifras">
            <div>
              <dt>{palabra} de tu reparto</dt>
              <dd>{fmt(paso.costoTotal)}</dd>
            </div>
            <div>
              <dt>Falta repartir</dt>
              <dd>{fmt(estado.falta)}</dd>
            </div>
            <div>
              <dt>Rutas usadas</dt>
              <dd>{estado.rutas}</dd>
            </div>
          </dl>
          <div className="acciones">
            <button className="secundario" onClick={limpiar} disabled={textos.flat().every((t) => t === '')}>
              Borrar todo
            </button>
            <button className="primario" onClick={() => setJuzgado(true)} disabled={!listo || juzgado}>
              Comparar con el óptimo
            </button>
          </div>
        </div>
        <p className="ayuda" role="status">
          {hayInvalidas
            ? 'Hay casillas que no son una cantidad válida: escribe números mayores o iguales que 0.'
            : excesos.length > 0
              ? `Te pasaste: ${excesos.join('; ')}.`
              : listo
                ? juzgado
                  ? 'Si cambias alguna cantidad puedes volver a comparar.'
                  : 'Reparto completo: toda la oferta sale y toda la demanda queda cubierta.'
                : `Los números junto a OFERTA y DEMANDA muestran lo que queda. Faltan ${fmt(estado.falta)} unidades por repartir.`}
        </p>
      </article>

      {veredicto && <Resultado veredicto={veredicto} x={x} onMetodo={onMetodo} />}
    </section>
  );
}

function Resultado({
  veredicto,
  x,
  onMetodo,
}: {
  veredicto: Veredicto;
  x: number[][];
  onMetodo: (m: MetodoInicial) => void;
}) {
  const { comparacion, posiciones, mensajes } = veredicto;
  const p = comparacion.problema;
  const palabra = p.utilidades ? 'Utilidad' : 'Costo';
  const optima = comparacion.solucionOptima;

  return (
    <article className="tarjeta reparto-veredicto" aria-live="polite">
      <h2 className="titulo-seccion">{veredicto.esOptimo ? 'Lo lograste' : 'Tu reparto frente al óptimo'}</h2>
      <div className="aviso ok">
        {mensajes.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>

      <div className="tabla-contenedor">
        <table className="tabla-simple">
          <thead>
            <tr>
              <th>Reparto</th>
              <th>{palabra}</th>
              <th>Diferencia con el óptimo</th>
            </tr>
          </thead>
          <tbody>
            {posiciones.map((q) => (
              <tr key={q.nombre} className={q.tipo === 'propia' ? 'propia' : q.tipo === 'optimo' ? 'referencia' : ''}>
                <td>{q.tipo === 'metodo' ? `${q.nombre} (solución inicial)` : q.nombre}</td>
                <td>{q.texto}</td>
                <td>
                  {q.prohibida
                    ? 'Usa una ruta prohibida'
                    : q.distancia === null
                      ? '—'
                      : q.distancia <= EPS
                        ? 'Ninguna'
                        : fmt(q.distancia)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {optima && !veredicto.esOptimo && (
        <details className="datos-grafico">
          <summary>Ver un reparto óptimo</summary>
          <div className="tabla-contenedor">
            <table className="tabla-mini" aria-label="Un reparto óptimo">
              <thead>
                <tr>
                  <th />
                  {p.destinos.map((d) => (
                    <th key={d}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.origenes.map((o, i) => (
                  <tr key={o}>
                    <th>{o}</th>
                    {p.destinos.map((d, j) => {
                      const distinta = Math.abs(optima.x[i][j] - x[i][j]) > EPS;
                      const usada = optima.x[i][j] > EPS;
                      return (
                        <td
                          key={d}
                          className={`${usada ? 'basica' : ''} ${distinta ? 'distinta' : ''}`}
                          title={distinta ? `Tú enviaste ${fmt(x[i][j])}` : undefined}
                        >
                          {usada ? fmt(optima.x[i][j]) : '·'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ayuda">
            El borde marca las rutas donde tu cantidad es distinta. Puede haber otros repartos con el mismo total.
          </p>
        </details>
      )}

      <div>
        <p className="ayuda">Mira cómo llega cada método a su solución, paso a paso:</p>
        <div className="acciones">
          {METODOS.map((k) => (
            <button key={k} className="secundario" onClick={() => onMetodo(k)}>
              {NOMBRE_METODO[k]}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
