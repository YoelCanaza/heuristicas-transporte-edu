import type { MetodoInicial } from './metodos';
import type { Celda, Linea, Paso, Problema } from './tipos';
import { EPS, fmt, fmtCosto, nombreCelda } from './util';

/**
 * Retroalimentación del modo práctica: en lugar de decir solo "incorrecto", explica qué
 * regla siguió (probablemente) el estudiante y en qué se diferencia de la del método.
 */

const igual = (a: Celda, b: Celda) => a.i === b.i && a.j === b.j;

function disponibles(estado: Paso): Celda[] {
  const celdas: Celda[] = [];
  estado.x.forEach((fila, i) =>
    fila.forEach((_, j) => {
      if (!estado.filaTachada?.[i] && !estado.columnaTachada?.[j]) celdas.push({ i, j });
    }),
  );
  return celdas;
}

function diagnosticoCostoMinimo(p: Problema, estado: Paso, correcta: Celda, elegida: Celda): string {
  const costo = (c: Celda) => p.costos[c.i][c.j];
  const cantidad = (c: Celda) => Math.min(estado.ofertaRestante![c.i], estado.demandaRestante![c.j]);
  const libres = disponibles(estado);

  if (costo(elegida) === costo(correcta)) {
    return cantidad(elegida) < cantidad(correcta)
      ? `Esa celda empata en costo (${fmtCosto(p, costo(elegida))}), pero solo permite asignar ${fmt(cantidad(elegida))}. En un empate se elige la que permite asignar más unidades.`
      : `Esa celda empata en costo y en cantidad. El último desempate es el orden: la primera por fila y luego por columna.`;
  }
  const esquina = { i: estado.filaTachada!.indexOf(false), j: estado.columnaTachada!.indexOf(false) };
  if (igual(elegida, esquina)) {
    return 'Elegiste la esquina noroeste. Este método sí mira los costos: busca el menor entre todas las celdas disponibles.';
  }
  const minimoFila = Math.min(...libres.filter((c) => c.i === elegida.i).map(costo));
  if (costo(elegida) === minimoFila) {
    return `Es la celda más barata de su fila (${fmtCosto(p, costo(elegida))}), pero en otra fila hay una de costo menor. Se busca en toda la tabla disponible.`;
  }
  return `Esa celda cuesta ${fmtCosto(p, costo(elegida))} y hay celdas disponibles más baratas. Busca el menor costo entre todas las que no están tachadas.`;
}

/**
 * Explica por qué `elegida` no es la celda que asigna el método.
 * `estado` es el paso previo a la asignación; `analisis`, el paso de penalizaciones si lo hay.
 */
export function diagnosticarAsignacion(
  p: Problema,
  estado: Paso,
  analisis: Paso | null,
  correcta: Celda,
  elegida: Celda,
  metodo: MetodoInicial,
): string {
  if (estado.filaTachada?.[elegida.i]) {
    return `La fila ${p.origenes[elegida.i]} ya está tachada: su oferta se agotó y no puede enviar más.`;
  }
  if (estado.columnaTachada?.[elegida.j]) {
    return `La columna ${p.destinos[elegida.j]} ya está tachada: su demanda ya está cubierta.`;
  }

  const costo = (c: Celda) => p.costos[c.i][c.j];
  const libres = disponibles(estado);
  const costoMinimo = Math.min(...libres.map(costo));

  if (metodo === 'noroeste') {
    if (costo(elegida) === costoMinimo) {
      return 'Elegiste la celda más barata. La Esquina Noroeste no mira los costos: toma la celda disponible de más arriba y más a la izquierda.';
    }
    if (elegida.i === correcta.i) return 'Vas en la fila correcta, pero hay una celda disponible más a la izquierda.';
    if (elegida.j === correcta.j) return 'Vas en la columna correcta, pero hay una celda disponible más arriba.';
    return 'Busca la primera fila sin tachar y, dentro de ella, la primera columna sin tachar.';
  }

  if (metodo === 'costoMinimo') return diagnosticoCostoMinimo(p, estado, correcta, elegida);

  // Vogel
  const linea = analisis?.lineaElegida;
  if (!analisis || !linea) {
    return `Solo queda una línea sin tachar, así que ya no se comparan penalizaciones. ${diagnosticoCostoMinimo(p, estado, correcta, elegida)}`;
  }
  const nombreLinea = linea.tipo === 'fila' ? `fila ${p.origenes[linea.k]}` : `columna ${p.destinos[linea.k]}`;
  const penalMayor = (linea.tipo === 'fila' ? analisis.penalFila : analisis.penalColumna)![linea.k]!;
  const enLinea = linea.tipo === 'fila' ? elegida.i === linea.k : elegida.j === linea.k;
  if (enLinea) {
    return costo(elegida) === costo(correcta)
      ? `Vas en la línea correcta (${nombreLinea}) y esa celda empata en costo, pero en un empate se elige la que permite asignar más unidades.`
      : `Vas en la línea correcta (${nombreLinea}, penalización ${fmtCosto(p, penalMayor)}), pero dentro de ella se elige la celda de menor costo.`;
  }
  const penalFila = analisis.penalFila![elegida.i]!;
  const penalColumna = analisis.penalColumna![elegida.j]!;
  if (Math.max(penalFila, penalColumna) === penalMayor) {
    return `Esa celda está en una línea que empata con la mayor penalización (${fmtCosto(p, penalMayor)}). El desempate es la línea que contiene el menor costo.`;
  }
  if (costo(elegida) === costoMinimo) {
    return 'Elegiste la celda más barata de la tabla, como haría el Costo Mínimo. Vogel elige primero la fila o columna de mayor penalización (la diferencia entre sus dos menores costos).';
  }
  return `La fila ${p.origenes[elegida.i]} tiene penalización ${fmtCosto(p, penalFila)} y la columna ${p.destinos[elegida.j]}, ${fmtCosto(p, penalColumna)}. Hay otra línea con una penalización mayor.`;
}

/** Explica por qué `elegida` no es la celda que entra a la base. `marginales` son los del paso de entrada. */
export function diagnosticarEntrada(
  p: Problema,
  estado: Paso,
  marginales: (number | null)[][],
  correcta: Celda,
  elegida: Celda,
): string {
  if (estado.basica[elegida.i][elegida.j]) {
    return 'Esa celda ya es básica. Solo puede entrar a la base una celda vacía.';
  }
  const m = marginales[elegida.i][elegida.j];
  if (m === null) return 'Esa celda no puede entrar a la base.';
  if (m > EPS) {
    return `Enviar por ${nombreCelda(p, elegida)} aumentaría el costo: su costo marginal es +${fmtCosto(p, m)}. Entra una celda de marginal negativo.`;
  }
  if (Math.abs(m) <= EPS) {
    return `El costo marginal de ${nombreCelda(p, elegida)} es 0: usarla daría otra solución de igual costo, no una mejor.`;
  }
  const mejor = marginales[correcta.i][correcta.j]!;
  if (Math.abs(m - mejor) <= EPS) {
    return `Esa celda empata con el marginal más negativo (${fmtCosto(p, m)}). En un empate entra la primera por fila y luego por columna.`;
  }
  return `${nombreCelda(p, elegida)} también reduciría el costo (${fmtCosto(p, m)} por unidad), pero el método elige la que más lo reduce: busca el marginal más negativo.`;
}

export type ResultadoTrazo = { ok: true; completo: boolean } | { ok: false; motivo: string };

/**
 * Valida el siguiente clic al trazar a mano el camino cerrado.
 * `trazo` empieza con la celda que entra; `ciclo` es el camino real (único), que puede
 * recorrerse en cualquiera de los dos sentidos.
 */
export function validarTrazo(basica: boolean[][], ciclo: Celda[], trazo: Celda[], clic: Celda): ResultadoTrazo {
  const n = trazo.length;
  const ultima = trazo[n - 1];

  if (trazo.some((c) => igual(c, clic))) {
    return { ok: false, motivo: 'Ya pasaste por esa celda. El camino no repite piedras.' };
  }
  if (!basica[clic.i][clic.j]) {
    return { ok: false, motivo: 'Esa celda está vacía. Solo se puede girar en celdas básicas (las piedras).' };
  }
  const horizontal = clic.i === ultima.i;
  if (!horizontal && clic.j !== ultima.j) {
    return {
      ok: false,
      motivo: 'Muévete en línea recta: la siguiente piedra debe estar en la misma fila o columna que la anterior.',
    };
  }
  if (n >= 2 && horizontal === (trazo[n - 2].i === ultima.i)) {
    return {
      ok: false,
      motivo: `Acabas de moverte en ${horizontal ? 'horizontal' : 'vertical'}. En cada piedra se gira en ángulo recto: ahora toca un movimiento ${horizontal ? 'vertical' : 'horizontal'}.`,
    };
  }

  const L = ciclo.length;
  const esperadas = n === 1 ? [ciclo[1], ciclo[L - 1]] : [igual(trazo[1], ciclo[1]) ? ciclo[n] : ciclo[L - n]];
  if (!esperadas.some((c) => igual(c, clic))) {
    return {
      ok: false,
      motivo: `Desde esa piedra el camino no se puede cerrar. Prueba con otra piedra de la misma ${horizontal ? 'fila' : 'columna'}.`,
    };
  }
  return { ok: true, completo: n + 1 === L };
}

const cerca = (a: number, b: number) => Math.abs(a - b) <= 1e-6;

/** Lo que le queda al origen y lo que le falta al destino de `celda` antes de asignar. */
export function restantes(p: Problema, estado: Paso, celda: Celda): { oferta: number; demanda: number } {
  return {
    oferta: estado.ofertaRestante?.[celda.i] ?? p.ofertas[celda.i],
    demanda: estado.demandaRestante?.[celda.j] ?? p.demandas[celda.j],
  };
}

/**
 * Revisa la cantidad que el estudiante quiere asignar a `celda`. Devuelve null si es la
 * correcta (el menor entre la oferta y la demanda restantes) o la explicación del error.
 */
export function diagnosticarCantidad(p: Problema, estado: Paso, celda: Celda, respuesta: number): string | null {
  const { oferta, demanda } = restantes(p, estado, celda);
  const origen = p.origenes[celda.i];
  const destino = p.destinos[celda.j];
  const q = Math.min(oferta, demanda);
  if (!Number.isFinite(respuesta) || respuesta < 0) return 'Escribe una cantidad: un número mayor o igual a 0.';
  if (cerca(respuesta, q)) return null;

  if (cerca(respuesta, p.ofertas[celda.i]) && !cerca(oferta, p.ofertas[celda.i])) {
    return `${fmt(respuesta)} es la oferta original de ${origen}, pero ya envió una parte: ahora le quedan ${fmt(oferta)}. Usa siempre las cantidades restantes.`;
  }
  if (cerca(respuesta, p.demandas[celda.j]) && !cerca(demanda, p.demandas[celda.j])) {
    return `${fmt(respuesta)} es la demanda original de ${destino}, pero ya recibió una parte: ahora le faltan ${fmt(demanda)}. Usa siempre las cantidades restantes.`;
  }
  if (cerca(respuesta, oferta)) {
    return `A ${origen} le quedan ${fmt(oferta)}, pero ${destino} solo necesita ${fmt(demanda)}. Se asigna el menor de los dos valores.`;
  }
  if (cerca(respuesta, demanda)) {
    return `${destino} necesita ${fmt(demanda)}, pero a ${origen} solo le quedan ${fmt(oferta)}. Se asigna el menor de los dos valores.`;
  }
  if (respuesta > q) {
    return oferta <= demanda
      ? `No se puede enviar tanto: a ${origen} solo le quedan ${fmt(oferta)}.`
      : `No se puede enviar tanto: ${destino} solo necesita ${fmt(demanda)}.`;
  }
  return `Se puede asignar más. El método envía lo máximo posible por la celda elegida: el menor entre lo que le queda a ${origen} y lo que le falta a ${destino}.`;
}

/** Respuesta a "¿qué se tacha?" después de una asignación. */
export type Tachado = 'fila' | 'columna' | 'ambas';

/** Líneas que quedaron tachadas entre el estado previo a la asignación y el paso de la asignación. */
export function lineasTachadas(estado: Paso, asignacion: Paso): Linea[] {
  const nuevas = (antes: boolean[] | undefined, despues: boolean[] | undefined, tipo: Linea['tipo']): Linea[] =>
    (despues ?? []).flatMap((t, k) => (t && !antes?.[k] ? [{ tipo, k }] : []));
  return [
    ...nuevas(estado.filaTachada, asignacion.filaTachada, 'fila'),
    ...nuevas(estado.columnaTachada, asignacion.columnaTachada, 'columna'),
  ];
}

export function tachadoCorrecto(estado: Paso, asignacion: Paso): Tachado {
  const lineas = lineasTachadas(estado, asignacion);
  return lineas.length === 2 ? 'ambas' : lineas[0].tipo;
}

/**
 * Revisa qué línea dice el estudiante que se tacha tras asignar en `asignacion.celda`.
 * Devuelve null si acierta o la explicación del error.
 */
export function diagnosticarTachado(p: Problema, estado: Paso, asignacion: Paso, respuesta: Tachado): string | null {
  const correcta = tachadoCorrecto(estado, asignacion);
  if (respuesta === correcta) return null;

  const celda = asignacion.celda!;
  const { oferta, demanda } = restantes(p, estado, celda);
  const origen = p.origenes[celda.i];
  const destino = p.destinos[celda.j];
  const q = Math.min(oferta, demanda);

  if (correcta === 'ambas') {
    return `Es la última asignación: se agotan a la vez la oferta de ${origen} y la demanda de ${destino}, y ya no queda nada por repartir. Se tachan las dos y la construcción termina.`;
  }
  if (cerca(oferta, demanda)) {
    const regla =
      correcta === 'fila'
        ? `se tacha la fila ${origen} y la columna ${destino} sigue abierta con demanda 0`
        : `como ${origen} es la última fila sin tachar, se tacha la columna ${destino}`;
    return respuesta === 'ambas'
      ? `La oferta y la demanda se agotan a la vez (degeneración), pero solo se tacha una línea: si se tacharan las dos, la solución tendría menos de m + n − 1 celdas básicas. Por convención, ${regla}.`
      : `La oferta y la demanda se agotan a la vez (degeneración) y solo se tacha una línea. Por convención, ${regla}.`;
  }
  if (correcta === 'fila') {
    return `A ${destino} todavía le faltan ${fmt(demanda - q)}, así que su columna sigue abierta. La que se agotó es la oferta de ${origen}: se tacha solo su fila.`;
  }
  return `A ${origen} todavía le quedan ${fmt(oferta - q)}, así que su fila sigue abierta. La que quedó cubierta es la demanda de ${destino}: se tacha solo su columna.`;
}

/**
 * Revisa el valor de θ que da el estudiante. `entrada` es el paso en que entra la celda
 * (con su camino cerrado). Devuelve null si acierta o la explicación del error.
 */
export function diagnosticarTheta(p: Problema, entrada: Paso, respuesta: number): string | null {
  const ciclo = entrada.ciclo!;
  const theta = entrada.theta!;
  if (!Number.isFinite(respuesta) || respuesta < 0) return 'Escribe una cantidad: un número mayor o igual a 0.';
  if (cerca(respuesta, theta)) return null;

  const x = (c: Celda) => entrada.x[c.i][c.j];
  const negativas = ciclo.filter((_, k) => k % 2 === 1);
  const limite = negativas.find((c) => cerca(x(c), theta))!;
  if (negativas.some((c) => cerca(x(c), respuesta))) {
    return `${fmt(respuesta)} es el valor de una celda con signo −, pero no el menor. Si se restara ${fmt(respuesta)} en todas, ${nombreCelda(p, limite)}, que solo tiene ${fmt(theta)}, quedaría negativa.`;
  }
  if (ciclo.some((c, k) => k % 2 === 0 && k > 0 && cerca(x(c), respuesta))) {
    return `${fmt(respuesta)} es el valor de una celda con signo +. A esas celdas se les suma, así que no limitan: θ se busca solo entre las celdas con signo −.`;
  }
  const marginal = entrada.marginales?.[ciclo[0].i]?.[ciclo[0].j];
  if (marginal != null && cerca(respuesta, Math.abs(marginal))) {
    return `${fmt(respuesta)} es el costo marginal: cuánto cambia el costo por cada unidad. θ es otra cosa: cuántas unidades se mueven por el camino.`;
  }
  return respuesta > theta
    ? `Con θ = ${fmt(respuesta)}, alguna celda con signo − quedaría negativa. θ es lo máximo que se puede restar en todas ellas.`
    : 'Se puede mover más. θ es lo máximo que se puede restar en las celdas con signo − sin que ninguna quede negativa.';
}

/**
 * Revisa qué celda dice el estudiante que sale de la base. `entrada` es el paso en que
 * entra la celda. Devuelve null si acierta o la explicación del error.
 */
export function diagnosticarSalida(p: Problema, entrada: Paso, elegida: Celda): string | null {
  const ciclo = entrada.ciclo!;
  const theta = entrada.theta!;
  if (igual(elegida, entrada.sale!)) return null;
  if (igual(elegida, ciclo[0])) return 'Esa es la celda que entra a la base. Sale una de las que ya eran básicas.';

  const k = ciclo.findIndex((c) => igual(c, elegida));
  if (k < 0) {
    return entrada.basica[elegida.i][elegida.j]
      ? 'Esa celda no está en el camino cerrado: su valor no cambia, así que sigue en la base.'
      : 'Esa celda está vacía: no es básica, así que no puede salir de la base.';
  }
  const valor = entrada.x[elegida.i][elegida.j];
  if (k % 2 === 0) {
    return `${nombreCelda(p, elegida)} tiene signo +: se le suma θ y pasa de ${fmt(valor)} a ${fmt(valor + theta)}. Sale una celda con signo −, la que queda en 0.`;
  }
  if (!cerca(valor, theta)) {
    return `${nombreCelda(p, elegida)} tiene ${fmt(valor)}; al restarle θ = ${fmt(theta)} queda con ${fmt(valor - theta)} y sigue en la base. Sale la celda con signo − que queda en 0.`;
  }
  return `${nombreCelda(p, elegida)} también queda en 0, pero solo sale una celda. Aquí sale ${nombreCelda(p, entrada.sale!)} y esta se queda en la base con ε.`;
}

/**
 * true si `elegida` queda en 0 igual que la celda que sale (empate en θ). Cualquiera de las
 * empatadas podría salir: la respuesta es válida aunque la traza saque otra.
 */
export function empataSalida(entrada: Paso, elegida: Celda): boolean {
  const k = entrada.ciclo!.findIndex((c) => igual(c, elegida));
  return k % 2 === 1 && !igual(elegida, entrada.sale!) && cerca(entrada.x[elegida.i][elegida.j], entrada.theta!);
}

/** Recordatorio del criterio (primera pista del modo práctica). */
export function recordarCriterio(metodo: MetodoInicial, quedaUnaLinea: boolean): string {
  if (metodo === 'noroeste') {
    return 'Este método no mira los costos: busca la celda disponible de más arriba y más a la izquierda.';
  }
  if (metodo === 'costoMinimo' || quedaUnaLinea) {
    return 'Busca el menor costo entre todas las celdas que no están tachadas. Si hay empate, la que permite asignar más unidades.';
  }
  return 'Calcula, para cada fila y columna sin tachar, la diferencia entre sus dos menores costos. En la línea con la mayor diferencia, elige la celda más barata.';
}
