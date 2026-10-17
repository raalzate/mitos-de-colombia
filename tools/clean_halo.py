"""Quita del borde de cada fotograma los píxeles claros sueltos (restos del fondo blanco de las hojas).
Solo borra píxeles de borde claros y poco saturados cuyo vecino interior es bastante más oscuro, así
los bordes que de verdad son blancos (vestido de la Llorona, huesos del Silbón) se conservan.
El pixel art de las hojas tiene contorno oscuro, así que fuera de La Llorona (vestido blanco hasta el
borde) cualquier píxel claro en el borde exterior se trata como halo (3 pasadas).
Uso: python3 -I tools/clean_halo.py public/assets/anim"""
import sys, glob, os
import numpy as np
from PIL import Image

WHITE_EDGE = ("llorona",)

def clean(path, passes=3):
    strict = not os.path.basename(path).startswith(WHITE_EDGE)
    im = Image.open(path).convert("RGBA")
    a = np.array(im).astype(int)
    removed = 0
    for _ in range(passes):
        al = a[:, :, 3] > 0
        rgb = a[:, :, :3]
        lum = rgb.mean(axis=2)
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        pad = np.pad(al, 1)
        edge = al & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
        # luminancia media de los vecinos opacos
        lp = np.pad(np.where(al, lum, 0), 1); cp = np.pad(al.astype(int), 1)
        nsum = lp[:-2, 1:-1] + lp[2:, 1:-1] + lp[1:-1, :-2] + lp[1:-1, 2:]
        ncnt = cp[:-2, 1:-1] + cp[2:, 1:-1] + cp[1:-1, :-2] + cp[1:-1, 2:]
        nlum = np.where(ncnt > 0, nsum / np.maximum(ncnt, 1), 255)
        kill = edge & (lum > 150) & (sat < 40) & (lum - nlum > 55)
        if strict:
            kill |= edge & (lum > 165) & (sat < 45)
            # hilo gris del antialias del fondo: borde gris claramente más claro que el interior
            kill |= edge & (lum > 115) & (sat < 45) & (lum - nlum > 22)
        # píxeles aislados (sin vecinos opacos o con uno solo)
        kill |= al & (ncnt <= 1)
        removed += int(kill.sum())
        a[kill, 3] = 0
    Image.fromarray(a.astype(np.uint8)).save(path)
    return removed

total = 0
for p in sorted(glob.glob(f"{sys.argv[1]}/*.png")):
    total += clean(p)
print("píxeles de halo eliminados:", total)
