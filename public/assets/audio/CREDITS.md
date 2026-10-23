# Créditos de audio

Todos los sonidos son CC0 (dominio público) o dominio público. Se recortaron, mezclaron,
normalizaron y convirtieron a MP3 mono (32 kHz, 56 kbps). Los cambios de tono por personaje
se hacen en el juego (`playbackRate`, ver `src/audio/Samples.ts`).

## Fuentes

| Clave | Paquete | Autor | Licencia | URL |
|---|---|---|---|---|
| RPG | RPG Sound Pack | artisticdude | CC0 | https://opengameart.org/content/rpg-sound-pack |
| KRPG | RPG Audio | Kenney (kenney.nl) | CC0 | https://kenney.nl/assets/rpg-audio |
| KIMP | Impact Sounds | Kenney (kenney.nl) | CC0 | https://kenney.nl/assets/impact-sounds |
| CRE | 80 CC0 creature SFX | rubberduck | CC0 | https://opengameart.org/content/80-cc0-creature-sfx |
| MW | 100 CC0 metal and wood SFX | rubberduck | CC0 | https://opengameart.org/content/100-cc0-metal-and-wood-sfx |
| SNARL | Monster Snarls | Darsycho | CC0 | https://opengameart.org/content/monster-snarls |
| WSCR | Girly Scream | Ferk | CC0 (multi-licencia, se usa CC0) | https://opengameart.org/content/girly-scream |
| WITCH | Witch Cackle | AntumDeluge | CC0 | https://opengameart.org/content/witch-cackle |
| EVL1 | Evil Laugh | AntumDeluge | CC0 | https://opengameart.org/content/evil-laugh |
| EVL2 | Evil Laugh 2 | AntumDeluge | CC0 | https://opengameart.org/content/evil-laugh-2 |
| QUB | Evil Laughter | qubodup | CC0 | https://opengameart.org/content/evil-laughter |
| CACK2 | Evil Cackle Laugh 2 | nocturnalvanguard | CC0 | https://opengameart.org/content/evil-cackle-laugh-2 |
| SCREECH | Evil Screech 1 | nocturnalvanguard | CC0 | https://opengameart.org/content/evil-screech-1 |
| GIGGLE | Group Giggling | nocturnalvanguard | CC0 | https://opengameart.org/content/group-giggling |
| YELL | Male Grunt/Yelling sounds | HaelDB | CC0 (multi-licencia, se usa CC0) | https://opengameart.org/content/male-gruntyelling-sounds |
| CRE2 | 80 CC0 creature SFX #2 | rubberduck | CC0 | https://opengameart.org/content/80-cc0-creture-sfx-2 |
| RPG80 | 80 CC0 RPG SFX | rubberduck | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx |
| BFH | 75 CC0 breaking / falling / hit sfx | rubberduck | CC0 | https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx |
| WAT | 40 CC0 water / splash / slime SFX | rubberduck | CC0 | https://opengameart.org/content/40-cc0-water-splash-slime-sfx |
| HEN | Hen announcing she's lain an egg | alys (pdsounds.org) | Dominio público | https://commons.wikimedia.org/wiki/File:Hen_announcing_shes_lain_an_egg.ogg |

## Archivos

| Archivo | Origen |
|---|---|
| machete_swing_1.mp3 | RPG `battle/swing.wav` + RPG `battle/sword-unsheathe2.wav` (filo) |
| machete_swing_2.mp3 | RPG `battle/swing3.wav` + RPG `battle/sword-unsheathe5.wav` |
| machete_hit_1.mp3 | KRPG `knifeSlice.ogg` + KIMP `impactPunch_medium_000.ogg` |
| machete_hit_2.mp3 | KRPG `knifeSlice2.ogg` + KIMP `impactPunch_heavy_001.ogg` |
| machete_clang.mp3 | KIMP `impactMetal_heavy_000.ogg` + MW `metal_hit_03.ogg` + RPG `inventory/metal-ringing.wav` |
| monster_madremonte.mp3 | CRE `monster_07.ogg` + MW `wood_cracking_01.ogg` |
| monster_roar.mp3 | CRE `roar_02.ogg` |
| monster_snarl.mp3 | SNARL `monster-snarls.ogg` (0,1–1,3 s) |
| monster_hiss.mp3 | CRE `breath.ogg` + CRE `spit_02.ogg` (filtrados como siseo) |
| beast_hurt_1.mp3 | CRE `hurt_03.ogg` |
| beast_hurt_2.mp3 | CRE `hurt_05.ogg` |
| female_shriek.mp3 | WSCR `wscream_2.ogg` |
| female_cackle.mp3 | WITCH `witch_cackle-1.ogg` |
| female_cackle_2.mp3 | CACK2 `evil_cackle_laugh_2.ogg` (0–1,3 s) |
| female_wail.mp3 | SCREECH `evil_screech_1.ogg` (0,4–1,5 s) |
| male_laugh_1.mp3 | EVL1 `laugh-evil-1.ogg` (0,9–2,1 s) |
| male_laugh_2.mp3 | EVL2 `evil_laugh_02.ogg` (0–1,25 s) |
| male_laugh_deep.mp3 | QUB `qubodupevillaughter.flac` (0,2–1,6 s) |
| male_hurt_1.mp3 | RPG `NPC/ogre/ogre3.wav` |
| male_hurt_2.mp3 | RPG `NPC/giant/giant4.wav` |
| ambient_pollo.mp3 | HEN (2,3–3,9 s) |
| ambient_duende.mp3 | GIGGLE `group_giggling.ogg` (0,2–1,7 s) |
| ambient_mano.mp3 | KRPG `cloth2.ogg` + CRE `troll_01.ogg` |

### Voz de Juan Machete y sonidos de los poderes

Generados con `python3 -I tools/build_power_sfx.py <carpeta de paquetes>`: recorte del silencio inicial, duración
máxima, cambio de tono en semitonos cuando se indica, y pico normalizado a -1 dB. La voz de Juan es siempre el
mismo hombre (vocalista 3 de YELL) dos semitonos más grave.

| Archivo | Origen |
|---|---|
| juan_attack_1/2/3.mp3 | YELL `3grunt6.wav`, `3grunt3.wav`, `3yell7.wav` (-2 semitonos) |
| juan_hurt_1/2.mp3 | YELL `3grunt1.wav`, `3yell5.wav` (-2 semitonos) |
| juan_power_1/2.mp3 | YELL `3yell6.wav`, `3yell1.wav` (-2 semitonos) |
| wood_crack.mp3 | MW `wood_cracking_02.ogg` |
| wood_snap.mp3 | RPG80 `wood_02.ogg` |
| wood_break.mp3 | BFH `bfh1_wood_breaking_01.ogg` |
| rock_rumble.mp3 | BFH `bfh1_rock_falling_03.ogg` (-3) |
| rock_break.mp3 | BFH `bfh1_rock_breaking_01.ogg` |
| roar_deep.mp3 | CRE2 `roar_06.ogg` (-2) |
| roar_low.mp3 | RPG80 `creature_roar_03.ogg` (-3) |
| grunt_deep.mp3 | CRE2 `grunt_07.ogg` (-2) |
| stomp.mp3 | CRE2 `stomp_01.ogg` |
| splash_big.mp3, splash_small.mp3, bubbles.mp3, water_rush.mp3, rain.mp3 | WAT `splash_03`, `splash_10`, `bubble_02`, `loop_water_01`, `loop_rain` |
| fire_burst.mp3, fire_roar.mp3 | RPG80 `spell_fire_06`, `spell_fire_03` (-2) |
| blade_slash.mp3, chain_whip.mp3 | RPG80 `blade_01`, `chain_01` |
| bite_snap.mp3 | CRE `eat_01.ogg` (-2) |
| bones_clack.mp3, bones_rattle.mp3 | BFH `bfh1_wood_hit_02` (+4), RPG80 `item_wood_02` (+3) |
| ghost_breath.mp3 | CRE `breath.ogg` (-4) |
| punch_1.mp3, punch_2.mp3, punch_heavy.mp3 | BFH `bfh1_hit_01`, `bfh1_hit_05`, `bfh1_hit_09` (-2) |

