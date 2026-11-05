"""Piloto de luchador en alta resolución (2x) con PixelLab: genera la referencia a 192x192 y sus movimientos.

1) base: /resize de images/pixellab/<id>_first.png (96x96) a 192x192 (máximo de /resize: 200x200 de área),
   guardada en images/pixellab/hires/<id>_first.png (pies en la fila ~187, mismo diseño y pose, doble detalle).
2) <accion>: /animate-with-text-v3 (máximo 256x256 y ancho*alto*fotogramas <= 524 288) con primer y último
   fotograma = la base; guarda images/pixellab/hires/<accion>/<id>/fNN.png (f00 = la base) y request.json.
   Después se revisan a ojo y keep.json elige los fotogramas buenos.

Uso: python3 -I tools/gen_pixellab_hires.py <id> base [--seed S]
     python3 -I tools/gen_pixellab_hires.py <id> <idle|walk|punch|kick> [--frames N] [--seed S] [--dry]
La clave se lee de .env (PIXELLAB_API_KEY) a través de tools/pixellab_api.py."""
import argparse, base64, io, json, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixellab_api as api  # noqa: E402
from gen_pixellab_moves import FIGHTERS, DEFAULT, STYLE, b64, decode  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "images", "pixellab")
HI = os.path.join(SRC, "hires")
SIZE = 192

DESCRIBE = {
    "llorona": ("La Llorona, Colombian weeping ghost woman, side view facing right, hunched fighting stance, very long "
                "messy black hair covering the face, pale grey skin, long ragged torn grey-white dress, thin bare pale "
                "feet, clawed hands, pixel art fighting game sprite"),
}

ACTIONS = {
    "idle": ("fighting stance idle loop: subtle breathing, chest and shoulders rise and fall a little, "
             "{idle_extra}, both feet stay planted, ends exactly in the starting pose", 4),
    "walk": ("walking in place facing right (the body stays centered, no travel), slow eerie ghostly walk cycle: the legs step forward one after the "
             "other under the ragged dress, the dress hem and the long black hair sway with each step, hunched "
             "posture, clawed hands hang forward, loops back to the starting pose", 6),
    "punch": ("{punch}, then returns to the starting fighting stance", 6),
    "kick": ("{kick}, then returns to the starting fighting stance", 6),
}


def run(endpoint, body):
    try:
        r = api.call("POST", endpoint, body)
    except SystemExit as e:
        if any(c in str(e) for c in ("HTTP 402", "HTTP 429")):
            print("SIN CRÉDITOS / CUOTA: se detiene.", e); sys.exit(2)
        raise
    jobs = [api.wait(j) for j in api.job_ids(r)]
    imgs = []
    if r.get("image"):
        imgs.append(r["image"])
    imgs += list(r.get("images") or [])
    for j in jobs:
        if j.get("status") != "completed":
            raise SystemExit(f"trabajo fallido: {json.dumps(j.get('last_response'))[:500]}")
        lr = j.get("last_response") or {}
        if lr.get("image"):
            imgs.append(lr["image"])
        imgs += lr.get("images") or []
    return r, [decode(i) for i in imgs]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("id"); ap.add_argument("action", choices=["base"] + sorted(ACTIONS))
    ap.add_argument("--frames", type=int); ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--box", help="x0,y0,x1,y1: anima solo este recorte de la base (el coste crece con el área: "
                    "192x192x4 cuesta 3 generaciones) y lo devuelve a su sitio en el lienzo de 192")
    a = ap.parse_args()
    os.makedirs(HI, exist_ok=True)
    if a.action == "base":
        src = Image.open(os.path.join(SRC, f"{a.id}_first.png")).convert("RGBA")
        body = {"description": DESCRIBE.get(a.id, a.id), "reference_image": b64(src),
                "reference_image_size": {"width": src.width, "height": src.height},
                "target_size": {"width": SIZE, "height": SIZE}, "view": "side", "direction": "east",
                "no_background": True, "seed": a.seed}
        print(a.id, "base", json.dumps({k: v for k, v in body.items() if k != "reference_image"}))
        if a.dry:
            return
        r, frames = run("/resize", body)
        out = os.path.join(HI, f"{a.id}_first.png")
        frames[0].save(out)
        for i, im in enumerate(frames[1:], 1):
            im.save(os.path.join(HI, f"{a.id}_first_alt{i}.png"))
        json.dump({"endpoint": "/resize", **{k: v for k, v in body.items() if k != "reference_image"},
                   "images": len(frames)}, open(os.path.join(HI, f"{a.id}_first.request.json"), "w"), indent=1)
        print("guardada", out, frames[0].size)
    else:
        tpl, n = ACTIONS[a.action]
        text = STYLE + tpl.format(**{**DEFAULT, **FIGHTERS.get(a.id, {})})
        full = Image.open(os.path.join(HI, f"{a.id}_first.png")).convert("RGBA")
        box = tuple(int(v) for v in a.box.split(",")) if a.box else (0, 0, SIZE, SIZE)
        ref = full.crop(box)
        body = {"first_frame": b64(ref), "last_frame": b64(ref), "action": text,
                "frame_count": a.frames or n, "seed": a.seed, "no_background": True}
        print(a.id, a.action, body["frame_count"], "fotogramas:", text)
        if a.dry:
            return
        r, frames = run("/animate-with-text-v3", body)
        frames = [im if im.size == ref.size else im.resize(ref.size, Image.NEAREST) for im in frames]
        placed = []
        for im in frames:
            c = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)); c.paste(im, box[:2]); placed.append(c)
        frames, ref = placed, full
        out = os.path.join(HI, a.action, a.id)
        os.makedirs(out, exist_ok=True)
        for f in os.listdir(out):
            if f.endswith(".png"):
                os.remove(os.path.join(out, f))
        ref.save(os.path.join(out, "f00.png"))
        for i, im in enumerate(frames, 1):
            im.save(os.path.join(out, f"f{i:02d}.png"))
        json.dump({"endpoint": "/animate-with-text-v3", "action": text, "frame_count": body["frame_count"],
                   "seed": a.seed, "size": SIZE, "box": box, "images": len(frames)},
                  open(os.path.join(out, "request.json"), "w"), indent=1)
        print("guardados", len(frames), "fotogramas en", out)
    print("saldo", api.call("GET", "/balance"))


if __name__ == "__main__":
    main()
