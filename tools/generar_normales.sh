#!/usr/bin/env bash
# Genera mapas de normales (<nombre>_n.png) para que los sprites del modo aventura reaccionen a la luz (Light2D).
# Usa spritefusion-sprite-normals (MIT): https://github.com/Hugo-Dz/spritefusion-sprite-normals
#   cargo install --git https://github.com/Hugo-Dz/spritefusion-sprite-normals --locked
#
# Uso (desde project/game):
#   bash tools/generar_normales.sh            # piloto: Juan y el Sombrerón del mapa
#   bash tools/generar_normales.sh --todos    # además todas las hojas 48×48 de public/assets/aventura
#
# Cada mapa de normales debe tener exactamente el mismo tamaño y la misma rejilla que la hoja original:
# el juego usa los mismos fotogramas para color y normales. Si no coincide, el script falla.
# Formato OpenGL (verde = arriba), que es el que espera el shader de luces de Phaser.
set -euo pipefail

BIN=${SPRITE_NORMALS:-$(command -v spritefusion-sprite-normals || echo "$HOME/.cargo/bin/spritefusion-sprite-normals")}
if [ ! -x "$BIN" ]; then
  echo "Falta spritefusion-sprite-normals. Instálelo con:" >&2
  echo "  cargo install --git https://github.com/Hugo-Dz/spritefusion-sprite-normals --locked" >&2
  exit 1
fi

OUT=public/assets/aventura
STRENGTH=${NORMAL_STRENGTH:-1.5}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# ancho y alto de un PNG leyendo la cabecera IHDR
png_size() {
  python3 -I -c 'import struct,sys; d=open(sys.argv[1],"rb").read(24); print(*struct.unpack(">II", d[16:24]))' "$1"
}

# genera <salida> a partir de <entrada>; <celda> = ANCHOxALTO de cada fotograma o vacío si es una sola imagen
normal() {
  local src=$1 dst=$2 cell=${3:-}
  local args=("$src" -o "$TMP/n.png" --normal-strength "$STRENGTH" --force)
  [ -n "$cell" ] && args+=(--frame-size "$cell")
  "$BIN" "${args[@]}" > "$TMP/log" 2>&1 || { cat "$TMP/log" >&2; exit 1; }
  local a b
  a=$(png_size "$src"); b=$(png_size "$TMP/n.png")
  if [ "$a" != "$b" ]; then
    echo "ERROR: $dst mide $b y la hoja $src mide $a: la rejilla no coincide" >&2
    exit 1
  fi
  mv "$TMP/n.png" "$dst"
  rm -f "$TMP"/n.color.png "$TMP"/n.frames.json
  echo "$src -> $dst ($a)"
}

normal "$OUT/hero.png" "$OUT/hero_n.png" 48x48
# el Sombrerón del mapa usa el dibujo de la pelea (public/assets/anim), achicado
normal public/assets/anim/sombreron_idle_p1.png "$OUT/sombreron_idle_n.png"
normal public/assets/anim/sombreron_walk_p1.png "$OUT/sombreron_walk_n.png" 50x72

if [ "${1:-}" = "--todos" ]; then
  for f in "$OUT"/*.png; do
    name=$(basename "$f" .png)
    case "$name" in *_n|hero|tiles_path|tree) continue ;; esac
    normal "$f" "$OUT/${name}_n.png" 48x48
  done
fi
