"""Convierte lo generado con PixelLab en images/pixellab/aventura/ en recursos del modo aventura
(public/assets/aventura/). Uso: python3 -I tools/import_aventura.py"""
import base64, colorsys, io, json, os
import numpy as np
from PIL import Image

SRC = "images/pixellab/aventura"
OUT = "public/assets/aventura"
CELL = 48
LEGS_FROM = 40
VILLAGERS = ("cantinero", "cura", "borracho", "nina", "arriero", "vendedora", "campesina", "policia", "cafetero", "nino")
SPIRITS = ("duende", "pollo", "mano")  # en la caminata de frente el sombrero tapa la cara: arriba se usa el sprite quieto

def rgba(path):
    return np.array(Image.open(path).convert("RGBA"))

def load_walk(d):
    # las caminatas quedan 2 px más arriba que las rotaciones: se alinean los pies
    return [np.roll(rgba(f"{SRC}/hero/walk_{d}_{k}.png"), 2, axis=0) for k in range(4)]

SHIRT, SHIRT_SHADE = (238, 238, 230), (196, 196, 188)
HAT_BAND = (58, 34, 18)
MUSTACHE = (48, 28, 16)

def hls(px):
    h, l, s = colorsys.rgb_to_hls(*(c / 255 for c in px[:3]))
    return h * 360, l, s

def is_skin(px):
    h, l, s = hls(px)
    return 10 <= h <= 35 and 0.35 < l < 0.85 and s > 0.3 and px[0] > 150

def juanify(f, facing):
    """Repinta al muchacho de PixelLab como Juan Machete: sombrero de paja café con cinta oscura,
    camisa blanca en lugar de la ruana, jean azul y bigote. Solo cambia colores de los mismos píxeles."""
    out = f.copy()
    H, W = f.shape[:2]
    alpha = f[:, :, 3] > 0
    shirt = np.zeros((H, W), bool)
    cols = [np.nonzero(alpha[y])[0] for y in range(H)]

    def hand(y, x, px):
        # piel solo en cara y cuello, o en las manos a los lados del cuerpo; en el pecho son dibujos de la ruana
        if not is_skin(px) or facing == "north":
            return False
        return y <= 21 or (y >= 30 and cols[y].size and (x - cols[y].min() < 5 or cols[y].max() - x < 5))
    for y in range(H):
        for x in range(W):
            if not alpha[y, x]:
                continue
            px = f[y, x]
            h, l, s = hls(px)
            if l < 0.1:
                continue  # contorno
            if y < 21 and not is_skin(px) and ((s > 0.35 and not 20 < h < 50) or (180 <= h <= 260 and l > 0.2)):
                out[y, x, :3] = HAT_BAND
            elif y < 17:
                if 20 <= h <= 55 and l > 0.35:
                    out[y, x, :3] = (int(px[0] * 0.82), int(px[1] * 0.66), int(px[2] * 0.5))
            elif facing == "north" and 35 <= y < 44 and not (l < 0.3 and 10 < h < 40):
                # de espaldas la ruana llegaba a las rodillas: abajo de la cintura es pantalón
                out[y, x, :3] = (int(30 + l * 60), int(60 + l * 90), int(140 + l * 110))
            elif facing != "north" and y >= 35 and 190 <= h <= 250 and s < 0.4:
                out[y, x, :3] = (int(30 + l * 60), int(60 + l * 90), int(140 + l * 110))
            elif y < 44 and not hand(y, x, px) and (y < 38 or (s > 0.35 and not 190 <= h <= 240)):
                shirt[y, x] = True
            elif y >= 36 and 190 <= h <= 240:
                out[y, x, :3] = (int(30 + l * 60), int(60 + l * 90), int(140 + l * 110))
    edge = np.zeros_like(shirt)
    for y, x in zip(*np.nonzero(shirt)):
        edge[y, x] = any(not (0 <= y + dy < H and 0 <= x + dx < W) or not shirt[y + dy, x + dx]
                         for dy, dx in ((0, -1), (1, 0), (0, 1)))
    out[shirt & ~edge, :3] = SHIRT
    out[shirt & edge, :3] = SHIRT_SHADE
    if facing in ("south", "east"):
        skin = np.array([[alpha[y, x] and is_skin(f[y, x]) for x in range(W)] for y in range(H)])
        mouth = None
        for y in range(15, 22):
            xs = np.nonzero(skin[y])[0]
            if xs.size < 4:
                continue
            gap = [x for x in range(xs.min(), xs.max()) if not skin[y, x]]
            if gap and facing == "south":
                mouth = (y, int(np.mean(gap)))
        if facing == "south" and mouth:
            y, cx = mouth
            for x in range(cx - 3, cx + 4):
                if alpha[y - 1, x]:
                    out[y - 1, x, :3] = MUSTACHE
            for x in (cx - 3, cx + 3):
                out[y, x, :3] = MUSTACHE
        elif facing == "east":
            r0 = max(range(14, 22), key=lambda y: skin[y].sum())
            xs = np.nonzero(skin[r0 + 1])[0]
            if xs.size:
                for x in range(xs.max() - 3, xs.max() + 1):
                    out[r0 + 1, x, :3] = MUSTACHE
    return out

def hero():
    """Hoja 48x48: 0-3 andar sur, 4-7 este, 8-11 norte, 12-14 quieto sur/este/norte. Oeste = este espejado."""
    south = rgba(f"{SRC}/hero/south.png")
    frames = []
    for w in load_walk("south"):
        f = south.copy(); f[LEGS_FROM:] = w[LEGS_FROM:]; frames.append(f)
    frames += load_walk("east") + load_walk("north")
    frames += [rgba(f"{SRC}/hero/{d}.png") for d in ("south", "east", "north")]
    facing = ["south"] * 4 + ["east"] * 4 + ["north"] * 4 + ["south", "east", "north"]
    frames = [juanify(f, d) for f, d in zip(frames, facing)]
    Image.fromarray(np.concatenate(frames, axis=1)).save(f"{OUT}/hero.png")

def npc(name, out=None):
    """Hoja 48x48 de un aldeano quieto: sur, este, norte (oeste = este espejado)."""
    if not os.path.exists(f"{SRC}/{name}.json"):
        return print("falta", name)
    r = json.load(open(f"{SRC}/{name}.json"))["_jobs"][0]["last_response"]
    os.makedirs(f"{SRC}/{name}", exist_ok=True)
    frames = []
    for d in ("south", "east", "north"):
        p = f"{SRC}/{name}/{d}.png"
        if not os.path.exists(p):
            os.system(f"curl -sS -o {p} '{r['storage_urls'][d]}'")
        im = Image.open(p).convert("RGBA")
        if im.size != (CELL, CELL):
            im = im.resize((CELL, CELL), Image.NEAREST)
        frames.append(np.array(im))
    Image.fromarray(np.concatenate(frames, axis=1)).save(f"{OUT}/{out or name}.png")

def pixflux(name):
    if not os.path.exists(f"{SRC}/{name}.json"):
        return print("falta", name)
    r = json.load(open(f"{SRC}/{name}.json"))
    im = Image.open(io.BytesIO(base64.b64decode(r["image"]["base64"]))).convert("RGBA")
    im.save(f"{SRC}/{name}.png")
    a = np.array(im); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    im = Image.fromarray(a); im.crop(im.getbbox()).save(f"{OUT}/{name}.png")

def tileset():
    """Tileset Wang hierba/camino en orden de máscara: NW*8 + NE*4 + SW*2 + SE (1 = camino)."""
    r = json.load(open(f"{SRC}/tileset_full.json"))["tileset"]["tiles"]
    sheet = Image.new("RGBA", (16 * 16, 16))
    for t in r:
        c = t["corners"]
        mask = sum(b for k, b in (("NW", 8), ("NE", 4), ("SW", 2), ("SE", 1)) if c[k] == "upper")
        sheet.paste(Image.open(io.BytesIO(base64.b64decode(t["image"]["base64"]))).convert("RGBA"), (mask * 16, 0))
    sheet.save(f"{OUT}/tiles_path.png")

if __name__ == "__main__":
    tileset()
    os.makedirs(OUT, exist_ok=True)
    hero()
    for n in ("abuela", "pescador") + VILLAGERS:
        npc(n)
    for n in SPIRITS:
        npc(n, f"spirit_{n}")
    for n in ("tree", "house"):
        pixflux(n)
