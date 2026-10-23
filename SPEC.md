# Spec: MITOS DE COLOMBIA: SANGRE DE LEYENDA

Juego web de lucha 2D 1 vs 1 en pixel art de 16 bits, ambientado en leyendas colombianas. Tono de terror folclórico, combate estilo Mortal Kombat, con modo aventura estilo Pokémon.

## 1. Objetivo y alcance

- Juego jugable en navegador (Chrome, Edge, Firefox modernos), un jugador contra la CPU.
- 10 luchadores, 9 escenarios, 3 dificultades de IA, modo aventura con 9 combates.
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

Controles para niños: flechas y solo **dos botones**. Lo fuerte, los poderes y el definitivo salen solos por combinación, por tiempo o por patrones (`src/combat/TwoButton.ts`).

| Acción | Cómo |
|---|---|
| Mover / saltar / agacharse | Flechas |
| Golpe | Z o ESPACIO |
| Patada | X |
| Golpe / patada fuerte (combo) | El mismo botón 3 veces seguidas (Z Z Z, X X X) |
| Poder 1 | Mantener Z y soltar, o Z X Z |
| Poder 2 | Mantener X y soltar, o X Z X |
| Golpe fuerte doble | Z + X juntos |
| Definitivo | Z + X juntos con la barra llena |
| Bloquear | Automático: echarse atrás cuando el rival ataca |
| Pausa / pausa-menú | Enter / Esc |
| Pantalla completa / hitboxes | F / H |

- **FR-014** Soporte de mando (Gamepad API estándar): cruceta/stick mover, X/Y/RB/RT golpe, A/B/LB/LT patada; mismas combinaciones que el teclado.
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
- **FR-034** Cada mito pelea donde ocurre su leyenda: Patasola y Madremonte en la selva del monte, la Muelona en la cantina, el Silbón en el llano, el Mohán y la Llorona en la ribera, el Hombre Caimán en la ciénaga, Bachué en la laguna, el Sombrerón en el pueblo. Escenario extra: cementerio.
- **FR-035** Mapas: el campo de San Agustín (120×72, con fiestas y terminal de jeeps), Medellín (80×60: Plaza Botero, Parque Berrío, metro elevado, Pueblito Paisa, Comuna 13, Feria de las Flores) y 28 interiores (casas, cantinas, tienda, iglesia, capilla, alcaldía, fondas, teatro…). Se entra por la puerta y se sale por el tapete.
- **FR-036** Un jeep (yipao) lleva entre el campo y Medellín con escena de carretera de montaña.
- **FR-037** Firulais, el perro de Juan, lo sigue a todas partes y gruñe cuando un mito escondido anda cerca.
- **FR-038** La gente cuenta 23 historias de la cultura colombiana (leyendas, café, arrieros, bandeja paisa, vallenato, cumbia, silleteros, metro, Comuna 13, Botero…); el menú lleva la cuenta.
- **FR-039** Ritmo ~75 % tensión / 25 % alegría: monte, río y llano oscuros con ambiente de terror; fiestas, ciudad e interiores con más luz y música (cumbia, carrilera, bambuco, salsa, órgano). Momentos alegres: bailar en el tablado, castillo de pólvora, rockola, comida.
- **FR-040** En el mapa los mitos se ven en proporción con Juan (un poco más altos), no al doble.
- **FR-041** Animación de pelea: anticipación, impacto sostenido y recuperación por golpe; saltos con estiramiento, voltereta y aterrizaje con polvo; reacción al golpe inmediata; caídas con rebote. Siempre un solo fotograma original a la vez (TC-04).
