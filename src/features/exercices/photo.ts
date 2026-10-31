// Photo de référence : redimensionnée (1080 px max) et compressée en JPEG, stockée localement. Propriétaire : 03.
import { db } from '../../core/db';
import { maintenant } from '../../core/ids';

const COTE_MAX = 1080;

export async function compresserPhoto(fichier: File): Promise<Blob> {
  const img = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
  const r = Math.min(1, COTE_MAX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * r);
  canvas.height = Math.round(img.height * r);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('Compression impossible'))), 'image/jpeg', 0.75));
}

export const enregistrerPhoto = async (id: string, fichier: File) =>
  db.exercices.update(id, { photo: await compresserPhoto(fichier), modifieLe: maintenant() });

export const retirerPhoto = (id: string) => db.exercices.update(id, { photo: undefined, modifieLe: maintenant() });
