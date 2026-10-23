"""Recorta, normaliza y convierte a MP3 los sonidos de poderes y la voz de Juan Machete.

Uso: python3 -I tools/build_power_sfx.py <carpeta con los paquetes descomprimidos>
Paquetes (CC0, ver public/assets/audio/CREDITS.md):
  x_yelling_sounds, x_80-CC0-creature-SFX_0, x_80-CC0-creature-sfx-2, x_80-CC0-RPG-SFX_0,
  x_100-CC0-wood-metal-SFX, x_sfx_breaking_and_falling, x_water-splash-slime-sfx, x_sfx_loops
"""
import subprocess
import sys
from pathlib import Path

# salida: (archivo de origen dentro de la carpeta, duración máxima en s, desplazamiento de tono en semitonos)
CLIPS = {
    # voz de Juan: siempre el mismo hombre (vocalista 3 de HaelDB), los tonos más graves y dos semitonos abajo
    'juan_attack_1': ('x_yelling_sounds/yelling sounds/3grunt6.wav', 0.45, -2),
    'juan_attack_2': ('x_yelling_sounds/yelling sounds/3grunt3.wav', 0.45, -2),
    'juan_attack_3': ('x_yelling_sounds/yelling sounds/3yell7.wav', 0.4, -2),
    'juan_hurt_1': ('x_yelling_sounds/yelling sounds/3grunt1.wav', 0.5, -2),
    'juan_hurt_2': ('x_yelling_sounds/yelling sounds/3yell5.wav', 0.45, -2),
    'juan_power_1': ('x_yelling_sounds/yelling sounds/3yell6.wav', 0.9, -2),
    'juan_power_2': ('x_yelling_sounds/yelling sounds/3yell1.wav', 0.9, -2),
    # tierra, madera y monte
    'wood_crack': ('x_100-CC0-wood-metal-SFX/wood_cracking_02.ogg', 0.7, 0),
    'wood_snap': ('x_80-CC0-RPG-SFX_0/wood_02.ogg', 0.25, 0),
    'wood_break': ('x_sfx_breaking_and_falling/bfh1_wood_breaking_01.ogg', 0.9, 0),
    'rock_rumble': ('x_sfx_breaking_and_falling/bfh1_rock_falling_03.ogg', 1.1, -3),
    'rock_break': ('x_sfx_breaking_and_falling/bfh1_rock_breaking_01.ogg', 0.9, 0),
    'roar_deep': ('x_80-CC0-creature-sfx-2/roar_06.ogg', 1.0, -2),
    'roar_low': ('x_80-CC0-RPG-SFX_0/creature_roar_03.ogg', 1.1, -3),
    'grunt_deep': ('x_80-CC0-creature-sfx-2/grunt_07.ogg', 0.8, -2),
    'stomp': ('x_80-CC0-creature-sfx-2/stomp_01.ogg', 0.45, 0),
    # agua
    'splash_big': ('x_water-splash-slime-sfx/splash_03.ogg', 0.9, 0),
    'splash_small': ('x_water-splash-slime-sfx/splash_10.ogg', 0.6, 0),
    'bubbles': ('x_water-splash-slime-sfx/bubble_02.ogg', 0.7, 0),
    'water_rush': ('x_water-splash-slime-sfx/loop_water_01.ogg', 1.3, 0),
    'rain': ('x_water-splash-slime-sfx/loop_rain.ogg', 1.6, 0),
    # fuego
    'fire_burst': ('x_80-CC0-RPG-SFX_0/spell_fire_06.ogg', 1.0, 0),
    'fire_roar': ('x_80-CC0-RPG-SFX_0/spell_fire_03.ogg', 1.6, -2),
    # filos, látigos, mordidas, huesos, espíritu
    'blade_slash': ('x_80-CC0-RPG-SFX_0/blade_01.ogg', 0.35, 0),
    'chain_whip': ('x_80-CC0-RPG-SFX_0/chain_01.ogg', 0.6, 0),
    'bite_snap': ('x_80-CC0-creature-SFX_0/eat_01.ogg', 0.5, -2),
    'bones_clack': ('x_sfx_breaking_and_falling/bfh1_wood_hit_02.ogg', 0.4, 4),
    'bones_rattle': ('x_80-CC0-RPG-SFX_0/item_wood_02.ogg', 0.6, 3),
    'ghost_breath': ('x_80-CC0-creature-SFX_0/breath.ogg', 0.7, -4),
    'punch_1': ('x_sfx_breaking_and_falling/bfh1_hit_01.ogg', 0.3, 0),
    'punch_2': ('x_sfx_breaking_and_falling/bfh1_hit_05.ogg', 0.3, 0),
    'punch_heavy': ('x_sfx_breaking_and_falling/bfh1_hit_09.ogg', 0.45, -2),
}


def build(src: Path, out: Path) -> None:
    for name, (rel, dur, semis) in CLIPS.items():
        f = src / rel
        if not f.exists():
            sys.exit(f'falta {f}')
        rate = 2 ** (semis / 12)
        chain = [
            'silenceremove=start_periods=1:start_threshold=-40dB',
            f'atrim=0:{dur}',
            f'afade=t=out:st={max(0, dur - 0.08):.2f}:d=0.08',
            f'asetrate=32000*{rate:.4f},aresample=32000' if semis else 'anull',
        ]
        tmp = out / f'.{name}.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(f), '-ac', '1', '-ar', '32000', '-af', ','.join(chain), str(tmp)], check=True)
        # todo al mismo pico (-1 dB) para que ningún poder quede más bajito que otro
        probe = subprocess.run(['ffmpeg', '-i', str(tmp), '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
        peak = float(probe.split('max_volume:')[1].split('dB')[0])
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', f'volume={-1 - peak:.2f}dB', '-b:a', '56k', str(out / f'{name}.mp3')], check=True)
        tmp.unlink()
        print('ok', name)


if __name__ == '__main__':
    build(Path(sys.argv[1]), Path(__file__).resolve().parent.parent / 'public' / 'assets' / 'audio')
