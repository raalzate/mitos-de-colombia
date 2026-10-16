"""EXPERIMENTAL (no se usa en el juego): duplica los fotogramas del ciclo de andar sintetizando
intermedios por flujo óptico (OpenCV). Los intermedios salen emborronados (caras y ropa pierden
detalle), por eso el juego usa solo fotogramas clave + fundido de movimiento. Para probarlo:
Uso: python3 -I tools/interpolate_walk.py public/assets/anim <contacto.png> id1,id2,...
Lee {id}_walk_{p1,p2}.png + manifest.json, escribe los mismos archivos con el doble de fotogramas."""
import sys, os, json
import numpy as np
import cv2
from PIL import Image

OUT, CONTACT = sys.argv[1], sys.argv[2]
UP = 6  # factor de ampliación para calcular el flujo

def frames_of(strip, n):
    cw = strip.width // n
    return [strip.crop((i*cw, 0, (i+1)*cw, strip.height)) for i in range(n)], cw

def inbetween(a, b):
    """Fotograma a mitad de camino entre a y b (RGBA PIL, mismo tamaño)."""
    A = np.array(a); B = np.array(b)
    h, w = A.shape[:2]
    def prep(X):
        rgb = X[:, :, :3].astype(np.uint8); al = X[:, :, 3]
        # fondo: color medio del cuerpo para que el flujo no "vea" el borde como objeto
        bg = rgb[al > 0].mean(axis=0) if (al > 0).any() else np.zeros(3)
        filled = rgb.copy(); filled[al == 0] = bg
        big = cv2.resize(filled, (w*UP, h*UP), interpolation=cv2.INTER_CUBIC)
        return cv2.GaussianBlur(big, (0, 0), 1.5), cv2.resize(al, (w*UP, h*UP), interpolation=cv2.INTER_NEAREST)
    ga, aa = prep(A); gb, ab = prep(B)
    fa = cv2.calcOpticalFlowFarneback(cv2.cvtColor(ga, cv2.COLOR_RGB2GRAY), cv2.cvtColor(gb, cv2.COLOR_RGB2GRAY), None, 0.5, 4, 25, 5, 7, 1.5, 0)
    fb = cv2.calcOpticalFlowFarneback(cv2.cvtColor(gb, cv2.COLOR_RGB2GRAY), cv2.cvtColor(ga, cv2.COLOR_RGB2GRAY), None, 0.5, 4, 25, 5, 7, 1.5, 0)
    H, W = fa.shape[:2]
    gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
    def warp(img, flow, t):
        mx = gx + flow[:, :, 0] * t; my = gy + flow[:, :, 1] * t
        return cv2.remap(img, mx, my, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    # píxeles sin transparencia como imagen RGBA grande
    rgba_a = np.dstack([cv2.resize(A[:, :, :3], (W, H), interpolation=cv2.INTER_NEAREST), aa])
    rgba_b = np.dstack([cv2.resize(B[:, :, :3], (W, H), interpolation=cv2.INTER_NEAREST), ab])
    wa = warp(rgba_a, fa, 0.5)   # a avanzada medio camino hacia b
    wb = warp(rgba_b, fb, 0.5)   # b retrocedida medio camino hacia a
    # combinar sin promediar (mantiene píxeles nítidos): A deformada manda; B rellena huecos
    oa = wa[:, :, 3] > 127; ob = wb[:, :, 3] > 127
    out = np.zeros_like(wa)
    out[oa, :3] = wa[oa, :3]
    out[ob & ~oa, :3] = wb[ob & ~oa, :3]
    out[:, :, 3] = np.where(oa | ob, 255, 0)
    # reducir a tamaño original (mayoría por bloque) y paleta de a∪b
    small = cv2.resize(out, (w, h), interpolation=cv2.INTER_NEAREST)
    # limpieza: mediana de color (quita píxeles sueltos) y apertura/cierre del alfa (bordes sin ruido)
    small[:, :, :3] = cv2.medianBlur(small[:, :, :3], 3)
    k = np.ones((2, 2), np.uint8)
    al8 = (small[:, :, 3] > 127).astype(np.uint8)
    al8 = cv2.morphologyEx(cv2.morphologyEx(al8, cv2.MORPH_OPEN, k), cv2.MORPH_CLOSE, k)
    alpha = al8 > 0
    pal = np.unique(np.vstack([A[A[:, :, 3] > 0][:, :3], B[B[:, :, 3] > 0][:, :3]]), axis=0).astype(int)
    px = small[:, :, :3].reshape(-1, 3).astype(int)
    d = ((px[:, None, :] - pal[None, :, :]) ** 2).sum(axis=2)
    q = pal[d.argmin(axis=1)].reshape(h, w, 3).astype(np.uint8)
    res = np.dstack([q, (alpha * 255).astype(np.uint8)])
    # quitar motas sueltas
    n, lab = cv2.connectedComponents(res[:, :, 3])
    if n > 2:
        sizes = np.bincount(lab.ravel()); sizes[0] = 0
        keep = sizes >= sizes.max() * 0.03
        res[:, :, 3] = np.where(keep[lab], res[:, :, 3], 0)
    return Image.fromarray(res, "RGBA")

# Solo personajes cuyo intermedio queda limpio (los de mucho detalle interno se emborronan)
INTERP = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else set()
manifest = json.load(open(f"{OUT}/manifest.json"))
contact = []
for cid, meta in manifest.items():
    n = meta["walk"]["frames"]
    if meta["walk"].get("interpolated") or cid not in INTERP: continue
    for slot in ("p1", "p2"):
        strip = Image.open(f"{OUT}/{cid}_walk_{slot}.png").convert("RGBA")
        frames, cw = frames_of(strip, n)
        out = []
        for i, f in enumerate(frames):
            out.append(f)
            out.append(inbetween(f, frames[(i + 1) % n]))
        new = Image.new("RGBA", (cw * len(out), strip.height), (0, 0, 0, 0))
        for i, f in enumerate(out): new.paste(f, (i * cw, 0), f)
        new.save(f"{OUT}/{cid}_walk_{slot}.png")
        if slot == "p1": contact.append(new)
    meta["walk"]["frames"] = n * 2
    meta["walk"]["interpolated"] = True
    print(cid, "walk", n, "->", n * 2)
json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=1)
if contact:
    w = max(c.width for c in contact); h = sum(c.height + 4 for c in contact)
    sheet = Image.new("RGBA", (w, h), (40, 40, 60, 255)); y = 0
    for c in contact: sheet.paste(c, (0, y), c); y += c.height + 4
    sheet.save(CONTACT)
