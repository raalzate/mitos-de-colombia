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

| Acción            | Jugador 1 | Jugador 2 |
|-------------------|-----------|-----------|
| Moverse           | A / D     | ← / →     |
| Saltar            | W         | ↑         |
| Agacharse         | S         | ↓         |
| Puño ligero       | F         | J         |
| Puño fuerte       | G         | K         |
| Patada ligera     | V         | U         |
| Patada fuerte     | B         | I         |
| Habilidad 1       | R         | O         |
| Habilidad 2       | S + R     | ↓ + O     |
| Definitivo        | T         | P         |
| Bloquear          | Q         | L         |

Flujo de partida: menú → (dificultad) → selección de luchador → selección de
escenario (A/D o flechas, `F`/`Enter` confirma, incluye ALEATORIO) → pantalla VS →
combate. En el menú, `ARTE: DIBUJADO / PROCEDIMENTAL` alterna entre el arte de
cuerpo entero dibujado y los sprites generados por código.

Teclas globales: `Enter` pausa/continúa, `Esc` pausa y, en pausa, vuelve al menú;
`Z` alterna pantalla completa; `H` muestra hitboxes (rojo), hurtboxes (azul) y
pushboxes (amarillo). Menús: W/S o flechas para moverse, F / J / Enter / Espacio
para aceptar, Esc para volver.

**Mandos:** se admite Gamepad API con disposición estándar. Primer mando → P1,
segundo → P2 (en modo CPU el segundo mando se ignora). Cruceta o stick izquierdo
para moverse, X puño ligero, Y puño fuerte, A patada ligera, B patada fuerte,
RB/RT especial, LB/LT definitivo, Select bloquear.

**Keyboard ghosting:** la mayoría de teclados de membrana solo registran 2 o 3
teclas simultáneas fuera de los modificadores. En modo dos jugadores pueden
perderse pulsaciones cuando ambos mantienen dirección y botón a la vez (por
ejemplo P1 con D+F y P2 con ← + J). Las combinaciones más propensas son las que
comparten fila/columna de la matriz del teclado (W/S con las flechas suelen ir
bien; F/G/V/B junto a J/K/U/I son las más conflictivas). Si se producen
bloqueos de entrada, usa un mando para uno de los jugadores o un teclado con
N-key rollover.

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
| Juan Machete | pesado | Machetazo (golpe) | Llamarada (erupción) | Pacto infernal (tormenta) |
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
  - `anim/`: tiras de animación por personaje (`walk` 6–7 fotogramas, `attack`
    5–6: puño y patada, `hurt` 5–6: golpe, caída, tumbado, levantarse, victoria),
    cortadas de `images/Retro Folklore Character Sprite Sheet.png`
    (`tools/extract_anim.py`; a La Patasola se le borra la pierna trasera).
  - `fx/`: 35 efectos (proyectil, chorro, invocación, tornado) por personaje.
  En modo `ARTE: DIBUJADO` el combate usa las tiras para caminar, golpes y daño
  (`DrawnAnim.ts`), las poses para habilidades y la imagen base para reposo,
  salto, agachado y bloqueo, con transiciones interpoladas (`SplashPose.ts`); los
  efectos de habilidades usan las imágenes de `fx/` animadas por transformación
  (`DrawnFx.ts`).
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

- Las animaciones son de 2-6 fotogramas por acción; faltan transiciones
  intermedias y animaciones de giro.
- En modo dibujado faltan fotogramas propios para reposo, salto, agachado y
  bloqueo (se usan la imagen base y transformaciones). En modo procedimental los
  10 personajes comparten el mismo conjunto de poses base.
- Sin remapeo de controles en pantalla (los mapas están en `InputManager.ts`).
- Sin ataques en el aire con animación propia para los puños fuertes (usan la
  misma pose que los ligeros).
- Sin sistema de combos ni cancelaciones avanzadas.
- La música es un bucle corto sintetizado.
- No se ha probado en Firefox/Safari reales durante el desarrollo (solo
  Chromium vía Playwright); el código no usa API exclusivas de Chromium.

## Despliegue

Producción en Vercel: https://mitos-de-colombia.vercel.app (proyecto
`mitos-de-colombia`, config en `vercel.json`). Para redesplegar desde el CLI:

```bash
vercel login          # una vez
vercel deploy --prod  # build con pnpm y publica dist/
```

`images/`, `tests/` y las capturas quedan fuera del upload (`.vercelignore`).
