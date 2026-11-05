"""Convierte los movimientos de pelea generados con PixelLab (tools/gen_pixellab_moves.py) en tiras del juego.

Entrada: images/pixellab/<accion>/<id>/fNN.png (96x96, f00 = referencia de guardia), accion = idle | punch | kick.
Opcional: images/pixellab/<accion>/<id>/keep.json = {"keep": [0, 4, 5, 6], "hit": 2} con los fotogramas
originales aceptados tras revisarlos a ojo (se descartan los que cambian el diseño, tienen fantasmas o
anatomía rota) y el índice de impacto dentro de la tira. Sin keep.json se usan todos, quitando los repetidos.
"source": "combo" toma los fotogramas de images/pixellab/combo/<id> (petición puño+patada en una sola);
"strip_fx": [tono mín, tono máx, saturación mín, brillo mín] borra efectos que PixelLab pintó (chispas) por color.

Limpieza (la misma que import_pixellab.py): fragmentos sueltos, alfa a 0/255, restos claros en el borde; a Juan
Machete se le quita el aura naranja (fix_sprites.strip_aura) y se rellenan huecos. Nunca se mezclan fotogramas.
Salida: public/assets/anim/<id>_<accion>_{p1,p2}.png (celdas 96x94, pies en la fila 93; p2 = tono +150°),
entrada en manifest.json (frames, w, h, hit para golpes, fps para el reposo) y src/art/drawnAnimManifest.ts.
Después: python3 -I tools/measure_anim.py

Alta resolución (piloto 2x): images/pixellab/hires/<accion>/<id>/fNN.png (lienzo 96*res, pies en la fila
CELL_H*res - 1; tools/gen_pixellab_hires.py) con keep.json {"keep": [...], "res": 2}. Se limpia igual, la celda
es (96*res)x(CELL_H*res) y la entrada del manifiesto lleva "res": el juego la dibuja a 1/res (la misma talla
lógica, el doble de detalle en el lienzo 2x). Reemplaza la tira de esa acción (idle, walk, punch, kick); las
acciones sin versión en alta se quedan con la de siempre.

Uso: python3 -I tools/import_pixellab_moves.py [id ...]   (desde project/game; sin ids, todos)"""
import glob, json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_pixellab import clean, hue_shift, one_leg, CELL_H  # noqa: E402
from fix_sprites import strip_aura, fill_holes, hsv_of  # noqa: E402
from write_anim_manifest import main as write_manifest  # noqa: E402

SRC = "images/pixellab"
HIRES = "images/pixellab/hires"
HIRES_ACTIONS = ("idle", "walk", "punch", "kick")
OUT = "public/assets/anim"
ACTIONS = ("idle", "punch", "kick")
IDLE_FPS = 8
WHITE_EDGE = ("llorona",)  # vestido blanco hasta el borde: solo se quitan claros mucho más claros que el interior


def halo(a, strict):
    """Restos claros del fondo en el borde (como tools/clean_halo.py), 2 pasadas."""
    a = a.astype(int)
    for _ in range(2):
        al = a[:, :, 3] > 0
        rgb = a[:, :, :3]
        lum = rgb.mean(axis=2); sat = rgb.max(axis=2) - rgb.min(axis=2)
        pad = np.pad(al, 1)
        edge = al & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
        lp = np.pad(np.where(al, lum, 0), 1); cp = np.pad(al.astype(int), 1)
        nsum = lp[:-2, 1:-1] + lp[2:, 1:-1] + lp[1:-1, :-2] + lp[1:-1, 2:]
        ncnt = cp[:-2, 1:-1] + cp[2:, 1:-1] + cp[1:-1, :-2] + cp[1:-1, 2:]
        nlum = np.where(ncnt > 0, nsum / np.maximum(ncnt, 1), 255)
        kill = edge & (lum > 150) & (sat < 40) & (lum - nlum > 55)
        if strict:
            kill |= edge & (lum > 200) & (sat < 30)
        kill |= al & (ncnt <= 1)
        a[kill, 3] = 0
    return a.astype(np.uint8)


def strip_fx(a, rule):
    """Borra los píxeles del efecto (tono en [h0, h1], saturación >= s0 y brillo >= v0: el pelo negro azulado
    se queda); los restos sueltos los quita clean()."""
    h0, h1, s0, v0 = (list(rule) + [0])[:4]
    h, s, v = hsv_of(a)
    a[(a[:, :, 3] > 0) & (h >= h0) & (h <= h1) & (s >= s0) & (v >= v0), 3] = 0


def prepare(cid, path, fx=None, res=1):
    a = np.array(clean(Image.open(path)))
    if fx:
        strip_fx(a, fx)
        a = np.array(clean(Image.fromarray(a)))
    if cid == "juanmachete":
        strip_aura(a)
    a = halo(a, not cid.startswith(WHITE_EDGE))
    fill_holes(a)
    im = clean(Image.fromarray(a)).crop((0, 0, 96 * res, CELL_H * res))
    return one_leg(im) if cid == "patasola" else im


def same(a, b):
    return (np.array(a)[:, :, 3] > 0).tolist() == (np.array(b)[:, :, 3] > 0).tolist() and \
        np.abs(np.array(a).astype(int) - np.array(b).astype(int)).max() < 8


def reach(im):
    """Hasta dónde llega el cuerpo hacia delante (mira a la derecha)."""
    bb = im.getbbox()
    return bb[2] if bb else 0


def import_one(man, cid, action):
    d = f"{SRC}/{action}/{cid}"
    sel = json.load(open(f"{d}/keep.json")) if os.path.exists(f"{d}/keep.json") else {}
    if sel.get("disabled"):
        # tira rechazada: se quita del manifiesto y el juego vuelve a la tira `attack`
        if man.get(cid, {}).pop(action, None) is not None:
            print(cid, action, "desactivada:", sel.get("note", ""))
        for slot in ("p1", "p2"):
            path = f"{OUT}/{cid}_{action}_{slot}.png"
            if os.path.exists(path):
                os.remove(path)
        return False
    files = sorted(glob.glob(f"{SRC}/{sel.get('source', action)}/{cid}/f*.png"))
    if not files or cid not in man:
        return False
    keep = sel.get("keep", list(range(len(files))))
    frames = []
    for k in keep:
        im = prepare(cid, files[k], sel.get("strip_fx"))
        if frames and same(frames[-1], im):
            continue  # el mismo dibujo repetido no aporta movimiento
        frames.append(im)
    if action != "idle" and len(frames) > 1 and same(frames[-1], frames[0]):
        frames.pop()  # el golpe vuelve a la guardia: la guardia ya es el fotograma 0
    if len(frames) < 2:
        return False
    strip = Image.new("RGBA", (96 * len(frames), CELL_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * 96, 0), f)
    strip.save(f"{OUT}/{cid}_{action}_p1.png")
    hue_shift(strip, 150).save(f"{OUT}/{cid}_{action}_p2.png")
    entry = {"frames": len(frames), "w": 96, "h": CELL_H}
    if action == "idle":
        entry["fps"] = sel.get("fps", IDLE_FPS)
    else:
        entry["hit"] = sel.get("hit", max(range(1, len(frames)), key=lambda i: reach(frames[i])))
    man[cid][action] = entry
    print(cid, action, entry)
    return True


def import_hires(man, cid, action):
    """Tira de alta resolución (keep.json con "res"): reemplaza la de esa acción en el manifiesto."""
    d = f"{HIRES}/{action}/{cid}"
    if not os.path.exists(f"{d}/keep.json") or cid not in man:
        return False
    sel = json.load(open(f"{d}/keep.json"))
    res = int(sel.get("res", 2))
    files = sorted(glob.glob(f"{d}/f*.png"))
    frames = []
    for k in sel.get("keep", list(range(len(files)))):
        im = prepare(cid, files[k], sel.get("strip_fx"), res)
        if frames and same(frames[-1], im):
            continue
        frames.append(im)
    if action in ("punch", "kick") and len(frames) > 1 and same(frames[-1], frames[0]):
        frames.pop()
    if len(frames) < 2:
        return False
    w, h = 96 * res, CELL_H * res
    strip = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * w, 0), f)
    strip.save(f"{OUT}/{cid}_{action}_p1.png")
    hue_shift(strip, 150).save(f"{OUT}/{cid}_{action}_p2.png")
    entry = {"frames": len(frames), "w": w, "h": h, "res": res}
    if action == "idle":
        entry["fps"] = sel.get("fps", IDLE_FPS)
    elif action in ("punch", "kick"):
        entry["hit"] = sel.get("hit", max(range(1, len(frames)), key=lambda i: reach(frames[i])))
    man[cid][action] = entry
    print(cid, action, "(alta)", entry)
    return True


def main():
    ids = sys.argv[1:]
    man = json.load(open(f"{OUT}/manifest.json"))
    for action in ACTIONS:
        for d in sorted(glob.glob(f"{SRC}/{action}/*")):
            cid = os.path.basename(d)
            if not ids or cid in ids:
                import_one(man, cid, action)
    for action in HIRES_ACTIONS:
        for d in sorted(glob.glob(f"{HIRES}/{action}/*")):
            cid = os.path.basename(d)
            if not ids or cid in ids:
                import_hires(man, cid, action)
    json.dump(man, open(f"{OUT}/manifest.json", "w"), indent=1)
    write_manifest()


if __name__ == "__main__":
    main()
