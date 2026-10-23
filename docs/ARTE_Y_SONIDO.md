# Arte y sonido

## Arte de los luchadores

![Selección](screenshots/02-seleccion.png)

Las referencias están en `images/`: caras (`caras.jpeg`), una hoja por personaje con poses y efectos, y una hoja de
animación (`Retro Folklore Character Sprite Sheet.png`, 10 filas con andar, golpe y daño). Se generaron con
**Gemini**; los prompts por personaje y acción están en `images/PROMPTS_ANIMACION.md`.

Los scripts de `tools/` (Python con PIL, numpy y scipy, siempre con `python3 -I`) cortan esas hojas y escriben lo que
usa el juego en `public/assets`:

| Carpeta | Qué hay | Script |
|---|---|---|
| `portraits/` | Caras de los 10 (24, 48, 64 y 96 px; variante p2 con giro de tono para el espejo) | `extract_splash.py` |
| `splash/` | Cuerpo entero (72 px en combate, 128 px en selección y VS) y 4 poses por personaje | `extract_splash.py`, `fix_splash.py` |
| `anim/` | Tiras de animación: andar (6–7 fotogramas), golpe (5–6), daño (5–6), entrada a agacharse/bloquear (3) | `build_anim.sh` |
| `anim/` (`fall`) | Caída y levantarse, 13 fotogramas por personaje, generados con PixelLab | `import_pixellab.py` |
| `fx/` | 35 efectos de poderes (proyectil, chorro, invocación, tornado) | `extract_fx.py` |
| `aventura/` | Juan, la abuela, aldeanos, espíritus, perro, árbol y tileset del mapa (PixelLab) | `import_aventura.py` |

`tools/build_anim.sh` regenera todas las tiras y el manifiesto `src/art/drawnAnimManifest.ts`. A la Patasola se le
borra la pierna trasera; `clean_halo.py` quita los restos claros del fondo blanco en los bordes.

### Animación al estilo Mortal Kombat

En modo `ARTE: DIBUJADO` todo el combate sale de esas tiras (`src/art/DrawnAnim.ts`):

- Siempre se ve **un solo fotograma dibujado original**. No se superponen fotogramas ni se usan intermedios
  sintetizados: se probaron (flujo óptico en `tools/interpolate_walk.py`) y se retiraron porque dejaban una "mano de
  más", como una segunda imagen detrás.
- La fluidez sale de transformar el fotograma completo (achatar, girar, inclinar) y de avanzar el ciclo de andar
  por **distancia recorrida** (un fotograma cada 7 px), así los pies no patinan.
- Reposo = primer fotograma de andar, con respiración; andar en reversa al retroceder; golpes y poderes siguen
  preparación → impacto → recuperación; salto con la patada recogida o extendida según la velocidad vertical; al
  cambiar de lado la figura se estrecha y se abre ya volteada.
- Los fotogramas se alinean por el centroide del torso para que el cuerpo no salte al cambiar de imagen.

En modo `ARTE: PROCEDIMENTAL` los luchadores salen de un esqueleto 2D con rasgos por personaje (`CharacterArtist.ts`).
Es también el respaldo si faltan los archivos de arte.

| Criterio frente a Mortal Kombat II | Estado |
|---|---|
| Un único personaje visible por luchador en todos los estados | Cumple |
| Al empezar a caminar no cambia la imagen | Cumple |
| Caminar con al menos tantas imágenes por segundo como MK II | Cumple: 11–27 frente a 9,5 |
| Sangre en los golpes y remate tras el KO decisivo | Cumple |
| Escenarios oscuros y temáticos | Cumple: 9 nocturnos o de terror |
| Caída y levantarse con tantos fotogramas como MK II (7 + 6) | Cumple: 13 por personaje |
| Golpes con tantos fotogramas dibujados como MK II | Parcial: 5–6 originales por tira |

La medición de la fluidez al caminar se hizo capturando el juego cuadro a cuadro y comparando con los GIF de MK II
(Scorpion, Sub-Zero y Reptile, 9 × 100 ms). Los sprites de MK II solo se usaron para medir y no están en el
repositorio.

| Personaje | Imágenes/s al caminar | Salto máximo entre imágenes (% px) |
|---|---|---|
| MK II (referencia) | 9,5 | 21–25 |
| La Madremonte | 15 | 17,9 |
| La Patasola | 16,4 | 12,6 |
| El Hombre Caimán | 16 | 19,7 |
| La Llorona | 16,4 | 12,8 |
| El Sombrerón | 12,3 | 4,2 |
| El Mohán | 21,3 | 15,4 |
| La Muelona | 23,2 | 14,8 |
| El Silbón | 27,3 | 14,8 |
| Juan Machete | 12,3 | 14,9 |
| Bachué | 10,9 | 9,8 |

## Arte del modo aventura

- **Personajes** (Juan, abuela, don Toño, aldeanos, espíritus, perro): generados con **PixelLab**
  (`create-character-v3`, 48 px). Juan es el muchacho de PixelLab repintado por `tools/import_aventura.py` con
  sombrero café, camisa blanca, jean y bigote, para que sea el mismo de la pelea. Los originales están en
  `images/pixellab/aventura/`.
- **Por código** (`src/adventure/*Art.ts`): edificios del pueblo, Medellín y Santa Fe; muebles de los 32
  interiores; objetos (faroles, fuente, chiva, jeep, metro, esculturas de Botero...); agua, hierba alta, puente y
  letreros; el **caballo** (Lucero y el caballo negro del Sombrerón, con cuatro fotogramas dibujados de galope).
- **Escenarios de pelea**: ocho capas por escenario dibujadas por código en `src/art/StageArtist.ts`.
- La clave de PixelLab se lee de `.env` (`tools/pixellab_api.py`), que no se sube al repositorio.

## Sonido

Todo el audio corre en WebAudio (`src/audio/Sfx.ts`): grabaciones reales para voces, golpes y poderes, y síntesis
para la música, el ambiente y algunos efectos.

### Poderes con sonido declarado

Cada poder de `src/data/fighters.ts` declara su sonido como capas (`PowerSound`):

```ts
s2spec: { type: 'eruption', short: 'FURIA', ...,
  sound: { cast: [{ s: 'rock_rumble', vol: 0.7 }], release: [{ s: 'rock_break' }, { s: 'wood_break', at: 0.1 }], voice: true } },
```

- `cast` suena al lanzar el poder y `release` cuando sale o pega.
- Cada capa es una grabación (`s`) o un sonido sintetizado (`fx`), con tono, volumen y retraso propios.
- `voice: true` hace que el luchador grite con su propia voz.

Así la Madremonte suena a tierra y madera (crujidos, retumbe, rugido grave), la Llorona a agua y lamento, el
Silbón a silbido y huesos, el Sombrerón a galope, relincho y látigo, y Juan Machete a machete y fuego. Un test
vigila que la Madremonte no use voces de mujer ni pitidos agudos.

### Voces

Cada luchador tiene voz para pegar, para recibir y para soltar un poder (`src/audio/Samples.ts`). **Juan Machete
habla con su propia voz**: siempre el mismo hombre (un actor de voz del paquete de HaelDB), dos semitonos más
grave. Como las grabaciones no se pueden escuchar en las pruebas automáticas, se mide su tono con un estimador
armónico: la voz de Juan queda entre 160 y 260 Hz.

### Música y ambiente

- **Paisaje sonoro por lugar** (`src/audio/StageSound.ts`): zumbido grave, un lecho continuo (río, viento, fuego)
  y sucesos al azar propios de cada escenario o zona de la aventura.
- **Música de los sitios alegres**: cumbia, música de carrilera, bambuco, salsa y órgano de iglesia, compuestas
  nota a nota en el código.
- **Música de batalla**: al aparecer un mito suena un golpe grave con un barrido de viento y cambia la música, como
  en los juegos de bolsillo. Es oscura a propósito: bajo grave que late en La con el roce de medio tono a Si
  bemol, tambores tipo taiko, cuerdas sostenidas en menor y una campanita lejana. Al ganar suena un acorde de
  cuerdas que se abre.
- La **tensión** del combate acelera el latido y abre el zumbido; la música de batalla apenas baja para que se oiga.

### De dónde salen las grabaciones

Paquetes CC0 de OpenGameArt: voces de HaelDB; criaturas, madera, piedras, agua, fuego y golpes de rubberduck;
risas y gritos de AntumDeluge, nocturnalvanguard y Ferk; machete de artisticdude y Kenney. Se recortan, se
normalizan y se convierten con `tools/build_power_sfx.py`. La lista completa archivo por archivo está en
[public/assets/audio/CREDITS.md](../public/assets/audio/CREDITS.md).
