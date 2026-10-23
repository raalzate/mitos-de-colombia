# Spec: MITOS DE COLOMBIA: SANGRE DE LEYENDA

Juego web de lucha 2D 1 vs 1 en pixel art de 16 bits, ambientado en leyendas colombianas. Tono de terror folclórico, combate estilo Mortal Kombat, con modo aventura estilo Pokémon.

## 1. Objetivo y alcance

- Juego jugable en navegador (Chrome, Edge, Firefox modernos), un jugador contra la CPU.
- 10 luchadores, 6 escenarios, 3 dificultades de IA, modo aventura con 9 combates.
- Fuera de alcance: multijugador en línea, combate por turnos, peleas aleatorias en el mapa.

## 2. Stack y restricciones técnicas

| Aspecto | Decisión |
|---|---|
| Lenguaje | TypeScript |
| Motor | Phaser 3.90 |
| Build / tests | Vite, Vitest |
| Gestor de paquetes | pnpm |
| Resolución | 384×224 interna, escalado entero, sin suavizado (`pixelArt: true`) |
| Despliegue | Estático (Vercel) |
| Paso de simulación | Fijo a 60 Hz con acumulador (independiente de la tasa de refresco) |

Restricciones:

- **TC-01** La lógica de combate no importa Phaser; es testeable en Node.
- **TC-02** Fuente 5×7, efectos, escenarios, SFX y música (chiptune WebAudio) se generan por código al arrancar.
- **TC-03** Caras y arte de cuerpo entero son PNG en `public/assets`. Si faltan, se usa arte procedimental sin otros cambios.
- **TC-04** Animación solo con fotogramas dibujados originales: nunca superponer fotogramas ni usar intermedios sintetizados (genera imagen fantasma). Eliminar halos blancos del fondo.

## 3. Flujo de pantallas

Aviso de contenido → Menú → Dificultad (fácil / normal / difícil) → Selección de luchador (caras y cuerpo entero) → Selección de escenario (suena el ambiente al recorrerlos) → VS → Combate → Resultado (revancha).
Desde el menú: Modo Aventura.

## 4. Requisitos funcionales

### 4.1 Combate

- **FR-001** Mejor de 3 rondas; máximo 5 si hay empates (tiempo agotado con igual vida o doble KO no puntúan).
- **FR-002** 99 s por ronda; al agotarse gana quien tenga más vida.
- **FR-003** Bloquear reduce el daño al 20 % (mínimo 1). El definitivo no se bloquea.
- **FR-004** Barra de energía: sube al golpear y, en menor medida, al recibir golpes. Llena habilita el definitivo, que la consume entera aunque falle.
- **FR-005** Cada habilidad tiene enfriamiento propio, visible en el HUD (parpadea al recargarse).
- **FR-006** Estados por luchador: `idle, walk, jump, crouch, attack, special, ultimate, block, hitstun, knockdown, getup, cinematic, victory, defeat`.
- **FR-007** Frame data por ataque (`startup/active/recovery`). La hitbox existe solo en frames activos y solo impacta una vez.
- **FR-008** Hurtboxes distintas de pie, agachado y en el aire; pushbox para empuje de cuerpos; invulnerabilidad al levantarse y durante teletransporte.
- **FR-009** Hitstop, retroceso con fricción, lanzamientos y derribos.
- **FR-010** Habilidades dirigidas por datos (`SpecialSpec`): golpe, embestida, onda, proyectil, erupción (brota bajo el rival), teletransporte (invulnerable, reaparece tras el rival).
- **FR-011** Definitivos con 4 cinemáticas: bloom (agarre + explosión), vórtice, tormenta (rayos/huesos/fuego), cortes.
- **FR-012** Sangre en golpes, "¡ACÁBALO!" y FATALIDAD al final de combate.
- **FR-013** Terror: ambiente sonoro, latido por baja vida, screamers ocasionales.

### 4.2 Controles

| Acción | Tecla |
|---|---|
| Mover | ← / → |
| Saltar / agacharse | ↑ / ↓ |
| Puño | ESPACIO |
| Patada | Z |
| Puño fuerte | X |
| Patada fuerte | C |
| Especial (↓+A: especial 2) | A |
| Definitivo | S |
| Bloquear | D o Shift izq. |
| Pausa / pausa-menú | Enter / Esc |
| Pantalla completa / hitboxes | F / H |

- **FR-014** Soporte de mando (Gamepad API estándar): cruceta/stick mover, X puño, Y puño fuerte, A patada, B patada fuerte, RB/RT especial, LB/LT definitivo.
- **FR-015** Menús: flechas, ESPACIO/ENTER aceptan, ESC vuelve. Solo atienden pulsaciones nuevas de la propia pantalla.
- **FR-016** Pausa automática al perder el foco.

### 4.3 IA

- **FR-017** IA con percepción retardada e intenciones, tres dificultades.
- **FR-018** La IA se mueve, ataca y no alterna el bloqueo de forma absurda.

### 4.4 Plantel (cada uno: 2 habilidades + 1 definitivo)

| Personaje | Estilo | Hab. 1 | Hab. 2 | Definitivo |
|---|---|---|---|---|
| La Madremonte | pesado | Latigazo de raíces | Furia del bosque (erupción) | Juicio de la selva |
| La Patasola | rápido, una pierna | Zarpazo sangriento (embestida) | Grito del monte (onda) | Cacería nocturna |
| El Hombre Caimán | pesado | Mordida del río (embestida) | Inmersión (teletransporte) | Arrastre al fondo |
| La Llorona | equilibrado | Lamento (proyectil) | Lágrimas del río (erupción) | Llanto eterno |
| El Sombrerón | equilibrado | Látigo de sombra | Paso de sombra (teletransporte) | Cabalgata maldita |
| El Mohán | rápido | Oleada del Magdalena (proyectil) | Niebla encantada (teletransporte) | Abismo del río |
| La Muelona | equilibrado | Mordisco (roba vida) | Risa macabra (onda) | Festín de dientes |
| El Silbón | rápido, alto | Silbido (proyectil) | Lluvia de huesos (erupción) | Saco de huesos |
| Juan Machete | pesado | Machetazo | Llamarada (erupción) | Furia paisa |
| Bachué | equilibrado | Serpiente de agua (proyectil) | Manantial (erupción) | Abrazo de la laguna |

- **FR-019** Balance: en IA vs IA determinista (540 combates), todos los personajes entre 25 % y 75 % de victorias.

### 4.5 Escenarios

Cada uno es un `StageTheme` con cielo, lejanía, franja de agua o llanura (3 fotogramas), capa media, suelo, primer plano, bruma y partículas; parallax; sonido ambiente propio. Capas generadas al elegir el escenario.

| Escenario | Ambientación |
|---|---|
| Ribera de los Antiguos | Río Magdalena, medianoche, luna, luciérnagas, bruma |
| Llanos del Silbón | Sabana de Casanare, ocaso, relámpagos aleatorios |
| Laguna de Iguaque | Páramo de Boyacá, amanecer, frailejones, niebla fría |
| Ciénaga del Caimán | Noche, árboles muertos, nenúfares, luna verde |
| Cañaduzal en Llamas | Hacienda de Juan Machete ardiendo, ascuas y ceniza |
| Callejón del Sombrerón | Pueblo colonial antioqueño, balcones, faroles, iglesia |

### 4.6 Arte y animación

- **FR-020** Tiras por personaje: `walk` 6–7 fotogramas, `attack` (puño y patada) 5–6, `hurt` 5–6 (golpe, caída, tumbado, levantarse, victoria), `trans` 3 (entrar a agacharse/bloquear). `idle` = primer fotograma de `walk`.
- **FR-021** Poses para habilidades (giro/escala/desplazamiento), efectos dibujados, caras (24/48/64/96 px) y cuerpo entero (72 px combate, 128 px VS/selección).
- **FR-022** Variante P2 como giro de tono para el espejo.

### 4.7 Modo Aventura

- **FR-023** Mapa explorable cenital estilo Pokémon, con diálogos en caja de texto.
- **FR-024** Protagonista: Juan Machete, campesino paisa de Medellín, vivo y berraco. No es un monstruo ni tiene pacto con el diablo. Siempre pelea él.
- **FR-025** Los 9 mitos restantes son guardianes; cada uno pelea en el escenario de su leyenda.
- **FR-026** Cada encuentro lleva al combate estilo MK (no por turnos) y vuelve al mapa con el resultado.
- **FR-027** Sin peleas al azar en la hierba (solo sustos); los encuentros son con mitos escondidos (FR-030).
- **FR-028** Ganar = mito calmado. Perder = FIN DEL JUEGO y partida borrada (`localStorage`).
- **FR-029** Mapa grande tipo Zelda (96×72 baldosas) de noche: pueblo colonial (iglesia, alcaldía, cantinas, tienda, edificios, casas de colores, plaza con fuente, chiva), vereda cafetera con trapiche, cementerio con capilla, llano, monte, río con tres puentes, ciénaga y laguna. Oscuridad con luz del farol de Juan, faroles y ventanas encendidas.
- **FR-030** Los mitos no se ven en el mapa: rondan escondidos en su zona, se mueven, dejan señales en el suelo (huesos, huellas de una pata, lágrimas, oro, escamas…), se oyen de cerca y a veces se dejan ver un instante con ojos rojos. Aparecen de la nada junto a Juan.
- **FR-031** Al aparecer, un mito puede esfumarse sin pelear; en la pelea, con poca vida, puede volarse (como un salvaje que huye). Cada huida baja la probabilidad de la siguiente. Huir no calma al mito.
- **FR-032** Personajes secundarios que no pelean: el Duende, el Pollo Maligno y la Mano Peluda. Aparecen, asustan, dan pistas y se esfuman. Aldeanos con diálogos que dan pistas de dónde buscar.
- **FR-033** Sonidos grabados reales (CC0, `public/assets/audio/CREDITS.md`): machete al cortar, al golpear y al chocar; voces de monstruo por mito al atacar y al recibir golpes.

## 5. Criterios de éxito

- **SC-001** Flujo completo menú → combate → KO → ronda 2 → victoria → resultado → revancha sin errores.
- **SC-002** Velocidad y daño idénticos en cualquier tasa de refresco o tamaño de ventana.
- **SC-003** `pnpm test` y `pnpm build` (typecheck + build) pasan.
- **SC-004** Sin imagen fantasma ni manchas blancas de fondo en ningún personaje.
- **SC-005** Se puede completar el modo aventura derrotando a los 9 guardianes.

## 6. Pruebas (Vitest, ~100)

Daño y bloqueo; resolución de golpes; energía y enfriamientos; rondas y victoria; máquina de estados (caminar, saltar, atacar, no duplicar impacto, derribo, KO, reinicio de ronda); proyectiles; niebla; teletransporte interrumpido; IA por dificultad; gestor de entrada; plantel completo (sprites, retratos, habilidades, definitivos, robo de vida); 6 escenarios (capas, tamaños); poses y manifiestos de animación contra archivos en disco; balance IA vs IA.

## 7. Estructura sugerida

```text
src/
├── main.ts, config/game-config.ts
├── combat/      CombatTypes, CombatRules, HitboxSystem, CombatSystem, InputManager
├── entities/    Fighter, SpecBehavior, Projectile
├── ai/          FighterAI
├── data/        fighters.ts
├── art/         PixelPainter, PixelFont, CharacterArtist, EffectsArtist, StageArtist, DrawnAnim
├── audio/       Sfx, StageSound
├── adventure/   World, State, DialogBox, OverworldArt
├── scenes/      Boot, Warning, Menu, CharacterSelect, StageSelect, Fight, Result, Adventure
├── ui/          CombatHUD, Screamer
└── utils/
public/assets/   portraits/, splash/, anim/
tests/
```

## 8. Plan por fases

1. Núcleo de combate + tests con arte procedimental.
2. HUD y pantallas.
3. Escenarios y audio.
4. Plantel completo y balance.
5. Arte dibujado y animación por tiras.
6. Modo aventura.

## 9. Dependencias de arte externas

Hojas de sprites generadas con Gemini (caras, poses, tiras de animación) y PixelLab (sprites del mapa de aventura). Sin esos PNG, aplica TC-03.
