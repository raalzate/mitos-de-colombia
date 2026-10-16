"""Corta la hoja 'Retro Folklore Character Sprite Sheet.png' en tiras por personaje y acción."""
import sys, os, json
from PIL import Image
import numpy as np
import scipy.ndimage as ndi

SRC, OUT, CONTACT = sys.argv[1], sys.argv[2], sys.argv[3]
IDS = ["madremonte","patasola","hombrecaiman","llorona","sombreron","mohan","muelona","silbon","juanmachete","bachue"]
ACTIONS = ["walk","attack","hurt"]
TARGET_H = 72          # alto de celda final (px)
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert("RGB")
W, H = im.size
a = np.array(im).astype(int)
nonwhite = a.min(axis=2) < 215
# ignora la columna de nombres (izquierda) y los títulos (arriba)
x_start = int(W * 0.10)
y_start = int(H * 0.035)
mask = np.zeros_like(nonwhite); mask[y_start:, x_start:] = nonwhite[y_start:, x_start:]

def spans(profile, thresh, min_len, min_gap=1):
    out=[]; start=None; gap=0
    for i,v in enumerate(profile):
        on = v > thresh
        if on:
            if start is None: start=i
            gap=0
        elif start is not None:
            gap+=1
            if gap>=min_gap:
                end=i-gap+1
                if end-start>=min_len: out.append((start,end))
                start=None; gap=0
    if start is not None and len(profile)-start>=min_len: out.append((start,len(profile)))
    return out

rows = spans(mask.mean(axis=1), 0.002, 30, min_gap=6)
assert len(rows) == 10, f"filas detectadas: {len(rows)} {rows}"
# tres secciones por columnas (gaps grandes)
# secciones fijas (fracción del ancho): walk, attack, hurt
cols_all = [(int(W*0.098), int(W*0.395)), (int(W*0.400), int(W*0.690)), (int(W*0.700), int(W*0.995))]

def pixelize(img, scale, colors=40):
    w,h = img.size
    nw, nh = max(1, round(w*scale)), max(1, round(h*scale))
    small = img.resize((nw, nh), Image.LANCZOS) if scale != 1 else img
    arr = np.array(small); alpha = arr[:,:,3] >= 128
    q = Image.fromarray(arr[:,:,:3]).quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    return Image.fromarray(np.dstack([np.array(q), (alpha*255).astype(np.uint8)]).astype(np.uint8), "RGBA")

def hue_shift(img, deg):
    hsv = np.array(img.convert("RGB").convert("HSV"))
    hsv[:,:,0] = (hsv[:,:,0].astype(int) + int(deg/360*255)) % 255
    out = Image.fromarray(hsv, "HSV").convert("RGBA"); out.putalpha(img.getchannel("A")); return out

manifest = {}
contact_frames = []
for ri,(y0,y1) in enumerate(rows):
    cid = IDS[ri]
    manifest[cid] = {}
    for ai,(cx0,cx1) in enumerate(cols_all):
        act = ACTIONS[ai]
        band = mask[y0:y1, cx0:cx1]
        fcols = spans(band.mean(axis=0), 0.0, 6, min_gap=3)
        # fotogramas pegados: partir franjas anchas por los valles de densidad
        cell = (cx1 - cx0) / 6.3
        prof = band.sum(axis=0)
        split = []
        for (fx0, fx1) in fcols:
            n = int(round((fx1 - fx0) / cell))
            if n <= 1 or (fx1 - fx0) < cell * 1.4:
                split.append((fx0, fx1)); continue
            cuts = [fx0]
            for k in range(1, n):
                guess = fx0 + (fx1 - fx0) * k / n
                lo, hi = int(guess - cell * 0.25), int(guess + cell * 0.25)
                seg = prof[lo:hi]
                cuts.append(lo + int(np.argmin(seg)))
            cuts.append(fx1)
            split += [(cuts[i], cuts[i + 1]) for i in range(n)]
        fcols = split
        frames = []
        for (fx0,fx1) in fcols:
            sub = band[:, fx0:fx1]
            lab, n = ndi.label(sub)
            if n == 0: continue
            sizes = ndi.sum(sub, lab, range(1,n+1))
            keep = [i+1 for i,s in enumerate(sizes) if s >= sizes.max()*0.03]
            keepm = np.isin(lab, keep)
            ys, xs = np.where(keepm)
            if ys.size < 150: continue   # ruido
            gx0, gx1 = cx0+fx0+xs.min(), cx0+fx0+xs.max()+1
            gy0, gy1 = y0+ys.min(), y0+ys.max()+1
            crop = im.crop((gx0,gy0,gx1,gy1))
            alpha = (keepm[ys.min():ys.max()+1, xs.min():xs.max()+1]*255).astype(np.uint8)
            frames.append(Image.fromarray(np.dstack([np.array(crop), alpha]).astype(np.uint8), "RGBA"))
        # celda común: alto máximo de la fila completa se calcula después; aquí guardamos
        manifest[cid][act] = frames
    print(cid, {k: len(v) for k,v in manifest[cid].items()})

def one_leg(f):
    """Patasola: borra la pierna trasera. Bajo el vestido, si una fila tiene dos tramos opacos
    separados, se quita el tramo de la izquierda (mira a la derecha). Solo filas inferiores."""
    arr = np.array(f); al = arr[:,:,3] > 0
    h, w = al.shape
    ys, xs = np.where(al)
    top = int(h * 0.62)
    for y in range(h - 1, top, -1):
        row = al[y]
        xs_on = np.where(row)[0]
        if xs_on.size == 0: continue
        # tramos
        segs = []; start = xs_on[0]; prev = xs_on[0]
        for x in xs_on[1:]:
            if x - prev > 1: segs.append((start, prev)); start = x
            prev = x
        segs.append((start, prev))
        segs = [sg for sg in segs if sg[1] - sg[0] >= 2]
        if len(segs) >= 2:
            l = segs[0]
            arr[y, l[0]:l[1] + 1, 3] = 0
    # fragmentos sueltos (restos del pie borrado)
    al = arr[:,:,3] > 0
    lab, n = ndi.label(al)
    if n > 1:
        sizes = ndi.sum(al, lab, range(1, n + 1))
        keep = [i + 1 for i, sz in enumerate(sizes) if sz >= sizes.max() * 0.06]
        arr[:,:,3] = np.where(np.isin(lab, keep), arr[:,:,3], 0)
    return Image.fromarray(arr, "RGBA")

# escala única por personaje: el fotograma más alto de 'walk' -> TARGET_H (pies alineados abajo)
sheets = {}
for cid in IDS:
    ref_h = max(f.height for f in manifest[cid]["walk"])
    scale = TARGET_H / ref_h
    meta = {}
    for act in ACTIONS:
        frames = [pixelize(f, scale) for f in manifest[cid][act]]
        if cid == "patasola" and act != "hurt": frames = [one_leg(f) for f in frames]
        if cid == "patasola" and act == "hurt": frames = [one_leg(f) if i < 2 or i == len(frames) - 1 else f for i, f in enumerate(frames)]
        cw = max(f.width for f in frames); ch = max(f.height for f in frames)
        cw += cw % 2; ch += ch % 2
        strip = Image.new("RGBA", (cw*len(frames), ch), (0,0,0,0))
        for i,f in enumerate(frames):
            strip.paste(f, (i*cw + (cw-f.width)//2, ch-f.height), f)   # centrado, pies abajo
        strip.save(f"{OUT}/{cid}_{act}_p1.png")
        hue_shift(strip, 150).save(f"{OUT}/{cid}_{act}_p2.png")
        meta[act] = {"frames": len(frames), "w": cw, "h": ch}
        contact_frames.append((cid, act, strip))
    sheets[cid] = meta
json.dump(sheets, open(f"{OUT}/manifest.json","w"), indent=1)

# hoja de contacto
rowsH = sum(max(s.height for c,a,s in contact_frames if c==cid) + 4 for cid in IDS)
colsW = max(sum(s.width+6 for c,a,s in contact_frames if c==cid) for cid in IDS)
sheet = Image.new("RGBA", (colsW, rowsH), (40,40,60,255))
y = 0
for cid in IDS:
    x = 0; hmax = 0
    for c,a,s in contact_frames:
        if c != cid: continue
        sheet.paste(s, (x, y), s); x += s.width+6; hmax = max(hmax, s.height)
    y += hmax + 4
sheet.save(CONTACT)
print(json.dumps(sheets))
