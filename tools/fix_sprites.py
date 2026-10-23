"""Limpia las tiras de pelea: rellena los huecos transparentes dentro del cuerpo (se veía el fondo por la
boca, el pelo o las manos) y le quita a Juan Machete el aura naranja que rodea su contorno.
Solo cambia píxeles: rellena con el color de los vecinos opacos, nunca mezcla fotogramas.
Uso: python3 -I tools/fix_sprites.py public/assets/anim [--dry]   (una sola vez sobre las tiras recién generadas)"""
import glob, os, sys, colorsys
import numpy as np
from PIL import Image
from scipy import ndimage

AURA = ("juanmachete",)


def frames_of(path):
    """Ancho de fotograma a partir del manifiesto, para no rellenar entre fotogramas vecinos."""
    import json
    m = json.load(open(os.path.join(os.path.dirname(path), "manifest.json")))
    base = os.path.basename(path)[:-4]
    cid, rest = base.split("_", 1)
    action = rest.rsplit("_", 1)[0]
    return m[cid][action]["w"]


OUTLINE = (42, 24, 14)


def hsv_of(a):
    rgb = a[:, :, :3].astype(float) / 255
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    v = mx
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, s, v


def strip_aura(a):
    """El aura de fuego de Juan es mucho más brillante que su piel (valor >= 0.9 contra <= 0.8) y está
    pegada al borde: se quita todo ese naranja brillante cerca de lo transparente (también el que se mete
    entre el brazo y el cuerpo) y el borde que queda cálido se oscurece como contorno."""
    h, s, v = hsv_of(a)
    warm = (h <= 60) | (h >= 340)
    al = a[:, :, 3] > 0
    near = ndimage.distance_transform_edt(al) <= 7
    # el destello amarillo pálido que quedó pintado en algunos cuadros de la caída
    flash = (h >= 40) & (h <= 70) & (v > 0.9) & (s > 0.15)
    gone = al & near & ((warm & (v > 0.88) & (s > 0.28)) | flash)
    a[gone, 3] = 0
    removed = int(gone.sum())
    # chispas sueltas del aura que quedaron flotando lejos del cuerpo
    lab, n = ndimage.label(a[:, :, 3] > 0, structure=np.ones((3, 3)))
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        for k, size in enumerate(sizes, 1):
            if size < 20:
                a[lab == k, 3] = 0
                removed += int(size)
    al = a[:, :, 3] > 0
    edge = al & ~ndimage.binary_erosion(al, structure=np.ones((3, 3)), border_value=0)
    dark = edge & warm & (v > 0.75) & (s > 0.25)
    a[dark, :3] = OUTLINE
    return removed + int(dark.sum())


# destellos que PixelLab dejó pintados en algunas caídas: (tono mín, tono máx, saturación mín, saturación máx, valor mín)
FLASHES = {
    "bachue_fall": [(150, 210, 0.05, 0.6, 0.78), (0, 360, 0, 0.15, 0.85)],
    "sombreron_fall": [(0, 70, 0.3, 1.0, 0.85)],
}


# cuadros tapados casi enteros por un destello: se usa en su lugar otro cuadro original de la misma tira
REPLACE = {"bachue_fall": {2: 3}}


def strip_flash(a, rules):
    h, s, v = hsv_of(a)
    gone = np.zeros(a.shape[:2], bool)
    for h0, h1, s0, s1, v0 in rules:
        gone |= (a[:, :, 3] > 0) & (h >= h0) & (h <= h1) & (s >= s0) & (s <= s1) & (v >= v0)
    a[gone, 3] = 0
    return int(gone.sum())


def fill_holes(a):
    """Huecos = transparente encerrado por el cuerpo, o rendijas de 1-2 px que el cierre morfológico tapa."""
    al = a[:, :, 3] > 0
    closed = ndimage.binary_closing(al, structure=np.ones((3, 3)), border_value=0) | ndimage.binary_fill_holes(al)
    holes = closed & ~al
    n = int(holes.sum())
    if not n:
        return 0
    # cada hueco toma el color del píxel opaco más cercano
    _, (iy, ix) = ndimage.distance_transform_edt(~al, return_indices=True)
    a[holes, :3] = a[iy[holes], ix[holes], :3]
    a[holes, 3] = 255
    return n


# lo que se le quitó a cada tira de P1: la tira P2 es la misma con otros colores
P1_MASKS = {}


def fix(path, dry):
    a = np.array(Image.open(path).convert("RGBA"))
    fw = frames_of(path)
    base = os.path.basename(path)
    key = base[:-7]
    rule = FLASHES.get(key)
    aura = holes = 0
    for dst, src in REPLACE.get(key, {}).items():
        a[:, dst * fw:(dst + 1) * fw] = a[:, src * fw:(src + 1) * fw]
    if base.startswith(AURA) or rule:
        if base.endswith("_p1.png"):
            before = a.copy()
            for x0 in range(0, a.shape[1], fw):
                f = a[:, x0:x0 + fw]
                if base.startswith(AURA):
                    aura += strip_aura(f)
                if rule:
                    aura += strip_flash(f, rule)
            P1_MASKS[key] = ((before[:, :, 3] > 0) & (a[:, :, 3] == 0),
                             (a[:, :, :3] != before[:, :, :3]).any(axis=2) & (a[:, :, 3] > 0))
        elif key in P1_MASKS and P1_MASKS[key][0].shape == a.shape[:2]:
            gone, dark = P1_MASKS[key]
            aura = int(gone.sum() + dark.sum())
            a[gone, 3] = 0
            a[dark, :3] = OUTLINE
    for x0 in range(0, a.shape[1], fw):
        f = a[:, x0:x0 + fw].copy()
        holes += fill_holes(f)
        a[:, x0:x0 + fw] = f
    if not dry and (aura or holes):
        Image.fromarray(a).save(path)
    return aura, holes


if __name__ == "__main__":
    root = sys.argv[1]
    dry = "--dry" in sys.argv
    for p in sorted(glob.glob(os.path.join(root, "*_p[12].png"))):
        aura, holes = fix(p, dry)
        if aura or holes:
            print(f"{os.path.basename(p):32s} aura {aura:5d}  huecos {holes:5d}")
