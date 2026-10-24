#!/bin/sh
# Publica la página (public/pagina) en GitHub Pages y actualiza main del repo público.
set -e
cd "$(git rev-parse --show-toplevel)"
R=https://github.com/raalzate/mitos-de-colombia.git
G() { git -c credential.helper= -c credential.helper='!gh auth git-credential' "$@"; }

git subtree split --prefix=project/game/public/pagina -b gh-pages-pagina
git subtree split --prefix=project/game -b game-public
G push $R gh-pages-pagina:gh-pages
G push $R game-public:main
echo "Listo: https://raalzate.github.io/mitos-de-colombia/ (tarda uno o dos minutos)"
