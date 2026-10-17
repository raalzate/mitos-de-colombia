# MITOS DE COLOMBIA: SANGRE DE LEYENDA

Prototipo jugable de lucha 2D uno contra uno en pixel art de 16 bits, ambientado en
las leyendas colombianas. Diez luchadores originales, seis escenarios con selección
propia, combate completo con habilidades y definitivos, IA con tres dificultades,
modo de dos jugadores locales y pantallas arcade (selección con caras y arte de
cuerpo entero, pantalla VS, resultado).

Resolución interna 384 × 224 con escalado entero y sin suavizado. Los escenarios,
efectos, fuente y sonido se generan por código al arrancar. Las caras y el arte de
cuerpo entero de los luchadores son imágenes pixel art en `public/assets`
(derivadas de las referencias de `images/`); si faltan, el juego vuelve al arte
procedimental sin cambiar nada más.

## Requisitos

- Node.js 20 o superior.
- pnpm (recomendado) o npm.

## Instalación y ejecución

```bash
pnpm install        # o npm install
pnpm dev            # servidor de desarrollo en http://localhost:5173
pnpm build          # typecheck + build de producción en dist/
pnpm preview        # sirve dist/
pnpm test           # pruebas unitarias (Vitest)
```

Con npm: `npm install`, `npm run dev`, `npm run build`, `npm test`.

Navegadores probados: Chromium (Playwright). Compatible con Chrome, Edge y Firefox
modernos (WebGL o Canvas 2D).

## Controles

Un jugador contra la CPU (el modo de dos jugadores está oculto). Mano derecha en
las flechas, mano izquierda en ESPACIO y las teclas cercanas:

| Acción | Tecla |
|---|---|
| Moverse | ← / → |
| Saltar / agacharse | ↑ / ↓ |
| Puño (golpe principal) | ESPACIO |
| Patada | Z |
| Puño fuerte | X |
| Patada fuerte | C |
| Especial (↓ + A: especial 2) | A |
| Definitivo | S |
| Bloquear | D o SHIFT izquierdo |

Teclas globales: `Enter` pausa/continúa, `Esc` pausa y, en pausa, vuelve al menú;
`F` pantalla completa; `H` muestra hitboxes. Menús: flechas para moverse,
ESPACIO o ENTER para aceptar, ESC para volver. Los menús solo atienden pulsaciones
nuevas de la propia pantalla (la tecla que confirmó la anterior no se arrastra).

**Mando** (Gamepad API, disposición estándar): cruceta o stick para moverse,
X puño, Y puño fuerte, A patada, B patada fuerte, RB/RT especial, LB/LT
definitivo.

Flujo: menú → dificultad → selección de luchador → selección de escenario (se oye
el sonido de cada uno al recorrerlos) → combate.

## Cómo se juega

- Mejor de tres: gana quien se lleva dos rondas. Si una ronda termina en empate
  (tiempo agotado con la misma vida o doble KO) no puntúa nadie; como máximo se
  juegan cinco rondas.
- 99 segundos por ronda. Al agotarse gana quien tenga más vida.
- Bloquear reduce el daño al 20 % (mínimo 1). El definitivo no se puede bloquear.
- La barra de energía (abajo) sube al golpear y, algo menos, al recibir golpes.
  Con la barra llena se puede usar el definitivo, que la consume entera aunque
  falle.
- Las habilidades tienen enfriamiento propio: dos segmentos sobre la barra de
  energía muestran cuándo están listas (parpadean al recargarse).

### Plantel (10 leyendas)

Cada personaje tiene dos habilidades (R / S+R para P1, O / ↓+O para P2) y un
definitivo (T / P). Los tipos de habilidad son: **golpe** (hitbox con efecto),
**proyectil**, **erupción** (brota bajo la posición del rival) y
**teletransporte** (invulnerable un instante, reaparece tras el rival).

| Personaje | Estilo | Habilidad 1 | Habilidad 2 | Definitivo |
|-----------|--------|-------------|-------------|------------|
| La Madremonte | pesado | Latigazo de raíces (golpe) | Furia del bosque (erupción) | Juicio de la selva |
| La Patasola | rápido, una pierna | Zarpazo sangriento (embestida) | Grito del monte (onda) | Cacería nocturna (cortes) |
| El Hombre Caimán | pesado | Mordida del río (embestida) | Inmersión (teletransporte) | Arrastre al fondo (vórtice) |
| La Llorona | equilibrado | Lamento (proyectil) | Lágrimas del río (erupción) | Llanto eterno (tormenta) |
| El Sombrerón | equilibrado | Látigo de sombra (golpe largo) | Paso de sombra (teletransporte) | Cabalgata maldita (cortes) |
| El Mohán | rápido | Oleada del Magdalena (proyectil) | Niebla encantada (teletransporte) | Abismo del río (vórtice) |
| La Muelona | equilibrado | Mordisco (embestida, roba vida) | Risa macabra (onda) | Festín de dientes |
| El Silbón | rápido, alto | Silbido (proyectil) | Lluvia de huesos (erupción) | Saco de huesos (tormenta) |
| Juan Machete | pesado | Machetazo (golpe) | Llamarada (erupción) | Furia paisa (tormenta) |
| Bachué | equilibrado | Serpiente de agua (proyectil) | Manantial (erupción) | Abrazo de la laguna (vórtice) |

### Escenarios (6)

| Escenario | Ambientación | Detalles |
|-----------|--------------|----------|
| Ribera de los Antiguos | Río Magdalena, medianoche | Río animado, luna, luciérnagas, bruma |
| Llanos del Silbón | Sabana de Casanare, ocaso | Sol bajo, morichales, relámpagos aleatorios |
| Laguna de Iguaque | Páramo de Boyacá, amanecer | Picos nevados, frailejones, laguna, niebla fría |
| Ciénaga del Caimán | Depresión Momposina, noche | Árboles muertos con raíces zancudas, nenúfares, luna verde |
| Cañaduzal en Llamas | Hacienda de Juan Machete | Casa ardiendo, caña en llamas, ascuas que suben y ceniza que cae |
| Callejón del Sombrerón | Pueblo colonial antioqueño | Fachadas con balcones y faroles, iglesia, empedrado |

Cada escenario es un tema (`StageTheme`) con cielo, lejanía, franja de agua o
llanura (3 fotogramas), capa media, suelo, primer plano, bruma y partículas
ambientales. Las capas se generan la primera vez que se elige el escenario.

Los definitivos usan cuatro estilos de cinemática: **bloom** (agarre y
explosión), **vórtice** (arrastre y lanzamiento), **tormenta** (caída de rayos,
huesos o fuego) y **cortes** (el atacante atraviesa al rival varias veces).

## Estructura del proyecto

```text
src/
├── main.ts                   Configuración de Phaser, zoom entero, foco y audio
├── config/game-config.ts     Constantes: resolución, física, partida
├── combat/
│   ├── CombatTypes.ts        Tipos (estados, ataques, cajas, entradas)
│   ├── CombatRules.ts        Reglas puras: daño, bloqueo, rondas, victoria
│   ├── HitboxSystem.ts       Geometría de hitboxes/hurtboxes
│   ├── CombatSystem.ts       Colisiones, proyectiles, empuje de cuerpos
│   └── InputManager.ts       Teclado continuo con buffer + Gamepad API
├── entities/
│   ├── Fighter.ts            Máquina de estados del luchador (sin Phaser)
│   ├── SpecBehavior.ts       Habilidades genéricas dirigidas por datos (SpecialSpec)
│   └── Projectile.ts
├── ai/FighterAI.ts           IA con percepción retardada e intenciones
├── data/fighters.ts          Datos de los 10 luchadores (frames, daño, cajas, habilidades)
├── art/                      Pixel art procedimental
│   ├── PixelPainter.ts       Rasterizador (líneas, polígonos, contorno, dither)
│   ├── PixelFont.ts          Fuente 5x7 original
│   ├── CharacterArtist.ts    Esqueleto 2D, poses, rasgos (Look) por personaje, retratos
│   ├── EffectsArtist.ts      Chispas, raíces, olas, niebla, vórtice
│   ├── SplashPose.ts         Poses (giro/escala/desplazamiento) del arte dibujado
│   ├── StageArtist.ts        Seis temas de escenario y sus capas con parallax
│   └── UiArtist.ts           Logotipo, cursor
├── audio/Sfx.ts              Síntesis WebAudio (efectos + música chiptune)
├── scenes/                   Boot, Menu, CharacterSelect, StageSelect, Fight, Result
├── ui/CombatHUD.ts           Barras, retratos, temporizador, rondas, energía
└── utils/                    Texturas (hojas, escenarios, retratos), entrada global, ajustes
public/assets/
├── portraits/                Caras de los 10 luchadores (24/48/64/96 px, p1 y p2)
└── splash/                   Arte de cuerpo entero (72 px para combate, 128 px para VS/selección)
tests/                        Vitest: reglas, hitboxes, luchador, IA, entrada, escenarios y poses
```

## Arquitectura de combate

- **Paso fijo a 60 Hz** en `FightScene` con acumulador: el tamaño de la ventana
  o la tasa de refresco no alteran velocidades ni daño.
- **Máquina de estados** por luchador: `idle`, `walk`, `jump`, `crouch`,
  `attack`, `special`, `ultimate`, `block`, `hitstun`, `knockdown`, `getup`,
  `cinematic`, `victory`, `defeat`.
- **Frame data** por ataque (`startup`, `active`, `recovery`): la hitbox existe
  solo durante los frames activos y se desactiva tras el primer impacto.
- **Hurtboxes** distintas de pie, agachado y en el aire; **pushbox** para el
  empuje de cuerpos; invulnerabilidad al levantarse y durante la niebla.
- **Hitstop**, retroceso con fricción, lanzamientos y derribos.
- La lógica de combate no importa Phaser, por lo que es testeable en Node.

## Pruebas

`pnpm test` ejecuta 100 pruebas: cálculo de daño y bloqueo, resolución de golpes,
energía y enfriamientos, transición de rondas y condiciones de victoria, máquina
de estados (caminar, saltar, atacar, hitboxes activas, no duplicar impactos,
derribo, KO, reinicio de ronda), proyectiles, niebla, IA en tres dificultades
(se mueve, ataca, no se bloquea), gestor de entrada y plantel completo (hoja de
sprites y retrato de cada personaje, ambas habilidades y el definitivo de los 10,
robo de vida de la Muelona, IA vs IA con cada personaje), los seis temas de
escenario (todas las capas con su tamaño y contenido, cielos distintos) y las poses
del arte dibujado (valores finitos, derribo tumbado, ataque inclinado), tiras de
animación y efectos dibujados (manifiestos contra los archivos en disco, selección
de fotograma en rango), regresiones de combate (IA sin alternar bloqueo, proyectiles
que chocan, teletransporte interrumpido, enfriamientos) y balance IA vs IA (540
combates deterministas; todos los personajes entre 25 % y 75 % de victorias).

Además se verificó manualmente con Playwright en Chromium el flujo completo:
menú → dificultad → selección → combate → KO → ronda 2 → victoria → pantalla de
resultado → revancha, pausa por tecla y por pérdida de foco, pantalla completa y
ambos definitivos.

## Estado de los recursos

- **Arte dibujado** (`public/assets`, extraído con los scripts de `tools/` a partir
  de `images/`; la variante `p2` es un giro de tono para el espejo):
  - `portraits/`: caras (selección, HUD, VS, resultado).
  - `splash/`: cuerpo entero base + 4 poses por personaje (habilidades).
  - `anim/`: tiras de animación por personaje con **solo fotogramas dibujados
    originales** (`walk` 6–7, `attack` 5–6: puño y patada, `hurt` 5–6: golpe,
    caída, tumbado, levantarse, victoria; `idle` = primer fotograma de andar;
    `trans` 3: entrada a agacharse y bloquear), cortadas de
    `images/Retro Folklore Character Sprite Sheet.png` con `tools/build_anim.sh`
    (a La Patasola se le borra la pierna trasera; `tools/clean_halo.py` quita los
    restos claros del fondo blanco en los bordes). Los intermedios sintetizados por
    flujo óptico (`tools/interpolate_walk.py`) se probaron y se retiraron: dejaban
    líneas del contorno dentro del cuerpo, como una segunda imagen detrás.
  - `fall` (en `anim/`): caída de espaldas y levantarse de los 10 personajes, 13
    fotogramas cada uno, generados con **PixelLab** (`animate-with-text-v3`) a partir
    del primer fotograma de andar de cada uno. Los originales están en
    `images/pixellab/fall/<id>/`; `tools/import_pixellab.py` los convierte en tiras,
    quita fragmentos sueltos, deja a Patasola con una sola pierna de pie y mide en
    cada caída qué fotogramas son vuelo, tumbado y levantarse. También se usan sus
    primeros fotogramas como retroceso al recibir un golpe.
  - `fx/`: 35 efectos (proyectil, chorro, invocación, tornado) por personaje.
  En modo `ARTE: DIBUJADO` **todo** el combate sale de las tres tiras
  (`DrawnAnim.ts`), al estilo Mortal Kombat: reposo = primer fotograma de andar
  con respiración (al arrancar a caminar no cambia la imagen; Patasola salta en el
  sitio), andar (en reversa al retroceder), golpes y habilidades desde `attack`
  siguiendo preparación → impacto → recuperación, daño/caída/levantarse/victoria
  desde `hurt`, agachado con achatado progresivo, bloqueo con pose de entrada,
  salto = patada recogida → extendida según la velocidad vertical, giro estrechando
  la figura. Siempre se ve **un solo fotograma** (sin superponer el anterior ni el
  siguiente). Los fotogramas se alinean por el centroide del torso para que el
  cuerpo no se desplace al cambiar. El ciclo de andar avanza por distancia
  recorrida (un fotograma cada 7 px, sin patinar), con balanceo por zancada, polvo
  en cada pisada y anticipación/extensión
  interpoladas en los ataques. Los efectos de habilidades usan `fx/`
  animados por transformación (`DrawnFx.ts`). La imagen base y las poses de
  `splash/` se usan en selección, VS y resultado.
- **Sprites procedimentales**: esqueleto con cinemática directa + rasgos por
  personaje (pelo, sombreros, barbas, escamas, dientes, fuego...), 47
  fotogramas por luchador, paletas tomadas de las referencias. Se usan en modo
  `ARTE: PROCEDIMENTAL` o si faltan los archivos de arte.
- Escenarios: 6 temas de 8 capas generadas (cielo, nubes, lejanía, agua/llanura
  animada en 3 fotogramas, capa media, suelo, primer plano, bruma) con parallax y
  partículas ambientales propias.
- Efectos, retratos, logotipo y fuente 5x7: definitivos para el prototipo.
- Audio: síntesis WebAudio (efectos y música de fondo). Provisional: se
  sustituiría por pistas compuestas.

## Limitaciones y pendientes

- En modo dibujado cada acción tiene los fotogramas de la hoja (andar 6–7, golpes
  y daño 5–6); salto, agachado y bloqueo reutilizan fotogramas de golpes/daño. Más
  fluidez necesita más fotogramas dibujados (prompts en
  `images/PROMPTS_ANIMACION.md`). En modo procedimental los 10 personajes
  comparten el mismo conjunto de poses base.
- Sin remapeo de controles en pantalla (los mapas están en `InputManager.ts`).
- Sin ataques en el aire con animación propia para los puños fuertes (usan la
  misma pose que los ligeros).
- Sin sistema de combos ni cancelaciones avanzadas.
- La música es un bucle corto sintetizado.
- No se ha probado en Firefox/Safari reales durante el desarrollo (solo
  Chromium vía Playwright); el código no usa API exclusivas de Chromium.

## Terror

**Sonido propio de cada escenario** (`src/audio/StageSound.ts`): además de la base
común (latido por tensión, sustos), cada escenario tiene su zumbido, un lecho
continuo y sucesos característicos al azar: la Ribera suena a río, ranas y búho;
los Llanos, a viento, truenos y el silbido do-re-mi del Silbón; la Laguna, a viento
frío, flauta lejana y goteo; la Ciénaga, a ranas, insectos y burbujas; el
Cañaduzal, a fuego crepitando, bramidos de toro y gritos; el Callejón, a campana de
iglesia, perros aullando y cascos de caballo.

- **Advertencia** al arrancar (sustos, gritos fuertes, destellos) y opción
  `SUSTOS: SÍ/NO` en el menú.
- **Ambiente sonoro** sintetizado (`src/audio/Sfx.ts`): zumbido grave en segunda
  menor con filtro que respira, caja de música desafinada lejana con eco,
  susurros, crujidos y gritos lejanos al azar. La **tensión** (vida más baja y
  tiempo restante, `src/combat/Fear.ts`) acelera un latido de 55 a 150 ppm, abre
  el zumbido y añade un tono agudo disonante.
- **Screamers** (`src/ui/Screamer.ts`): la cara del luchador se abalanza a pantalla
  completa con un grito distorsionado, temblor y glitch (máximo dos destellos, sin
  parpadeo rápido). Saltan al rematar el combate (cara del ganador), como mucho
  una vez por ronda cuando alguien baja de 30 de vida (cara del que va ganando,
  con 20 s de separación) y tras 25 s quieto en el menú. La lógica del combate se
  pausa mientras dura el susto.

## Estilo Mortal Kombat: criterio de aceptación

| Criterio | Estado | Cómo se verificó |
|---|---|---|
| Un único personaje por luchador en todos los estados (un solo fotograma visible, sin imágenes superpuestas) | Cumple | Lectura de textura y fotograma por estado en el juego; capturas de los 10 caminando |
| Al empezar a caminar no cambia la imagen | Cumple | El reposo es el primer fotograma del ciclo de andar |
| Caminar con al menos tantas imágenes por segundo como MK II | Cumple | 11–27 frente a 9,5 (tabla siguiente) |
| Sangre en los golpes (gotas en la dirección del golpe y manchas en el suelo) | Cumple | Captura de un golpe fuerte de Juan Machete al Silbón |
| «¡ACÁBALO!/¡ACÁBALA!» tras el KO decisivo y FATALIDAD (definitivo o golpe fuerte) | Cumple | Captura de la fatalidad: texto, fuente de sangre y susto con la cara del ganador |
| Escenarios oscuros y temáticos | Cumple | 6 escenarios nocturnos o de terror |
| Caída y levantarse con tantos fotogramas como MK II (7 de caída, 6 de levantarse) | Cumple | Caída de 13 fotogramas por personaje generada con PixelLab, revisada en el juego |
| Golpes con tantos fotogramas dibujados como MK II | Parcial | 5–6 fotogramas originales por tira; MK II no publica tiempos de golpes |

En combate, tras el KO que decide el combate el ganador tiene 4 s para pulsar el
definitivo o un golpe fuerte (P1: T, G o B; P2: P, K o I). La CPU remata con una
probabilidad que sube con la dificultad.

## Fluidez frente a Mortal Kombat II

Referencia: GIF de caminar de MK II en mortalkombatwarehouse.com (Scorpion,
Sub-Zero y Reptile: 9 fotogramas × 100 ms) y postura de Scorpion (7 × 80 ms).
Medición al caminar: capturas del juego en 45 pasos seguidos de 60 Hz por
personaje (solo el luchador, sin escenario) frente a los GIF reproducidos a 60 Hz
con su tiempo original, a la misma altura. Se cuenta el % de píxeles que cambian
visiblemente entre pasos consecutivos.

| Personaje | Pasos con cambio | Congelado máx. (pasos) | Imágenes/s | Salto máx. (% px) | Cambio medio (% px) |
|---|---|---|---|---|---|
| MK II Scorpion | 16 % | 5 | 9,5 | 23,1 | 17,8 |
| MK II Sub-Zero | 16 % | 5 | 9,5 | 21,4 | 18,7 |
| MK II Reptile | 16 % | 5 | 9,5 | 24,9 | 18,2 |
| La Madremonte | 25 % | 6 | 15 | 17,9 | 13,7 |
| La Patasola | 27 % | 4 | 16,4 | 12,6 | 10,2 |
| El Hombre Caimán | 27 % | 5 | 16 | 19,7 | 14,2 |
| La Llorona | 27 % | 4 | 16,4 | 12,8 | 11,1 |
| El Sombrerón | 20 % | 4 | 12,3 | 4,2 | 3,2 |
| El Mohán | 36 % | 4 | 21,3 | 15,4 | 13,2 |
| La Muelona | 39 % | 4 | 23,2 | 14,8 | 12,6 |
| El Silbón | 45 % | 4 | 27,3 | 14,8 | 11,7 |
| Juan Machete | 20 % | 5 | 12,3 | 14,9 | 12,3 |
| Bachué | 18 % | 5 | 10,9 | 9,8 | 8,6 |

Con solo fotogramas originales y sin superposiciones, los 10 personajes muestran
más imágenes por segundo al caminar que MK II (11–27 frente a 9,5), con saltos
iguales o menores (4–20 % frente a 21–25 %). La cadencia depende de la velocidad
de cada personaje, porque el ciclo avanza por distancia.

La caída de MK II (Scorpion, GIF del sitio) son 7 fotogramas de 60 ms y la pose
tumbada; aquí la caída gira según la velocidad vertical sobre el fotograma de
caída de la hoja.

MK II no publica tiempos de sus golpes: en mortalkombatwarehouse solo hay
fotogramas sueltos de cada golpe, así que aquí no se comparan ritmos.

Los sprites de MK II solo se usaron para medir; no están en el repositorio.

## Despliegue

Producción en Vercel: https://mitos-de-colombia.vercel.app (proyecto
`mitos-de-colombia`, config en `vercel.json`). Para redesplegar desde el CLI:

```bash
vercel login          # una vez
vercel deploy --prod  # build con pnpm y publica dist/
```

`images/`, `tests/` y las capturas quedan fuera del upload (`.vercelignore`).

## Modo aventura

Desde el menú, **MODO AVENTURA** abre un recorrido por casillas con vista desde arriba, al estilo de los juegos de bolsillo:

- **Juan Machete es el protagonista**: un campesino paisa de Medellín, vivo y berraco. Llega a la vereda San Agustín
  y la abuela Rosa le cuenta que cinco espantos asustan a la gente. Él siempre es quien pelea.
- **Los espantos** (Silbón, Llorona, Patasola, Sombrerón y Mohán) se ven en el mapa. Si te acercas, gritan, el héroe
  tiembla del miedo, el espanto se acerca y empieza un **combate de lucha** como el del modo normal (rounds, golpes,
  especiales, ¡ACÁBALO!). En la hierba alta también saltan mitos salvajes.
- **Si ganas** sigues donde estabas y el espanto queda calmado. **Si pierdes**, FIN DEL JUEGO: la partida se borra y todo vuelve a empezar.
- Los espantos se ponen más bravos (dificultad difícil) cuando ya calmaste a tres. Los salvajes van en fácil.
- Don Toño, el pescador, oye llorar a la Llorona, se asusta y huye a la vereda.
- Con los cinco calmados, vuelve con la abuela para el final.

Controles en el mapa: flechas para andar, ESPACIO/ENTER para hablar y aceptar, ESC para el menú (espantos que faltan, guardar).
La partida se guarda en el navegador.

Arte: Juan Machete en el mapa (4 direcciones y caminata, generado con PixelLab y repintado en `tools/import_aventura.py` con sombrero café, camisa blanca, jean y bigote para que sea el mismo de la pelea), la abuela, don Toño, el árbol y el tileset de hierba y camino se generaron
con **PixelLab** (originales en `images/pixellab/aventura/`, `tools/pixellab_api.py` lee la clave de `.env`, que no se
sube). `tools/import_aventura.py` los convierte en `public/assets/aventura/`. Agua, hierba alta, puente, letreros y
casas se dibujan en código (`src/adventure/OverworldArt.ts`); en combate se usan las tiras dibujadas de los luchadores.
