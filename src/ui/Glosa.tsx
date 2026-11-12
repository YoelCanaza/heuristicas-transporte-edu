import { GLOSARIO } from '../contenido/glosario';

interface Coincidencia {
  inicio: number;
  fin: number;
  definicion: string;
}

/** Primera aparición de cada término del glosario en el texto, sin solapamientos. */
function buscarTerminos(texto: string): Coincidencia[] {
  const halladas: Coincidencia[] = [];
  for (const t of GLOSARIO) {
    const m = t.patron?.exec(texto);
    if (m) halladas.push({ inicio: m.index, fin: m.index + m[0].length, definicion: t.definicion });
  }
  halladas.sort((a, b) => a.inicio - b.inicio);
  return halladas.filter((c, k) => k === 0 || c.inicio >= halladas[k - 1].fin);
}

/** Párrafo cuyos términos técnicos muestran su definición al pasar el cursor o enfocarlos. */
export function TextoConGlosario({ texto }: { texto: string }) {
  const terminos = buscarTerminos(texto);
  const partes: React.ReactNode[] = [];
  let cursor = 0;
  terminos.forEach((c, k) => {
    partes.push(texto.slice(cursor, c.inicio));
    partes.push(
      <span key={k} className="termino" tabIndex={0}>
        {texto.slice(c.inicio, c.fin)}
        <span className="termino-def" role="tooltip">
          {c.definicion}
        </span>
      </span>,
    );
    cursor = c.fin;
  });
  partes.push(texto.slice(cursor));
  return <p className="con-glosario">{partes}</p>;
}
