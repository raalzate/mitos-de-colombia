# Combate

![Combate](screenshots/06-poderes.png)

Lucha uno contra uno al estilo de los arcade de los 90. Se juega desde **COMBATE** en el menú (eliges luchador,
rival y escenario) o en el modo aventura, donde Juan Machete siempre pelea contra el mito que lo encontró, en el
escenario de su leyenda.

## Reglas

- Mejor de tres rondas. Un empate (tiempo agotado con la misma vida o doble KO) no puntúa; como máximo se juegan
  cinco rondas.
- 99 segundos por ronda; al agotarse gana quien tenga más vida.
- Bloquear reduce el daño al 20 % (mínimo 1). El definitivo no se puede bloquear.
- La barra de energía sube al pegar y, algo menos, al recibir. Llena, permite el definitivo, que la gasta entera
  aunque falle.
- Cada poder tiene su propio tiempo de recarga: dos segmentos sobre la barra muestran cuándo están listos.
- Antes de la primera ronda los dos luchadores se cruzan unas frases de reto, y durante la pelea a veces se dicen
  algo en un globo de texto. Cualquiera de los dos botones se salta la charla.
- Tras el KO que decide el combate aparece **¡ACÁBALO!**: con el definitivo o un golpe fuerte se hace el remate,
  con sangre y la cara del ganador encima de la pantalla.
- La IA tiene tres dificultades (fácil, normal y difícil) con percepción retardada e intenciones: se acerca, mide,
  bloquea, castiga y usa sus poderes.

## Controles para niños: dos botones

| Qué se quiere | Cómo |
|---|---|
| Golpe / patada | Z (o ESPACIO) / X |
| Golpe o patada fuerte | El mismo botón tres veces seguidas |
| Poder 1 | Mantener Z y soltar, o Z X Z |
| Poder 2 | Mantener X y soltar, o X Z X |
| Definitivo | Z + X juntos con la barra llena (si no está llena, sale un golpe fuerte) |
| Bloquear | Retroceder cuando el rival ataca |

Cuando un poder está cargado salen chispas alrededor del luchador para que el niño sepa que ya puede soltar.
Con mando: X/Y golpe, A/B patada.

## Los 10 luchadores

| Personaje | Estilo | Poder 1 | Poder 2 | Definitivo |
|---|---|---|---|---|
| **Juan Machete**, campesino berraco de Medellín | pesado | Machetazo (golpe) | Llamarada (erupción) | Furia paisa (tormenta de fuego) |
| **La Madremonte**, guardiana del monte | pesado | Latigazo de raíces (golpe) | Furia del bosque (erupción) | Juicio de la selva |
| **La Patasola**, terror de la espesura | rápido, una pierna | Zarpazo sangriento (embestida) | Grito del monte (onda) | Cacería nocturna (cortes) |
| **El Hombre Caimán**, bestia del Magdalena | pesado | Mordida del río (embestida) | Inmersión (teletransporte) | Arrastre al fondo (vórtice) |
| **La Llorona**, alma en pena del río | equilibrado | Lamento (proyectil) | Lágrimas del río (erupción) | Llanto eterno (tormenta) |
| **El Sombrerón**, jinete de la noche | equilibrado | Látigo de sombra (golpe largo) | Paso de sombra (teletransporte) | Cabalgata maldita (cortes) |
| **El Mohán**, señor de las aguas | rápido | Oleada del Magdalena (proyectil) | Niebla encantada (teletransporte) | Abismo del río (vórtice) |
| **La Muelona**, sonrisa devoradora | equilibrado | Mordisco (embestida, roba vida) | Risa macabra (onda) | Festín de dientes |
| **El Silbón**, el que silba en la llanura | rápido, alto | Silbido (proyectil) | Lluvia de huesos (erupción) | Saco de huesos (tormenta) |
| **Bachué**, madre de la laguna | equilibrado | Serpiente de agua (proyectil) | Manantial (erupción) | Abrazo de la laguna (vórtice) |

Tipos de poder: **golpe** (con efecto visual), **proyectil**, **erupción** (brota bajo los pies del rival, con aviso)
y **teletransporte** (invulnerable un instante, reaparece junto al rival). Los definitivos tienen cuatro cinemáticas:
agarre y explosión, vórtice, tormenta y cortes.

Cada poder **declara su propio sonido** junto a sus datos (`src/data/fighters.ts`): lo que suena al lanzarlo, lo
que suena cuando sale o pega, y si el luchador grita. Ver [Arte y sonido](ARTE_Y_SONIDO.md).

## Escenarios

![Escenarios](screenshots/03-escenarios.png)

| Escenario | Ambientación |
|---|---|
| Ribera de los Antiguos | Río Magdalena, medianoche |
| Llanos del Silbón | Sabana de Casanare, ocaso con tormenta |
| Laguna de Iguaque | Páramo de Boyacá, amanecer |
| Ciénaga del Caimán | Depresión Momposina, noche cerrada |
| Cañaduzal en Llamas | Hacienda antioqueña, noche de incendio |
| Callejón del Sombrerón | Pueblo colonial antioqueño, luna llena |
| Monte de la Patasola | Selva antioqueña, noche de niebla |
| Cantina La Última Copa | Pueblo antioqueño, rockola a medianoche |
| Cementerio de las Ánimas | Camposanto del pueblo, noche de difuntos |

Cada escenario se dibuja por código en ocho capas con parallax (cielo, nubes, lejanía, agua o llanura animada,
capa media, suelo, primer plano y bruma), con partículas propias (luciérnagas, ascuas, hojas, lluvia) y su propio
paisaje sonoro.

## Los mitos se meten al fondo del escenario

| | |
|---|---|
| ![Sombrerón](screenshots/07-fondo-sombreron.png) | ![Patasola](screenshots/08-fondo-patasola.png) |

Contra la CPU, de vez en cuando (como mucho dos veces por ronda) el mito se aleja **hacia el fondo** del
escenario: se achica, se oscurece y se pierde entre la bruma. Mientras está allá nadie pega y el reloj no corre;
Juan puede moverse y dice algo como "¿Y PA' DÓNDE SE METIÓ ESO?". Al final se viene encima de una embestida, a unos
pasos de Juan.

Lo que hace allá depende del sitio:

| Escenario | Escenas |
|---|---|
| Ribera y laguna | Se hunde en el agua y sale por otro lado mirando fijo; flota y voltea la cabeza de golpe |
| Llanos | Aparece lejos, luego más cerca, sin moverse nunca (como el Silbón) |
| Ciénaga | Se arrastra tendido por el barro, medio hundido |
| Cañaduzal | Camina entre las llamas y se pierde y aparece con el fuego |
| Pueblo | Cruza la calle despacio, se para y voltea la cabeza de lado a lado |
| Monte | Salta de árbol en árbol, se esconde y se asoma torcido |
| Cantina | Cada vez que parpadea el bombillo ya está en otro lado |
| Cementerio | Se mete en una tumba y sale de otra a tirones |

Y lo propio de algunos mitos: **el Sombrerón pasa a galope en su caballo negro**, **la Patasola se acuesta** como
una mujer herida y se para de un brinco, el Silbón se acerca sin moverse y la Llorona flota.

Las escenas se animan con fotogramas dibujados originales: el paso avanza según lo que camina (los pies no
patinan), al voltearse la figura se estrecha y se abre ya volteada, al aparecer en otro sitio se aclara en unos
pocos cuadros, y nunca queda tapada detrás de Juan. Están en `src/combat/Lurk.ts` como guiones de fotogramas clave.

## Terror

- Advertencia al arrancar (sustos, gritos fuertes, destellos) y opción **SUSTOS: SÍ/NO** en el menú.
- La **tensión** (la vida más baja y el tiempo que queda) acelera un latido de 55 a 150 pulsaciones por minuto,
  abre el zumbido de fondo y agrega un tono agudo disonante.
- **Sustos**: la cara del luchador se abalanza a pantalla completa con un grito distorsionado. Saltan al rematar el
  combate, como mucho una vez por ronda cuando alguien baja de 30 de vida, y tras 25 segundos quieto en el menú. La
  pelea se pausa mientras dura.
- Cada escenario tiene sus sucesos sonoros al azar: ranas y búho en la ribera, truenos y el do-re-mi del Silbón en
  el llano, fuego y bramidos en el cañaduzal, campana y cascos de caballo en el callejón...
