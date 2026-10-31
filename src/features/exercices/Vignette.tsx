// Petit visuel d'un exercice : photo perso, sinon image du catalogue, sinon corps avec les muscles.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { urlImage } from '../../data/catalogue';
import { CorpsMuscles } from './CorpsMuscles';

export function Vignette({ photo, catalogueId, groupes }: { photo?: Blob; catalogueId?: string; groupes: string[] }) {
  const urlPhoto = useMemo(() => (photo ? URL.createObjectURL(photo) : undefined), [photo]);
  useEffect(() => () => urlPhoto && URL.revokeObjectURL(urlPhoto), [urlPhoto]);
  const [echec, setEchec] = useState(false);
  useEffect(() => setEchec(false), [catalogueId]);
  const src = urlPhoto ?? (catalogueId && !echec ? urlImage(catalogueId) : undefined);
  return (
    <span class="ex-vignette" aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" decoding="async" onError={() => setEchec(true)} /> : <CorpsMuscles actifs={groupes} mini />}
    </span>
  );
}
