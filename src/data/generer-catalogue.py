"""Génère src/data/catalogue-donnees.ts et public/catalogue/*.webp depuis free-exercise-db.

Source : https://github.com/yuhonas/free-exercise-db (Unlicense, domaine public).
Usage : python3 src/data/generer-catalogue.py  (réseau requis, Pillow installé)
On ne garde que les catégories « strength » et « powerlifting ».
"""
import concurrent.futures as cf, io, json, os, urllib.request
from PIL import Image

RACINE = os.path.dirname(os.path.abspath(__file__))
BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/'
MUSCLES = {
    'abdominals': 'abdos', 'abductors': 'abducteurs', 'adductors': 'adducteurs', 'biceps': 'biceps',
    'calves': 'mollets', 'chest': 'pectoraux', 'forearms': 'avant-bras', 'glutes': 'fessiers',
    'hamstrings': 'ischios', 'lats': 'dos', 'lower back': 'lombaires', 'middle back': 'dos',
    'neck': 'trapezes', 'quadriceps': 'quadriceps', 'shoulders': 'epaules', 'traps': 'trapezes', 'triceps': 'triceps',
}
EQUIPEMENT = {
    'barbell': 'barre', 'e-z curl bar': 'barre', 'dumbbell': 'halteres', 'cable': 'poulie', 'machine': 'machine',
    'body only': 'poids_du_corps', 'kettlebells': 'kettlebell',
}
NIVEAU = {'beginner': 1, 'intermediate': 2, 'expert': 3}


def uniques(xs):
    return list(dict.fromkeys(xs))


def image(chemin, dst):
    if os.path.exists(dst):
        return
    data = urllib.request.urlopen(BASE + 'exercises/' + chemin, timeout=30).read()
    img = Image.open(io.BytesIO(data)).convert('RGB')
    img.thumbnail((360, 360))
    img.save(dst, 'WEBP', quality=60, method=6)


def main():
    brut = json.load(urllib.request.urlopen(BASE + 'dist/exercises.json', timeout=60))
    garde = [x for x in brut if x['category'] in ('strength', 'powerlifting')]
    sortie = []
    for x in sorted(garde, key=lambda x: x['name'].lower()):
        p = uniques(MUSCLES[m] for m in x['primaryMuscles'])
        s = [m for m in uniques(MUSCLES[m] for m in x['secondaryMuscles']) if m not in p]
        sortie.append({
            'id': x['id'], 'nom': x['name'], 'eq': EQUIPEMENT.get(x['equipment'] or '', 'autre'),
            'niv': NIVEAU.get(x['level'], 1), 'p': p, 's': s, 'inst': x['instructions'], 'img': min(2, len(x['images'])),
        })
    texte = json.dumps(json.dumps(sortie, ensure_ascii=False, separators=(',', ':')), ensure_ascii=False)
    with open(os.path.join(RACINE, 'catalogue-donnees.ts'), 'w', encoding='utf-8') as f:
        f.write('// Généré par generer-catalogue.py depuis free-exercise-db (domaine public). Ne pas modifier à la main.\n')
        f.write("import type { EntreeCatalogue } from './catalogue';\n\n")
        f.write(f'const CATALOGUE: EntreeCatalogue[] = JSON.parse({texte});\nexport default CATALOGUE;\n')
    dossier = os.path.join(RACINE, '..', '..', 'public', 'catalogue')
    os.makedirs(dossier, exist_ok=True)
    taches = [(im, os.path.join(dossier, f"{x['id']}-{i}.webp")) for x in garde for i, im in enumerate(x['images'][:2])]
    with cf.ThreadPoolExecutor(16) as ex:
        list(ex.map(lambda t: image(*t), taches))
    print(len(sortie), 'exercices,', len(taches), 'images')


if __name__ == '__main__':
    main()
