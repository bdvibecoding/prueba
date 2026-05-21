"""
Add new exercises from the Videos Español folder.

For each entry in NEW_EXERCISES:
  - Copies source GIF into videos info/<group folder>/<slug>.gif
  - Extracts a middle-frame PNG thumbnail next to it
  - Either appends a new entry to data.js OR adds localVideo+localImg to an
    existing entry that matches by `n` field.
"""
import json, os, re, sys, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_ROOT = Path(r'C:\Users\bigde\Desktop\Videos Español')
VIDEOS_DIR = ROOT / 'videos info'
DATA_FILE = ROOT / 'data' / 'data.js'

# Group → destination folder name in 'videos info/'
GROUP_FOLDERS = {
    'Abductores':   'Abductores - Abductors',
    'Aductores':    'Adductores - Adductors',
    'Cardio':       'Cardio - Cardio',
    'Espalda Baja': 'Espalda - Back',
    'Glúteos':      'Glúteos - Glutes',
    'Hombros':      'Hombros - Shoulders',
    'Isquios':      'Isquiotibiales - Hamstrings',
    'Pecho':        'Pecho - Chest',
    'Trapecios':    'Espalda - Back',
    'Tríceps':      'Tríceps - Triceps',
    'Espalda Alta': 'Espalda - Back',
    'Cuádriceps':   'Cuádriceps - Quadriceps',
    'Abs':          'Abdomen - Abs',
    'Dorsales':     'Dorsales - Lats',
    'Bíceps':       'Bíceps - Biceps',
    'Gemelos':      'Pantorrillas - Calves',
}

# === NEW EXERCISES =====================================================
# Format: (name, muscle_group_display, target_token, secondary[], type c/i,
#         source_gif (rel to SRC_ROOT), slug, instructions[])
NEW_EXERCISES = [
    ('ABDUCCIÓN CON BANDA', 'Abductores', 'abductores', ['gluteos'], 'i',
     'abductor/abductores bandas.gif', 'abduccion_con_banda',
     ['Coloca una banda elástica alrededor de los tobillos o por encima de las rodillas.',
      'Ponte de pie con los pies a la anchura de las caderas y las rodillas ligeramente flexionadas.',
      'Activa el core y mantén el torso erguido durante todo el movimiento.',
      'Abre una pierna lateralmente sin rotar la cadera hasta sentir la contracción en el glúteo medio.',
      'Vuelve controlando la tensión de la banda sin dejar que la pierna pase la línea media.',
      'Completa las reps de un lado y cambia a la otra pierna.']),
    ('ABDUCCIÓN LIBRE EN SUELO', 'Abductores', 'abductores', ['gluteos'], 'i',
     'abductor/abductores libres.gif', 'abduccion_libre_suelo',
     ['Túmbate de lado con las piernas extendidas y alineadas con el torso.',
      'Apoya la cabeza sobre el brazo inferior y coloca la mano superior delante para estabilizar.',
      'Activa el glúteo medio y eleva la pierna superior manteniéndola extendida.',
      'Sube hasta sentir la contracción sin rotar la cadera ni inclinarte hacia atrás.',
      'Baja controladamente sin apoyar la pierna en la otra entre repeticiones.',
      'Completa las reps de un lado y cambia.']),
    ('ABDUCCIÓN MÁQUINA', 'Abductores', 'abductores', ['gluteos'], 'i',
     'abductor/abductores maquina.gif', 'abduccion_maquina',
     ['Siéntate en la máquina de abductores con la espalda completamente apoyada en el respaldo.',
      'Coloca las piernas dentro de los apoyos acolchados con las rodillas a 90 grados.',
      'Agarra los asideros laterales y activa el core para estabilizar la zona lumbar.',
      'Abre las piernas hacia fuera empujando con la cara externa de las rodillas.',
      'Mantén un segundo la contracción máxima en el glúteo medio.',
      'Cierra controlando la fase excéntrica sin dejar que las pesas choquen.']),

    ('ADUCCIÓN POLEA', 'Aductores', 'aductores', ['gluteos'], 'i',
     'adductores/adductor polea.gif', 'aduccion_polea',
     ['Engancha el tobillo a una polea baja con un tobillera y colócate de pie de lado a la torre.',
      'Sujétate con la mano más cercana a la máquina para mantener el equilibrio.',
      'Eleva ligeramente la pierna trabajada y mantén una ligera flexión de rodilla.',
      'Cruza la pierna por delante del cuerpo activando los aductores.',
      'Vuelve controlando la fase excéntrica sin dejar que la pesa baje del todo.',
      'Completa las reps y cambia de lado.']),
    ('ADUCTORES EN MÁQUINA', 'Aductores', 'aductores', ['gluteos'], 'i',
     'adductores/adductor maquina.gif', 'aductores_maquina',
     ['Siéntate en la máquina de aductores con la espalda apoyada en el respaldo.',
      'Coloca las piernas dentro de los apoyos acolchados separadas a la amplitud cómoda.',
      'Agarra los asideros laterales y activa el core.',
      'Cierra las piernas juntando los acolchados activando la cara interna del muslo.',
      'Mantén un segundo la contracción máxima.',
      'Regresa controlando la fase excéntrica.']),
    ('PLANCHA COPENHAGUE', 'Aductores', 'aductores', ['abs', 'oblicuos', 'core'], 'i',
     'adductores/plancha copenage.gif', 'plancha_copenhague',
     ['Túmbate de lado y apoya el codo bajo el hombro con el antebrazo en el suelo.',
      'Coloca la pierna superior sobre un banco bajo apoyando la cara interna del tobillo o rodilla.',
      'Eleva la cadera del suelo formando una línea recta con el cuerpo.',
      'Activa el aductor de la pierna superior empujando contra el banco.',
      'Mantén la pierna inferior elevada sin tocar el suelo durante el tiempo previsto.',
      'Descansa y cambia de lado.']),

    ('BICICLETA CROSS', 'Cardio', 'cardio', [], 'c',
     'cardio/bici cross.gif', 'bicicleta_cross',
     ['Ajusta el asiento de la bicicleta para que la rodilla quede ligeramente flexionada al pedalear.',
      'Coloca los pies bien apoyados sobre los pedales con los empeines paralelos al suelo.',
      'Agarra el manillar con las muñecas neutras y el torso ligeramente inclinado hacia delante.',
      'Pedalea a ritmo constante manteniendo la respiración controlada.',
      'Mantén el core activo y la espalda en posición neutra.',
      'Continúa el tiempo previsto.']),
    ('BICICLETA ESTÁTICA', 'Cardio', 'cardio', [], 'c',
     'cardio/bici.gif', 'bicicleta_estatica',
     ['Ajusta la altura del asiento para que la pierna quede casi extendida con el pedal abajo.',
      'Apoya los pies sobre los pedales y agarra el manillar con las manos relajadas.',
      'Mantén la espalda recta y el core activado durante todo el ejercicio.',
      'Pedalea a un ritmo constante respirando de forma regular.',
      'Ajusta la resistencia para mantener la intensidad prevista.',
      'Continúa el tiempo previsto sin perder la cadencia.']),
    ('CINTA DE CORRER', 'Cardio', 'cardio', [], 'c',
     'cardio/cinta.gif', 'cinta_de_correr',
     ['Súbete a la cinta con la máquina detenida y agarra los asideros para iniciarla.',
      'Selecciona la velocidad adecuada al objetivo (caminar, trotar, correr).',
      'Mantén el torso erguido y mira al frente, no a los pies.',
      'Apoya el talón primero y empuja con el dedo gordo en cada zancada.',
      'Acompaña con un movimiento natural de brazos sin agarrarte a los asideros.',
      'Corre o camina el tiempo previsto.']),
    ('CINTA INCLINADA', 'Cardio', 'cardio', ['gluteos', 'cuadriceps'], 'c',
     'cardio/cinta inclinada.gif', 'cinta_inclinada',
     ['Configura la cinta con una inclinación entre 5% y 12% según objetivo.',
      'Camina a un ritmo cómodo manteniendo el torso erguido.',
      'No te agarres a los asideros para que el esfuerzo sea real.',
      'Apoya bien todo el pie y empuja desde el glúteo en cada paso.',
      'Mantén respiración controlada y constante.',
      'Continúa el tiempo previsto sin reducir la inclinación.']),
    ('ESCALADOR (STAIRMASTER)', 'Cardio', 'cardio', ['gluteos', 'cuadriceps'], 'c',
     'cardio/escaleras.gif', 'escalador_stairmaster',
     ['Súbete a la máquina y agarra los asideros sin descargar el peso en ellos.',
      'Selecciona la velocidad adecuada para mantener un ritmo continuo.',
      'Mantén el torso erguido y el core activado durante todo el ejercicio.',
      'Sube cada escalón pisando con todo el pie, no solo con la punta.',
      'Empuja con el glúteo en cada paso para activar la cadena posterior.',
      'Continúa el tiempo previsto sin apoyarte fuertemente en los asideros.']),

    ('HIPEREXTENSIÓN ESPALDA BAJA', 'Espalda Baja', 'espalda_baja', ['gluteos', 'isquios'], 'i',
     'espalda baja/hiperextenson espalda baja.gif', 'hiperextension_espalda_baja',
     ['Colócate en la máquina de hiperextensiones a 45 o 90 grados.',
      'Ajusta los apoyos para que la cadera quede justo en el borde del soporte.',
      'Cruza los brazos sobre el pecho o sostén un disco si necesitas más resistencia.',
      'Desciende flexionando la cadera sin redondear la espalda lumbar.',
      'Sube extendiendo la cadera activando glúteos y lumbares sin hiperextender.',
      'Repite hasta las reps previstas.']),
    ('EXTENSIÓN LUMBAR MÁQUINA', 'Espalda Baja', 'espalda_baja', ['gluteos'], 'i',
     'espalda baja/espalda baja maquina.gif', 'extension_lumbar_maquina',
     ['Siéntate en la máquina de extensión lumbar con la espalda apoyada en el respaldo.',
      'Ajusta el cinturón sobre las caderas si lo tiene para mantenerte fijo.',
      'Cruza los brazos sobre el pecho o agarra los asideros laterales.',
      'Empuja el respaldo hacia atrás activando los erectores espinales.',
      'Vuelve controladamente sin dejar que la espalda caiga hacia delante.',
      'Repite hasta las reps previstas.']),

    ('EXTENSIÓN DE CADERA MÁQUINA', 'Glúteos', 'gluteos', ['isquios'], 'i',
     'gluteos/extension de cadera maquina.gif', 'extension_cadera_maquina',
     ['Colócate en la máquina de extensión de cadera apoyando el muslo trabajado en el acolchado.',
      'Agarra los asideros y mantén el torso pegado al respaldo.',
      'Activa el glúteo y empuja la pierna hacia atrás extendiendo la cadera.',
      'Aprieta un segundo en la posición de máxima contracción.',
      'Regresa controladamente sin dejar que la pesa choque.',
      'Completa las reps y cambia de pierna.']),
    ('HIP THRUST MÁQUINA', 'Glúteos', 'gluteos', ['isquios'], 'c',
     'gluteos/hip thrust maquina.gif', 'hip_thrust_maquina',
     ['Siéntate en la máquina de hip thrust con la espalda alta apoyada en el respaldo.',
      'Coloca el acolchado sobre la cadera y asegura los pies en la plataforma a la anchura de los hombros.',
      'Agarra los asideros laterales y activa el core.',
      'Empuja la cadera hacia arriba apretando los glúteos hasta la extensión completa.',
      'Mantén un segundo la contracción sin sobre-extender la espalda.',
      'Baja controladamente hasta justo antes de tocar abajo y repite.']),
    ('PESO MUERTO HEXAGONAL', 'Glúteos', 'gluteos', ['isquios', 'espalda_baja', 'cuadriceps'], 'c',
     'gluteos/peso muerto hexagonal.gif', 'peso_muerto_hexagonal',
     ['Sitúate en el centro de la barra hexagonal con los pies a la anchura de los hombros.',
      'Agarra las asas laterales con las manos en posición neutra y el torso erguido.',
      'Mantén el pecho elevado, la espalda neutra y los hombros ligeramente atrás.',
      'Empuja el suelo con los pies extendiendo caderas y rodillas a la vez.',
      'Termina con caderas completamente extendidas sin hiperextender la espalda.',
      'Desciende controlando la fase excéntrica hasta apoyar la barra.']),

    ('ELEVACIONES LATERALES MÁQUINA', 'Hombros', 'hombros', ['hombros_frontal'], 'i',
     'hombros/elevaciones maquina.gif', 'elevaciones_laterales_maquina',
     ['Siéntate en la máquina de elevaciones laterales con la espalda apoyada.',
      'Coloca los brazos bajo los acolchados con los codos a 90 grados.',
      'Activa el core y mantén los hombros bajos durante todo el movimiento.',
      'Eleva los brazos hacia los lados hasta llegar a la altura de los hombros.',
      'Aprieta un segundo el deltoides medio en la posición máxima.',
      'Baja controlando la fase excéntrica sin dejar que la pesa caiga.']),
    ('ELEVACIONES POLEA DOBLE', 'Hombros', 'hombros', [], 'i',
     'hombros/elevaciones polea doble.gif', 'elevaciones_polea_doble',
     ['Ajusta dos poleas a la altura más baja y agarra cada cable con la mano contraria por delante del cuerpo.',
      'Ponte de pie con los pies a la anchura de los hombros y los brazos cruzados delante.',
      'Activa el core y mantén una ligera flexión de codo.',
      'Eleva los brazos lateralmente abriendo los cables hasta la altura de los hombros.',
      'Mantén un segundo la contracción del deltoides medio.',
      'Regresa controlando la fase excéntrica con tensión constante.']),

    ('CURL NÓRDICO', 'Isquios', 'isquios', ['gluteos'], 'c',
     'isquios/curl nordico.gif', 'curl_nordico',
     ['Arrodíllate en una superficie acolchada con un compañero o anclaje sujetándote los tobillos firmemente.',
      'Mantén el torso recto y el core activado en línea con los muslos.',
      'Desciende lentamente hacia el suelo controlando la fase excéntrica con los isquios.',
      'Atrasa el momento de tocar el suelo con las manos lo máximo posible.',
      'Apoya las manos al final del descenso y usa los brazos para volver.',
      'Repite hasta las reps previstas.']),

    ('CRUCE POLEAS ALTOS', 'Pecho', 'pecho', ['hombros_frontal'], 'i',
     'pecho/cruces de pecho altos.gif', 'cruce_poleas_altos',
     ['Ajusta las dos poleas a la altura más alta y agarra los cables con cada mano.',
      'Da un paso adelante con un pie y mantén el torso ligeramente inclinado.',
      'Mantén los codos ligeramente flexionados durante todo el movimiento.',
      'Lleva las manos al frente cruzándolas a la altura del abdomen activando la parte inferior del pecho.',
      'Aprieta un segundo en la posición de máxima contracción.',
      'Regresa controladamente sin dejar que los brazos pasen detrás del torso.']),
    ('CRUCE POLEAS BAJOS', 'Pecho', 'pecho', ['hombros_frontal'], 'i',
     'pecho/cruces de pecho bajos.gif', 'cruce_poleas_bajos',
     ['Ajusta las dos poleas a la altura más baja y agarra los cables con cada mano.',
      'Da un paso adelante con un pie y mantén el torso ligeramente inclinado.',
      'Mantén los codos ligeramente flexionados durante todo el movimiento.',
      'Lleva las manos hacia arriba cruzándolas a la altura del pecho activando la parte superior.',
      'Aprieta un segundo en la posición de máxima contracción.',
      'Regresa controladamente sin dejar que los brazos pasen detrás del torso.']),

    ('FLEXIONES ESCÁPULA', 'Espalda Alta', 'espalda_alta', ['core'], 'i',
     'serratos/flexiones escapula.gif', 'flexiones_escapula',
     ['Colócate en posición de plancha alta con las manos a la anchura de los hombros.',
      'Mantén los brazos extendidos y el cuerpo en línea recta de los pies a la cabeza.',
      'Activa el core y los glúteos para evitar que la cadera caiga.',
      'Sin flexionar los codos, junta las escápulas dejando que el pecho baje ligeramente.',
      'Empuja el suelo separando las escápulas y elevando la espalda alta.',
      'Repite hasta las reps previstas.']),

    ('ENCOGIMIENTOS CON BARRA', 'Trapecios', 'espalda_alta', [], 'i',
     'trapecios/trapecios discos.gif', 'encogimientos_barra',
     ['Sostén una barra con las manos a la anchura de los hombros en pronación.',
      'Ponte de pie con la espalda recta, el core activado y los brazos extendidos.',
      'Eleva los hombros hacia las orejas activando el trapecio sin flexionar los codos.',
      'Aprieta un segundo en la posición de máxima contracción.',
      'Baja controladamente sin rebotar.',
      'Repite hasta las reps previstas.']),
    ('ENCOGIMIENTOS POLEA', 'Trapecios', 'espalda_alta', [], 'i',
     'trapecios/trapecios polea.gif', 'encogimientos_polea',
     ['Ajusta una polea a la altura más baja y conecta una barra recta.',
      'Agarra la barra con las dos manos a la anchura de los hombros en pronación.',
      'Da un paso atrás y mantén los brazos extendidos a los lados del cuerpo.',
      'Eleva los hombros hacia las orejas sin flexionar los codos.',
      'Aprieta un segundo en la posición de máxima contracción.',
      'Baja controladamente sin que las pesas choquen.']),
    ('ENCOGIMIENTOS MÁQUINA', 'Trapecios', 'espalda_alta', [], 'i',
     'trapecios/trapecios maquina.gif', 'encogimientos_maquina',
     ['Siéntate o colócate de pie en la máquina de encogimientos según el modelo.',
      'Agarra los asideros con los brazos extendidos a los lados.',
      'Mantén la espalda recta y el core activado.',
      'Eleva los hombros hacia las orejas sin flexionar los codos.',
      'Aprieta un segundo en la posición de máxima contracción.',
      'Baja controladamente sin rebotar.']),

    ('FLEXIONES DIAMANTE', 'Tríceps', 'triceps', ['pecho', 'hombros'], 'c',
     'triceps/flexiones diamante.gif', 'flexiones_diamante',
     ['Colócate en posición de plancha alta con las manos juntas formando un diamante con pulgares e índices bajo el pecho.',
      'Mantén el cuerpo en línea recta de los pies a la cabeza con el core activado.',
      'Flexiona los codos pegándolos al torso para bajar el pecho hacia las manos.',
      'Mantén los codos cerca del cuerpo durante todo el descenso.',
      'Empuja el suelo extendiendo los codos para volver a la posición inicial.',
      'Repite hasta las reps previstas.']),
    ('EXTENSIÓN POLEA BARRA V', 'Tríceps', 'triceps', [], 'i',
     'triceps/extension triceps v.gif', 'extension_polea_barra_v',
     ['Conecta una barra V a una polea alta y agárrala con las manos en posición neutra.',
      'Da un paso atrás manteniendo los codos pegados al torso.',
      'Inclina ligeramente el torso hacia delante con el core activado.',
      'Extiende los codos llevando la barra hacia abajo hasta extensión completa.',
      'Aprieta un segundo el tríceps en la contracción máxima.',
      'Regresa controlando la fase excéntrica sin que los codos se separen del cuerpo.']),
    ('FONDOS BANCO', 'Tríceps', 'triceps', ['hombros'], 'c',
     'triceps/fondos triceps banco.gif', 'fondos_banco',
     ['Siéntate en el borde de un banco apoyando las manos a los lados de las caderas.',
      'Estira las piernas hacia delante o flexiona las rodillas a 90 grados según nivel.',
      'Desplaza la cadera fuera del banco manteniendo los brazos extendidos.',
      'Flexiona los codos descendiendo la cadera hasta que los brazos formen 90 grados.',
      'Empuja el banco extendiendo los codos para volver a la posición inicial.',
      'Repite hasta las reps previstas.']),
]

# === EXISTING EXERCISES that just need a localVideo/localImg ============
# Format: (name_in_data_js, source_gif, slug, group)
UPDATE_EXISTING = [
    ('PESO MUERTO SUMO',       'gluteos/peso muerto sumo.gif', 'peso_muerto_sumo',    'Glúteos'),
    ('PRENSA DE PIERNAS 45º',  'gluteos/prensa 45 .gif',       'prensa_piernas_45',   'Glúteos'),
]


def copy_and_thumb(src_rel, group, slug):
    src = SRC_ROOT / src_rel
    if not src.exists():
        return None, None, f'source missing: {src}'
    dst_folder = VIDEOS_DIR / GROUP_FOLDERS[group]
    dst_folder.mkdir(parents=True, exist_ok=True)
    gif_dst = dst_folder / (slug + '.gif')
    thumb_dst = dst_folder / (slug + '_thumb.png')

    shutil.copy2(src, gif_dst)
    try:
        img = Image.open(gif_dst)
        n_frames = getattr(img, 'n_frames', 1)
        try: img.seek(max(0, n_frames // 2))
        except EOFError: img.seek(0)
        img.convert('RGB').save(thumb_dst, 'PNG', optimize=True)
    except Exception as e:
        return None, None, f'thumb failed: {e}'

    gif_rel = ('videos info/' + GROUP_FOLDERS[group] + '/' + slug + '.gif')
    thumb_rel = ('videos info/' + GROUP_FOLDERS[group] + '/' + slug + '_thumb.png')
    return gif_rel, thumb_rel, None


# === Run ===============================================================
src = DATA_FILE.read_text(encoding='utf-8')

new_entries = []
added = 0
failed = 0
skipped = 0

for tup in NEW_EXERCISES:
    name, group, target, sec, etype, src_rel, slug, instructions = tup
    if f'"{name}"' in src:
        print(f'[SKIP] already in data.js: {name}')
        skipped += 1
        continue
    gif_rel, thumb_rel, err = copy_and_thumb(src_rel, group, slug)
    if err:
        print(f'[FAIL] {name}: {err}')
        failed += 1
        continue
    sec_str = ', '.join(f'"{s}"' for s in sec)
    ins_str = ', '.join(f'"{ins}"' for ins in instructions)
    entry = (f'{{ n: "{name}", img: "{target}.png", m: "{group}", t: "{etype}", '
             f'target: "{target}", sec: [{sec_str}], '
             f'instructions: [{ins_str}], v: "", '
             f'localVideo: "{gif_rel}", localImg: ["{thumb_rel}"] }}')
    new_entries.append(entry)
    print(f'[ADD]  {name}')
    added += 1

# Update existing entries
updated_existing = 0
for name, src_rel, slug, group in UPDATE_EXISTING:
    if f'"{name}"' not in src:
        print(f'[?]   not in data.js: {name}')
        continue
    pat = re.compile(r'(\{\s*n:\s*"' + re.escape(name) + r'"[^{}]*?)(\})', re.DOTALL)
    m = pat.search(src)
    if not m:
        print(f'[?]   pattern not matched: {name}')
        continue
    if 'localVideo:' in m.group(1):
        print(f'[=]   already has localVideo: {name}')
        continue
    gif_rel, thumb_rel, err = copy_and_thumb(src_rel, group, slug)
    if err:
        print(f'[FAIL update] {name}: {err}')
        continue
    inject = f', localVideo: "{gif_rel}", localImg: ["{thumb_rel}"]'
    src = pat.sub(lambda mm: mm.group(1) + inject + mm.group(2), src, count=1)
    print(f'[UPD] {name}')
    updated_existing += 1

# Append new entries before closing ];
if new_entries:
    closing = src.rfind('];')
    insertion = '\n\n// --- NUEVOS EJERCICIOS ---\n' + ',\n'.join(new_entries) + ',\n\n'
    src = src[:closing] + insertion + src[closing:]

DATA_FILE.write_text(src, encoding='utf-8')

print('-' * 60)
print(f'New exercises added:      {added}')
print(f'Existing entries updated: {updated_existing}')
print(f'Skipped (already exist):  {skipped}')
print(f'Failed:                   {failed}')
