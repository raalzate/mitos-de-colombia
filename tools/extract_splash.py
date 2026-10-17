import sys, os
from PIL import Image
import numpy as np

IMG = sys.argv[1]      # images dir
OUT = sys.argv[2]      # public/assets dir
os.makedirs(f"{OUT}/portraits", exist_ok=True)
os.makedirs(f"{OUT}/splash", exist_ok=True)

def spans(profile, thresh, min_len):
    out = []; start = None
    for i, v in enumerate(profile):
        on = v > thresh
        if on and start is None: start = i
        if not on and start is not None:
            if i - start >= min_len: out.append((start, i))
            start = None
    if start is not None and len(profile) - start >= min_len: out.append((start, len(profile)))
    return out

import scipy.ndimage as ndi

def background_mask(rgb):
    """Fondo de la hoja: blanco/casi blanco conectado con el borde del recorte. Se busca primero sobre
    la máscara clara erosionada (las rendijas finas del contorno no dejan pasar el relleno, así la camisa o
    el vestido blancos quedan opacos) y luego se deja crecer 3 px dentro de lo claro para tragarse el halo
    de antialias del generador. Los huecos encerrados de blanco puro (media >= 253.5) también son fondo."""
    light = rgb.min(axis=2) >= 215
    core = ndi.binary_erosion(light, iterations=2, border_value=1)
    lab, _ = ndi.label(core)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    for _ in range(3):
        bg = ndi.binary_dilation(bg) & light
    pure = rgb.min(axis=2) >= 252
    pl, pn = ndi.label(pure & ~bg)
    for k in range(1, pn + 1):
        m = pl == k
        if m.sum() > rgb.shape[0] * rgb.shape[1] * 0.0008 and rgb[m].min(axis=1).mean() >= 253.5:
            bg |= ndi.binary_dilation(m, iterations=3) & light
    return bg

def pixelize(img, target_h=None, target_w=None, colors=40):
    """RGBA -> downscale (LANCZOS) -> hard alpha -> limited palette."""
    w, h = img.size
    if target_h: scale = target_h / h
    else: scale = target_w / w
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    small = img.resize((nw, nh), Image.LANCZOS)
    a = np.array(small)
    alpha = a[:, :, 3] >= 128
    rgb = Image.fromarray(a[:, :, :3])
    q = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    qa = np.dstack([np.array(q), (alpha * 255).astype(np.uint8)])
    return Image.fromarray(qa, "RGBA")

def hue_shift(img, deg):
    hsv = img.convert("RGB").convert("HSV")
    a = np.array(hsv)
    a[:, :, 0] = (a[:, :, 0].astype(int) + int(deg / 360 * 255)) % 255
    out = Image.fromarray(a, "HSV").convert("RGBA")
    out.putalpha(img.getchannel("A"))
    return out

# ---------------- caras ----------------
faces = Image.open(f"{IMG}/caras.jpeg").convert("RGB")
ROWS = [(204, 694), (835, 1328), (1466, 1982), (2122, 2632)]
COLS3 = [(16, 489), (532, 1004), (1048, 1520)]
COLS2 = [(11, 757), (803, 1525)]
ORDER = [["madremonte", "patasola", "hombrecaiman"], [None, "llorona", "sombreron"], ["mohan", "muelona", "silbon"], ["juanmachete", "bachue"]]
for r, (y0, y1) in enumerate(ROWS):
    cols = COLS2 if r == 3 else COLS3
    for c, (x0, x1) in enumerate(cols):
        name = ORDER[r][c]
        if not name: continue
        inset = 14
        box = faces.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))
        w, h = box.size
        s = min(w, h)
        box = box.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).convert("RGBA")
        for size in (24, 48, 64, 96):
            p = pixelize(box, target_h=size, colors=48 if size >= 48 else 24)
            p.save(f"{OUT}/portraits/{name}_p1_{size}.png")
            hue_shift(p, 150).save(f"{OUT}/portraits/{name}_p2_{size}.png")
        print("  face", name, box.size)

# ---------------- cuerpos ----------------
# Cajas en coordenadas de la vista reducida (alto 1200); se escalan al original.
BODIES = {
    "madremonte": ("madremonte.jpeg", (10, 20, 200, 270)),
    "patasola": ("patasola.png", (20, 940, 240, 1155)),
    "hombrecaiman": ("hombre_caiman.jpeg", (5, 980, 200, 1190)),
    "llorona": ("llorona.jpeg", (10, 360, 235, 605)),
    "sombreron": ("sombrerero.jpeg", (15, 30, 194, 300)),
    "mohan": ("mohan.jpeg", (5, 935, 220, 1172)),
    "muelona": ("muelona.jpeg", (5, 20, 235, 280)),
    "silbon": ("silbon.jpeg", (5, 10, 235, 280)),
    "juanmachete": ("juan_machete.jpeg", (5, 930, 235, 1170)),
    "bachue": ("bachue.jpeg", (5, 970, 225, 1190)),
}
for name, (file, box) in BODIES.items():
    im = Image.open(f"{IMG}/{file}").convert("RGB")
    k = im.height / 1200
    x0, y0, x1, y1 = [int(v * k) for v in box]
    crop = im.crop((x0, y0, x1, y1))
    ca = np.array(crop).astype(int)
    import scipy.ndimage as ndi
    alpha = (~background_mask(ca)).astype(np.uint8) * 255
    lab, n = ndi.label(alpha > 0)
    sizes = ndi.sum(alpha > 0, lab, range(1, n + 1))
    keep = [i + 1 for i, sz in enumerate(sizes) if sz >= sizes.max() * 0.12]
    alpha = np.where(np.isin(lab, keep), alpha, 0).astype(np.uint8)
    ys, xs = np.where(alpha > 0)
    crop = crop.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    alpha = alpha[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rgba = np.dstack([np.array(crop), alpha])
    body = Image.fromarray(rgba.astype(np.uint8), "RGBA")
    for h in (128, 72):
        p = pixelize(body, target_h=h, colors=40)
        p.save(f"{OUT}/splash/{name}_p1_{h}.png")
        hue_shift(p, 150).save(f"{OUT}/splash/{name}_p2_{h}.png")
    print("body", name, body.size)
