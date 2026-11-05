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
python3 -I tools/import_pixellab.py                              # caídas generadas con PixelLab (si existen)
python3 -I tools/fix_sprites.py "$OUT"                           # rellena huecos y quita el aura de Juan y los destellos
python3 -I tools/import_pixellab_moves.py                        # reposo, puño y patada de PixelLab (si existen)
python3 -I tools/write_anim_manifest.py                          # src/art/drawnAnimManifest.ts
python3 -I tools/measure_anim.py                              # eje y línea de suelo por fotograma
rm -rf "$TMP"
