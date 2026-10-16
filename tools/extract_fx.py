#!/usr/bin/env python3 -I
"""Extrae los efectos dibujados (copia izquierda, apunta a la derecha) de las hojas de
referencia de images/ y los guarda como PNG transparentes en public/assets/fx.

Uso: python3 -I extract_fx.py <dir images> <dir salida> <hoja_contacto.png>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HEIGHTS = {'orb': 24, 'vortex': 64, 'summon': 56, 'beam': 32}
ANCHORS = {'orb': 'center', 'vortex': 'center', 'summon': 'bottom', 'beam': 'left'}

# Por hoja: (archivo, [(fila 0..3, kind, opciones)]). Opciones:
#   x0: borde izquierdo de la zona de búsqueda (fracción del ancho, def. 0.22)
#   x1: borde derecho (def. 0.50)
#   attached: True si el efecto está pegado al personaje -> se corta en x0 y se
#             conservan los componentes que tocan ese borde.
SHEETS = {
    'madremonte': ('madremonte.jpeg', [
        (1, 'summon', {'attached': True, 'x0': 0.24}),  # raíces pegadas a los pies
        (2, 'vortex', {}),            # torbellino de hojas
        (3, 'orb', {}),               # disparo de energía natural
    ]),
    'patasola': ('patasola.png', [
        (0, 'beam', {}),              # aullido sónico (ondas)
        (2, 'summon', {'attached': True, 'x0': 0.21}),  # invocación de espinas (bajo los pies)
        (3, 'orb', {}),               # energía espectral
    ]),
    'hombrecaiman': ('hombre_caiman.jpeg', [
        (0, 'beam', {'attached': True, 'x0': 0.24, 'pxfilter': 'green'}),  # chorro de agua, sin el puño
        (1, 'summon', {'attached': True, 'x0': 0.33, 'pxfilter': 'green'}),  # coletazo de tierra, sin la cola
        (2, 'vortex', {}),            # remolino
        (3, 'orb', {}),               # energía pantanosa
    ]),
    'llorona': ('llorona.jpeg', [
        (0, 'beam', {}),              # onda sónica
        (2, 'summon', {'attached': True, 'x0': 0.25}),  # manos espectrales bajo el vestido
        (3, 'orb', {'x0': 0.30}),     # ráfaga de almas (bola)
    ]),
    'sombreron': ('sombrerero.jpeg', [
        (0, 'beam', {'attached': True, 'x0': 0.31}),   # látigo de sombras desde la mano
        (1, 'summon', {'x0': 0.27}),  # perro negro central
        (2, 'vortex', {}),            # torbellino de oscuridad
        (3, 'orb', {'x0': 0.34}),     # ráfaga sombría
    ]),
    'mohan': ('mohan.jpeg', [
        (0, 'beam', {'attached': True, 'x0': 0.345}),  # chorro de río pegado al puño
        (1, 'summon', {}),            # furia del río (rocas)
        (2, 'vortex', {'attached': True, 'x0': 0.30}), # torbellino de oro tocado por la mano
        (3, 'orb', {'attached': True, 'x0': 0.345}),   # energía natural desde la mano
    ]),
    'muelona': ('muelona.jpeg', [
        (0, 'beam', {}),              # mordisco sónico
        (1, 'summon', {}),            # trampa de colmillos
        (3, 'orb', {}),               # ráfaga de colmillos
    ]),
    'silbon': ('silbon.jpeg', [
        (0, 'beam', {}),              # silbido (ondas y notas)
        (1, 'summon', {'x0': 0.325}), # huesos y cráneos fuera del saco
        (2, 'vortex', {'attached': True, 'x0': 0.215}),  # torbellino de la sabana (polvo bajo los pies)
        (3, 'orb', {'pad': 0.04}),    # ráfaga de ánimas
    ]),
    'juanmachete': ('juan_machete.jpeg', [
        (0, 'vortex', {'attached': True, 'x0': 0.29, 'pxfilter': 'gray'}),  # tornado de fuego, sin la punta del machete
        (1, 'summon', {'attached': True, 'x0': 0.25}),  # toro espectral
        (3, 'orb', {}),               # ráfaga de pacto
    ]),
    'bachue': ('bachue.jpeg', [
        (0, 'beam', {'attached': True, 'x0': 0.275}),  # torrente pegado a la mano
        (1, 'summon', {'attached': True, 'x0': 0.29}),  # serpiente de agua (salpicadura bajo los pies)
        (2, 'vortex', {}),            # torbellino de vida
        (3, 'orb', {}),               # destello ancestral
    ]),
}


def ink_mask(rgb: np.ndarray) -> np.ndarray:
    return rgb.min(axis=2) < 215


def find_rows(rgb: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Bandas verticales de las 4 filas a partir de los personajes de la izquierda."""
    h, w = rgb.shape[:2]
    lab, n = ndimage.label(ink_mask(rgb))
    objs = ndimage.find_objects(lab)
    chars = []
    for i, sl in enumerate(objs, 1):
        ys, xs = sl
        area = (lab[sl] == i).sum()
        if area < 0.01 * h * w:
            continue
        if xs.start < 0.15 * w:
            chars.append((ys.start, ys.stop))
    chars.sort()
    merged: list[tuple[int, int]] = []
    for y0, y1 in chars:
        if merged and y0 < merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], y1))
        else:
            merged.append((y0, y1))
    chars = merged
    assert len(chars) == 4, f'se esperaban 4 personajes, hay {len(chars)}: {chars}'
    bands = []
    for i, (y0, y1) in enumerate(chars):
        top = 0 if i == 0 else (chars[i - 1][1] + y0) // 2
        bot = h if i == 3 else (y1 + chars[i + 1][0]) // 2
        bands.append((top, bot, y0, y1))
    return bands


def components(rgb: np.ndarray):
    mask = ink_mask(rgb)
    lab, _ = ndimage.label(mask)
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        ys, xs = sl
        m = lab[sl] == i
        px = rgb[sl][m]
        mean = px.mean(axis=0)
        sat = px.max(axis=1).astype(int) - px.min(axis=1).astype(int)
        comps.append({
            'id': i, 'y0': ys.start, 'y1': ys.stop, 'x0': xs.start, 'x1': xs.stop,
            'h': ys.stop - ys.start, 'w': xs.stop - xs.start, 'area': int(m.sum()),
            'gray': bool(mean.mean() < 150 and np.median(sat) < 45),
        })
    return lab, comps


def text_lines(comps, band_h: int) -> list[tuple[int, int]]:
    """Franjas verticales ocupadas por pies de texto: varios componentes pequeños,
    oscuros y grises alineados en la misma altura."""
    small = [c for c in comps if c['area'] < 0.006 * band_h * band_h and c['gray'] and c['h'] < 0.09 * band_h]
    lines: list[tuple[int, int]] = []
    used = [False] * len(small)
    for i, c in enumerate(small):
        if used[i]:
            continue
        group = [c]
        used[i] = True
        for j, d in enumerate(small):
            if not used[j] and min(c['y1'], d['y1']) - max(c['y0'], d['y0']) > 0.4 * min(c['h'], d['h']):
                group.append(d)
                used[j] = True
        if len(group) >= 5:
            lines.append((min(g['y0'] for g in group) - 4, max(g['y1'] for g in group) + 4))
    return lines


def extract(rgb: np.ndarray, band: tuple[int, int, int, int], opts: dict, debug: str = '') -> np.ndarray | None:
    h, w = rgb.shape[:2]
    pad = opts.get('pad', 0.16) * (band[3] - band[2])
    band = (max(band[0], int(band[2] - pad)), min(band[1], int(band[3] + pad)))
    x0 = int(opts.get('x0', 0.22) * w)
    x1 = int(opts.get('x1', 0.50) * w)
    attached = opts.get('attached', False)
    band_rgb = rgb[band[0]:band[1]]
    bh = band_rgb.shape[0]
    # pies de texto detectados sobre la parte central de la banda completa
    _, all_comps = components(band_rgb[:, int(0.15 * w):int(0.85 * w)])
    lines = text_lines(all_comps, bh)

    xl = x0 if attached else max(0, x0 - int(0.04 * w))
    crop = band_rgb[:, xl:x1]
    lab, comps = components(crop)
    ch, cw = crop.shape[:2]
    keep = []
    edge = []
    for c in comps:
        cy = (c['y0'] + c['y1']) / 2
        in_text = any(c['y0'] >= t0 and c['y1'] <= t1 for t0, t1 in lines)
        near_text = any(t0 <= cy <= t1 for t0, t1 in lines) and c['gray']
        if (in_text or near_text) and c['area'] < 0.01 * ch * cw:
            continue
        if c['area'] < 0.0004 * ch * cw:
            continue  # motas sueltas y ruido jpeg
        if c['x1'] == cw and c['w'] < 0.012 * w:
            continue  # borde de la copia espejada
        if c['x0'] == 0:
            edge.append(c)  # toca el lado del personaje
            continue
        keep.append(c)
    if attached and edge:
        keep.append(max(edge, key=lambda c: c['area']))  # el efecto pegado: el mayor
    if debug:
        print(f'  {debug}: lineas texto {lines}; kept {[(c["x0"], c["y0"], c["w"], c["h"], c["area"]) for c in keep]}; '
              f'edge {[(c["w"], c["h"], c["area"]) for c in edge]}', file=sys.stderr)
    if not keep:
        return None
    out = np.zeros((ch, cw), bool)
    for c in keep:
        sl = (slice(c['y0'], c['y1']), slice(c['x0'], c['x1']))
        out[sl] |= lab[sl] == c['id']
    ys, xs = np.where(out)
    y0, y1, xa, xb = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([crop[y0:y1, xa:xb], (out[y0:y1, xa:xb] * 255).astype(np.uint8)])
    flt = opts.get('pxfilter')
    if flt:
        hsv = np.asarray(Image.fromarray(rgba[..., :3]).convert('HSV')).astype(int)
        hue, sat, val = hsv[..., 0] * 360 // 255, hsv[..., 1], hsv[..., 2]
        if flt == 'gray':
            bad = (sat < 60) & (val < 200)
        elif flt == 'green':
            bad = (hue > 55) & (hue < 165) & (sat > 60)
        else:
            raise ValueError(flt)
        rgba[bad, 3] = 0
    return rgba


def downscale(rgba: np.ndarray, height: int) -> Image.Image:
    """Reducción premultiplicada (sin halo blanco), alfa binaria y paleta de 32 colores."""
    h, w = rgba.shape[:2]
    scale = height / h
    nw = max(1, round(w * scale))
    a = rgba[..., 3:4].astype(np.float32) / 255
    pre = np.dstack([rgba[..., :3].astype(np.float32) * a, a * 255]).astype(np.uint8)
    small = np.asarray(Image.fromarray(pre).resize((nw, height), Image.LANCZOS)).astype(np.float32)
    alpha = small[..., 3]
    rgb = small[..., :3] / np.maximum(alpha, 1)[..., None] * 255
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    solid = alpha >= 128
    pal = Image.fromarray(rgb).quantize(32, dither=Image.Dither.NONE).convert('RGB')
    out = np.dstack([np.asarray(pal), (solid * 255).astype(np.uint8)])
    out[~solid, :3] = 0
    return Image.fromarray(out)


def main() -> None:
    images, out_dir, contact = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for fid, (fname, rows) in SHEETS.items():
        rgb = np.asarray(Image.open(images / fname).convert('RGB'))
        bands = find_rows(rgb)
        for row, kind, opts in rows:
            rgba = extract(rgb, bands[row], opts, debug=f'{fid}_{kind}' if '-v' in sys.argv else '')
            if rgba is None:
                print(f'[!] {fid} fila {row}: sin componentes', file=sys.stderr)
                continue
            img = downscale(rgba, HEIGHTS[kind])
            path = out_dir / f'{fid}_{kind}.png'
            img.save(path, optimize=True)
            results.append((fid, kind, img))
            print(f'{path.name}: {img.width}x{img.height} (fuente {rgba.shape[1]}x{rgba.shape[0]}, anchor {ANCHORS[kind]})')

    # Hoja de contacto a x3 sobre fondo oscuro
    z = 3
    cols = 4
    cell_w, cell_h = 140 * z, 70 * z + 14
    sheet = Image.new('RGB', (cols * cell_w, ((len(results) + cols - 1) // cols) * cell_h), (40, 44, 52))
    d = ImageDraw.Draw(sheet)
    for i, (fid, kind, img) in enumerate(results):
        cx, cy = (i % cols) * cell_w, (i // cols) * cell_h
        big = img.resize((img.width * z, img.height * z), Image.NEAREST)
        sheet.paste(big, (cx + 4, cy + 14 + (70 * z - big.height) // 2), big)
        d.text((cx + 4, cy + 2), f'{fid}_{kind} {img.width}x{img.height}', fill=(240, 240, 240))
    sheet.save(contact)


if __name__ == '__main__':
    main()
