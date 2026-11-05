"""Escribe src/art/drawnAnimManifest.ts a partir de public/assets/anim/manifest.json.
Lo usan tools/build_anim.sh y tools/import_pixellab_moves.py.
Uso: python3 -I tools/write_anim_manifest.py   (desde project/game)"""
import json

OPTIONAL = ("fall", "punch", "kick")


def main():
    m = json.load(open("public/assets/anim/manifest.json"))
    opt = " | ".join(f"'{a}'" for a in OPTIONAL)
    lines = ["import type { FighterId } from '../combat/CombatTypes';", "",
             "/** Generado por tools/build_anim.sh a partir de images/Retro Folklore Character Sprite Sheet.png. */",
             "export type DrawnAction = 'walk' | 'attack' | 'hurt' | 'idle' | 'trans' | " + opt + ";",
             "export interface DrawnStrip { frames: number; w: number; h: number; interpolated?: boolean; keys?: number; "
             "lying?: number; air?: number; airEnd?: number; hit?: number; fps?: number }", "",
             "/** `fall` (caída y levantarse), `punch` y `kick` (golpes de PixelLab) son opcionales por personaje.",
             " * `hit`: fotograma de impacto de la tira; `fps`: ritmo propio del ciclo (reposo dibujado). */",
             "export const DRAWN_ANIM: Record<FighterId, Record<Exclude<DrawnAction, " + opt + ">, DrawnStrip> & "
             "Partial<Record<" + opt + ", DrawnStrip>>> = {"]
    for cid, acts in m.items():
        parts = ", ".join(
            f"{a}: {{ frames: {v['frames']}, w: {v['w']}, h: {v['h']}"
            + (", interpolated: true" if v.get("interpolated") else "")
            + (f", keys: {v['keys']}" if v.get("keys") else "")
            + (f", lying: {v['lying']}, air: {v['air']}, airEnd: {v['airEnd']}" if "lying" in v else "")
            + (f", hit: {v['hit']}" if "hit" in v else "")
            + (f", fps: {v['fps']}" if "fps" in v else "") + " }"
            for a, v in acts.items())
        lines.append(f"  {cid}: {{ {parts} }},")
    lines.append("};")
    open("src/art/drawnAnimManifest.ts", "w").write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
