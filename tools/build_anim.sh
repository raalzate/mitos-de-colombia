#!/usr/bin/env bash
# Regenera todas las tiras dibujadas en orden y el manifiesto TypeScript.
# Uso: bash tools/build_anim.sh   (desde project/game)
set -euo pipefail
OUT=public/assets/anim
TMP=$(mktemp -d)
python3 -I tools/extract_anim.py "images/Retro Folklore Character Sprite Sheet.png" "$OUT" "$TMP/contact.png" > /dev/null
python3 -I tools/interpolate_walk.py "$OUT" trans                # agacharse / bloqueo con fotogramas originales
python3 -I tools/interpolate_walk.py "$OUT" idle                 # reposo = primer fotograma de andar (Patasola: salto)
python3 -I tools/clean_halo.py "$OUT"                            # quita restos claros del fondo en los bordes
python3 - <<'PY'
import json
m = json.load(open("public/assets/anim/manifest.json"))
lines = ["import type { FighterId } from '../combat/CombatTypes';", "",
         "/** Generado por tools/build_anim.sh a partir de images/Retro Folklore Character Sprite Sheet.png. */",
         "export type DrawnAction = 'walk' | 'attack' | 'hurt' | 'idle' | 'trans';",
         "export interface DrawnStrip { frames: number; w: number; h: number; interpolated?: boolean; keys?: number }", "",
         "export const DRAWN_ANIM: Record<FighterId, Record<DrawnAction, DrawnStrip>> = {"]
for cid, acts in m.items():
    parts = ", ".join(
        f"{a}: {{ frames: {v['frames']}, w: {v['w']}, h: {v['h']}"
        + (", interpolated: true" if v.get("interpolated") else "")
        + (f", keys: {v['keys']}" if v.get("keys") else "") + " }"
        for a, v in acts.items())
    lines.append(f"  {cid}: {{ {parts} }},")
lines.append("};")
open("src/art/drawnAnimManifest.ts", "w").write("\n".join(lines) + "\n")
PY
rm -rf "$TMP"
