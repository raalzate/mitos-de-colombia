"""Convierte las animaciones de caída generadas con PixelLab (images/pixellab/fall/<id>/fNN.png, 96x96)
en tiras public/assets/anim/<id>_fall_{p1,p2}.png y las añade al manifiesto.
Quita fragmentos sueltos (<3 % del componente mayor). La variante p2 es el giro de tono de 150°.
Uso: python3 -I tools/import_pixellab.py"""
import json, glob, os
import numpy as np
import scipy.ndimage as ndi
from PIL import Image

SRC = "images/pixellab/fall"
OUT = "public/assets/anim"
CELL_H = 94  # el primer fotograma se pegó con los pies en la fila 93 del lienzo de 96

def clean(im):
    a = np.array(im.convert("RGBA"))
    al = a[:, :, 3] > 0
    lab, n = ndi.label(al)
    if n > 1:
        sizes = ndi.sum(al, lab, range(1, n + 1))
        keep = [i + 1 for i, z in enumerate(sizes) if z >= sizes.max() * 0.03]
        a[:, :, 3] = np.where(np.isin(lab, keep), a[:, :, 3], 0)
    a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(a)

def one_leg(im):
    """Patasola tiene una sola pierna: en los fotogramas de pie, bajo el vestido, si una fila tiene dos
    tramos opacos separados se borra el de la izquierda (la pierna trasera; mira a la derecha)."""
    a = np.array(im); al = a[:, :, 3] > 0
    ys = np.where(al.any(axis=1))[0]
    if ys.size == 0 or (ys.max() - ys.min()) < im.height * 0.55:
        return im   # tumbada o agachada: no se toca
    top = ys.min() + int((ys.max() - ys.min()) * 0.66)
    for y in range(ys.max(), top, -1):
        xs = np.where(al[y])[0]
        if xs.size == 0: continue
        segs = []; start = prev = xs[0]
        for x in xs[1:]:
            if x - prev > 1: segs.append((start, prev)); start = x
            prev = x
        segs.append((start, prev))
        segs = [g for g in segs if g[1] - g[0] >= 2]
        if len(segs) >= 2:
            a[y, segs[0][0]:segs[0][1] + 1, 3] = 0
    return clean(Image.fromarray(a))

def hue_shift(img, deg):
    hsv = np.array(img.convert("RGB").convert("HSV"))
    hsv[:, :, 0] = (hsv[:, :, 0].astype(int) + int(deg / 360 * 255)) % 255
    out = Image.fromarray(hsv, "HSV").convert("RGBA"); out.putalpha(img.getchannel("A")); return out

man = json.load(open(f"{OUT}/manifest.json"))
for d in sorted(glob.glob(f"{SRC}/*")):
    cid = os.path.basename(d)
    if cid not in man: continue
    frames = [clean(Image.open(f)).crop((0, 0, 96, CELL_H)) for f in sorted(glob.glob(f"{d}/f*.png"))]
    if cid == "patasola": frames = [one_leg(f) for f in frames]
    if len(frames) < 4: continue
    strip = Image.new("RGBA", (96 * len(frames), CELL_H), (0, 0, 0, 0))
    for i, f in enumerate(frames): strip.paste(f, (i * 96, 0), f)
    strip.save(f"{OUT}/{cid}_fall_p1.png")
    hue_shift(strip, 150).save(f"{OUT}/{cid}_fall_p2.png")
    # puntos clave de cada caída según la altura de la figura: el más bajo es «tumbado»; el vuelo
    # empieza cuando la figura baja del 90 % de su altura de pie
    hs = []
    for f in frames:
        bb = f.getbbox(); hs.append(bb[3] - bb[1] if bb else 0)
    n = len(frames)
    lying = min(range(3, n - 2), key=lambda i: hs[i])
    air = next((i for i in range(1, lying) if hs[i] < hs[0] * 0.9), lying - 1)
    air = max(1, min(air, lying - 1))
    # en el aire solo poses que conservan al menos el 55 % de la altura de pie (no tumbado flotando)
    tall = [i for i in range(air, lying) if hs[i] >= hs[0] * 0.55]
    air_end = max(tall) if tall else air
    if air_end < air: air = air_end
    if hs[air] < hs[0] * 0.55: air = air_end = max(1, air - 1)
    man[cid]["fall"] = {"frames": n, "w": 96, "h": CELL_H, "lying": lying, "air": air, "airEnd": air_end}
    print(cid, "fall", n, "air", air, "airEnd", air_end, "lying", lying)
json.dump(man, open(f"{OUT}/manifest.json", "w"), indent=1)
