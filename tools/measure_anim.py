"""Mide cada fotograma de las tiras dibujadas y genera src/art/drawnAnimMetrics.ts.

Por fotograma: centro horizontal del cuerpo visible respecto al centro del fotograma (cx),
píxeles vacíos bajo los pies (pad) y altura visible (h). La escena los usa para que todas
las tiras compartan línea de suelo y eje, sin saltos al cambiar de tira.
Uso: python3 -I tools/measure_anim.py   (desde project/game)
"""
import json
from PIL import Image

ANIM = "public/assets/anim"
man = json.load(open(f"{ANIM}/manifest.json"))
lines = [
    "import type { FighterId } from '../combat/CombatTypes';",
    "import type { DrawnAction } from './drawnAnimManifest';",
    "",
    "/** Generado por tools/measure_anim.py: [cx, pad, h] por fotograma (cuerpo visible). */",
    "export type FrameMetric = readonly [number, number, number];",
    "export const DRAWN_METRICS: Record<FighterId, Partial<Record<DrawnAction, readonly FrameMetric[]>>> = {",
]
for cid, acts in man.items():
    parts = []
    for act, v in acts.items():
        im = Image.open(f"{ANIM}/{cid}_{act}_p1.png").convert("RGBA")
        w, h = v["w"], v["h"]
        rows = []
        for i in range(v["frames"]):
            a = im.crop((i * w, 0, i * w + w, h)).split()[3].point(lambda p: 255 if p > 40 else 0)
            bb = a.getbbox()
            if not bb:
                rows.append("[0, 0, 0]")
                continue
            l, t, r, b = bb
            rows.append(f"[{round((l + r) / 2 - w / 2)}, {h - b}, {b - t}]")
        parts.append(f"{act}: [{', '.join(rows)}]")
    lines.append(f"  {cid}: {{ {', '.join(parts)} }},")
lines.append("};")
open("src/art/drawnAnimMetrics.ts", "w").write("\n".join(lines) + "\n")
