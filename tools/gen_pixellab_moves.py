"""Genera con PixelLab (animate-with-text-v3) los movimientos de pelea de un luchador a partir de su primer
fotograma (images/pixellab/<id>_first.png, 96x96, mirando a la derecha, pies en la fila 93).
Guarda los fotogramas originales en images/pixellab/<accion>/<id>/fNN.png (fNN = f00 es la referencia).
`punch+kick` pide los dos golpes en una sola petición (12 fotogramas, mismo coste que una): se guardan en
images/pixellab/combo/<id> y punch/<id>/keep.json y kick/<id>/keep.json eligen la parte de cada uno.
Luego: python3 -I tools/import_pixellab_moves.py <id>   para limpiar, hacer las tiras y el manifiesto.

Uso: python3 -I tools/gen_pixellab_moves.py <id> <idle|punch|kick|punch+kick> [--frames N] [--seed S] [--action "texto"] [--dry]
La clave se lee de .env (PIXELLAB_API_KEY) a través de tools/pixellab_api.py. Si la API responde 402/429
(sin créditos o cuota) el script se detiene sin tocar lo ya generado."""
import argparse, base64, io, json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixellab_api as api  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "images", "pixellab")

STYLE = ("side view, 2D fighting game sprite facing right, same character, same outfit, same colors, same size, "
         "same pixel art style, feet stay on the same ground line, no background, ")

# texto por acción; {who} y {weapon} se rellenan por luchador
ACTIONS = {
    "idle": ("fighting stance idle loop: subtle breathing, chest and shoulders rise and fall a little, "
             "{idle_extra}, both feet stay planted, ends exactly in the starting pose", 4),
    "punch": ("{punch}, then returns to the starting fighting stance", 6),
    "kick": ("{kick}, then returns to the starting fighting stance", 6),
    # una sola petición para los dos golpes (ahorra créditos): se parte por el fotograma más parecido a la guardia
    "punch+kick": ("first {punch}, then returns to the starting fighting stance; then {kick}, "
                   "then returns to the starting fighting stance", 12),
}

FIGHTERS = {
    "juanmachete": {
        "idle_extra": ("white shirt stays white, hat brim bobs slightly, both hands stay low and ready, "
                       "no weapon in the idle"),
        "punch": ("quick machete slash: he holds a LONG STRAIGHT MACHETE BLADE in his right hand (Colombian machete, "
                  "long straight steel blade, no hook, not a pickaxe, not a sickle), pulls the right arm back, then "
                  "swings the straight machete forward at chest height with the arm fully extended to the right, "
                  "the blade continues the line of the arm, holds the impact"),
        "kick": ("strong front kick with a clearly visible leg: lifts the front knee, then thrusts the leg straight "
                 "forward to the right at waist height with the sole of the bare foot, blue trousers on the leg, "
                 "holds the impact, leg comes back down"),
    },
    "llorona": {
        "idle_extra": "long black hair and grey ragged dress sway gently, hands hang like claws",
        "punch": ("ghostly claw slap: draws the arm back, then lunges and rakes forward to the right with open "
                  "clawed hand fully extended, hair and dress whip forward, holds the impact"),
        "kick": ("ghostly kick: a thin pale bare leg comes out from under the grey ragged dress and kicks forward "
                 "to the right at knee height, the leg and foot are clearly visible, the grey dress lifts, holds "
                 "the impact, leg returns under the dress"),
    },
    "madremonte": {
        "idle_extra": "leafy hair, flowers and vines sway gently, mossy arms hang ready",
        "punch": ("root-claw strike: draws the arm back, then lunges and swings the mossy arm forward to the right "
                  "with wooden root claws on the fingers fully extended, leaves fly, holds the impact"),
        "kick": ("vine-wrapped kick: lifts the front leg wrapped in vines and roots and kicks forward to the right "
                 "at waist height, leg fully extended, holds the impact, leg comes back down"),
    },
    "patasola": {
        # 2.ª versión: la primera (puño+patada juntos) le pintó dos piernas grises con zapatos negros
        "punch": ("clawed slash: she has only ONE single pale bloody leg under the center of her green dress, never "
                  "two legs, no shoes; she draws the bloody clawed hand back, then rakes forward to the right with "
                  "the arm fully extended and long claws, hair whips forward, holds the impact, the single leg "
                  "stays under the dress"),
        "kick": ("one-legged hop stomp: she has only ONE single pale bloody leg, never two legs, no shoes; she hops "
                 "up a little on that single leg, swings it forward to the right and stomps down with the bloody "
                 "foot, holds the impact, then stands again on her one leg under the green dress"),
    },
    "hombrecaiman": {
        "idle_extra": "crocodile tail sways slowly, jaws open and close a little, clawed hands ready",
        "punch": ("jaw lunge with clawed swipe: draws the clawed arm back, then lunges forward to the right swinging "
                  "the scaly arm fully extended with claws while the crocodile jaws snap open, holds the impact"),
        "kick": ("heavy reptile kick: lifts the front scaly leg and kicks forward to the right at waist height with "
                 "the clawed foot, the tail swings behind for balance, holds the impact, leg comes back down"),
    },
    "sombreron": {
        "idle_extra": "huge black hat and long black coat sway slightly, hands ready at his sides",
        "punch": ("shadow whip lash: draws the arm back, then swings it forward to the right fully extended "
                  "cracking a short black shadow whip held in the hand, holds the impact"),
        "kick": ("coat kick: the long black coat opens and he kicks forward to the right at waist height with a "
                 "black boot, leg fully extended, holds the impact, leg comes back down"),
    },
    "mohan": {
        "idle_extra": "long wild hair and beard sway, broad chest breathes, fists low and ready",
        "punch": ("water-splashing punch: draws the big arm back, then throws a heavy straight punch forward to "
                  "the right with the arm fully extended, a small splash of river water around the fist, holds the "
                  "impact"),
        "kick": ("heavy barefoot kick: lifts the front knee and kicks forward to the right at waist height with "
                 "the bare foot, leg fully extended, holds the impact, leg comes back down"),
    },
    "muelona": {
        "idle_extra": "long black hair sways, big teeth jaw opens and closes slightly, clawed hands hang",
        "punch": ("biting lunge: draws back, then lunges forward to the right with the clawed arm fully extended "
                  "and the huge mouth of big teeth opened wide to bite, hair whips, holds the impact"),
        "kick": ("ragged kick: lifts the front grey leg out of the ragged green dress and kicks forward to the "
                 "right at knee height, leg and bare foot clearly visible, holds the impact, leg comes back down"),
    },
    "silbon": {
        "idle_extra": "bone sack on the back sways, straw hat bobs, skinny body breathes",
        "punch": ("bone sack swing: grabs the big burlap sack of bones and swings it forward to the right with "
                  "the arm fully extended, the sack hits at chest height, holds the impact, sack goes back on "
                  "the shoulder"),
        "kick": ("skinny long kick: lifts the front leg and kicks forward to the right at waist height with the "
                 "boot, long thin leg fully extended, holds the impact, leg comes back down"),
    },
    "bachue": {
        "idle_extra": "feathered headdress and teal skirt sway, long black hair moves, hands ready",
        "punch": ("serpent water strike: draws the arm back, then thrusts the open palm forward to the right with "
                  "the arm fully extended, a small teal water serpent coils around the forearm, holds the impact"),
        "kick": ("graceful high kick: lifts the front bare leg out of the teal skirt and kicks forward to the right "
                 "at waist height, leg fully extended, holds the impact, leg comes back down"),
    },
}

DEFAULT = {"idle_extra": "hair and clothes move gently",
           "punch": "straight punch forward to the right with the front arm, fully extended, holds the impact",
           "kick": "front kick forward to the right at waist height, leg fully extended, holds the impact"}


def b64(im):
    buf = io.BytesIO(); im.save(buf, "PNG")
    return {"type": "base64", "base64": base64.b64encode(buf.getvalue()).decode(), "format": "png"}


def reference(cid):
    im = Image.open(os.path.join(SRC, f"{cid}_first.png")).convert("RGBA")
    if cid == "juanmachete":
        # sin el aura naranja: así PixelLab no la redibuja en cada fotograma
        # y con los huecos rellenos (camisa blanca, brazo): si no, PixelLab pinta la camisa gris y las manos huecas
        from fix_sprites import strip_aura, fill_holes
        a = np.array(im); strip_aura(a); fill_holes(a); im = Image.fromarray(a)
    return im


def decode(img):
    data = img.get("base64") if isinstance(img, dict) else img
    if data.startswith("data:"):
        data = data.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(data))).convert("RGBA")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("id"); ap.add_argument("action", choices=sorted(ACTIONS))
    ap.add_argument("--frames", type=int); ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--action-text", dest="text"); ap.add_argument("--out", help="carpeta de salida (por defecto images/pixellab/<accion>/<id>)")
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    tpl, n = ACTIONS[a.action]
    text = a.text or STYLE + tpl.format(**{**DEFAULT, **FIGHTERS.get(a.id, {})})
    ref = reference(a.id)
    body = {"first_frame": b64(ref), "last_frame": b64(ref), "action": text,
            "frame_count": a.frames or n, "seed": a.seed, "no_background": True}
    print(a.id, a.action, body["frame_count"], "fotogramas:", text)
    if a.dry:
        return
    try:
        r = api.call("POST", "/animate-with-text-v3", body)
    except SystemExit as e:
        if any(c in str(e) for c in ("HTTP 402", "HTTP 429")):
            print("SIN CRÉDITOS / CUOTA: se detiene la generación.", e); sys.exit(2)
        raise
    jobs = [api.wait(j) for j in api.job_ids(r)]
    imgs = list(r.get("images") or [])
    for j in jobs:
        if j.get("status") != "completed":
            raise SystemExit(f"trabajo fallido: {json.dumps(j.get('last_response'))[:500]}")
        imgs += (j.get("last_response") or {}).get("images") or []
    frames = [decode(img) for img in imgs]
    frames = [im if im.size == ref.size else im.resize(ref.size, Image.NEAREST) for im in frames]
    if a.action == "punch+kick":
        # todo en images/pixellab/combo/<id>; punch/kick toman su parte con keep.json (por defecto, cada mitad:
        # revísalo a ojo y ajústalo, el reparto real depende de cada generación)
        parts = {"combo": frames}
        half = (len(frames) + 1) // 2
        for act, keep in (("punch", list(range(half + 1))), ("kick", [0] + list(range(half + 1, len(frames) + 1)))):
            d = os.path.join(SRC, act, a.id); os.makedirs(d, exist_ok=True)
            json.dump({"source": "combo", "keep": keep}, open(os.path.join(d, "keep.json"), "w"), indent=1)
    else:
        parts = {a.action: frames}
    for act, fr in parts.items():
        out = a.out or os.path.join(SRC, act, a.id)
        os.makedirs(out, exist_ok=True)
        for f in os.listdir(out):
            if f.endswith(".png") or f == "keep.json": os.remove(os.path.join(out, f))
        ref.save(os.path.join(out, "f00.png"))
        for i, im in enumerate(fr, 1):
            im.save(os.path.join(out, f"f{i:02d}.png"))
        json.dump({"request": a.action, "action": text, "frame_count": body["frame_count"], "seed": a.seed,
                   "images": len(imgs), "saved": len(fr)}, open(os.path.join(out, "request.json"), "w"), indent=1)
        print("guardados", len(fr), "fotogramas en", out)
    print("saldo", api.call("GET", "/balance"))


if __name__ == "__main__":
    main()
