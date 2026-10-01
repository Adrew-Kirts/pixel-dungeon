#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from PIL import Image

from pixel import Layer, hex_rgba, draw_text, text_width, OUTLINE

ROOT = Path(__file__).resolve().parents[2]
TILES = Image.open(ROOT / 'assets/tiles.png').convert('RGBA')

PALETTE = {
    'O': OUTLINE,
    'R': '#e43b44',
    'r': '#a22633',
    'G': '#a22633',
    'g': '#733e39',
    'B': '#f77622',
    'Y': '#feae34',
    'L': '#fee761',
    'H': '#fec99c',
    'h': '#e19a65',
    'P': '#f6757a',
    'E': '#fee761',
    'W': '#ffffff',
    'M': '#5a1a2a',
    'T': '#ff706d',
    'w': '#bd6c4a',
    'k': '#763b36',
    'e': '#43e1b3',
    'n': '#25956a',
    's': '#8b9bb4',
    'S': '#c0cbdc',
    'D': '#ffffff',
    'd': '#c0cbdc',
    'V': '#3a4466',
    'C': '#75e3ff',
    'c': '#b5f1ff',
    'b': '#0099db',
    'N': '#23406a',
    'p': '#e8c28f',
    'q': '#c28569',
}


BODY_SPANS = {
    7: (9, 14), 8: (7, 15), 9: (5, 16), 10: (3, 16), 11: (2, 16), 12: (2, 17),
    13: (3, 17), 14: (4, 18), 15: (6, 19), 16: (9, 20), 17: (10, 21), 18: (11, 22),
    19: (12, 23), 20: (12, 25), 21: (13, 28), 22: (13, 31), 23: (13, 33), 24: (13, 34),
    25: (13, 35), 26: (13, 36), 27: (13, 37), 28: (13, 37), 29: (14, 37), 30: (14, 37),
    31: (15, 36), 32: (15, 35), 33: (16, 34),
}
OPEN_MOUTH_SPANS = {13: (3, 17), 14: (3, 18), 15: (3, 19), 16: (5, 20), 17: (9, 21)}
TAIL_SPANS = {
    31: (36, 45), 30: (36, 46), 29: (38, 46), 28: (44, 46), 27: (44, 46), 26: (44, 46),
    25: (43, 45), 24: (42, 44),
}
SPADE_SPANS = {23: (40, 45), 22: (41, 44), 21: (42, 43)}
BELLY_END = {16: 11, 17: 12, 18: 13, 19: 14, 20: 14, 21: 15, 22: 16, 23: 17, 24: 18, 25: 19, 26: 20, 27: 20, 28: 20}
BELLY_START = {16: 9, 17: 10, 18: 11, 19: 12, 20: 12}
HORN = [
    (14, 7, 'H'), (15, 7, 'h'), (15, 6, 'H'), (16, 6, 'H'), (17, 6, 'h'), (17, 5, 'H'), (18, 5, 'H'), (19, 5, 'h'), (19, 4, 'H'), (20, 4, 'H'),
    (12, 7, 'H'), (12, 6, 'H'), (13, 6, 'h'), (13, 5, 'H'),
]


def highlight_top(layer, base, highlight):
    snapshot = dict(layer.pixels)
    for (x, y), key in snapshot.items():
        if key == base and (x, y - 1) not in snapshot and y < 30:
            layer.pixels[(x, y)] = highlight


DORSAL_SPIKES = [(20, 15), (22, 17), (24, 19), (27, 20), (30, 21), (33, 22)]


def dragon_body(mouth_open):
    layer = Layer(48, 40, PALETTE)
    spans = dict(BODY_SPANS)
    if mouth_open is True:
        spans.update(OPEN_MOUTH_SPANS)
    for y, (x0, x1) in spans.items():
        layer.span(y, x0, x1, 'R')
    for y, (x0, x1) in TAIL_SPANS.items():
        layer.span(y, x0, x1, 'R')
    for y, (x0, x1) in SPADE_SPANS.items():
        layer.span(y, x0, x1, 'r')
    for y in range(34, 38):
        front = {34: (16, 20), 35: (17, 20), 36: (17, 20), 37: (16, 21)}[y]
        back = {34: (28, 34), 35: (29, 33), 36: (29, 33), 37: (28, 34)}[y]
        layer.span(y, *front, 'R')
        layer.span(y, *back, 'R')
    for x in (16, 18, 20, 21, 28, 30, 32, 33, 34):
        layer.set(x, 38, 'R')
    layer.shade_bottom('R', 'r')
    for x in (15, 17, 19, 27, 29, 31):
        layer.set(x, 38, 'H')
    for y, end in BELLY_END.items():
        start = BELLY_START.get(y, 13)
        if mouth_open is True and y == 16:
            start = 7
        for x in range(start, end + 1):
            layer.set(x, y, 'Y' if y % 2 == 0 else 'B')
    for x, y in DORSAL_SPIKES:
        layer.set(x, y, 'B')
    for y in range(30, 34):
        layer.set(21, y, 'r')
    for x, y in ((27, 26), (26, 27), (26, 28), (26, 29), (27, 30), (28, 31)):
        layer.set(x, y, 'r')
    for x, y in ((24, 23), (28, 24), (31, 25), (23, 26), (33, 27), (30, 29)):
        layer.set(x, y, 'r')
    for x in range(10, 14):
        layer.set(x, 8, 'r')
    layer.set(11, 9, 'E')
    layer.set(12, 9, 'E')
    layer.set(11, 10, 'O')
    layer.set(12, 10, 'E')
    layer.set(4, 10, 'O')
    if mouth_open is True:
        for y in (13, 14):
            for x in range(3, 11):
                layer.set(x, y, 'M')
        for x in range(5, 9):
            layer.set(x, 14, 'T')
        for x in (3, 6, 9):
            layer.set(x, 13, 'W')
        for x in (4, 8):
            layer.set(x, 15, 'W')
    else:
        for x in range(3, 11):
            layer.set(x, 13, 'O')
        layer.set(5, 13, 'W')
        layer.set(8, 13, 'W')
    for x, y, key in HORN:
        layer.set(x, y, key)
    highlight_top(layer, 'R', 'P')
    layer.outline()
    return layer


WING_POSES = {
    'up': {'elbow': (29, 10), 'wrist': (35, 4), 'tip': (44, 1)},
    'mid': {'elbow': (31, 13), 'wrist': (38, 9), 'tip': (46, 6)},
    'down': {'elbow': (32, 16), 'wrist': (39, 15), 'tip': (46, 19)},
}
SHOULDER = (24, 21)
WING_ANCHOR = (35, 24)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def dragon_wing(pose):
    config = WING_POSES[pose]
    elbow, wrist, tip = config['elbow'], config['wrist'], config['tip']
    fingers = [lerp(tip, WING_ANCHOR, step / 4) for step in (1, 2, 3)]
    edge = [tip] + fingers + [WING_ANCHOR]
    points = [SHOULDER, elbow, wrist, tip]
    for start, end in zip(edge, edge[1:]):
        middle = lerp(start, end, 0.5)
        points.append(lerp(middle, wrist, 0.16))
        points.append(end)
    layer = Layer(48, 40, PALETTE)
    layer.poly(points, 'G')
    for finger in fingers:
        layer.line(wrist[0], wrist[1], round(finger[0]), round(finger[1]), 'g')
    layer.line(SHOULDER[0], SHOULDER[1], elbow[0], elbow[1], 'R')
    layer.line(SHOULDER[0] + 1, SHOULDER[1], elbow[0] + 1, elbow[1], 'R')
    layer.line(elbow[0], elbow[1], wrist[0], wrist[1], 'R')
    layer.line(wrist[0], wrist[1], tip[0], tip[1], 'R')
    layer.set(wrist[0], wrist[1] - 1, 'H')
    layer.outline()
    return layer


def dragon_frame(pose, mouth_open):
    frame = Image.new('RGBA', (48, 40), (0, 0, 0, 0))
    frame.alpha_composite(dragon_wing(pose).image())
    frame.alpha_composite(dragon_body(mouth_open).image())
    return frame


def tile(index):
    column, row = index % 12, index // 12
    return TILES.crop((column * 16, row * 16, column * 16 + 16, row * 16 + 16))


def recolor(image, mapping):
    result = image.copy()
    lookup = {hex_rgba(source): hex_rgba(target) for source, target in mapping.items()}
    for x in range(result.width):
        for y in range(result.height):
            pixel = result.getpixel((x, y))
            if pixel in lookup:
                result.putpixel((x, y), lookup[pixel])
    return result


def stick_icon():
    layer = Layer(16, 16, PALETTE)
    layer.line(4, 13, 11, 4, 'w')
    layer.line(5, 13, 12, 4, 'k')
    layer.set(8, 8, 'k')
    layer.set(12, 3, 'e')
    layer.set(13, 3, 'n')
    layer.set(13, 2, 'e')
    layer.outline()
    return layer.image()


def morning_star_icon():
    layer = Layer(16, 16, PALETTE)
    layer.line(3, 13, 8, 8, 'k')
    layer.line(4, 13, 9, 8, 'w')
    for y in range(3, 10):
        for x in range(7, 14):
            if (x - 10) ** 2 + (y - 6) ** 2 <= 9:
                layer.set(x, y, 's')
    for x, y in ((9, 5), (10, 5), (9, 4)):
        layer.set(x, y, 'S')
    for x, y in ((10, 2), (14, 6), (10, 10), (6, 6), (13, 3), (13, 9), (7, 3)):
        layer.set(x, y, 'S')
    layer.outline()
    return layer.image()


PIPS = {
    1: [(4, 4)],
    2: [(1, 1), (7, 7)],
    3: [(1, 1), (4, 4), (7, 7)],
    4: [(1, 1), (7, 1), (1, 7), (7, 7)],
    5: [(1, 1), (7, 1), (4, 4), (1, 7), (7, 7)],
    6: [(1, 1), (7, 1), (1, 4), (7, 4), (1, 7), (7, 7)],
}


def dice_icon(face):
    layer = Layer(12, 12, PALETTE)
    for y in range(1, 11):
        layer.span(y, 1, 10, 'D' if y < 9 else 'd')
    for px, py in PIPS[face]:
        for dx in (0, 1):
            for dy in (0, 1):
                layer.set(1 + px + dx, 1 + py + dy, 'O')
    layer.outline()
    image = layer.image()
    for corner in ((0, 0), (11, 0), (0, 11), (11, 11)):
        image.putpixel(corner, (0, 0, 0, 0))
    return image


def torch_icon():
    layer = Layer(8, 12, PALETTE)
    layer.span(4, 1, 6, 's')
    layer.span(5, 2, 5, 'S')
    layer.span(6, 3, 4, 's')
    for y in range(7, 11):
        layer.span(y, 3, 4, 'w' if y % 2 == 0 else 'k')
    layer.outline()
    return layer.image()


def graffiti_icon():
    width = text_width('EZRA WAS HERE') + 1
    layer = Layer(width, 13, PALETTE)
    for dy, key in ((1, 'S'), (0, 'V')):
        draw_text(layer, 'EZRA WAS HERE', 0, dy, key)
        draw_text(layer, '2023', (width - text_width('2023')) // 2, 7 + dy, key)
    return layer.image()


def banner_e_icon():
    layer = Layer(16, 16, PALETTE)
    for y in range(1, 13):
        layer.span(y, 3, 12, 'R')
    for x in range(3, 13):
        if abs(x - 7.5) > (15 - 13) + 2.5:
            continue
    layer.span(13, 4, 11, 'R')
    layer.span(14, 6, 9, 'R')
    for y in range(1, 15):
        if (3, y) in layer.pixels:
            layer.set(3, y, 'r')
    layer.span(1, 2, 13, 'k')
    for y in range(2, 13):
        layer.set(4, y, 'r')
        layer.set(11, y, 'r')
    draw_text(layer, 'E', 6, 4, 'Y')
    for x, y in ((6, 9), (7, 9), (8, 9)):
        layer.set(x, y + 1, 'L')
    layer.outline()
    return layer.image()


def painting_icon():
    layer = Layer(20, 15, PALETTE)
    for y in range(0, 15):
        layer.span(y, 0, 19, 'w')
    for y in range(2, 13):
        layer.span(y, 2, 17, 'C')
    for y in range(2, 6):
        layer.span(y, 2, 17, 'c')
    peaks = [(5, 5), (10, 3), (14, 5)]
    for y in range(3, 11):
        for x in range(2, 18):
            for px, py in peaks:
                if y >= py and abs(x - px) <= (y - py) * 1.2:
                    layer.set(x, y, 's' if y > py + 1 else 'D')
    for y in range(9, 13):
        layer.span(y, 2, 17, 'b')
    for x in (4, 8, 13, 16):
        layer.set(x, 10, 'C')
    layer.span(12, 2, 17, 'n')
    for x in range(1, 19):
        layer.set(x, 1, 'k')
        layer.set(x, 13, 'k')
    for y in range(1, 14):
        layer.set(1, y, 'k')
        layer.set(18, y, 'k')
    layer.outline()
    return layer.image()


def picto_sign_icon():
    layer = Layer(16, 16, PALETTE)
    for y in range(1, 15):
        layer.span(y, 2 if y in (1, 14) else 1, 13 if y in (1, 14) else 14, 'N')
    for y in range(4, 13):
        layer.span(y, 4, 11, 'w')
    for y in range(5, 12):
        layer.span(y, 5, 10, 'D')
    layer.span(3, 6, 9, 's')
    layer.span(4, 6, 9, 'S')
    for y in (7, 9):
        layer.span(y, 6, 9, 'h')
    layer.set(6, 11, 'e')
    layer.set(7, 10, 'e')
    layer.outline()
    return layer.image()


def wanted_icon():
    layer = Layer(28, 34, PALETTE)
    for y in range(0, 34):
        layer.span(y, 0, 27, 'p')
    for x in range(28):
        layer.set(x, 0, 'q')
        layer.set(x, 33, 'q')
    for y in range(34):
        layer.set(0, y, 'q')
        layer.set(27, y, 'q')
    for x, y in ((1, 1), (26, 1), (1, 32), (26, 32), (25, 31), (2, 2)):
        layer.set(x, y, 'q')
    draw_text(layer, 'WANTED', (28 - text_width('WANTED')) // 2, 2, 'r')
    draw_text(layer, 'REWARD', (28 - text_width('REWARD')) // 2, 27, 'k')
    image = layer.image()
    head = dragon_frame('up', False).crop((1, 2, 21, 20))
    image.alpha_composite(head, (4, 8))
    return image


def build():
    frames = {}
    sheet = Image.new('RGBA', (288, 64), (0, 0, 0, 0))
    column = 0
    for pose in ('up', 'mid', 'down'):
        for mouth in ('closed', 'open'):
            sheet.alpha_composite(dragon_frame(pose, mouth == 'open'), (column * 48, 0))
            frames[f'{pose}-{mouth}'] = [column * 48, 0, 48, 40]
            column += 1
    icons = {
        'stick': stick_icon(),
        'morningStar': morning_star_icon(),
        'lightbringer': recolor(tile(106), {'#c0cbdc': '#fee761', '#8b9bb4': '#feae34', '#e4edf9': '#ffffff', '#52607c': '#cf8254'}),
        'fireStaff': recolor(tile(129), {'#d176d0': '#feae34', '#9b4ca3': '#e84537'}),
        'stormStaff': tile(130),
        'smallPotion': tile(127),
        'largePotion': tile(115),
        'torch': torch_icon(),
    }
    for face in range(1, 7):
        icons[f'dice{face}'] = dice_icon(face)
    icons['bannerE'] = banner_e_icon()
    icons['painting'] = painting_icon()
    icons['pictoSign'] = picto_sign_icon()
    icons['wanted'] = wanted_icon()
    icons['graffiti'] = graffiti_icon()
    from real_art import build_real_icons
    icons.update(build_real_icons(dragon_frame('up', False).crop((1, 2, 17, 18))))
    from deep_art import build_deep_icons
    icons.update(build_deep_icons())
    x, y, row_height = 0, 40, 0
    placements = {}
    for name, image in icons.items():
        if x + image.width > 384:
            x, y, row_height = 0, y + row_height, 0
        placements[name] = (x, y)
        x += image.width
        row_height = max(row_height, image.height)
    height = y + row_height
    final = Image.new('RGBA', (384, height), (0, 0, 0, 0))
    final.alpha_composite(sheet.crop((0, 0, 288, 40)), (0, 0))
    icon_rects = {}
    for name, image in icons.items():
        final.alpha_composite(image, placements[name])
        icon_rects[name] = [placements[name][0], placements[name][1], image.width, image.height]
    sheet = final
    sheet.save(ROOT / 'assets/sprites.png', optimize=True)
    atlas = {'sheet': {'width': sheet.width, 'height': sheet.height}, 'dragon': frames, 'icons': icon_rects}
    (ROOT / 'src/art/atlas.js').write_text('export const ATLAS = ' + json.dumps(atlas, indent=2) + ';\n')
    head = dragon_frame('up', False).crop((1, 2, 19, 20)).resize((36, 36), Image.NEAREST)
    favicon = Image.new('RGBA', (36, 36), (0, 0, 0, 0))
    favicon.alpha_composite(head)
    favicon.save(ROOT / 'assets/favicon.png', optimize=True)
    if len(sys.argv) > 1:
        preview = Image.new('RGBA', (sheet.width, sheet.height), (38, 43, 68, 255))
        preview.alpha_composite(sheet)
        preview.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST).save(sys.argv[1])


if __name__ == '__main__':
    build()
