# Arquitectura

Phaser 3.90 + TypeScript + Vite, pruebas con Vitest, gestor de paquetes pnpm. Todo lo que es regla del juego
(combate, entrada, IA, mapas, mitos escondidos, escenas al fondo, música) es **código puro sin Phaser**, para poder
probarlo en Node; las escenas de Phaser solo dibujan y reproducen sonido.

## Estructura

```text
src/
├── main.ts                    Phaser, zoom entero, foco y desbloqueo del audio
├── config/game-config.ts      Resolución (384 × 224), física, tiempos de partida
├── scenes/
│   ├── BootScene.ts           Carga del arte dibujado y de PixelLab (con respaldo procedimental)
│   ├── WarningScene.ts        Advertencia de sustos
│   ├── MenuScene.ts           Menú, dificultad, controles, opciones
│   ├── CharacterSelectScene.ts, StageSelectScene.ts, ResultScene.ts
│   ├── FightScene.ts          Combate: paso fijo, render, cinemáticas, escenas al fondo
│   └── AdventureScene.ts      Modo aventura: mapas, noche, diálogos, sucesos, perro, caballo
├── combat/                    Reglas puras del combate
│   ├── CombatTypes.ts         Estados, ataques, cajas, poderes y su sonido declarado
│   ├── CombatRules.ts         Daño, bloqueo, energía, rondas, victoria
│   ├── CombatSystem.ts        Colisiones, proyectiles, empuje de cuerpos
│   ├── HitboxSystem.ts        Geometría de cajas
│   ├── InputManager.ts        Teclado con buffer + Gamepad API
│   ├── TwoButton.ts           Controles de dos botones (combinaciones, carga, patrones)
│   ├── Lurk.ts                Escenas del mito al fondo del escenario
│   ├── Fear.ts, Finish.ts     Tensión, sustos y remate
│   └── Banter.ts, Duels.ts    Frases durante la pelea y charla de reto
├── entities/                  Fighter (máquina de estados), SpecBehavior (poderes por datos), Projectile
├── ai/FighterAI.ts            IA con percepción retardada e intenciones
├── data/fighters.ts           Los 10 luchadores: tiempos, daño, cajas, poderes y sus sonidos
├── adventure/                 Modo aventura (puro salvo el arte)
│   ├── World.ts, Maps.ts      San Agustín, Medellín, Santa Fe e interiores
│   ├── Hunt.ts                Mitos escondidos: ronda, señales, emboscada, huida
│   ├── State.ts, Stories.ts   Partida guardada e historias
│   ├── DialogBox.ts, text.ts  Caja de diálogo y partición de texto
│   └── *Art.ts                Dibujo por código de pueblo, ciudad, interiores, perro y caballo
├── art/                       Pixel art: pintor, fuente 5×7, escenarios, efectos, animación dibujada
├── audio/                     Sfx (síntesis + muestras), StageSound (paisajes y música), Samples (voces)
├── ui/                        HUD del combate y sustos
└── utils/                     Texturas, entrada global y ajustes
public/assets/                 Arte dibujado, PixelLab, efectos y audio
tools/                         Scripts de Python para extraer arte y preparar audio
tests/                         Vitest
images/                        Referencias y originales (no se publican en Vercel)
docs/                          Esta documentación y las capturas
```

## Decisiones de combate

- **Paso fijo a 60 Hz** con acumulador en `FightScene`: ni el tamaño de la ventana ni la tasa de refresco cambian
  velocidades o daño.
- **Máquina de estados** por luchador: `idle`, `walk`, `jump`, `crouch`, `attack`, `special`, `ultimate`, `block`,
  `hitstun`, `knockdown`, `getup`, `cinematic`, `victory`, `defeat`.
- **Tiempos por ataque** (`startup`, `active`, `recovery`): la caja de golpe existe solo en los cuadros activos y se
  apaga tras el primer impacto. Cajas de daño distintas de pie, agachado y en el aire; caja de empuje;
  invulnerabilidad al levantarse y en el teletransporte. Parada de impacto, retroceso, derribos.
- **Poderes dirigidos por datos**: `SpecBehavior` interpreta cada `SpecialSpec` (golpe, proyectil, erupción,
  teletransporte) y avisa a la escena por `FighterEvents` (efecto, proyectil, sonido del poder). Agregar un poder es
  agregar datos.
- **Escenas al fondo**: `Lurk.ts` arma un guion de fotogramas clave (posición en pantalla, profundidad, giro, cuánto
  está hundido, transparencia, pose) y la escena lo interpreta cuadro a cuadro. Mientras dura no se llama a
  `CombatSystem`, así que nadie pega.

## Decisiones del modo aventura

- Los mapas son rejillas de casillas de 16 px (dibujadas al doble) con tipos de suelo; edificios, objetos y letreros
  se estampan encima. Un solo registro (`getMap`) entrega campo, ciudades e interiores; cada interior sabe a qué
  puerta vuelve.
- Los mitos escondidos son datos (`GUARDIANS`: zona, señal, frases, escenario de su pelea) y reglas puras
  (`Hunt.ts`): probabilidad de emboscada según la distancia, descanso tras esfumarse, ganas de huir que bajan con
  cada escape.
- Los sucesos de la historia son banderas en la partida (`intro`, `perro`, `arepa`, `caballo`, `tono`...). Los
  personajes pueden declarar `needs` (aparecen tras un suceso) o `gone` (se van tras un suceso).
- El combate se abre con la configuración en el registro de Phaser (`adventureFight`) y vuelve con el resultado
  (`win`, `lose`, `fled`).

## Pruebas

`pnpm test` corre **440 pruebas** en 25 archivos. Entre ellas:

- Reglas de combate, cajas, máquina de estados del luchador, proyectiles, teletransporte, remate, tensión y sustos.
- IA en tres dificultades y **balance IA contra IA**: 540 combates deterministas, todos los personajes entre 25 % y
  75 % de victorias.
- Controles de dos botones, gestor de entrada y regresiones de combate.
- Todos los mapas: se llega a cada persona, letrero y puerta; nada se monta encima de otra cosa; cada interior
  vuelve a su puerta; el ritmo del campo es mayormente tensión; casi todas las historias tienen narrador; Lucero
  queda amarrado junto a su llegada.
- Mitos escondidos: aparecen lejos, rondan sin salir de su zona, dejan señales, saltan solo de cerca.
- Escenas al fondo: empiezan donde peleaba el mito, vuelven a pelear junto a Juan, no quedan detrás de él,
  aparecen sin saltos bruscos.
- Sonido: cada muestra existe, cada poder declara su sonido con grabaciones que existen, todos tienen voz, la
  Madremonte no suena a niña, la música de batalla no tiene metales ni bajo que salte.
- Arte: manifiestos de animación contra los archivos en disco, escenarios, poses y efectos.

Además, cada cambio visual se revisa en el juego real con Playwright (capturas cuadro a cuadro), no solo con
métricas.

## Herramientas (`tools/`)

| Script | Para qué |
|---|---|
| `build_anim.sh` | Regenera todas las tiras de animación y el manifiesto |
| `extract_splash.py`, `fix_splash.py`, `extract_fx.py` | Caras, cuerpo entero, poses y efectos desde `images/` |
| `import_pixellab.py`, `import_aventura.py`, `pixellab_api.py` | Arte generado con PixelLab (caídas y modo aventura) |
| `build_power_sfx.py` | Recorta y normaliza las grabaciones de poderes y la voz de Juan |
| `measure_anim.py` | Mide la fluidez de las animaciones |

## Despliegue

Vercel (`vercel.json`): `pnpm build` y se publica `dist/`. `images/`, `docs/` y `tests/` quedan fuera
(`.vercelignore`).
