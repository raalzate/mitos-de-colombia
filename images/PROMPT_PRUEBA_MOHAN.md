# Prueba: caída y levantarse de El Mohán (Gemini)

Adjunta `images/referencias/mohan_referencia.png` y pega este prompt:

```
16-bit pixel art sprite strip for a 2D fighting game, exact same character, art
style, colors, proportions and dark outline as the attached reference image.
ONE horizontal row of 10 animation frames, left to right, evenly spaced, with
clear white space between frames. Pure flat white background (#FFFFFF), no
shadow, no text, no numbers, no borders, no effects. Side view, the character
faces RIGHT in every frame. Same scale in every frame, the floor is the same
line in every frame. Crisp pixels, no blur.

Character: El Mohán, big muscular tanned man, very long wild brown hair, long
thick brown beard, bare chest, necklace of animal teeth, brown loincloth,
barefoot, smoking pipe.

Animation (knocked down by an uppercut, then getting up):
1 standing, head snapped back from the hit
2 feet leave the ground, body arched backwards
3 airborne, body tilted 45 degrees backwards
4 airborne, body horizontal, arms flung up
5 falling, back towards the floor
6 back hits the floor, small bounce
7 lying flat on the back
8 rolling to one side, pushing with one arm
9 on one knee
10 standing back in fighting guard
```

Guarda el resultado como `images/anim/mohan_fall.png`.

Si Gemini no respeta las 10 viñetas, pide la misma acción en dos imágenes de 5
(fotogramas 1–5 y 6–10) o una imagen por fotograma con el texto «frame N of 10:
<descripción>»: el cortador las ordena y alinea por los pies.
