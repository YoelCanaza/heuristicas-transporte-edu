import type { MetodoInicial } from './metodos';
import type { Celda, Paso, Problema } from './tipos';
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
