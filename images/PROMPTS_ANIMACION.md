# Prompts para generar las tiras de animación (Gemini)

Cada prompt = **REGLAS** + **PERSONAJE** + **ACCIÓN**. Copia los tres bloques juntos.
Adjunta además la imagen de referencia del personaje (`images/<personaje>.jpeg`) y
añade al final: *"Use exactly the character from the attached image."*

Guarda cada resultado como `images/anim/<id>_<accion>.png`, por ejemplo
`images/anim/mohan_walk.png`. Ids: `madremonte`, `patasola`, `hombrecaiman`,
`llorona`, `sombreron`, `mohan`, `muelona`, `silbon`, `juanmachete`, `bachue`.
Acciones: `walk`, `attack`, `hurt`.

Si Gemini mete texto, efectos o fondo con sombra, vuelve a generar: el cortador
necesita fondo blanco limpio y fotogramas separados por espacio en blanco.

---

## REGLAS (siempre igual)

```
16-bit pixel art sprite sheet for a 2D fighting game, in the exact same art style,
colors, proportions and outline as the attached reference. ONE horizontal strip of
6 animation frames, left to right, evenly spaced, with clear white space between
frames. Pure flat white background (#FFFFFF), no shadow on the floor, no text, no
labels, no numbers, no borders, no visual effects, no weapons glow. Side view, the
character always faces RIGHT. Same size in every frame, feet on the same baseline.
Full body visible, nothing cropped. Crisp pixels, no blur, no anti-aliasing.
```

## ACCIÓN: walk (ciclo de caminar)

```
Animation: walking cycle, 6 frames. Frame 1 contact (front foot forward), frame 2
down, frame 3 passing, frame 4 contact (other foot forward), frame 5 down, frame 6
passing. Arms swing naturally, hair and clothes move slightly. Looping cycle.
```

## ACCIÓN: attack (golpes)

```
Animation: 6 frames. Frames 1-3: straight punch with the front arm (wind-up, full
extension, recover). Frames 4-6: high kick with the front leg (chamber, full
extension, recover). Strong dynamic poses, exaggerated extension on frames 2 and 5.
```

## ACCIÓN: hurt (golpeado, derribo, victoria)

```
Animation: 6 frames. Frame 1: hit reaction, head snapped back. Frame 2: stronger
hit reaction, body bent backwards. Frame 3: falling backwards in the air. Frame 4:
lying on the back on the floor. Frame 5: getting up on one knee. Frame 6: victory
pose, both arms raised.
```

---

## PERSONAJES

### madremonte
```
Character: La Madremonte, Colombian forest spirit. Green skin, wild mane of green
leaves and vines with pink and orange flowers, bark-like leaf dress, bare feet,
strong athletic body, fierce yellow eyes. Heavy, grounded stance.
```

### patasola
```
Character: La Patasola, Colombian forest ghost. Gray-green pale skin, long tangled
black hair, torn dark green dress, ONE single leg ending in a hoof, long red claws,
screaming mouth, blood-red eyes. Fast, hunched, feral posture; she hops on one leg.
```

### hombrecaiman
```
Character: El Hombre Caimán, man-crocodile from the Magdalena river. Full crocodile
head with open jaws and sharp teeth, dark green scaled body, muscular arms and
legs, long crocodile tail, torn brown shorts, barefoot clawed feet, yellow eyes.
Heavy brute stance.
```

### llorona
```
Character: La Llorona, weeping ghost. Very pale white-gray skin, long straight
black hair covering part of the face, long torn white dress down to the ankles,
bare feet, dark hollow crying eyes with tear streaks, open wailing mouth. Floaty,
eerie movements.
```

### sombreron
```
Character: El Sombrerón, Colombian shadow legend. Tall thin man entirely in black:
very wide-brimmed tall black hat, long black coat to the ankles, black gloves and
boots, pale gray face hidden in shadow under the hat, faint glowing eyes. Elegant,
sinister posture.
```

### mohan
```
Character: El Mohán, river spirit of the Magdalena. Big muscular tanned man, very
long wild brown hair and long thick brown beard, bare chest, necklace of animal
teeth, brown loincloth, bracelets, barefoot, smoking pipe in the mouth. Powerful
wrestler stance.
```

### muelona
```
Character: La Muelona, Colombian legend. Woman with pale lilac skin, long black
hair, ragged olive-green dress, bare feet, enormous open mouth full of huge sharp
teeth, glowing red eyes, long clawed fingers. Wild, hungry posture.
```

### silbon
```
Character: El Silbón, legend of the Llanos. Tall thin walking skeleton with gray
bones, wearing a wide straw hat, torn white shirt, torn dark blue pants, barefoot,
carrying a big burlap sack of bones on his back. Gaunt, lanky posture.
```

### juanmachete
```
Character: Juan Machete, Colombian legend. Peasant man with tanned skin, thick black
mustache, wide straw ranch hat, white long-sleeve shirt with rolled sleeves, dark
blue pants, barefoot, holding a steel machete in the front hand, a faint red and
orange fire aura around the body. Brawler stance.
```

### bachue
```
Character: Bachué, Muisca mother goddess. Brown-skinned indigenous woman, long black
hair, golden headdress with turquoise feathers, gold necklaces, bracelets and
earrings, turquoise and gold wrap skirt, bare midriff, barefoot, teal glowing eyes.
Graceful, balanced stance.
```

---

## Ejemplo completo (Mohán, caminar)

```
16-bit pixel art sprite sheet for a 2D fighting game, in the exact same art style,
colors, proportions and outline as the attached reference. ONE horizontal strip of
6 animation frames, left to right, evenly spaced, with clear white space between
frames. Pure flat white background (#FFFFFF), no shadow on the floor, no text, no
labels, no numbers, no borders, no visual effects, no weapons glow. Side view, the
character always faces RIGHT. Same size in every frame, feet on the same baseline.
Full body visible, nothing cropped. Crisp pixels, no blur, no anti-aliasing.

Character: El Mohán, river spirit of the Magdalena. Big muscular tanned man, very
long wild brown hair and long thick brown beard, bare chest, necklace of animal
teeth, brown loincloth, bracelets, barefoot, smoking pipe in the mouth. Powerful
wrestler stance.

Animation: walking cycle, 6 frames. Frame 1 contact (front foot forward), frame 2
down, frame 3 passing, frame 4 contact (other foot forward), frame 5 down, frame 6
passing. Arms swing naturally, hair and clothes move slightly. Looping cycle.

Use exactly the character from the attached image.
```

## Checklist antes de guardar

- Fondo blanco sin degradado ni sombra bajo los pies.
- Personaje mirando a la derecha en todos los fotogramas.
- Fotogramas separados por blanco (si dos se tocan, pide "more spacing").
- Sin texto ni números. Sin efectos (fuego, agua, ondas) salvo el aura de Juan Machete.
- Formato PNG o JPEG, tamaño libre (el cortador reescala).
