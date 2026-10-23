"""Quita las llamas rojas y negras de la pose grande de Juan Machete (pantalla VS y selección): restos del
concepto viejo de pacto con el diablo; Juan es un campesino de carne y hueso.
Uso: python3 -I tools/fix_splash.py   (una sola vez sobre las poses recién extraídas)"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, __import__("os").path.dirname(__file__))
from fix_sprites import hsv_of, fill_holes

# las llamas son rojo puro muy saturado y negro absoluto; la piel es más clara y menos saturada
masks = {}
for name in ["juanmachete_p1_128", "juanmachete_p1_72", "juanmachete_p2_128", "juanmachete_p2_72"]:
    p = f"public/assets/splash/{name}.png"
    a = np.array(Image.open(p).convert("RGBA"))
    key = name.replace("p2", "p1")
    if key in masks and masks[key].shape == a.shape[:2]:
        gone = masks[key]
    else:
        h, s, v = hsv_of(a)
        al = a[:, :, 3] > 0
        red = al & ((h < 8) | (h >= 335)) & (s >= 0.75)
        zone = ndimage.binary_dilation(red, iterations=4)
        black = al & zone & (v < 0.06)
        gone = red | black
        # lo que queda suelto tras quitar las llamas (lenguas de fuego aisladas)
        rest = al & ~gone
        lab, n = ndimage.label(rest, structure=np.ones((3, 3)))
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        for k, size in enumerate(sizes, 1):
            if size < 30:
                gone |= lab == k
        masks[key] = gone
    a[gone, 3] = 0
    fill_holes(a)
    Image.fromarray(a).save(p)
    print(name, int(gone.sum()))
