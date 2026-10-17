"""Duplica los fotogramas del ciclo de andar sintetizando intermedios por flujo óptico DIS muy
suavizado (las extremidades se desplazan en bloque) y deformación por vecino más cercano: los
fotogramas intermedios conservan los píxeles nítidos del original. Se ejecuta tras extract_anim.py.
Uso: python3 -I tools/interpolate_walk.py public/assets/anim <contacto.png> [id1,id2,...]
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

def inbetween(a, b, t=0.5):
    """Fotograma a fracción t del camino entre a y b (RGBA PIL, mismo tamaño)."""
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
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    dis.setVariationalRefinementIterations(10)
    dis.setFinestScale(1)
    g1 = cv2.cvtColor(ga, cv2.COLOR_RGB2GRAY); g2 = cv2.cvtColor(gb, cv2.COLOR_RGB2GRAY)
    fa = dis.calc(g1, g2, None); fb = dis.calc(g2, g1, None)
    # flujo muy suavizado: las extremidades se mueven en bloque, sin ruido píxel a píxel
    for fl in (fa, fb):
        fl[:, :, 0] = cv2.medianBlur(fl[:, :, 0].astype(np.float32), 5); fl[:, :, 1] = cv2.medianBlur(fl[:, :, 1].astype(np.float32), 5)
        fl[:, :, 0] = cv2.GaussianBlur(fl[:, :, 0], (0, 0), UP * 2); fl[:, :, 1] = cv2.GaussianBlur(fl[:, :, 1], (0, 0), UP * 2)
    H, W = fa.shape[:2]
    gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
    def warp(img, flow, t):
        mx = gx + flow[:, :, 0] * t; my = gy + flow[:, :, 1] * t
        return cv2.remap(img, mx, my, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    # píxeles sin transparencia como imagen RGBA grande
    rgba_a = np.dstack([cv2.resize(A[:, :, :3], (W, H), interpolation=cv2.INTER_NEAREST), aa])
    rgba_b = np.dstack([cv2.resize(B[:, :, :3], (W, H), interpolation=cv2.INTER_NEAREST), ab])
    wa = warp(rgba_a, fa, t)        # a avanzada una fracción t hacia b
    wb = warp(rgba_b, fb, 1 - t)    # b retrocedida el resto hacia a
    # combinar sin promediar (mantiene píxeles nítidos): A deformada manda; B rellena huecos
    oa = wa[:, :, 3] > 127; ob = wb[:, :, 3] > 127
    out = np.zeros_like(wa)
    out[oa, :3] = wa[oa, :3]
    out[ob & ~oa, :3] = wb[ob & ~oa, :3]
    out[:, :, 3] = np.where(oa | ob, 255, 0)
    # reducir a tamaño original (mayoría por bloque) y paleta de a∪b
    small = cv2.resize(out, (w, h), interpolation=cv2.INTER_NEAREST)
    # limpieza: solo apertura/cierre del alfa (bordes sin ruido); el color se conserva nítido
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
INTERP = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else set(manifest_ids := json.load(open(f"{OUT}/manifest.json")).keys())
# Patasola: el pelo se deforma con la síntesis; su reposo es un salto en el sitio con fotogramas
# originales (clave) de su propio andar, sin intermedios generados
IDLE_HOP = {"patasola"}

def make_idle(out_dir, manifest, ids):
    """Ciclo de reposo (6 fotogramas) sintetizado: guardia en alto (primer fotograma de golpe) que
    baja y sube suavemente hacia la postura de andar: a0, 20 %, 40 %, 60 %, 40 %, 20 %."""
    for cid in ids:
        meta = manifest[cid]
        for slot in ("p1", "p2"):
            atk = Image.open(f"{out_dir}/{cid}_attack_{slot}.png").convert("RGBA")
            wlk = Image.open(f"{out_dir}/{cid}_walk_{slot}.png").convert("RGBA")
            ww = meta["walk"]["w"]
            w0 = wlk.crop((0, 0, ww, wlk.height))
            a0 = w0 if cid in IDLE_HOP else atk.crop((0, 0, meta["attack"]["w"], atk.height))
            cw = max(a0.width, w0.width); ch = max(a0.height, w0.height)
            def cell(f):
                c = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); c.paste(f, ((cw - f.width) // 2, ch - f.height), f); return c
            A, W = cell(a0), cell(w0)
            if cid in IDLE_HOP:
                step = 2 if meta["walk"].get("interpolated") else 1   # índices de fotogramas clave
                keys = [cell(wlk.crop((ww * k * step, 0, ww * (k * step + 1), wlk.height))) for k in range(3)]
                seq = [keys[0], keys[0], keys[1], keys[1], keys[2], keys[2], keys[1], keys[1]]
            else:
                # reposo = el primer fotograma de andar: al arrancar a caminar no cambia la imagen. Sin
                # intermedios sintetizados: dejan líneas del contorno dentro del cuerpo (se ve una imagen detrás)
                seq = [W]
            strip = Image.new("RGBA", (cw * len(seq), ch), (0, 0, 0, 0))
            for i, f in enumerate(seq): strip.paste(f, (i * cw, 0), f)
            strip.save(f"{out_dir}/{cid}_idle_{slot}.png")
        meta["idle"] = {"frames": len(seq), "w": cw, "h": ch}
        print(cid, "idle", len(seq))

def make_attack(out_dir, manifest, ids):
    """Golpes: entre cada par de fotogramas clave se inserta un intermedio (2n-1 fotogramas);
    el fotograma clave k queda en el índice 2k."""
    for cid in ids:
        meta = manifest[cid]["attack"]
        if meta.get("interpolated"): continue
        n, cw = meta["frames"], meta["w"]
        for slot in ("p1", "p2"):
            strip = Image.open(f"{out_dir}/{cid}_attack_{slot}.png").convert("RGBA")
            keys = [strip.crop((i * cw, 0, (i + 1) * cw, strip.height)) for i in range(n)]
            seq = []
            for i, k in enumerate(keys):
                seq.append(k)
                if i < n - 1: seq.append(inbetween(k, keys[i + 1]))
            out = Image.new("RGBA", (cw * len(seq), strip.height), (0, 0, 0, 0))
            for i, f in enumerate(seq): out.paste(f, (i * cw, 0), f)
            out.save(f"{out_dir}/{cid}_attack_{slot}.png")
        meta.update({"frames": 2 * n - 1, "interpolated": True, "keys": n})
        print(cid, "attack", n, "->", 2 * n - 1)

def make_trans(out_dir, manifest, ids):
    """Transiciones de guardia: [agacharse 1/3, agacharse 2/3, bloqueo 1/2] desde la postura de andar."""
    for cid in ids:
        m = manifest[cid]
        for slot in ("p1", "p2"):
            wlk = Image.open(f"{out_dir}/{cid}_walk_{slot}.png").convert("RGBA")
            atk = Image.open(f"{out_dir}/{cid}_attack_{slot}.png").convert("RGBA")
            hrt = Image.open(f"{out_dir}/{cid}_hurt_{slot}.png").convert("RGBA")
            hn = m["hurt"]["frames"]; getup = 4 if hn >= 6 else hn - 2
            w0 = wlk.crop((0, 0, m["walk"]["w"], wlk.height))
            a0 = atk.crop((0, 0, m["attack"]["w"], atk.height))
            c0 = hrt.crop((getup * m["hurt"]["w"], 0, (getup + 1) * m["hurt"]["w"], hrt.height))
            cw = max(w0.width, a0.width, c0.width); ch = max(w0.height, a0.height, c0.height)
            def cell(f):
                c = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); c.paste(f, ((cw - f.width) // 2, ch - f.height), f); return c
            W, A, C = cell(w0), cell(a0), cell(c0)
            # Patasola: el pelo se deforma con la síntesis; sus transiciones usan solo fotogramas originales
            seq = [W, A, A] if cid in IDLE_HOP else [W, C, A]
            out = Image.new("RGBA", (cw * 3, ch), (0, 0, 0, 0))
            for i, f in enumerate(seq): out.paste(f, (i * cw, 0), f)
            out.save(f"{out_dir}/{cid}_trans_{slot}.png")
        m["trans"] = {"frames": 3, "w": cw, "h": ch}
        print(cid, "trans 3")

manifest = json.load(open(f"{OUT}/manifest.json"))
if CONTACT in ("attack", "trans"):
    ids = sys.argv[3].split(",") if len(sys.argv) > 3 else list(manifest.keys())
    (make_attack if CONTACT == "attack" else make_trans)(OUT, manifest, ids)
    json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=1)
    sys.exit(0)
if CONTACT == "idle":
    make_idle(OUT, manifest, sys.argv[3].split(",") if len(sys.argv) > 3 else list(manifest.keys()))
    json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=1)
    sys.exit(0)
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
