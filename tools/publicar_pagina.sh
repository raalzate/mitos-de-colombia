#!/bin/sh
# Publica la página (public/pagina) en GitHub Pages y sube main al repo público.
set -e
cd "$(git rev-parse --show-toplevel)"
R=https://github.com/raalzate/mitos-de-colombia.git
G() { git -c credential.helper= -c credential.helper='!gh auth git-credential' "$@"; }

git subtree split --prefix=public/pagina -b gh-pages-pagina
G push $R gh-pages-pagina:gh-pages
G push $R main:main
echo "Listo: https://raalzate.github.io/mitos-de-colombia/ (tarda uno o dos minutos)"
