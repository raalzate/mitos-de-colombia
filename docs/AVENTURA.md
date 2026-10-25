# Modo aventura

![Intro](screenshots/09-aventura-intro.png)

Un recorrido por casillas con vista desde arriba, al estilo de los juegos de bolsillo. No hay combate por turnos:
cada encuentro con un mito abre el combate de lucha (ver [Combate](COMBATE.md)).

## La historia

**Juan Machete** es un campesino paisa de Medellín, vivo y berraco. No es un monstruo ni hizo pacto con nadie:
es de carne y hueso y siempre es él quien pelea. Baja a la vereda San Agustín y la **abuela Rosa** le cuenta que
todos los mitos andan sueltos asustando a la gente: el Sombrerón y la Muelona en el pueblo, el Silbón en el llano,
la Llorona y el Mohán en el río, el Hombre Caimán en la ciénaga, la Patasola y la Madremonte en el monte y Bachué
en la laguna del sur.

Juan tiene que encontrarlos y calmarlos a los nueve. Los mitos no se destruyen: "son parte de esta tierra, hay que
respetarlos". Con los nueve calmados vuelve donde la abuela para el final.

- **Ganar** un combate calma al mito y la aventura sigue donde Juan estaba.
- **Perder** es FIN DEL JUEGO: la partida se borra y todo vuelve a empezar.
- Si el mito **se vuela** (antes o en plena pelea, cuando le queda poca vida), toca buscarlo otra vez. Cada vez que
  se escapa le quedan menos ganas de volver a huir.
- Los mitos se ponen más bravos: dificultad fácil al principio, normal desde el tercero calmado y difícil desde el
  sexto.

## Mitos escondidos

![El Sombrerón aparece](screenshots/12-sombreron-a-caballo.png)

Los mitos no se ven en el mapa. Cada uno ronda la zona de su leyenda y se delata. Algunos tienen **dos sitios
posibles** y cada noche se sortea cuál les toca: la Patasola y la Madremonte se reparten los dos montes, la Llorona y
el Hombre Caimán se reparten las dos aguas, y la Muelona se mete dentro de una de las dos cantinas.

| Mito | Dónde ronda | Señal que deja | Escenario de la pelea |
|---|---|---|---|
| El Sombrerón | Calle de abajo del pueblo | Un sombrero negro enorme | Callejón del Sombrerón |
| La Muelona | Dentro de la cantina La Última Lágrima o de El Remolino | Un diente más grande que un dedo | Cantina La Última Copa |
| El Silbón | El llano | Huesos regados | Llanos del Silbón |
| El Hombre Caimán | La ciénaga o Río Abajo | Huellas de caimán... y de pie | El de su sitio: ciénaga o ribera |
| La Llorona | Río Abajo o la ciénaga | Charquitos de lágrimas | El de su sitio: ribera o ciénaga |
| La Patasola | El monte o el Monte Puro | Huellas de un solo pie | El de su sitio: Monte de la Patasola o Monte Puro |
| La Madremonte | El Monte Puro o el monte | Ramas partidas y musgo | El de su sitio: Monte Puro o Monte de la Patasola |
| El Mohán | El río grande | Pepitas de oro en la orilla | Ribera de los Antiguos |
| Bachué | Laguna del sur | Escamas doradas | Laguna de Iguaque |

Además de las señales, los mitos **se oyen** de lejos (silbido, llanto, pasos de una sola pata...) y a veces **se
dejan ver un instante** a lo lejos con los ojos rojos. Cerca de uno, Juan tiembla y suspira. El Sombrerón aparece
siempre en su **caballo negro**, y a veces la Patasola se ve **acostada** en el monte, como una mujer herida que
espera a que alguien se acerque.

También hay espíritus que no pelean pero asustan y dan pistas: el **duende** en el pueblo, el **pollo maligno** en
el monte y la **mano peluda** que sale de la tierra en el cementerio. En la hierba alta a veces algo se mueve y Juan
se lleva el susto, sin pelea. El **padre Anselmo**, en la puerta de la iglesia, le da a Juan un **escapulario**
bendito: con él el duende, el pollo y la mano peluda ya no aparecen.

La pelea se hace en el escenario del sitio donde estaba el mito esa noche: los dos montes son dos escenarios
distintos (el guadual del **Monte de la Patasola** y el robledal de niebla del **Monte Puro**).

## Las cosas pasan de mano en mano

Lo que Juan consigue lo tiene alguien primero, y se le ve: la **abuela** tiene el farol encendido (Juan empieza a
oscuras), **don Julio** el machete, el **cabo** el mapa y el **padre Anselmo** el escapulario. Al entregarlo, el
objeto vuela de la mano de quien lo tenía a la de Juan y ya no vuelve a estar allá. El tronco del Monte Puro
desaparece cuando Juan recoge la leña (para siempre: queda en `taken` de la partida) y Juan carga el tercio a la
espalda hasta dárselo a don Julio. La arepa pasa de la vendedora a Juan y de Juan al perro. **Lucero** lo trae don
Rubén al galope y queda amarrado a su lado, junto a la mula, en la vereda.

## Una sola noche

Todo pasa en una noche: el reloj (arriba a la derecha) empieza a las **6:00 PM** y la noche termina a las
**12:00 AM**. Un minuto de la noche son 10 segundos andando por el mapa (en diálogos y menús el reloj se detiene),
cada pelea se lleva 10 minutos y cada viaje en jeep o a caballo, 30. A las 11:00 PM el reloj se pone rojo y Juan
avisa. A medianoche, si quedan espantos sueltos, se acaba la noche: la partida se borra y todo vuelve a empezar, con
los mitos sorteados de nuevo. Los valores están en `src/adventure/State.ts` (`MS_PER_MINUTE`, `FIGHT_MINUTES`,
`TRIP_MINUTES`).

## Firulais, el perro

![Perro callejero](screenshots/10-perro-callejero.png)

Firulais no está desde el principio. Es un perro flaco y sin dueño que anda por la plaza principal: si Juan se le
acerca con las manos vacías, gruñe y se aleja. Hay que **ganárselo con una arepa**:

1. Hablarle al perro (Juan nota que tiene hambre).
2. Conseguir una arepa: doña Gloria, en la plaza, le da la última que le queda; también se consiguen en las fiestas
   (doña Marina o el puesto de arepas).
3. Dársela. El perro se la come, le lame la mano y se une a Juan con el nombre de Firulais.

![Firulais avisa](screenshots/11-firulais-avisa.png)

Desde ese momento Firulais sigue a Juan a todas partes y **avisa cuando hay peligro**: si un mito escondido está a
cuatro casillas o menos, se para en seco, ladra hacia donde está y el mito se queda quieto unos pasos, así Juan
alcanza a prepararse. También le ladra a los espíritus y gruñe cuando huele algo más lejos.

## Lucero, el caballo

![Lucero](screenshots/13-lucero.png)

Don Rubén, el arriero de la vereda, tiene una mula que no pasa por el llano porque el Silbón la tiene espantada.
Le propone un trato a Juan: **si calma al Silbón, le regala a Lucero**, su caballo. Al cumplirlo, Lucero queda
amarrado al principio del camino de herradura, en el llano, y con él Juan puede viajar a Santa Fe de Antioquia
(y volver).

![Viaje a caballo](screenshots/14-viaje-a-caballo.png)

## Los lugares

| Lugar | Cómo se llega | Zonas |
|---|---|---|
| **Río Abajo** (44 × 30) | Por la trocha del sur de la ciénaga | El caño con su puente, el juncal y el charco de los ahogados |
| **San Agustín** (120 × 72 casillas) | Inicio | Vereda La Esperanza, pueblo y plaza principal, cementerio, el llano, el monte, el río grande, la ciénaga, potreros del sur, laguna de Bachué, terminal de jeeps y fiestas |
| **Medellín** (80 × 60) | En el yipao de don Evelio, desde la terminal de jeeps | Terminal del Norte, Plaza Botero, Parque Berrío y el metro, Pueblito Paisa, Comuna 13, Feria de las Flores, parque del río |
| **Santa Fe de Antioquia** (64 × 46) | A caballo con Lucero, por el camino de herradura | Plaza mayor con su ceiba, catedral, Calle de la Amargura, río Cauca y Puente de Occidente |

![Santa Fe](screenshots/15-santa-fe.png)
![Medellín](screenshots/16-medellin.png)

Hay **32 interiores** (casas, cantinas, tiendas, iglesias, fincas, el trapiche, la fonda, el teatro, la dulcería...):
se entra parado frente a la puerta mirando hacia arriba y se sale por el tapete.

![Cantina](screenshots/17-cantina.png)

## La gente y sus historias

Más de 40 personajes en los mapas y otros tantos dentro de las casas. Muchos ofrecen una historia: hay **27**, y el
menú de pausa lleva la cuenta de las que Juan ya escuchó.

Leyendas (la Patasola, el Silbón, la Llorona, el Mohán, el Sombrerón, la Muelona, la Madremonte, el Hombre Caimán,
Bachué, El Dorado, la Mula Herrada) y costumbres y orgullo de la tierra (el café, los arrieros, la bandeja paisa, el
tiple y el bambuco, Francisco el Hombre, la cumbia, la chiva, los silleteros, el metro, la Comuna 13, las gordas de
Botero, el Pueblito Paisa, la Navidad paisa, el Puente de Occidente, los dulces de tamarindo y la ciudad madre).

## Ritmo: miedo y alegría

El campo es tres cuartas partes **tensión** (monte, río y espantos: oscuro, con zumbido y latido) y una cuarta
parte **alegría** (las fiestas, la plaza, las ciudades y los interiores: más luz, música y gente). En los sitios
alegres se puede bailar en el tablado, prender el castillo de pólvora, poner la rockola, comer arepas y mango biche
o sobarle la barriga a la gorda de Botero.

## Guardado

La partida se guarda en el navegador (`localStorage`) en cada suceso importante y desde el menú de pausa. Al volver
de una pelea (ganada o con el mito volado) el juego **pregunta si se quiere guardar**.
Si el navegador no deja guardar, la partida dura mientras la pestaña esté abierta.

## Dónde está en el código

| Archivo | Qué hace |
|---|---|
| `src/scenes/AdventureScene.ts` | La escena: mapa, noche y faroles, diálogos, sucesos, perro, caballo, viajes |
| `src/adventure/World.ts` | San Agustín: mapa, zonas, gente, mitos (zona, señal, frases) y espíritus |
| `src/adventure/Maps.ts` | Registro de mapas: campo, Medellín, Santa Fe e interiores |
| `src/adventure/Hunt.ts` | Reglas puras de los mitos escondidos: ronda, señales, emboscada, huida |
| `src/adventure/State.ts` | Partida, guardado y resultado de los combates |
| `src/adventure/Stories.ts` | Las 27 historias |
| `src/adventure/TownArt.ts`, `CityArt.ts`, `InteriorArt.ts`, `OverworldArt.ts` | Dibujo por código de edificios, objetos, muebles, perro y caballo |
