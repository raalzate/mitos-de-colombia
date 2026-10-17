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

HOLE_LOG = []

WHITE_CLOTHES = False   # se activa por personaje (Llorona, Silbón, Juan Machete)

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
    if not WHITE_CLOTHES:
        # huecos encerrados gris muy claro y sin color (fondo atrapado entre brazo y cuerpo o entre
        # mechones); los personajes con ropa blanca de verdad se excluyen
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        pocket = light & ~bg
        ql, qn = ndi.label(pocket)
        for k in range(1, qn + 1):
            m = ql == k
            if rgb[m].min(axis=1).mean() >= 232 and sat[m].mean() < 22:
                bg |= ndi.binary_dilation(m, iterations=1) & light
    return bg

def fill_inner_white(sil, rgb, cid="", act=""):
    """Silueta del fotograma: la región del personaje menos el fondo de la hoja."""
    region = ndi.binary_fill_holes(ndi.binary_dilation(sil, iterations=2))
    out = region & ~background_mask(rgb)
    ol, on = ndi.label(out)
    if on > 1:
        sizes = ndi.sum(out, ol, range(1, on + 1))
        out = np.isin(ol, [i + 1 for i, z in enumerate(sizes) if z >= sizes.max() * 0.03])
    return out

HOLE_BG_MIN_FRAC = 0.002

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
    WHITE_CLOTHES = cid in ("llorona", "silbon", "juanmachete")
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
            sil = keepm[ys.min():ys.max()+1, xs.min():xs.max()+1]
            alpha = (fill_inner_white(sil, np.array(crop).astype(int), cid, act) * 255).astype(np.uint8)
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
        # alineación horizontal por el centroide del torso (filas superiores), no por la caja:
        # así el cuerpo no se desplaza al cambiar de fotograma aunque brazos o piernas se extiendan
        cw = int(cw * 1.3) + (int(cw * 1.3) % 2)
        strip = Image.new("RGBA", (cw*len(frames), ch), (0,0,0,0))
        for i,f in enumerate(frames):
            al = np.array(f)[:,:,3] > 0
            top = al[: max(1, int(al.shape[0] * 0.55))]
            ys, xs = np.where(top)
            cxm = xs.mean() if xs.size else f.width / 2
            if act == "hurt" and i >= 2 and i < len(frames) - 1:
                cxm = f.width / 2   # tumbado/levantándose: centrar por caja
            px = int(round(i*cw + cw/2 - cxm))
            px = min(max(px, i*cw), i*cw + cw - f.width)
            strip.paste(f, (px, ch-f.height), f)   # pies abajo
        strip.save(f"{OUT}/{cid}_{act}_p1.png")
        hue_shift(strip, 150).save(f"{OUT}/{cid}_{act}_p2.png")
        meta[act] = {"frames": len(frames), "w": cw, "h": ch}
        contact_frames.append((cid, act, strip))
    sheets[cid] = meta
json.dump(sheets, open(f"{OUT}/manifest.json","w"), indent=1)
if os.environ.get("HOLES_LOG"): json.dump(HOLE_LOG, open(os.environ["HOLES_LOG"], "w"))

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
