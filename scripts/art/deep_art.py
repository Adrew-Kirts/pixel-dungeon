import math

from PIL import Image

from pixel import Layer, draw_text, text_width
from real_art import P

C = dict(P)
C.update({
    'O': '#3f2631',
    'L': '#63c74d',
    'l': '#3e8948',
    'd': '#265c42',
    'D': '#193c3e',
    'H': '#fec99c',
    'h': '#e19a65',
    'e': '#e8b796',
    'E': '#b86f50',
    'j': '#733e39',
    'M': '#b55088',
    'P': '#f6757a',
    'z': '#e8c28f',
})


def stamp(layer, rows, x0=0, y0=0):
    for y, row in enumerate(rows):
        for x, key in enumerate(row):
            if key != '.':
                layer.set(x0 + x, y0 + y, key)


def ellipse(layer, cx, cy, rx, ry, key_for):
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1:
                key = key_for(dx, dy, x, y)
                if key is not None:
                    layer.set(x, y, key)


MANAGER_BODY = [
    '..........hhhh..........',
    '......cccwwrrwwccc......',
    '.....ccccwwrrwwccBB.....',
    '....ccOcccwrrwcccBOcB...',
    '....ccOccccrrcckcBOcB...',
    '....ccOccccrrcBBBBOcB...',
    '....ccOccccrrccccBOcB...',
    '...ccOcwcccrrcccccBOcB..',
    '...HHOcwcccrrcccccBOhHh.',
    '...HHOccwcccrcccccBOHHh.',
    '...hhOcccwcccccccBBOhhh.',
    '.....OjjccccccccBBjO....',
    '......kjjjjjjsjjjjjk....',
    '......kkkkkkkkkkkkKK....',
    '......kkkkkOkkkkkkKK....',
    '......kkkkkOOkkkkkKK....',
    '......KkkkKO.KkkkkKK....',
    '.....HHHHhO..OkHHHHh....',
    '....HhHhHHh..HhHhHHh....',
]

HEAD_SPANS = {
    1: (9, 14), 2: (7, 16), 3: (6, 17), 4: (5, 17), 5: (5, 18), 6: (5, 18), 7: (5, 18),
    8: (5, 18), 9: (5, 18), 10: (5, 17), 11: (6, 16), 12: (7, 15),
}


def manager_body(layer):
    stamp(layer, MANAGER_BODY, 0, 13)


def manager_skull(layer, base, shade, light):
    for y, (x0, x1) in HEAD_SPANS.items():
        for x in range(x0, x1 + 1):
            edge = x >= x1 - 1 and y >= 4 or y == 12 or (y == 11 and x >= 12)
            layer.set(x, y, shade if edge is True else base)
    for x, y in ((8, 2), (9, 2), (7, 3)):
        layer.set(x, y, light)


def manager_hair(layer):
    dark, mid, light = 'j', 'G', 's'
    for x, y, key in (
        (15, 4, mid), (16, 4, light), (16, 5, mid), (17, 5, light), (18, 4, mid), (18, 5, mid),
        (19, 5, dark), (17, 6, mid), (18, 6, light), (19, 6, mid), (18, 7, mid), (19, 7, light),
        (20, 7, mid), (18, 8, mid), (19, 8, mid), (18, 9, light), (19, 9, mid),
        (17, 10, dark), (18, 10, mid), (16, 10, dark), (16, 11, dark), (17, 11, mid), (14, 5, mid), (14, 6, dark),
        (15, 5, dark), (15, 6, dark), (16, 6, dark), (17, 7, dark), (17, 8, dark), (17, 9, dark),
        (4, 5, light), (5, 5, mid), (4, 6, mid), (5, 6, dark), (3, 6, light),
    ):
        layer.set(x, y, key)


def manager_ear(layer, base, shade):
    for x, y in ((15, 7), (16, 7), (15, 8), (16, 8), (15, 9), (16, 9)):
        layer.set(x, y, base)
    layer.set(14, 7, shade)
    layer.set(14, 8, shade)
    layer.set(14, 9, shade)
    layer.set(16, 8, shade)
    layer.set(15, 10, shade)


def manager_face(layer, variant, base, shade):
    angry = variant == 'angry'
    layer.set(4, 8, base)
    layer.set(4, 9, shade)
    layer.set(5, 9, shade)
    if angry is True:
        brows = ((6, 5), (7, 6), (8, 7), (10, 7), (11, 6), (12, 5))
    else:
        brows = ((6, 6), (7, 6), (8, 7), (10, 7), (11, 6), (12, 6))
    for x, y in brows:
        layer.set(x, y, 'O')
    layer.set(7, 8, 'X')
    layer.set(11, 8, 'X')
    if variant == 'talk':
        for x, y in ((7, 10), (8, 10), (9, 10), (7, 11), (9, 11)):
            layer.set(x, y, 'O')
        layer.set(8, 11, 'r')
    elif angry is True:
        for x, y in ((7, 10), (8, 10), (9, 10), (10, 10), (7, 11), (10, 11)):
            layer.set(x, y, 'O')
        layer.set(8, 11, 'W')
        layer.set(9, 11, 'W')
    else:
        for x, y in ((7, 11), (8, 11), (9, 11), (10, 12)):
            layer.set(x, y, 'O')


def steam(layer, cx, cy):
    for dx, dy, key in ((1, 0, 'w'), (2, 0, 'w'), (0, 1, 'w'), (1, 1, 'W'), (2, 1, 'W'), (3, 1, 'w'), (0, 2, 's'), (1, 2, 'w'), (2, 2, 'w'), (3, 2, 's'), (1, 3, 's'), (2, 3, 's')):
        layer.set(cx + dx, cy + dy, key)


MELON_SPANS = {
    1: (9, 14), 2: (7, 16), 3: (6, 17), 4: (5, 18), 5: (4, 19), 6: (4, 19), 7: (4, 19),
    8: (4, 19), 9: (4, 19), 10: (5, 18), 11: (5, 18), 12: (6, 17), 13: (8, 15),
}
MELON_MERIDIANS = (-62, -21, 21, 62)


def melon_head(layer, variant):
    stripe_pixels = set()
    for y, (x0, x1) in MELON_SPANS.items():
        centre = (x0 + x1) / 2
        half = (x1 - x0 + 1) / 2
        for angle in MELON_MERIDIANS:
            stripe_x = round(centre + half * math.sin(math.radians(angle)))
            jag = 1 if y % 4 in (1, 2) else 0
            if angle > 0:
                jag = -jag + 1
            stripe_pixels.add((stripe_x - 1 + jag, y))
            stripe_pixels.add((stripe_x + jag, y))
    for y, (x0, x1) in MELON_SPANS.items():
        for x in range(x0, x1 + 1):
            shaded = x == x1 or y == 13 or (y >= 10 and x >= x1 - 1)
            dark = (x, y) in stripe_pixels
            if dark is True:
                layer.set(x, y, 'D' if shaded is True else 'd')
            else:
                layer.set(x, y, 'l' if shaded is True else 'L')
    for x, y in ((8, 2), (7, 3)):
        layer.set(x, y, 'w')
    layer.set(12, 1, 'j')
    layer.set(12, 0, 'E')
    layer.set(13, 0, 'E')
    for x, y in ((6, 4), (7, 4), (8, 5), (9, 5), (11, 5), (12, 5), (13, 4), (14, 4)):
        layer.set(x, y, 'X')
    for x, y in ((7, 6), (8, 6), (7, 7), (8, 7), (12, 6), (13, 6), (12, 7), (13, 7)):
        layer.set(x, y, 'W')
    layer.set(7, 6, 'X')
    layer.set(12, 6, 'X')
    if variant == 'melonTalk':
        for x, y, key in (
            (8, 8, 'X'), (9, 8, 'X'), (10, 8, 'X'), (11, 8, 'X'), (12, 8, 'X'),
            (7, 9, 'X'), (8, 9, 'w'), (9, 9, 'w'), (10, 9, 'w'), (11, 9, 'w'), (12, 9, 'w'), (13, 9, 'X'),
            (7, 10, 'X'), (8, 10, 'R'), (9, 10, 'X'), (10, 10, 'R'), (11, 10, 'R'), (12, 10, 'R'), (13, 10, 'X'),
            (7, 11, 'X'), (8, 11, 'R'), (9, 11, 'R'), (10, 11, 'R'), (11, 11, 'X'), (12, 11, 'R'), (13, 11, 'X'),
            (8, 12, 'X'), (9, 12, 'r'), (10, 12, 'r'), (11, 12, 'r'), (12, 12, 'X'),
            (9, 13, 'X'), (10, 13, 'X'), (11, 13, 'X'),
        ):
            layer.set(x, y, key)
    else:
        for x, y in ((7, 11), (8, 10), (9, 10), (10, 10), (11, 10), (12, 10), (13, 11)):
            layer.set(x, y, 'X')
        for x in range(8, 13):
            layer.set(x, 11, 'R')
        for x in range(8, 13):
            layer.set(x, 12, 'X')


def melon_chunk(layer, x, y, flip):
    cells = ((0, 0, 'R'), (1, 0, 'R'), (0, 1, 'w'), (1, 1, 'l')) if flip is False else ((0, 0, 'l'), (1, 0, 'w'), (0, 1, 'R'), (1, 1, 'R'))
    for dx, dy, key in cells:
        layer.set(x + dx, y + dy, key)


def melon_wedge(layer, x, y, flip):
    rows = ('.R.', 'RXR', 'lll') if flip is False else ('lll', 'RXR', '.R.')
    for dy, row in enumerate(rows):
        for dx, key in enumerate(row):
            if key != '.':
                layer.set(x + dx, y + dy, key)


def manager_headless_v1():
    layer = Layer(24, 32, C)
    manager_body(layer)
    torso = {16: (7, 17), 17: (7, 17), 18: (7, 17), 19: (7, 17), 20: (6, 18), 21: (6, 18), 22: (6, 18), 23: (6, 18)}
    for y, (x0, x1) in torso.items():
        for x in range(24):
            if x < x0 or x > x1:
                layer.pixels.pop((x, y), None)
    for x in (4, 5, 18, 19):
        layer.pixels.pop((x, 15), None)
    layer.set(5, 15, 'c')
    layer.set(18, 15, 'B')
    for offset, key in ((0, 'c'), (1, 'c'), (2, 'B')):
        layer.line(4 + offset, 16, 2 + offset, 12, key if offset < 2 else 'c')
    for offset, key in ((0, 'B'), (1, 'c'), (2, 'c')):
        layer.line(19 - offset, 16, 21 - offset, 12, key)
    layer.line(3, 16, 1, 13, 'B')
    for x, y, key in (
        (2, 10, 'H'), (3, 10, 'H'), (2, 11, 'H'), (3, 11, 'h'), (1, 9, 'H'), (3, 9, 'H'), (1, 10, 'h'), (4, 10, 'H'),
        (20, 10, 'H'), (21, 10, 'H'), (20, 11, 'h'), (21, 11, 'H'), (20, 9, 'H'), (22, 9, 'H'), (22, 10, 'h'), (19, 10, 'H'),
    ):
        layer.set(x, y, key)
    for (x, y) in list(layer.pixels):
        if y < 13:
            if (x, y) not in ((2, 10), (3, 10), (2, 11), (3, 11), (1, 9), (3, 9), (1, 10), (4, 10), (20, 10), (21, 10), (20, 11), (21, 11), (20, 9), (22, 9), (22, 10), (19, 10), (3, 12), (4, 12), (20, 12), (19, 12)):
                layer.pixels.pop((x, y), None)
    for x in range(10, 14):
        layer.set(x, 12, 'h')
        layer.set(x, 13, 'h')
    layer.set(10, 12, 'H')
    for x, y, key in ((10, 11, 'l'), (11, 11, 'R'), (12, 11, 'R'), (13, 11, 'l'), (11, 10, 'R'), (12, 10, 'w'), (12, 11, 'X')):
        layer.set(x, y, key)
    melon_chunk(layer, 7, 13, False)
    melon_chunk(layer, 15, 14, True)
    melon_chunk(layer, 9, 18, False)
    for x, y in ((8, 16), (15, 19), (14, 13), (6, 18)):
        layer.set(x, y, 'X')
    melon_wedge(layer, 4, 4, True)
    melon_wedge(layer, 16, 1, False)
    melon_wedge(layer, 10, 4, False)
    for x, y in ((8, 2), (14, 7), (19, 6), (4, 7)):
        layer.set(x, y, 'X')
    layer.outline()
    return layer.image()


def manager_v1(variant):
    layer = Layer(24, 32, C)
    manager_body(layer)
    if variant.startswith('melon'):
        melon_head(layer, variant)
        layer.outline()
        return layer.image()
    if variant == 'angry':
        base, shade, light = 'P', 'R', 'p'
    else:
        base, shade, light = 'H', 'h', 'W'
    manager_skull(layer, base, shade, light)
    manager_hair(layer)
    manager_ear(layer, base, shade)
    manager_face(layer, variant, base, shade)
    if variant == 'angry':
        steam(layer, 0, 1)
        steam(layer, 19, 1)
    layer.outline()
    return layer.image()


TEE_BODY = [
    '.........hhhhhh.........',
    '.......Lldhhhhdlld......',
    '......Lllldddddllld.....',
    '.....LlOLllllllldOld....',
    '.....LlOLllllllldOld....',
    '.....ddOLllllllldOdd....',
    '......f.Lllllllld.f.....',
    '......f.Lllllllld.f.....',
    '......f.Lllllllld.fh....',
    '.....ff.Lllllllld.ffh...',
    '.....hh.ddddddddd.hhh...',
    '.......jdddddddddj......',
    '......kjjjjjjsjjjjjk....',
    '......kkkkkkkkkkkkKK....',
    '......kkkkkOkkkkkkKK....',
    '......kkkkkOOkkkkkKK....',
    '......KkkkKO.KkkkkKK....',
    '.....ffffhO..OkffffE....',
    '....fhfhffh..fhfhffE....',
]

HEAD_V2_SPANS = {
    1: (9, 14), 2: (7, 16), 3: (6, 17), 4: (6, 17), 5: (5, 18), 6: (5, 18), 7: (5, 18),
    8: (5, 18), 9: (5, 18), 10: (6, 17), 11: (6, 17), 12: (7, 16), 13: (8, 14),
}


def tee_body(layer):
    stamp(layer, TEE_BODY, 0, 13)


def manager_head_v2(layer, variant):
    angry = variant == 'angry'
    if angry is True:
        base, shade, deep, dome, shine = 'P', 'R', 'r', 'p', 'W'
    else:
        base, shade, deep, dome, shine = 'f', 'h', 'E', 'F', 'W'
    for y, (x0, x1) in HEAD_V2_SPANS.items():
        for x in range(x0, x1 + 1):
            key = base
            if x >= x1 - 1 and y >= 5 or y >= 12 and x >= 12:
                key = shade
            if x == x1 and y >= 7:
                key = deep
            if ((x + 0.5 - 10) / 4.6) ** 2 + ((y + 0.5 - 2.6) / 2.6) ** 2 < 1:
                key = dome
            layer.set(x, y, key)
    for x, y in ((8, 2), (9, 2), (7, 3)):
        layer.set(x, y, shine)
    hair = (
        (14, 4, 'j'), (15, 4, 'X'), (16, 4, 'X'), (17, 4, 'j'), (14, 5, 'X'), (15, 5, 'X'), (16, 5, 'X'), (17, 5, 'X'), (18, 5, 'j'),
        (14, 6, 'X'), (17, 6, 'X'), (18, 6, 'X'), (17, 7, 'X'), (18, 7, 'j'), (17, 8, 'X'), (18, 8, 'X'), (17, 9, 'j'), (18, 9, 'X'),
        (16, 10, 'X'), (17, 10, 'X'), (15, 11, 'j'), (16, 11, 'X'), (14, 7, 'X'), (14, 8, 'j'),
        (5, 5, 'X'), (5, 6, 'j'), (6, 5, 'j'),
    )
    for x, y, key in hair:
        layer.set(x, y, key)
    for x, y in ((15, 6), (16, 6), (15, 7), (16, 7), (15, 8), (16, 8), (16, 9)):
        layer.set(x, y, base)
    layer.set(16, 7, deep)
    layer.set(15, 9, shade)
    layer.set(4, 8, base)
    layer.set(4, 9, shade)
    layer.set(5, 9, deep)
    layer.set(6, 9, shade)
    if angry is True:
        brows = ((6, 5), (7, 6), (8, 6), (8, 7), (10, 7), (11, 6), (12, 5), (12, 6), (13, 5))
    else:
        brows = ((6, 6), (7, 6), (8, 6), (8, 7), (10, 7), (11, 6), (12, 6), (13, 6))
    for x, y in brows:
        layer.set(x, y, 'X')
    for x, y in ((7, 8), (11, 8)):
        layer.set(x, y, 'X')
    layer.set(8, 8, 'W')
    layer.set(12, 8, 'W')
    for x in range(5, 11):
        layer.set(x, 10, 'X')
    layer.set(5, 10, 'j')
    layer.set(5, 11, 'j')
    if variant == 'talk':
        mouth = ((7, 11, 'X'), (8, 11, 'r'), (9, 11, 'X'), (7, 12, 'X'), (8, 12, 'X'), (9, 12, 'X'))
    elif angry is True:
        mouth = ((7, 11, 'W'), (8, 11, 'W'), (9, 11, 'W'), (7, 12, 'X'), (8, 12, 'X'), (9, 12, 'X'))
    else:
        mouth = ((7, 11, 'r'), (8, 11, 'r'), (9, 11, 'u'), (7, 12, 'g'), (8, 12, 's'), (9, 12, 'g'))
    for x, y, key in ((6, 11, 'X'), (10, 11, 'X'), (6, 12, 'X'), (10, 12, 'X'), (7, 13, 'g'), (8, 13, 'w'), (9, 13, 's'), (10, 13, 'g')) + mouth:
        layer.set(x, y, key)


def manager(variant):
    layer = Layer(24, 32, C)
    tee_body(layer)
    if variant.startswith('melon'):
        melon_head(layer, variant)
        layer.outline()
        return layer.image()
    manager_head_v2(layer, variant)
    if variant == 'angry':
        steam(layer, 0, 1)
        steam(layer, 19, 1)
    layer.outline()
    return layer.image()


def manager_headless():
    layer = Layer(24, 32, C)
    tee_body(layer)
    for y in range(16, 24):
        for x in range(24):
            if x < 8 or x > 16:
                layer.pixels.pop((x, y), None)
    for (x, y) in list(layer.pixels):
        if y < 13:
            layer.pixels.pop((x, y), None)
    for x, y, key in ((4, 13, 'd'), (5, 13, 'l'), (5, 14, 'l'), (6, 14, 'L'), (4, 14, 'd'), (19, 13, 'd'), (18, 13, 'l'), (18, 14, 'l'), (17, 14, 'l'), (19, 14, 'd')):
        layer.set(x, y, key)
    layer.line(4, 12, 3, 9, 'f')
    layer.line(19, 12, 20, 9, 'f')
    for x, y, key in ((2, 7, 'f'), (3, 7, 'h'), (4, 7, 'f'), (2, 8, 'f'), (3, 8, 'f'), (4, 8, 'h'),
                      (19, 7, 'f'), (20, 7, 'h'), (21, 7, 'f'), (19, 8, 'h'), (20, 8, 'f'), (21, 8, 'f')):
        layer.set(x, y, key)
    for x in range(10, 14):
        layer.set(x, 12, 'h')
        layer.set(x, 13, 'h')
    layer.set(10, 12, 'f')
    for x, y, key in ((10, 11, 'l'), (11, 11, 'R'), (12, 11, 'R'), (13, 11, 'l'), (11, 10, 'R'), (12, 10, 'w'), (12, 11, 'X')):
        layer.set(x, y, key)
    melon_chunk(layer, 8, 14, False)
    melon_chunk(layer, 14, 16, True)
    melon_chunk(layer, 10, 19, False)
    for x, y in ((9, 17), (15, 20), (13, 15), (12, 22)):
        layer.set(x, y, 'X')
    melon_wedge(layer, 5, 2, True)
    melon_wedge(layer, 16, 1, False)
    melon_wedge(layer, 10, 4, False)
    for x, y in ((8, 1), (14, 7), (19, 4), (6, 7)):
        layer.set(x, y, 'X')
    layer.outline()
    return layer.image()


LUMI_HEAD = [
    '............yYy...',
    '......YYYYYYYWYy..',
    '....YYWWWYYYYYYF..',
    '...FYYYYYYYYYYYF..',
    '...FYHYYHHYYHYYF..',
    '...FHXXXHHXXXHF...',
    '...FXWnnHHWnnXF...',
    '...FHnnNHHnnNHF...',
    '...YHNNNHHNNNHY...',
    '...YHPPHHHHPPHY...',
    '...Y.HHHHpHHH.Y...',
    '...Y..HHHHHH..Y...',
]

LUMI_HEAD_SAD = [
    '............yYy...',
    '......YYYYYYYWYy..',
    '....YYWWWYYYYYYF..',
    '...FYYYYYYYYYYYF..',
    '...FYHYYHHYYHYYF..',
    '...FHXXXHHXXXHF...',
    '...FHWnnHHWnnHF...',
    '...FHnnNHHnnNHF...',
    '...YHcccHHcccHY...',
    '...YHPcHHHHcPHY...',
    '...Y.HHHrrHHH.Y...',
    '...Y..HHHHHH..Y...',
]

LUMI_TORSO = [
    '..YY....ee....YY..',
    '..F...HHHHHH...F..',
    '.....HLLLLLLH.....',
    '.....H..LLL..H....',
    '.....H.LLLLl..H...',
    '......LLLLLLl.....',
    '.....L.L.L.L.L....',
    '.......H..H.......',
    '.......H..H.......',
    '......LL..LL......',
]

LUMI_TORSO_SAD = [
    '..YY....ee....YY..',
    '..F...HHHHHH...F..',
    '.....HLLLLLLH.....',
    '.....H..LLL.H.....',
    '.....H.LLLLlH.....',
    '......LLLLLLl.....',
    '.....L.L.L.L.L....',
    '.......H..H.......',
    '.......H..H.......',
    '......LL..LL......',
]

FAIRY_WINGS = {
    'up': ((2.9, 11.2, 2.0, 3.6, 26), (15.1, 11.2, 2.0, 3.6, -26), (3.6, 16.4, 1.5, 2.3, -38), (14.4, 16.4, 1.5, 2.3, 38)),
    'down': ((2.7, 14.2, 1.9, 3.4, -52), (15.3, 14.2, 1.9, 3.4, 52), (4.0, 17.8, 1.4, 2.1, -16), (14.0, 17.8, 1.4, 2.1, 16)),
    'sadUp': ((3.4, 15.0, 1.6, 3.5, 10), (14.6, 15.0, 1.6, 3.5, -10), (4.6, 18.6, 1.2, 2.1, 4), (13.4, 18.6, 1.2, 2.1, -4)),
    'sadDown': ((3.7, 15.6, 1.6, 3.5, 2), (14.3, 15.6, 1.6, 3.5, -2), (4.9, 19.0, 1.2, 2.1, 0), (13.1, 19.0, 1.2, 2.1, 0)),
}

FAIRY_WAND = {
    False: ((15, 15, 'y'), (15, 14, 'y'), (16, 13, 'W'), (15, 13, 'Y'), (17, 13, 'Y'), (16, 12, 'Y'), (16, 14, 'Y')),
    True: ((13, 17, 'y'), (13, 18, 'y'), (14, 19, 'y'), (14, 20, 'o')),
}

FAIRY_ANTENNAE = ((7, 0, 'E'), (6, 0, 'f'), (10, 0, 'E'), (11, 0, 'f'))


def oval(layer, cx, cy, rx, ry, angle, key_for):
    radians = math.radians(angle)
    cos_a, sin_a = math.cos(radians), math.sin(radians)
    for y in range(layer.height):
        for x in range(layer.width):
            px, py = x + 0.5 - cx, y + 0.5 - cy
            u = (px * cos_a + py * sin_a) / rx
            v = (-px * sin_a + py * cos_a) / ry
            if u * u + v * v <= 1:
                key = key_for(u, v)
                if key is not None:
                    layer.set(x, y, key)


def fairy_wing(u, v):
    if u * u + v * v > 0.55:
        return 'c'
    return 'w'


def fairy(pose):
    sad = pose.startswith('sad')
    layer = Layer(18, 22, C)
    if sad is True:
        stamp(layer, LUMI_HEAD_SAD + LUMI_TORSO_SAD)
    else:
        stamp(layer, LUMI_HEAD + LUMI_TORSO)
    layer.outline()
    wings = Layer(18, 22, C)
    for cx, cy, rx, ry, angle in FAIRY_WINGS[pose]:
        oval(wings, cx, cy, rx, ry, angle, fairy_wing)
    for position, key in wings.pixels.items():
        if position not in layer.pixels:
            layer.pixels[position] = key
    for x, y, key in FAIRY_WAND[sad]:
        layer.set(x, y, key)
    for x, y, key in FAIRY_ANTENNAE:
        layer.set(x, y, key)
    return layer.image()


MINI_HEAD = [
    '.........yYy.',
    '....YYYYYlYy.',
    '...YWWYYYYF..',
    '..FYHYHHYHF..',
    '..FHXXHXXHF..',
    '..FHWnHWnHF..',
    '..YHNNHNNHY..',
    '..YPHHpHHPY..',
    '..Y..HHH..Y..',
]

MINI_HEAD_SAD = [
    '.........yYy.',
    '....YYYYYlYy.',
    '...YWWYYYYF..',
    '..FYHYHHYHF..',
    '..FHXXHXXHF..',
    '..FHWnHWnHF..',
    '..YHccHccHY..',
    '..YHcHrHcHY..',
    '..Y..HHH..Y..',
]

MINI_TORSO = [
    '..FHLLLLLHF..',
    '...H.LLL.H...',
    '...HLLLLLH...',
    '...L.L.L.L...',
    '.....H.H.....',
    '....LL.LL....',
]

MINI_TORSO_SAD = MINI_TORSO

MINI_WINGS = {
    'up': ((1.6, 9.2, 1.5, 2.6, 22), (11.4, 9.2, 1.5, 2.6, -22), (2.0, 12.3, 1.1, 1.6, -32), (11.0, 12.3, 1.1, 1.6, 32)),
    'down': ((1.5, 11.0, 1.4, 2.4, -50), (11.5, 11.0, 1.4, 2.4, 50), (2.3, 13.2, 1.0, 1.4, -12), (10.7, 13.2, 1.0, 1.4, 12)),
    'sadUp': ((1.9, 10.9, 1.2, 2.6, 8), (11.1, 10.9, 1.2, 2.6, -8), (2.6, 13.5, 0.9, 1.3, 2), (10.4, 13.5, 0.9, 1.3, -2)),
    'sadDown': ((2.1, 11.3, 1.2, 2.6, 0), (10.9, 11.3, 1.2, 2.6, 0), (2.8, 13.8, 0.9, 1.3, 0), (10.2, 13.8, 0.9, 1.3, 0)),
}

MINI_WAND = {
    False: ((10, 10, 'y'), (11, 9, 'W'), (12, 9, 'Y'), (11, 8, 'Y'), (11, 10, 'Y')),
    True: ((10, 12, 'y'), (10, 13, 'y'), (11, 14, 'o')),
}

MINI_ANTENNAE = ((5, 0, 'E'), (4, 0, 'f'), (7, 0, 'E'), (8, 0, 'f'))


def fairy_mini(pose):
    sad = pose.startswith('sad')
    layer = Layer(13, 15, C)
    if sad is True:
        stamp(layer, MINI_HEAD_SAD + MINI_TORSO_SAD)
    else:
        stamp(layer, MINI_HEAD + MINI_TORSO)
    layer.outline()
    wings = Layer(13, 15, C)
    for cx, cy, rx, ry, angle in MINI_WINGS[pose]:
        oval(wings, cx, cy, rx, ry, angle, fairy_wing)
    for position, key in wings.pixels.items():
        if position not in layer.pixels:
            layer.pixels[position] = key
    for x, y, key in MINI_WAND[sad]:
        layer.set(x, y, key)
    for x, y, key in MINI_ANTENNAE:
        layer.set(x, y, key)
    return layer.image()


def noise(x, y, seed=0):
    value = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    value = ((value ^ (value >> 13)) * 1274126177) & 0xFFFFFFFF
    return (value ^ (value >> 16)) % 1000 / 1000


def merge(target, part, outline=True):
    if outline is True:
        part.outline()
    target.pixels.update(part.pixels)


def recolor_layer(layer, mapping):
    for position, key in list(layer.pixels.items()):
        if key in mapping:
            layer.pixels[position] = mapping[key]


FOREWING = [(0, -2), (7, -5), (15, -8), (23, -11), (28, -12), (31, -10), (31.5, -6), (30, -1), (26, 4), (20, 7), (13, 8), (7, 7), (2, 4), (0, 2)]
HINDWING = [(0, -1), (6, -3), (13, -3), (19, 0), (22, 5), (21, 11), (16, 15), (9, 15), (4, 11), (1, 6)]
MOTH_POSES = {
    'up': {'fore': (-44, 0.8, 0.78), 'hind': (-16, 0.84, 0.9)},
    'mid': {'fore': (-14, 0.98, 1.0), 'hind': (16, 1.0, 1.0)},
    'down': {'fore': (24, 0.9, 0.9), 'hind': (52, 0.85, 0.9)},
}


def wing_layer(root, shape, angle, scale_u, scale_v, mirror, colour):
    radians = math.radians(angle)
    cos_a, sin_a = math.cos(radians), math.sin(radians)
    direction = -1 if mirror is True else 1
    points = []
    for u, v in shape:
        su, sv = u * scale_u, v * scale_v
        x = su * cos_a - sv * sin_a
        y = su * sin_a + sv * cos_a
        points.append((root[0] + direction * x, root[1] + y))
    mask = Layer(64, 48, C)
    mask.poly(points, 'a')
    layer = Layer(64, 48, C)
    for (x, y) in mask.pixels:
        dx = (x + 0.5 - root[0]) * direction
        dy = y + 0.5 - root[1]
        u = (dx * cos_a + dy * sin_a) / scale_u
        v = (-dx * sin_a + dy * cos_a) / scale_v
        layer.set(x, y, colour(u, v, x, y))
    return layer


def eye_spot(u, v, cu, cv, radius):
    distance = math.hypot(u - cu, v - cv) / radius
    if distance < 0.26:
        return 'W' if u < cu and v < cv else 'X'
    if distance < 0.5:
        return 'X'
    if distance < 0.72:
        return 'R'
    if distance < 0.93:
        return 'y'
    if distance < 1.08:
        return 'j'
    return None


def forewing_colour(u, v, x, y):
    spot = eye_spot(u, v, 19, -1.5, 5.2)
    if spot is not None:
        return spot
    t = u / 31
    wave = math.sin(v * 0.55) * 0.035
    grain = noise(x, y, 3)
    if t < 0.18:
        return 'u' if grain < 0.6 else 'E'
    if t < 0.27 + wave:
        return 'E' if grain > 0.2 else 'Q'
    if t < 0.31 + wave:
        return 'k'
    if t < 0.7 + wave:
        return 'G' if grain > 0.16 else 's' if grain > 0.06 else 'g'
    if t < 0.75 + wave:
        return 's'
    if t < 0.78 + wave:
        return 'k'
    if u > 26 and v < -6:
        return 'u'
    if t > 0.94 or (u > 21 and v > 4):
        return 'z' if grain < 0.3 else 'Q'
    return 'E' if grain > 0.15 else 'Q'


def hindwing_colour(u, v, x, y):
    grain = noise(x, y, 5)
    t = u / 22
    if t < 0.24:
        return 'u' if grain < 0.6 else 'E'
    radial = math.hypot(u - 3, v - 5) / 17
    if radial > 0.95:
        return 's' if grain < 0.3 else 'G'
    if radial > 0.84:
        return 'g'
    if 0.62 < radial < 0.7:
        return 'z'
    if math.hypot(u - 12, v - 7) < 1.6:
        return 'u'
    return 'E' if grain > 0.15 else 'Q'


MOTH_HOT = {'Q': 'o', 'E': 'R', 'u': 'r', 'j': 'r', 'k': 'r', 'z': 'Y', 'G': 'o', 'g': 'R', 's': 'y', 'y': 'Y', 'R': 'y'}


def fuzzy_blob(layer, cx, cy, rx, ry, colour, seed):
    for y in range(int(cy - ry - 2), int(cy + ry + 3)):
        for x in range(int(cx - rx - 2), int(cx + rx + 3)):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            distance = math.sqrt(dx * dx + dy * dy)
            limit = 1 + (0.2 if noise(x, y, seed) > 0.62 else 0)
            if distance <= limit:
                layer.set(x, y, colour(dx, dy, x, y))


def fur(light, mid, dark, seed):
    def colour(dx, dy, x, y):
        tone = dx * 0.7 + dy * 0.8 + (noise(x // 1, y // 2, seed) - 0.5) * 0.5
        if tone < -0.55:
            return light
        if tone > 0.55:
            return dark
        return mid
    return colour


def mane_fur(dx, dy, x, y):
    grain = noise(x, y // 2, 41)
    tone = dx * 0.6 + dy * 0.8
    if tone < -0.8 and grain > 0.7:
        return 'W'
    if tone > 0.5:
        return 'q' if grain > 0.35 else 'Q'
    return 'z' if grain > 0.3 else 'F'


def moth_body(layer, enraged):
    abdomen = Layer(64, 48, C)
    for y in range(30, 47):
        progress = (y - 30) / 16
        half = 4.6 * (1 - progress ** 1.8) + 0.7
        centre = 33 + progress * 7
        for x in range(int(centre - half - 1), int(centre + half + 2)):
            offset = x + 0.5 - centre
            if abs(offset) <= half:
                band = (y // 2) % 2 == 0
                if offset < -half + 1.3:
                    key = 'Q' if band is True else 'E'
                elif offset > half - 1.3:
                    key = 'j'
                else:
                    key = 'E' if band is True else 'u'
                abdomen.set(x, y, key)
    merge(layer, abdomen)

    legs = Layer(64, 48, C)
    for path in (((29, 31), (26, 34), (25, 38)), ((31, 33), (29, 37), (29, 40)), ((36, 31), (39, 34), (40, 38)), ((34, 33), (36, 37), (36, 40))):
        for (x0, y0), (x1, y1) in zip(path, path[1:]):
            legs.line(x0, y0, x1, y1, 'E')
        legs.set(path[1][0], path[1][1], 'Q')
    merge(layer, legs)

    thorax = Layer(64, 48, C)
    fuzzy_blob(thorax, 32.5, 27.5, 6.6, 5.6, fur('Q', 'E', 'j', 29), 11)
    merge(layer, thorax)

    mane = Layer(64, 48, C)
    fuzzy_blob(mane, 31.0, 21.0, 8.6, 5.8, mane_fur, 17)
    merge(layer, mane)

    head = Layer(64, 48, C)
    fuzzy_blob(head, 29.8, 18.8, 5.8, 4.8, fur('E', 'u', 'j', 37), 23)
    core = 'W' if enraged is True else 'Y'
    for cx, cy, radius in ((26.7, 19.3, 2.9), (32.9, 18.9, 2.5)):
        for y in range(int(cy - 5), int(cy + 5)):
            for x in range(int(cx - 5), int(cx + 5)):
                distance = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if distance <= radius:
                    ratio = distance / radius
                    head.set(x, y, core if ratio < 0.3 else 'y' if ratio < 0.55 else 'R' if ratio < 0.8 else 'r')
    for x, y in ((23, 15), (24, 15), (25, 16), (26, 16), (27, 16), (28, 17), (31, 17), (32, 16), (33, 16), (34, 16), (35, 15)):
        head.set(x, y, 'X')
    for x, y in ((25, 18), (31, 18)):
        head.set(x, y, 'W')
    merge(layer, head)


def polyline_samples(points):
    samples = []
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        steps = int(math.hypot(x1 - x0, y1 - y0) * 2) + 1
        for step in range(steps):
            t = step / steps
            samples.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    samples.append(points[-1])
    return samples


def feather_antenna(layer, points, width=2.6):
    samples = polyline_samples(points)
    total = len(samples)
    feather = Layer(64, 48, C)
    lengths = [0.0]
    for (x0, y0), (x1, y1) in zip(samples, samples[1:]):
        lengths.append(lengths[-1] + math.hypot(x1 - x0, y1 - y0))
    for y in range(48):
        for x in range(64):
            px, py = x + 0.5, y + 0.5
            best, best_index = 99.0, 0
            for index, (sx, sy) in enumerate(samples):
                distance = math.hypot(px - sx, py - sy)
                if distance < best:
                    best, best_index = distance, index
            t = best_index / (total - 1)
            half = width * math.sin(math.pi * min(1.0, 0.18 + t * 0.95)) + 0.35
            if best > half:
                continue
            if best < 0.72:
                feather.set(x, y, 'j')
                continue
            along = lengths[best_index] - best * 0.9
            feather.set(x, y, 'Q' if int(along) % 2 == 0 else 'E')
    merge(layer, feather)


def moth(pose, enraged):
    layer = Layer(64, 48, C)
    settings = MOTH_POSES[pose]
    wings = []
    for mirror, root_x, scale in ((True, 28, 0.86), (False, 36, 1.0)):
        fore_angle, fore_u, fore_v = settings['fore']
        hind_angle, hind_u, hind_v = settings['hind']
        hind = wing_layer((root_x, 27), HINDWING, hind_angle, hind_u * scale, hind_v, mirror, hindwing_colour)
        fore = wing_layer((root_x, 24), FOREWING, fore_angle, fore_u * scale, fore_v, mirror, forewing_colour)
        if enraged is True:
            recolor_layer(hind, MOTH_HOT)
            recolor_layer(fore, MOTH_HOT)
        wings.append((hind, fore))
    for hind, fore in wings:
        merge(layer, hind)
    for hind, fore in wings:
        merge(layer, fore)
    moth_body(layer, enraged)
    feather_antenna(layer, [(26.5, 15.5), (24, 10), (20, 5), (13, 1.5)])
    feather_antenna(layer, [(32.5, 14.5), (34.5, 9), (38.5, 4.5), (45, 1.5)])
    return layer.image()


BUG_FRAMES = {
    'up': [
        '................',
        '..........EEE...',
        '.QQ......EsGGE..',
        'QjQQ....EsGGGGE.',
        '.QjQ...EsGGyGGE.',
        '..Qj..EsGGyXyGE.',
        '...j.EsGGGGyGE..',
        '...jEzsGGGGGGE..',
        '..uuzzzGGGGGE...',
        '.uRYuzzzEEuuEEu.',
        '.uRRuzzzEEuuEEuj',
        '..uuuzzqEEuuEj..',
        '...E.E.E........',
        '..E.E.E.........',
        '................',
        '................',
    ],
    'down': [
        '................',
        '................',
        '................',
        '.QQ.............',
        'QjQQ............',
        '.QjQ............',
        '..Qjzzz.........',
        '...jzzzzEEuu....',
        '..uuzzzqEEuuEEu.',
        '.uRYuzzzEEuuEEuj',
        '.uRRuzEsGGGGGj..',
        '..uuuEsGGGyGGE..',
        '...E.EsGGyXyGE..',
        '..E.E.EsGGyGGE..',
        '.......EsGGGE...',
        '........EEEE....',
    ],
}


def sprite(rows, width=16, height=16, outline=True):
    padded = [row.ljust(width, '.')[:width] for row in rows]
    while len(padded) < height:
        padded.append('.' * width)
    layer = Layer(width, height, C)
    stamp(layer, padded[:height])
    if outline is True:
        layer.outline()
    return layer.image()


ITEMS = {
    'keycard': [
        '................',
        '.......BB.......',
        '.......Bb.......',
        '......ssss......',
        '...wwwssssww....',
        '...wBBBBBBBBw...',
        '...wBcBBBBBBw...',
        '...wWWWWWWWWw...',
        '...wcHcWkkkWw...',
        '...wcHcWWWWWw...',
        '...wbbbWkkWWw...',
        '...wWWWWWWWWw...',
        '...wWyYWWWWWw...',
        '...wWyyWWBBBw...',
        '...wwwwwwwwww...',
    ],
    'potLid': [
        '................',
        '................',
        '......kGGk......',
        '......kssk......',
        '.......gg.......',
        '....wwsssss.....',
        '..wwWwsssssGG...',
        '.swWwsssssssGg..',
        '.swwssssssssGg..',
        'sssssssssssGGgg.',
        'GGGGGGGGGGGGGgg.',
        '.gggggggggggggg.',
        '..kkkkkkkkkkkk..',
    ],
    'buckler': [
        '................',
        '.....gggggg.....',
        '...ggGsssGGgg...',
        '..gGswwsssssGg..',
        '..gswwsssssGGg..',
        '.gGwsssssssssGg.',
        '.gssssGGGGssGGg.',
        '.gsssGsWwGssGGg.',
        '.gsssGswsGssGGg.',
        '.gssssGGGGssGGg.',
        '.gGsssssssssGGg.',
        '..gGssssssGGGg..',
        '..ggGGssssGGgg..',
        '...gggGGGGggg...',
        '.....gggggg.....',
    ],
    'kiteShield': [
        '................',
        '...ssssssssss...',
        '..swUURRUUUUGs..',
        '..sUUURRUUUUug..',
        '..sUUURRUUUuug..',
        '..sRRRRRRRRRRg..',
        '..sUUURRUUUuug..',
        '...sUURRUUUug...',
        '...sUURRUUuug...',
        '....sURRUuug....',
        '....sURRUuug....',
        '.....sRRuug.....',
        '......sRug......',
        '.......gg.......',
    ],
    'towerShield': [
        '....gGGGGGGg....',
        '..gGswssssssGg..',
        '..gwRRRswRRrsg..',
        '..gsRRRswRRrsg..',
        '..gsRRRswRRrsg..',
        '..gsRRRswRRrsg..',
        '..gsRRGGGGRrsg..',
        '..gsRRGWwGRrsg..',
        '..gsRRGwsGRrsg..',
        '..gsRRGGGGRrsg..',
        '..gsRRRswRRrsg..',
        '..gsRRRswRRrsg..',
        '..gsrRRswRrrsg..',
        '..gGssssssssGg..',
        '...gggggggggg...',
    ],
    'aegisShield': [
        '.....Y....Y.....',
        '...yYYYYYYYYy...',
        '..yYBBBBBBBBoy..',
        '..yBBcBBBBBBbo..',
        '..yBcBBWBBBBbo..',
        '..yBBBBcWBBBbo..',
        '..yBBBBBcWBBbo..',
        '..yBBBBcWBBBbo..',
        '..yBBBWBBBBBbo..',
        '...yBBBBBWWBo...',
        '...yBBBBBBBbo...',
        '....yBBBBBbo....',
        '.....yBBBbo.....',
        '......yYoo......',
        '.......o........',
    ],
    'coffeeCup': [
        '.....s...s......',
        '....s...s.......',
        '.....s...s......',
        '....s...s.......',
        '................',
        '...wwwwwwwww....',
        '...wuuuuuuuw....',
        '...WWWWWWWWsss..',
        '...WWWWWWWWs.s..',
        '...WWRRRWWWs.s..',
        '...WWRWRWWWs.s..',
        '...WWWWWWWWsss..',
        '...sWWWWWWss....',
        '....sssssss.....',
    ],
    'runeStaff': [
        '.......cc.......',
        '....u.cWWc.u....',
        '....ucWWBBcu....',
        '.....cWBBBc.....',
        '.....cBBbbc.....',
        '......cbbcU.....',
        '......UuuUu.....',
        '.......UUu......',
        '.......Uu.......',
        '.......Uu.......',
        '.......Uu.......',
        '.......Uu.......',
        '.......Uu.......',
        '.......Uu.......',
        '.......uj.......',
    ],
    'sunStaff': [
        '...Y...Y...Y....',
        '....Y.WWW.Y.....',
        '.....WWWWY......',
        '..YYWWWWWYYY....',
        '.....YWWYY......',
        '....Y.YYy.Y.....',
        '...Y.oYyyo.Y....',
        '.....YoYyo......',
        '.......Yo.......',
        '.......Yo.......',
        '.......Yo.......',
        '......yYyo......',
        '.......Yo.......',
        '.......Yo.......',
        '.......yo.......',
    ],
}

SMALL_ITEMS = {
    'padlock': ([
        '..sss...',
        '.s...s..',
        '.s...s..',
        'YYYYYyy.',
        'YyyXyyo.',
        'YyyXyyo.',
        'yoooooo.',
    ], 8, 8, True),
    'stickyNote': ([
        '.......',
        '.YYYYY.',
        '.YkkYY.',
        '.YYYYY.',
        '.YkkkY.',
        '.YYYy..',
        '.......',
    ], 7, 7, True),
    'invite': ([
        '.........',
        '.RsRRRsR.',
        '.WWWWWWW.',
        '.WkWkWRW.',
        '.WkWkWkW.',
        '.WWWWWWW.',
        '.........',
    ], 9, 7, True),
    'seed': ([
        '.j.',
        'jQj',
        'jju',
        '.u.',
    ], 3, 4, False),
    'mothDust': ([
        '..W..',
        '.zFz.',
        'WFWFW',
        '.zFz.',
        '..W..',
    ], 5, 5, False),
}


def twin_daggers():
    layer = Layer(16, 16, C)
    for mirror in (False, True):
        def put(x, y, key):
            layer.set(15 - x if mirror is True else x, y, key)
        for step in range(8):
            put(2 + step, 1 + step, 'w' if step < 7 else 's')
            put(3 + step, 1 + step, 's')
        put(2, 1, 'W')
        for x, y in ((8, 11), (9, 10), (10, 9), (11, 8), (12, 7)):
            put(x, y, 'y')
        put(9, 11, 'o')
        put(12, 8, 'o')
        for step in range(3):
            put(11 + step, 11 + step, 'u')
            put(12 + step, 11 + step, 'j')
        put(14, 14, 'y')
    layer.outline()
    return layer.image()


def centred(image, width=16, height=16):
    box = image.getbbox()
    if box is None:
        return image
    canvas = image.crop(box)
    result = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    result.alpha_composite(canvas, ((width - canvas.width) // 2, (height - canvas.height) // 2))
    return result


def rect(layer, x0, y0, x1, y1, key):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            layer.set(x, y, key)


def interior_glow(layer, inside, cx, cy, warm):
    bright = 'j' if warm is True else 'g'
    for (x, y) in inside:
        depth = 31 - y
        centre = abs(x + 0.5 - cx)
        checker = (x + y) % 2 == 0
        if depth <= 1 and centre < 3:
            key = bright
        elif depth <= 3 or (depth == 4 and checker is True):
            key = 'k'
        elif depth <= 7 or (depth <= 9 and checker is True):
            key = 'K'
        else:
            key = 'X'
        layer.set(x, y, key)


def arch_door(open_door):
    layer = Layer(24, 32, C)
    cx, cy = 12.0, 12.0

    def in_opening(x, y):
        px, py = x + 0.5, y + 0.5
        if 5 <= x <= 18 and py >= cy:
            return True
        return py < cy and math.hypot(px - cx, py - cy) <= 7

    def in_frame(x, y):
        px, py = x + 0.5, y + 0.5
        if 1 <= x <= 22 and py >= cy:
            return True
        return py < cy and math.hypot(px - cx, py - cy) <= 11

    inside = []
    for y in range(32):
        for x in range(24):
            if in_opening(x, y) is True:
                inside.append((x, y))
            elif in_frame(x, y) is True:
                px, py = x + 0.5, y + 0.5
                if py < cy:
                    angle = math.degrees(math.atan2(cy - py, px - cx))
                    segment = angle / (180 / 7)
                    joint = abs(segment - round(segment)) < 0.09 and 0 < round(segment) < 7
                    ring = math.hypot(px - cx, py - cy)
                    if joint is True:
                        key = 'g'
                    elif 3 <= segment <= 4:
                        key = 's' if ring > 9.6 else 'w'
                    else:
                        key = 's' if ring > 10 or (segment < 3.5 and ring > 8.8) else 'G'
                    layer.set(x, y, key)
                else:
                    column = 0 if x < 12 else 1
                    row_offset = 0 if column == 0 else 2
                    local_y = (y + row_offset) % 5
                    if local_y == 4:
                        key = 'g'
                    elif local_y == 0 or x in (1, 19):
                        key = 's'
                    else:
                        key = 'G'
                    if x in (4, 22) and local_y != 4:
                        key = 'g'
                    layer.set(x, y, key)
    if open_door is True:
        interior_glow(layer, inside, 12, 24, True)
        for (x, y) in inside:
            if x <= 7:
                if x == 7:
                    layer.set(x, y, 'j')
                elif y in (14, 15, 25, 26):
                    layer.set(x, y, 'k')
                else:
                    layer.set(x, y, 'u' if x == 5 else 'U')
        for y in range(11, 32):
            if in_opening(8, y) is True:
                layer.set(8, y, 'O')
    else:
        for (x, y) in inside:
            plank = (x - 5) % 4
            key = 'j' if plank == 3 else 'f' if plank == 0 else 'U'
            if y in (14, 15, 26, 27):
                key = 'k' if y in (15, 27) else 'g'
                if x % 3 == 1 and y in (14, 26):
                    key = 's'
            layer.set(x, y, key)
        for x, y in ((15, 19), (16, 19), (14, 20), (17, 20), (14, 21), (17, 21), (15, 22), (16, 22)):
            layer.set(x, y, 'y')
        layer.set(15, 18, 'k')
        layer.set(16, 18, 'k')
        layer.set(15, 19, 'Y')
        layer.set(7, 20, 'k')
        layer.set(7, 21, 'k')
    for y in range(32):
        for x in range(24):
            if in_opening(x, y) is True and in_opening(x, y - 1) is False and y < 12:
                layer.set(x, y, 'O' if open_door is True else 'j')
    layer.outline()
    return layer.image()


def iron_door(open_door):
    layer = Layer(24, 32, C)
    rect(layer, 1, 2, 18, 31, 'g')
    rect(layer, 2, 3, 17, 31, 'G')
    for y in range(3, 32):
        layer.set(2, y, 's')
    for x in range(2, 18):
        layer.set(x, 3, 's')
    for x, y in ((3, 4), (16, 4), (3, 30), (16, 30), (3, 17), (16, 17)):
        layer.set(x, y, 'w')
    inside = [(x, y) for y in range(6, 32) for x in range(5, 15)]
    if open_door is True:
        interior_glow(layer, inside, 10, 25, False)
        rect(layer, 5, 6, 14, 7, 'g')
        for x in range(5, 15):
            layer.set(x, 7, 'k' if x % 2 == 0 else 'y')
        for x in range(5, 15):
            layer.set(x, 8, 'O')
    else:
        rect(layer, 5, 6, 14, 31, 'G')
        for y in range(6, 32):
            layer.set(5, y, 's')
            layer.set(14, y, 'g')
        for y in (12, 20, 27):
            for x in range(5, 15):
                layer.set(x, y, 'g')
                layer.set(x, y - 1, 's')
        for y in (8, 15, 23, 29):
            for x in (6, 13):
                layer.set(x, y, 'w')
        for y in range(15, 19):
            layer.set(12, y, 'k')
        layer.set(11, 16, 'k')
        layer.set(11, 17, 's')
        for x in range(5, 15):
            if x % 4 < 2:
                layer.set(x, 30, 'y')
                layer.set(x, 31, 'k')
            else:
                layer.set(x, 30, 'k')
                layer.set(x, 31, 'y')
    for y in range(6, 32):
        layer.set(4, y, 'k')
        layer.set(15, y, 'k')
    for x in range(4, 16):
        layer.set(x, 5, 'k')
    rect(layer, 20, 14, 22, 20, 'k')
    for y in range(15, 20):
        layer.set(20, y, 'g')
    layer.set(21, 15, 'L' if open_door is True else 'R')
    layer.set(22, 15, 'N' if open_door is True else 'p')
    layer.set(21, 17, 'X')
    layer.set(21, 18, 'X')
    layer.set(21, 19, 'X')
    layer.outline()
    return layer.image()


BOOK_COLOURS = (('R', 'r'), ('B', 'b'), ('L', 'l'), ('y', 'o'), ('V', 'v'), ('n', 'd'), ('p', 'R'), ('c', 'B'), ('Q', 'u'), ('M', 'v'))


def bookshelf():
    layer = Layer(24, 32, C)
    rect(layer, 1, 1, 22, 31, 'U')
    rect(layer, 1, 1, 22, 2, 'f')
    rect(layer, 3, 3, 20, 30, 'j')
    for x in range(1, 23):
        layer.set(x, 31, 'u')
    for y in range(1, 32):
        layer.set(1, y, 'f')
        layer.set(22, y, 'u')
    shelves = (10, 17, 24, 30)
    top = 3
    for index, shelf in enumerate(shelves):
        rect(layer, 3, shelf, 20, shelf, 'U')
        for x in range(3, 21):
            layer.set(x, top, 'u')
        x = 3
        book = index * 3
        while x <= 19:
            width = 2 if noise(x, shelf, 7) > 0.45 else 1
            height = shelf - top - 1 - (1 if noise(x, shelf, 8) > 0.6 else 0) - (1 if noise(x, shelf, 9) > 0.85 else 0)
            light, dark = BOOK_COLOURS[book % len(BOOK_COLOURS)]
            if index == 1 and x in (15, 16):
                x += 1
                continue
            for column in range(x, min(x + width, 21)):
                for y in range(shelf - height, shelf):
                    layer.set(column, y, light if column == x and width == 2 else dark if width == 2 else light)
            if noise(x, shelf, 11) > 0.55:
                for column in range(x, min(x + width, 21)):
                    layer.set(column, shelf - height + 1, 'y' if light not in ('y', 'Q') else 'W')
            x += width
            book += 1 if noise(x, shelf, 10) > 0.25 else 2
        top = shelf + 1
    for y in range(12, 17):
        layer.set(15, y, 'j')
        layer.set(16, y, 'j')
    for step, (x, y) in enumerate(((15, 16), (15, 15), (16, 14), (16, 13), (17, 12))):
        layer.set(x, y, 'R')
        layer.set(x + 1, y, 'r')
    layer.set(15, 15, 'y')
    for y in range(18, 24):
        layer.set(21, y, 'b')
        layer.set(22, y, 'b')
        layer.set(20, y, 'B')
    layer.set(23, 18, 'B')
    layer.set(21, 19, 'y')
    layer.set(22, 19, 'y')
    layer.outline()
    return layer.image()


def desk():
    layer = Layer(32, 20, C)
    rect(layer, 0, 10, 31, 11, 'q')
    for x in range(0, 32):
        layer.set(x, 10, 'F')
        layer.set(x, 12, 'Q')
    rect(layer, 1, 12, 9, 19, 'Q')
    for y in range(12, 20):
        layer.set(1, y, 'q')
        layer.set(9, y, 'u')
    for y in (15, 18):
        rect(layer, 2, y, 8, y, 'u')
    layer.set(5, 14, 'y')
    layer.set(5, 17, 'y')
    rect(layer, 28, 12, 30, 19, 'Q')
    for y in range(12, 20):
        layer.set(30, y, 'u')
    rect(layer, 10, 0, 22, 7, 'k')
    rect(layer, 11, 1, 21, 6, 'B')
    for x in range(11, 22):
        layer.set(x, 1, 'c')
    for x, y in ((13, 3), (13, 5), (16, 3), (17, 3), (15, 4), (16, 5), (18, 5)):
        layer.set(x, y, 'W')
    layer.set(15, 4, 'B')
    for x, y in ((14, 3), (14, 5), (16, 4), (17, 4), (18, 4), (15, 5), (19, 5), (19, 3)):
        layer.set(x, y, 'B')
    rect(layer, 15, 8, 17, 8, 'g')
    rect(layer, 13, 9, 19, 9, 'k')
    rect(layer, 3, 8, 11, 9, 's')
    for x in range(3, 12, 2):
        layer.set(x, 8, 'w')
    for x in range(3, 12):
        layer.set(x, 9, 'g')
    rect(layer, 24, 5, 27, 9, 'W')
    for y in range(5, 10):
        layer.set(27, y, 's')
    layer.set(28, 6, 's')
    layer.set(28, 7, 's')
    layer.set(28, 8, 's')
    for x in range(24, 28):
        layer.set(x, 5, 'u')
    layer.set(25, 7, 'R')
    layer.outline()
    return layer.image()


def office_chair():
    layer = Layer(12, 16, C)
    rect(layer, 3, 1, 8, 7, 'k')
    for y in range(1, 8):
        layer.set(3, y, 'g')
        layer.set(8, y, 'K')
    for x in range(3, 9):
        layer.set(x, 1, 'g')
    rect(layer, 1, 8, 10, 9, 'k')
    for x in range(1, 11):
        layer.set(x, 8, 'g')
    rect(layer, 1, 6, 1, 8, 'K')
    rect(layer, 10, 6, 10, 8, 'K')
    rect(layer, 5, 10, 6, 12, 'G')
    layer.set(6, 11, 'g')
    rect(layer, 2, 13, 9, 13, 'g')
    for x in (1, 5, 6, 10):
        layer.set(x, 14, 'X')
    layer.set(2, 14, 'X')
    layer.set(9, 14, 'X')
    layer.outline()
    return layer.image()


def plant():
    layer = Layer(12, 20, C)
    leaves = ((6, 13, 1.5, 4, -35), (6, 13, 5, 0, -8), (6, 13, 9.5, 1, 22), (6, 13, 0.5, 8, -62), (6, 13, 11, 7, 55), (6, 13, 7.5, 5, 10))
    for base_x, base_y, tip_x, tip_y, lean in leaves:
        length = math.hypot(tip_x - base_x, tip_y - base_y)
        for y in range(20):
            for x in range(12):
                px, py = x + 0.5, y + 0.5
                along = ((px - base_x) * (tip_x - base_x) + (py - base_y) * (tip_y - base_y)) / (length * length)
                if not 0 <= along <= 1:
                    continue
                cx = base_x + (tip_x - base_x) * along
                cy = base_y + (tip_y - base_y) * along
                distance = math.hypot(px - cx, py - cy)
                width = 1.9 * math.sin(math.pi * min(1.0, along * 1.15)) + 0.2
                if distance <= width:
                    side = (px - cx) * (tip_y - base_y) - (py - cy) * (tip_x - base_x)
                    layer.set(x, y, 'l' if distance < 0.5 else 'L' if side < 0 else 'n')
    rect(layer, 3, 13, 8, 19, 'U')
    rect(layer, 2, 13, 9, 14, 'f')
    for x in range(2, 10):
        layer.set(x, 14, 'U')
    for y in range(15, 20):
        layer.set(8, y, 'u')
        layer.set(3, y, 'f')
    for x in range(4, 8):
        layer.set(x, 13, 'j')
    layer.outline()
    return layer.image()


def water_cooler():
    layer = Layer(12, 24, C)
    ellipse(layer, 5.5, 4.5, 3.6, 4.2, lambda dx, dy, x, y: 'W' if dx < -0.3 and dy < -0.1 else 'B' if dx > 0.45 else 'c')
    for x in range(3, 9):
        layer.set(x, 2, 'B')
        layer.set(x, 6, 'B')
    layer.set(3, 3, 'W')
    rect(layer, 4, 8, 7, 9, 'B')
    rect(layer, 2, 10, 9, 23, 'w')
    for y in range(10, 24):
        layer.set(9, y, 's')
        layer.set(2, y, 'W')
    for x in range(2, 10):
        layer.set(x, 10, 'W')
    rect(layer, 3, 12, 8, 17, 's')
    rect(layer, 3, 12, 8, 12, 'g')
    layer.set(4, 13, 'R')
    layer.set(7, 13, 'B')
    layer.set(4, 14, 'g')
    layer.set(7, 14, 'g')
    rect(layer, 3, 17, 8, 17, 'G')
    for y in range(19, 23):
        layer.set(5, y, 's')
    rect(layer, 2, 23, 9, 23, 'G')
    layer.outline()
    return layer.image()


def whiteboard():
    layer = Layer(32, 20, C)
    rect(layer, 0, 0, 31, 16, 's')
    rect(layer, 1, 1, 30, 15, 'W')
    for x in range(1, 31):
        layer.set(x, 15, 'w')
    for y in range(1, 16):
        layer.set(30, y, 'w')
    for y in range(2, 15):
        layer.set(3, y, 'k')
    for x in range(3, 29):
        layer.set(x, 14, 'k')
    points = ((4, 4), (7, 6), (9, 5), (12, 8), (14, 7), (17, 10), (19, 9), (23, 12), (25, 12))
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        layer.line(x0, y0, x1, y1, 'b')
    for x, y in ((24, 11), (25, 11), (24, 13), (25, 13)):
        layer.set(x, y, 'b')
    for angle in range(0, 360, 20):
        radians = math.radians(angle)
        layer.set(round(24.5 + 3.2 * math.cos(radians)), round(12 + 2.4 * math.sin(radians)), 'R')
    for x in range(6, 13):
        layer.set(x, 2, 'g')
    layer.set(14, 2, 'g')
    layer.set(15, 2, 'g')
    rect(layer, 2, 17, 29, 17, 'G')
    for x in range(2, 30):
        layer.set(x, 18, 'g')
    rect(layer, 6, 16, 8, 16, 'R')
    rect(layer, 10, 16, 12, 16, 'B')
    rect(layer, 22, 16, 25, 16, 'w')
    layer.outline()
    return layer.image()


def window_night():
    layer = Layer(24, 20, C)
    rect(layer, 0, 0, 23, 19, 's')
    for y in range(1, 19):
        for x in range(1, 23):
            layer.set(x, y, 'K' if y < 9 else 'b' if y > 13 else 'k')
    for x, y in ((18, 3), (19, 3), (18, 4), (19, 4), (20, 3)):
        layer.set(x, y, 'w')
    layer.set(20, 4, 'K')
    for x, y in ((4, 2), (9, 5), (14, 2), (6, 7), (12, 8)):
        layer.set(x, y, 'G')
    buildings = ((1, 12), (3, 9), (6, 13), (8, 7), (11, 11), (13, 8), (16, 12), (18, 10), (21, 13))
    for index, (x0, top) in enumerate(buildings):
        x1 = buildings[index + 1][0] - 1 if index + 1 < len(buildings) else 22
        rect(layer, x0, top, x1, 18, 'X')
        for y in range(top + 1, 18, 2):
            for x in range(x0, x1 + 1):
                if noise(x, y, 51) > 0.72:
                    layer.set(x, y, 'Y' if noise(x, y, 52) > 0.5 else 'y')
    for y in range(1, 19):
        layer.set(11, y, 'G')
        layer.set(12, y, 's')
    for x in range(1, 23):
        layer.set(x, 10, 'G')
    for x in range(0, 24):
        layer.set(x, 19, 'G')
    layer.outline()
    return layer.image()


def server_rack():
    layer = Layer(20, 40, C)
    rect(layer, 0, 0, 19, 38, 'X')
    rect(layer, 1, 1, 18, 37, 'K')
    for x in range(0, 20):
        layer.set(x, 0, 'k')
    for y in range(0, 39):
        layer.set(0, y, 'k')
    for unit in range(8):
        top = 2 + unit * 4 + (1 if unit >= 4 else 0)
        rect(layer, 2, top, 17, top + 2, 'k')
        for x in range(2, 18):
            layer.set(x, top, 'g')
        for x in range(4, 13):
            if x % 2 == 0:
                layer.set(x, top + 1, 'X')
                layer.set(x, top + 2, 'X')
        layer.set(15, top + 1, 'L' if unit % 3 != 1 else 'y')
        layer.set(16, top + 1, 'N' if unit % 2 == 0 else 'R')
        layer.set(3, top + 1, 's')
    rect(layer, 2, 19, 17, 19, 'X')
    rect(layer, 1, 39, 3, 39, 'X')
    rect(layer, 16, 39, 18, 39, 'X')
    layer.outline()
    return layer.image()


SNACKS = (('R', 'r'), ('y', 'o'), ('L', 'l'), ('B', 'b'), ('M', 'v'), ('W', 's'))


def vending_machine():
    layer = Layer(20, 36, C)
    rect(layer, 0, 0, 19, 35, 'R')
    for y in range(0, 36):
        layer.set(0, y, 'p')
        layer.set(19, y, 'r')
    for x in range(0, 20):
        layer.set(x, 0, 'p')
    rect(layer, 2, 2, 13, 26, 'K')
    for row in range(5):
        shelf = 6 + row * 5
        for x in range(2, 14):
            layer.set(x, shelf, 'g')
        for column in range(3):
            light, dark = SNACKS[(row * 3 + column) % len(SNACKS)]
            x0 = 3 + column * 4
            rect(layer, x0, shelf - 3, x0 + 1, shelf - 1, light)
            layer.set(x0 + 1, shelf - 1, dark)
            layer.set(x0 + 1, shelf - 3, dark)
    for y in range(2, 27):
        layer.set(2, y, 'k')
    layer.set(3, 3, 'w')
    layer.set(4, 4, 'w')
    rect(layer, 15, 3, 18, 5, 'X')
    layer.set(16, 4, 'L')
    layer.set(17, 4, 'N')
    for y in range(8, 18, 2):
        layer.set(15, y, 'w')
        layer.set(17, y, 'w')
    rect(layer, 16, 20, 17, 23, 'X')
    layer.set(16, 21, 'y')
    rect(layer, 3, 29, 12, 32, 'X')
    for x in range(3, 13):
        layer.set(x, 29, 'r')
    rect(layer, 1, 34, 18, 35, 'r')
    layer.outline()
    return layer.image()


def coffee_machine():
    layer = Layer(16, 20, C)
    rect(layer, 1, 0, 14, 19, 'k')
    for y in range(0, 20):
        layer.set(1, y, 'g')
        layer.set(14, y, 'K')
    for x in range(1, 15):
        layer.set(x, 0, 'g')
    rect(layer, 3, 2, 8, 4, 'X')
    layer.set(4, 3, 'N')
    layer.set(5, 3, 'N')
    layer.set(12, 3, 'R')
    layer.set(10, 3, 's')
    rect(layer, 3, 7, 12, 16, 'X')
    rect(layer, 6, 7, 9, 8, 'G')
    layer.set(7, 9, 'u')
    layer.set(7, 10, 'u')
    rect(layer, 5, 12, 9, 16, 'W')
    for y in range(12, 17):
        layer.set(9, y, 's')
    layer.set(10, 13, 's')
    layer.set(10, 14, 's')
    for x in range(5, 9):
        layer.set(x, 12, 'u')
    rect(layer, 2, 17, 13, 17, 'G')
    for x in range(3, 13, 2):
        layer.set(x, 17, 'g')
    layer.outline()
    return layer.image()


def motiv_poster():
    layer = Layer(20, 26, C)
    rect(layer, 0, 0, 19, 25, 'X')
    rect(layer, 2, 2, 17, 17, 'b')
    for y in range(2, 18):
        for x in range(2, 18):
            if y < 6:
                layer.set(x, y, 'B' if (x + y) % 2 == 0 and y == 5 else 'b')
            elif y < 10:
                layer.set(x, y, 'B')
            else:
                layer.set(x, y, 'c' if y < 12 else 'B')
    peak = [(2, 16), (6, 10), (8, 12), (11, 6), (14, 11), (17, 9), (17, 17), (2, 17)]
    layer.poly(peak, 'G')
    for y in range(6, 18):
        for x in range(2, 18):
            if layer.pixels.get((x, y)) == 'G' and x > 11 + (y - 6) * 0.2:
                layer.set(x, y, 'g')
    for x, y in ((11, 6), (10, 7), (11, 7), (12, 7), (9, 8), (10, 8), (12, 8), (13, 9)):
        layer.set(x, y, 'W')
    layer.set(6, 10, 'W')
    layer.set(6, 11, 's')
    rect(layer, 2, 16, 17, 17, 'g')
    for x, y in ((14, 4), (15, 4), (16, 5)):
        layer.set(x, y, 'Y')
    draw_text(layer, 'TEAM', (20 - text_width('TEAM')) // 2, 19, 'W')
    layer.outline()
    return layer.image()


def manager_desk():
    layer = Layer(40, 22, C)
    rect(layer, 0, 10, 39, 12, 'U')
    for x in range(0, 40):
        layer.set(x, 10, 'f')
        layer.set(x, 12, 'u')
    rect(layer, 1, 13, 38, 21, 'u')
    for y in range(13, 22):
        layer.set(1, y, 'U')
        layer.set(38, y, 'j')
    for y in range(13, 22):
        layer.set(13, y, 'j')
        layer.set(26, y, 'j')
    for y in (16, 19):
        for x in list(range(2, 13)) + list(range(27, 38)):
            layer.set(x, y, 'j')
    for x, y in ((7, 14), (7, 17), (7, 20), (32, 14), (32, 17), (32, 20)):
        layer.set(x, y, 'y')
    rect(layer, 16, 14, 23, 18, 'j')
    rect(layer, 17, 15, 22, 17, 'U')
    rect(layer, 14, 7, 25, 9, 'y')
    for x in range(14, 26):
        layer.set(x, 7, 'Y')
        layer.set(x, 9, 'o')
    for x in range(16, 24):
        if x not in (19, 20):
            layer.set(x, 8, 'j')
    rect(layer, 29, 7, 35, 9, 'X')
    rect(layer, 29, 5, 35, 5, 'k')
    layer.set(29, 6, 'k')
    layer.set(35, 6, 'k')
    for x in (31, 33):
        layer.set(x, 8, 'g')
    layer.set(32, 8, 'R')
    rect(layer, 3, 8, 10, 9, 'W')
    rect(layer, 4, 7, 10, 7, 'w')
    for x in range(4, 10, 2):
        layer.set(x, 9, 's')
    layer.outline()
    return layer.image()


def relay_panel():
    layer = Layer(24, 40, C)
    rect(layer, 0, 0, 23, 37, 'G')
    for y in range(0, 38):
        layer.set(0, y, 's')
        layer.set(23, y, 'g')
    for x in range(0, 24):
        layer.set(x, 0, 's')
    rect(layer, 2, 2, 21, 9, 'g')
    for index, x in enumerate((4, 9, 14, 19)):
        rect(layer, x - 1, 3, x, 7, 'k')
        layer.set(x - 1, 4, 'o')
        layer.set(x, 4, 'y')
        layer.set(x - 1, 5, 'Y' if index % 2 == 0 else 'y')
        layer.set(x, 5, 'o')
        layer.set(x - 1, 3, 's')
        layer.set(x, 3, 's')
        layer.set(x - 1, 8, 'X')
        layer.set(x, 8, 'X')
    for row in range(4):
        y = 12 + row * 4
        for column in range(5):
            x = 2 + column * 4
            rect(layer, x, y, x + 2, y + 2, 'k')
            layer.set(x, y, 'g')
            layer.set(x + 1, y + 1, 'y' if (row + column) % 3 == 0 else 's')
            layer.set(x + 2, y + 2, 'X')
    for cx in (6, 17):
        ellipse(layer, cx + 0.5, 31.5, 2.6, 2.6, lambda dx, dy, x, y: 'W' if dx + dy < -0.8 else 'w')
        layer.set(cx, 31, 'X')
        layer.set(cx + 1, 30, 'R')
    rect(layer, 10, 29, 13, 34, 'k')
    layer.set(11, 30, 'o')
    layer.set(12, 32, 'y')
    rect(layer, 1, 38, 3, 39, 'k')
    rect(layer, 20, 38, 22, 39, 'k')
    layer.outline()
    return layer.image()


def light_bulb():
    layer = Layer(10, 22, C)
    for y in range(0, 11):
        layer.set(4, y, 'k')
    rect(layer, 3, 11, 5, 13, 'g')
    layer.set(3, 11, 'G')
    layer.set(3, 12, 's')
    layer.set(5, 13, 'k')
    rect(layer, 3, 14, 5, 14, 'y')
    ellipse(layer, 4.5, 17.5, 3.4, 3.6, lambda dx, dy, x, y: 'W' if dx * dx + dy * dy < 0.2 else 'Y' if dx + dy < 0.6 else 'y')
    layer.set(3, 16, 'W')
    layer.set(4, 18, 'o')
    layer.set(5, 18, 'o')
    layer.outline()
    return layer.image()


def cobweb():
    layer = Layer(16, 16, C)
    angles = (0, 22, 45, 68, 90)
    for angle in angles:
        radians = math.radians(angle)
        layer.line(0, 0, round(15 * math.cos(radians)), round(15 * math.sin(radians)), 's')
    for radius in (4, 8, 12):
        for first, second in zip(angles, angles[1:]):
            for step in range(9):
                t = step / 8
                angle = math.radians(first + (second - first) * t)
                sag = radius - 0.9 * math.sin(math.pi * t) * radius / 6
                layer.set(round(sag * math.cos(angle)), round(sag * math.sin(angle)), 'G' if radius == 12 else 's')
    layer.set(0, 0, 'w')
    layer.set(1, 1, 'w')
    return layer.image()


def chains():
    layer = Layer(8, 24, C)
    rect(layer, 1, 0, 6, 2, 'g')
    rect(layer, 2, 0, 5, 1, 'G')
    layer.set(3, 1, 'k')
    y = 3
    link = 0
    while y < 17:
        if link % 2 == 0:
            for dy, row in enumerate(('.GG.', 'G..g', 'G..g', '.gg.')):
                for dx, key in enumerate(row):
                    if key != '.':
                        layer.set(2 + dx, y + dy, key)
            y += 3
        else:
            for dy in range(3):
                layer.set(3, y + dy, 's' if dy == 0 else 'G')
                layer.set(4, y + dy, 'g')
            y += 2
        link += 1
    for dy, row in enumerate(('..GGGG..', '.G....g.', 'G......g', 'G......g', 'G......g', '.g....g.', '..gggg..')):
        for dx, key in enumerate(row):
            if key != '.':
                layer.set(dx, 17 + dy, key)
    layer.set(1, 18, 's')
    layer.outline()
    return layer.image()


def bones():
    layer = Layer(16, 8, C)
    for x0, y0, x1, y1 in ((1, 6, 8, 4), (6, 7, 14, 6), (9, 4, 14, 2)):
        layer.line(x0, y0, x1, y1, 'w')
        for x, y in ((x0, y0), (x1, y1)):
            layer.set(x, y - 1, 'W')
            layer.set(x, y + 1, 's')
    ellipse(layer, 5.5, 3.5, 3.2, 2.8, lambda dx, dy, x, y: 'W' if dx + dy < -0.5 else 's' if dx + dy > 0.6 else 'w')
    rect(layer, 4, 6, 7, 6, 's')
    layer.set(4, 3, 'X')
    layer.set(4, 4, 'X')
    layer.set(6, 3, 'X')
    layer.set(6, 4, 'X')
    layer.set(5, 5, 'G')
    layer.set(5, 6, 'G')
    layer.set(7, 6, 'G')
    layer.outline()
    return layer.image()


def brazier():
    layer = Layer(12, 16, C)
    rect(layer, 1, 5, 10, 5, 'g')
    rect(layer, 1, 6, 10, 7, 'k')
    rect(layer, 2, 8, 9, 8, 'k')
    rect(layer, 3, 9, 8, 9, 'K')
    for x in range(1, 11):
        layer.set(x, 5, 'G')
    for x in range(1, 11, 3):
        layer.set(x, 6, 's')
    for x, key in zip(range(2, 10), 'roXRorXo'):
        layer.set(x, 4, key)
    for x, key in zip(range(3, 9), 'XroRrX'):
        layer.set(x, 3, key)
    rect(layer, 5, 10, 6, 12, 'k')
    layer.set(5, 10, 'g')
    for x0, x1 in ((4, 1), (7, 10)):
        layer.line(x0, 12, x1, 15, 'k')
    layer.line(5, 13, 5, 15, 'K')
    layer.line(6, 13, 6, 15, 'K')
    layer.outline()
    return layer.image()


def neon_break():
    layer = Layer(28, 10, C)
    rect(layer, 0, 0, 27, 9, 'X')
    for x in range(1, 27):
        layer.set(x, 1, 'c')
        layer.set(x, 8, 'c')
    for y in range(1, 9):
        layer.set(1, y, 'c')
        layer.set(26, y, 'c')
    letters = Layer(28, 10, C)
    draw_text(letters, 'BREAK', (28 - text_width('BREAK')) // 2, 3, 'm')
    for (x, y) in letters.pixels:
        layer.set(x, y, 'W' if y == 3 else 'm')
    for x in range(3, 25):
        if (x, 7) not in letters.pixels:
            layer.set(x, 7, 'K')
    layer.set(4, 0, 'g')
    layer.set(23, 0, 'g')
    return layer.image()


def cocoon():
    layer = Layer(12, 20, C)
    for y in range(0, 5):
        layer.set(6, y, 's')
    layer.set(5, 0, 'G')
    layer.set(7, 0, 'G')
    for y in range(4, 20):
        progress = (y - 4) / 15
        half = 3.6 * math.sin(math.pi * min(1.0, 0.12 + progress * 0.88)) + 0.4
        for x in range(12):
            offset = x + 0.5 - 6.3
            if abs(offset) <= half:
                wrap = (y + int(offset * 0.8)) % 3 == 0
                key = 'W' if offset < -half + 1.2 else 'q' if offset > half - 1.2 else 'z'
                if wrap is True and abs(offset) < half - 0.6:
                    key = 'q' if key == 'z' else 'Q'
                layer.set(x, y, key)
    layer.outline()
    return layer.image()


SKELETON = [
    '.W......wwww....',
    '.wsg...wWWWWw...',
    '..wsg..XXwXXw...',
    '...wsg.XXwXXs...',
    '....wsg.wsws....',
    '....ywsgsXsX....',
    '.....yyjw.ww....',
    '.....y.UwwswsG..',
    '........wwwwwsG.',
    '........swsw..G.',
    '.........www..s.',
    '..........w.....',
    '.........w.w....',
    '........w...s...',
    '........w...s...',
    '.......ww..sss..',
]


def skeleton():
    layer = Layer(16, 16, C)
    stamp(layer, SKELETON)
    for (x, y), key in list(layer.pixels.items()):
        if key in ('s', 'w', 'g') and x + 2 < y + 4 and x < 7 and y < 6 and noise(x, y, 61) > 0.5:
            layer.set(x, y, 'Q' if key != 'g' else 'u')
    layer.outline()
    return layer.image()


def file_cabinet():
    layer = Layer(14, 26, C)
    rect(layer, 1, 0, 12, 25, 'G')
    for y in range(0, 26):
        layer.set(1, y, 's')
        layer.set(12, y, 'g')
    rect(layer, 1, 0, 12, 0, 's')
    for index, top in enumerate((1, 7, 13, 19)):
        if index == 1:
            rect(layer, 2, top, 11, top + 1, 'X')
            for x, key in ((3, 'W'), (4, 'W'), (6, 'y'), (7, 'y'), (9, 'c'), (10, 'W')):
                layer.set(x, top, key)
            rect(layer, 1, top + 2, 12, top + 6, 's')
            rect(layer, 1, top + 6, 12, top + 6, 'g')
            rect(layer, 5, top + 3, 8, top + 3, 'W')
            rect(layer, 5, top + 5, 8, top + 5, 'k')
            continue
        rect(layer, 2, top, 11, top + 4, 'G')
        rect(layer, 2, top, 11, top, 's')
        rect(layer, 2, top + 5, 11, top + 5, 'k')
        rect(layer, 5, top + 1, 8, top + 1, 'W')
        rect(layer, 5, top + 3, 8, top + 3, 'k')
        rect(layer, 5, top + 2, 8, top + 2, 'g')
    rect(layer, 2, 25, 3, 25, 'k')
    rect(layer, 10, 25, 11, 25, 'k')
    layer.outline()
    return layer.image()


def scroll_rack():
    layer = Layer(18, 24, C)
    rect(layer, 0, 0, 17, 23, 'U')
    for y in range(0, 24):
        layer.set(0, y, 'f')
        layer.set(17, y, 'u')
    columns = ((1, 7), (9, 16))
    rows = ((1, 5), (7, 11), (13, 17), (19, 22))
    for row_index, (y0, y1) in enumerate(rows):
        for column_index, (x0, x1) in enumerate(columns):
            rect(layer, x0, y0, x1, y1, 'j')
            rect(layer, x0, y0, x1, y0, 'X')
            count = 2 if (row_index + column_index) % 3 else 1
            for index in range(count):
                y = y1 - 1 - index * 2
                shift = 1 if (row_index * 2 + column_index + index) % 2 == 0 else 0
                start_x, end_x = x0 + shift, x1 - 1 + shift
                for x in range(start_x, end_x + 1):
                    layer.set(x, y, 'W' if x < end_x else 'q')
                    layer.set(x, y + 1, 'z' if x < end_x else 'Q')
                layer.set(end_x, y, 'z')
                if (row_index + index) % 2 == 0:
                    middle = (start_x + end_x) // 2
                    layer.set(middle, y, 'R')
                    layer.set(middle, y + 1, 'r')
    layer.set(8, 1, 'U')
    for y in range(1, 23):
        layer.set(8, y, 'U')
    for y in (6, 12, 18):
        rect(layer, 1, y, 16, y, 'f')
    layer.outline()
    return layer.image()


def reading_desk():
    layer = Layer(24, 16, C)
    rect(layer, 0, 8, 23, 9, 'U')
    rect(layer, 0, 8, 23, 8, 'f')
    rect(layer, 1, 10, 2, 15, 'u')
    rect(layer, 21, 10, 22, 15, 'u')
    rect(layer, 7, 10, 16, 12, 'u')
    rect(layer, 7, 10, 16, 10, 'j')
    layer.set(11, 11, 'y')
    layer.set(12, 11, 'y')
    rect(layer, 3, 7, 14, 7, 'r')
    rect(layer, 3, 4, 8, 6, 'W')
    rect(layer, 9, 4, 14, 6, 'w')
    for x in range(4, 8):
        layer.set(x, 3, 'W')
    for x in range(10, 14):
        layer.set(x, 3, 'w')
    layer.set(8, 4, 's')
    layer.set(9, 4, 's')
    for x in (4, 5, 6, 10, 11, 12, 13):
        layer.set(x, 5, 'G')
    for x in (4, 5, 10, 11, 12):
        layer.set(x, 6, 's')
    rect(layer, 18, 4, 19, 6, 'W')
    layer.set(19, 5, 's')
    layer.set(19, 6, 's')
    layer.set(17, 5, 'w')
    rect(layer, 17, 7, 20, 7, 'y')
    layer.set(18, 3, 'X')
    layer.set(18, 2, 'o')
    layer.set(18, 1, 'Y')
    layer.set(19, 2, 'Y')
    layer.set(18, 0, 'W')
    layer.outline()
    return layer.image()


def globe():
    layer = Layer(12, 18, C)
    rect(layer, 5, 12, 6, 15, 'u')
    layer.set(5, 12, 'U')
    rect(layer, 2, 16, 9, 17, 'u')
    rect(layer, 2, 16, 9, 16, 'U')
    for angle in range(-80, 260, 8):
        radians = math.radians(angle)
        layer.set(round(5.3 + 5.5 * math.cos(radians)), round(6.5 - 5.5 * math.sin(radians)), 'y')

    def sphere(dx, dy, x, y):
        land = noise(x // 2, y // 2, 81) > 0.55 or (x, y) in ((4, 4), (5, 4), (4, 5), (7, 7), (7, 8), (6, 8))
        shade = dx + dy > 0.7
        if dx + dy < -0.9:
            return 'c'
        if land is True:
            return 'l' if shade is True else 'L'
        return 'b' if shade is True else 'B'

    ellipse(layer, 5.5, 6.5, 4.6, 4.6, sphere)
    layer.set(4, 3, 'W')
    layer.set(5, 1, 'y')
    layer.set(5, 0, 'Y')
    layer.outline()
    return layer.image()


def paper_pile():
    layer = Layer(14, 8, C)
    for index, y in enumerate(range(3, 8)):
        shift = (0, 1, 0, -1, 1)[index]
        rect(layer, 1 + shift, y, 11 + shift, y, 'W' if index % 2 == 0 else 's')
    rect(layer, 2, 2, 10, 2, 'W')
    for x in range(3, 9, 2):
        layer.set(x, 3, 'G')
    layer.line(8, 1, 13, 4, 'w')
    layer.line(8, 2, 13, 5, 'W')
    layer.set(13, 7, 'W')
    layer.set(12, 7, 'w')
    layer.set(0, 7, 'w')
    layer.set(4, 2, 'R')
    layer.outline()
    return layer.image()


def wall_clock():
    layer = Layer(10, 10, C)
    ellipse(layer, 5.0, 5.0, 3.95, 3.95, lambda dx, dy, x, y: 'k' if dx * dx + dy * dy > 0.62 else 'W')
    for x, y in ((5, 2), (7, 5), (5, 7), (2, 5)):
        layer.set(x, y, 'G')
    layer.set(5, 3, 'X')
    layer.set(5, 4, 'X')
    layer.set(5, 5, 'X')
    layer.set(6, 5, 'X')
    layer.set(4, 6, 'R')
    layer.set(3, 3, 'w')
    layer.outline()
    return layer.image()


def printer():
    layer = Layer(16, 14, C)
    rect(layer, 4, 0, 11, 2, 'W')
    for x in range(5, 11):
        layer.set(x, 1, 'G' if x % 2 == 0 else 'W')
    rect(layer, 1, 3, 14, 8, 'w')
    rect(layer, 1, 3, 14, 3, 'W')
    for y in range(3, 9):
        layer.set(14, y, 's')
    rect(layer, 1, 8, 14, 8, 'G')
    rect(layer, 3, 6, 12, 6, 'k')
    rect(layer, 2, 7, 13, 7, 'W')
    rect(layer, 10, 4, 12, 4, 'K')
    layer.set(13, 4, 'L')
    rect(layer, 3, 9, 12, 13, 'k')
    rect(layer, 3, 9, 12, 9, 'g')
    rect(layer, 5, 11, 10, 11, 'g')
    layer.outline()
    return layer.image()


def coat_rack():
    layer = Layer(10, 28, C)
    rect(layer, 4, 2, 5, 25, 'u')
    for y in range(2, 26):
        layer.set(4, y, 'U')
    rect(layer, 4, 0, 5, 1, 'U')
    layer.set(4, 0, 'f')
    for x, y in ((3, 3), (2, 2), (6, 3), (7, 2)):
        layer.set(x, y, 'u')
    layer.line(4, 25, 1, 27, 'u')
    layer.line(5, 25, 8, 27, 'u')
    rect(layer, 4, 26, 5, 27, 'j')
    coat = {4: (2, 4), 5: (1, 4), 6: (0, 4), 7: (0, 4), 8: (0, 4), 9: (0, 4), 10: (0, 4), 11: (0, 4), 12: (0, 4), 13: (0, 4), 14: (0, 4), 15: (0, 4), 16: (0, 4), 17: (0, 4)}
    for y, (x0, x1) in coat.items():
        for x in range(x0, x1 + 1):
            layer.set(x, y, 'k' if x == x1 or x == x0 and y > 6 else 'b')
    for x, y in ((2, 5), (3, 6), (3, 7), (4, 5)):
        layer.set(x, y, 'B')
    rect(layer, 0, 11, 4, 11, 'K')
    for y in (8, 13, 16):
        layer.set(3, y, 'y')
    layer.set(1, 17, 'k')
    for y in range(4, 16):
        layer.set(6, y, 'R' if y % 3 else 'W')
        layer.set(7, y, 'r' if y % 3 else 's')
    for x, y in ((6, 16), (7, 16)):
        layer.set(x, y, 'R')
    layer.set(6, 17, 'r')
    layer.set(7, 17, 'R')
    layer.outline()
    return layer.image()


MEETING_FACES = (('b', 'H', 'u'), ('n', 'f', 'X'), ('v', 'e', 'y'), ('U', 'Q', 'X'), ('k', 'H', 'G'), ('B', 'f', 'j'))


def meeting_screen():
    layer = Layer(30, 18, C)
    rect(layer, 0, 1, 29, 16, 'X')
    rect(layer, 1, 2, 28, 15, 'K')
    layer.set(14, 0, 'k')
    layer.set(15, 0, 'k')
    layer.set(14, 1, 'g')
    for index, (background, skin, hair) in enumerate(MEETING_FACES):
        column, row = index % 3, index // 3
        x0, y0 = 2 + column * 9, 3 + row * 6
        rect(layer, x0, y0, x0 + 7, y0 + 4, background)
        cx = x0 + 3
        rect(layer, cx, y0 + 1, cx + 1, y0 + 2, skin)
        layer.set(cx, y0 + 1, hair)
        layer.set(cx + 1, y0 + 1, hair)
        rect(layer, cx - 1, y0 + 4, cx + 2, y0 + 4, 'w' if background != 'k' else 'g')
        layer.set(cx, y0 + 3, skin)
        layer.set(cx + 1, y0 + 3, skin)
        if index == 4:
            rect(layer, x0, y0, x0 + 7, y0, 'L')
    rect(layer, 13, 15, 16, 15, 'R')
    rect(layer, 9, 17, 20, 17, 'k')
    layer.outline()
    return layer.image()


def wall_calendar():
    layer = Layer(12, 14, C)
    rect(layer, 1, 2, 10, 13, 'W')
    for y in range(2, 14):
        layer.set(10, y, 'w')
    rect(layer, 1, 2, 10, 4, 'R')
    rect(layer, 1, 4, 10, 4, 'r')
    layer.set(3, 1, 's')
    layer.set(8, 1, 's')
    layer.set(3, 2, 'g')
    layer.set(8, 2, 'g')
    for y in range(6, 13, 2):
        for x in range(2, 10, 2):
            layer.set(x, y, 'G')
    for x, y in ((6, 7), (7, 7), (8, 7), (5, 8), (9, 8), (6, 9), (7, 9), (8, 9)):
        layer.set(x, y, 'R')
    layer.set(7, 8, 'X')
    layer.set(10, 13, 's')
    layer.set(9, 13, 's')
    layer.outline()
    return layer.image()


def server_rack_open():
    layer = Layer(20, 40, C)
    rect(layer, 3, 0, 19, 38, 'X')
    rect(layer, 4, 1, 18, 37, 'K')
    for y in range(0, 39):
        layer.set(3, y, 'k')
    for y in range(1, 39):
        for x in range(0, 3):
            layer.set(x, y, 'g' if (x + y) % 2 == 0 else 'k')
        layer.set(2, y, 'G')
    rect(layer, 0, 1, 2, 1, 'G')
    rect(layer, 0, 38, 2, 38, 'G')
    for unit in range(7):
        top = 2 + unit * 5
        rect(layer, 5, top, 17, top + 2, 'k')
        rect(layer, 5, top, 17, top, 'g')
        for x in range(7, 15, 2):
            layer.set(x, top + 1, 'X')
        layer.set(16, top + 1, 'L' if unit % 2 == 0 else 'R')
        layer.set(15, top + 1, 'y' if unit % 3 == 0 else 'N')
    cables = (((7, 6), (6, 12), (8, 20), (7, 27)), ((10, 11), (11, 18), (9, 24)), ((13, 16), (15, 22), (14, 30), (16, 36)), ((8, 21), (6, 28), (9, 34), (8, 38)), ((15, 1), (17, 8), (16, 14)))
    for path, key in zip(cables, ('B', 'y', 'L', 'R', 'c')):
        for (x0, y0), (x1, y1) in zip(path, path[1:]):
            layer.line(x0, y0, x1, y1, key)
    rect(layer, 4, 39, 6, 39, 'X')
    rect(layer, 16, 39, 18, 39, 'X')
    layer.outline()
    return layer.image()


def ups_unit():
    layer = Layer(16, 20, C)
    rect(layer, 1, 0, 14, 19, 'k')
    rect(layer, 1, 0, 14, 0, 'g')
    for y in range(0, 20):
        layer.set(1, y, 'g')
        layer.set(14, y, 'K')
    rect(layer, 3, 2, 12, 6, 'X')
    for index, x in enumerate(range(4, 12, 2)):
        rect(layer, x, 4, x, 5, 'L' if index < 3 else 'K')
        layer.set(x, 3, 'N' if index < 3 else 'K')
    rect(layer, 3, 8, 12, 8, 'R')
    layer.set(11, 10, 'L')
    layer.set(12, 10, 'g')
    layer.set(3, 10, 'G')
    layer.set(4, 10, 'G')
    for y in range(12, 18, 2):
        rect(layer, 3, y, 12, y, 'X')
    rect(layer, 2, 19, 3, 19, 'X')
    rect(layer, 12, 19, 13, 19, 'X')
    layer.outline()
    return layer.image()


def fire_extinguisher():
    layer = Layer(8, 16, C)
    rect(layer, 1, 4, 5, 15, 'R')
    for y in range(4, 16):
        layer.set(2, y, 'p')
        layer.set(5, y, 'r')
    rect(layer, 1, 4, 5, 4, 'r')
    layer.set(1, 4, 'R')
    layer.set(5, 4, 'r')
    rect(layer, 2, 2, 4, 3, 'G')
    layer.set(2, 2, 's')
    rect(layer, 1, 1, 5, 1, 'X')
    layer.set(6, 1, 'X')
    rect(layer, 2, 8, 4, 10, 'W')
    layer.set(3, 9, 'R')
    for x, y in ((5, 3), (6, 4), (6, 5), (6, 6), (6, 7), (6, 8), (6, 9), (7, 10)):
        layer.set(x, y, 'X')
    rect(layer, 1, 15, 5, 15, 'r')
    layer.outline()
    return layer.image()


def warning_sign():
    layer = Layer(12, 12, C)
    layer.poly([(6, 0.2), (11.8, 11.2), (0.2, 11.2)], 'X')
    layer.poly([(6, 1.9), (10.5, 10.3), (1.5, 10.3)], 'Y')
    for x, y in ((7, 4), (6, 5), (5, 6), (6, 6), (7, 6), (6, 7), (5, 8), (5, 9)):
        layer.set(x, y, 'X')
    return layer.image()


def cable_bundle():
    layer = Layer(24, 10, C)
    cables = (('y', 'Y', 0.6, 7.8, 1.0, 0.52, 1), ('k', 'g', 0.0, 5.5, 2.0, 0.34, 2), ('b', 'B', 3.0, 6.0, 2.0, 0.3, 2))
    for dark, light, phase, base, amplitude, frequency, thickness in cables:
        cable = Layer(24, 10, C)
        previous = None
        for x in range(1, 23):
            y = round(base + amplitude * math.sin(x * frequency + phase))
            if previous is not None:
                cable.line(x - 1, previous, x, y, light)
                if thickness == 2:
                    cable.line(x - 1, previous + 1, x, y + 1, dark)
            previous = y
        merge(layer, cable)
    layer.set(0, 6, 's')
    layer.set(0, 7, 'g')
    return layer.image()


def fridge():
    layer = Layer(16, 32, C)
    rect(layer, 1, 0, 14, 30, 'w')
    for y in range(0, 31):
        layer.set(1, y, 'W')
        layer.set(14, y, 's')
    rect(layer, 1, 0, 14, 0, 'W')
    rect(layer, 2, 9, 13, 9, 's')
    rect(layer, 1, 10, 14, 10, 'G')
    rect(layer, 2, 30, 13, 30, 's')
    rect(layer, 12, 5, 12, 8, 'G')
    rect(layer, 12, 12, 12, 18, 'G')
    for x, y, key in ((3, 3, 'R'), (6, 5, 'B'), (4, 13, 'L'), (8, 14, 'R'), (3, 22, 'y'), (9, 25, 'B')):
        layer.set(x, y, key)
        layer.set(x + 1, y, key)
    rect(layer, 5, 17, 9, 21, 'Y')
    rect(layer, 6, 18, 8, 18, 'G')
    rect(layer, 6, 20, 7, 20, 'G')
    layer.set(9, 21, 'y')
    layer.set(7, 16, 'R')
    rect(layer, 2, 31, 3, 31, 'k')
    rect(layer, 12, 31, 13, 31, 'k')
    layer.outline()
    return layer.image()


def counter():
    layer = Layer(32, 14, C)
    rect(layer, 0, 6, 31, 7, 's')
    rect(layer, 0, 6, 31, 6, 'w')
    rect(layer, 1, 8, 30, 13, 'U')
    for x0 in (1, 11, 21):
        rect(layer, x0, 8, x0 + 9, 8, 'u')
        for y in range(8, 13):
            layer.set(x0, y, 'f')
            layer.set(x0 + 9, y, 'u')
        layer.set(x0 + 7, 10, 'y')
    rect(layer, 1, 13, 30, 13, 'j')
    rect(layer, 2, 0, 14, 5, 'w')
    rect(layer, 2, 0, 14, 0, 'W')
    for y in range(0, 6):
        layer.set(14, y, 's')
    rect(layer, 3, 1, 9, 4, 'K')
    layer.set(4, 2, 'k')
    layer.set(5, 2, 'k')
    rect(layer, 3, 4, 9, 4, 'k')
    layer.set(11, 1, 'L')
    layer.set(12, 1, 'L')
    for y in (3, 4):
        layer.set(11, y, 'G')
        layer.set(12, y, 'G')
    rect(layer, 22, 2, 27, 5, 'R')
    for y in range(2, 6):
        layer.set(22, y, 'p')
        layer.set(27, y, 'r')
    rect(layer, 23, 1, 26, 1, 'R')
    layer.set(24, 0, 'k')
    layer.set(25, 0, 'k')
    layer.set(21, 3, 'R')
    layer.set(20, 2, 'R')
    layer.set(28, 3, 'k')
    layer.set(28, 4, 'k')
    rect(layer, 22, 5, 27, 5, 'k')
    layer.outline()
    return layer.image()


def notice_board():
    layer = Layer(22, 16, C)
    rect(layer, 0, 0, 21, 15, 'u')
    for y in range(1, 15):
        for x in range(1, 21):
            layer.set(x, y, 'f' if noise(x, y, 91) > 0.3 else 'U')
    rect(layer, 0, 0, 21, 0, 'U')
    notes = ((2, 2, 5, 5, 'Y', 'R'), (8, 3, 11, 6, 'P', 'B'), (14, 2, 18, 5, 'c', 'R'), (3, 8, 7, 12, 'W', 'L'), (10, 9, 13, 12, 'L', 'R'), (15, 8, 19, 12, 'Y', 'B'))
    for x0, y0, x1, y1, key, pin in notes:
        rect(layer, x0, y0, x1, y1, key)
        for y in range(y0 + 2, y1, 2):
            rect(layer, x0 + 1, y, x1 - 1, y, 'G' if key != 'W' else 's')
        layer.set((x0 + x1) // 2, y0, pin)
    layer.outline()
    return layer.image()


def trash_bin():
    layer = Layer(8, 12, C)
    rect(layer, 1, 3, 6, 11, 'g')
    for y in range(4, 11):
        for x in range(2, 6):
            if (x + y) % 2 == 0:
                layer.set(x, y, 'G')
    rect(layer, 1, 3, 6, 3, 's')
    rect(layer, 1, 11, 6, 11, 'k')
    for y in range(3, 12):
        layer.set(1, y, 'G')
    for x, y, key in ((2, 2, 'W'), (3, 1, 'W'), (3, 2, 's'), (4, 2, 'w'), (5, 1, 'w'), (5, 2, 's')):
        layer.set(x, y, key)
    layer.outline()
    return layer.image()


def cage():
    layer = Layer(14, 22, C)
    for y in range(0, 5):
        layer.set(6, y, 'G' if y % 2 == 0 else 'g')
        layer.set(7, y, 'g' if y % 2 == 0 else 'G')
    for angle in range(0, 181, 10):
        radians = math.radians(angle)
        layer.set(round(6.5 + 4.6 * math.cos(radians)), round(9 - 3.6 * math.sin(radians)), 'g')
    for x in (2, 5, 8, 11):
        for y in range(7 if x in (2, 11) else 6, 20):
            layer.set(x, y, 'G')
    for y in (9, 14):
        rect(layer, 2, y, 11, y, 'g')
    rect(layer, 1, 20, 12, 21, 'k')
    rect(layer, 1, 20, 12, 20, 'g')
    for x, y, key in ((6, 17, 'w'), (7, 17, 'w'), (6, 18, 'X'), (7, 18, 's'), (6, 19, 's')):
        layer.set(x, y, key)
    layer.outline()
    return layer.image()


def skull_at(layer, x, y):
    for dy, row in enumerate(('.www.', 'wWwws', 'wXwXs', '.wsw.', '.s.s.')):
        for dx, key in enumerate(row):
            if key != '.':
                layer.set(x + dx, y + dy, key)


def skull_pile():
    layer = Layer(16, 10, C)
    for x0, x1, y in ((0, 6, 8), (8, 15, 9), (5, 11, 7)):
        layer.line(x0, y, x1, y - 1, 's')
    for x, y in ((0, 5), (5, 5), (10, 5), (3, 1), (8, 1)):
        part = Layer(16, 10, C)
        skull_at(part, x, y)
        merge(layer, part)
    return layer.image()


def wall_crack():
    layer = Layer(14, 18, C)
    crack = [(7, 0), (6, 3), (8, 6), (6, 9), (7, 12), (5, 15), (6, 17)]
    branches = [((8, 6), (11, 8)), ((6, 9), (3, 10)), ((7, 12), (10, 14))]
    near = set()
    for (x0, y0), (x1, y1) in list(zip(crack, crack[1:])) + branches:
        temp = Layer(14, 18, C)
        temp.line(x0, y0, x1, y1, 'X')
        near.update(temp.pixels)
    for y in range(18):
        for x in range(14):
            dx, dy = (x + 0.5 - 7) / 7, (y + 0.5 - 9) / 9
            if dx * dx + dy * dy > 1 - 0.25 * noise(x, y, 93):
                continue
            row = y // 3
            joint = y % 3 == 2 or (x + (2 if row % 2 else 0)) % 5 == 4
            key = 'g' if joint is True else 's' if y % 3 == 0 else 'G'
            layer.set(x, y, key)
    for (x, y) in near:
        layer.set(x, y, 'X')
        for ox, oy in ((1, 0), (-1, 0)):
            if (x + ox, y + oy) not in near and (x + ox, y + oy) in layer.pixels:
                layer.set(x + ox, y + oy, 'r')
    for x, y in ((6, 3), (7, 9), (6, 13)):
        layer.set(x, y, 'R')
    layer.set(7, 10, 'p')
    return layer.image()


def stairs_down():
    layer = Layer(32, 18, C)
    rect(layer, 0, 3, 19, 17, 'g')
    for step in range(6):
        x0, top = 0 + step * 3, 3 + step * 2
        rect(layer, x0 + 3, top, 31, top + 1, 'X')
    for y in range(18):
        for x in range(20):
            if layer.pixels.get((x, y)) == 'g':
                row = y // 3
                if y % 3 == 2 or (x + (2 if row % 2 else 0)) % 6 == 5:
                    layer.set(x, y, 'k')
    for step in range(7):
        x0, top = step * 3, 3 + step * 2
        for x in range(x0, x0 + 3):
            layer.set(x, top, 's' if step < 4 else 'G' if step < 6 else 'g')
            layer.set(x, top + 1, 'G' if step < 4 else 'g' if step < 6 else 'k')
    for y in range(18):
        for x in range(21, 32):
            if (x, y) not in layer.pixels or layer.pixels[(x, y)] == 'X':
                if y >= 2:
                    layer.set(x, y, 'X')
    rect(layer, 19, 0, 31, 2, 'G')
    for x in range(19, 32):
        layer.set(x, 0, 's')
        if x % 4 == 2:
            layer.set(x, 1, 'g')
            layer.set(x, 2, 'g')
    rect(layer, 19, 0, 20, 17, 'G')
    rect(layer, 19, 0, 19, 17, 's')
    for y in range(3, 18, 4):
        layer.set(20, y, 'g')
    for x, y, key in ((21, 15, 'K'), (22, 15, 'K'), (23, 15, 'K'), (24, 17, 'K'), (25, 17, 'K'), (21, 16, 'k'), (22, 16, 'K')):
        layer.set(x, y, key)
    layer.outline()
    return layer.image()


def sarcophagus():
    layer = Layer(30, 14, C)
    rect(layer, 1, 4, 28, 12, 'G')
    for y in range(4, 13):
        layer.set(1, y, 's')
        layer.set(28, y, 'g')
    rect(layer, 0, 2, 29, 4, 's')
    rect(layer, 0, 2, 29, 2, 'w')
    rect(layer, 0, 4, 29, 4, 'g')
    rect(layer, 3, 0, 6, 1, 's')
    layer.set(3, 0, 'w')
    rect(layer, 7, 1, 24, 1, 'G')
    rect(layer, 13, 0, 15, 0, 's')
    for x0, x1 in ((3, 9), (11, 18), (20, 26)):
        rect(layer, x0, 6, x1, 10, 'g')
        rect(layer, x0 + 1, 7, x1 - 1, 9, 'G')
        rect(layer, x0 + 1, 7, x1 - 1, 7, 's')
    for x, y in ((14, 7), (14, 8), (14, 9), (13, 8), (15, 8)):
        layer.set(x, y, 'g')
    rect(layer, 0, 13, 29, 13, 'g')
    layer.line(22, 4, 24, 7, 'k')
    layer.outline()
    return layer.image()


def urn():
    layer = Layer(8, 12, C)
    shape = {0: (3, 4), 1: (2, 5), 2: (2, 5), 3: (3, 4), 4: (2, 5), 5: (1, 6), 6: (0, 7), 7: (0, 7), 8: (1, 6), 9: (1, 6), 10: (2, 5), 11: (2, 5)}
    for y, (x0, x1) in shape.items():
        for x in range(x0, x1 + 1):
            key = 'q' if x == x0 else 'g' if x == x1 else 'G'
            layer.set(x, y, key)
    rect(layer, 0, 6, 7, 6, 'y')
    layer.set(7, 6, 'o')
    rect(layer, 2, 2, 5, 2, 'g')
    layer.set(3, 0, 's')
    rect(layer, 2, 11, 5, 11, 'g')
    layer.outline()
    return layer.image()


def candles():
    layer = Layer(14, 8, C)
    rect(layer, 0, 7, 13, 7, 'q')
    for x0, width, top in ((0, 2, 4), (3, 3, 1), (7, 2, 3), (10, 3, 0)):
        for x in range(x0, x0 + width):
            for y in range(top + 1, 7):
                layer.set(x, y, 'W' if x == x0 else 'q' if x == x0 + width - 1 else 'z')
        for x in range(x0, x0 + width):
            layer.set(x, top + 1, 'z' if x != x0 else 'W')
        layer.set(x0 + width // 2, top, 'X')
    for x, y in ((2, 6), (6, 6), (9, 6), (13, 6)):
        layer.set(x, y, 'z')
    layer.outline()
    return layer.image()


def broken_pillar():
    layer = Layer(16, 20, C)
    rect(layer, 1, 17, 14, 19, 'G')
    rect(layer, 1, 17, 14, 17, 's')
    rect(layer, 1, 19, 14, 19, 'g')
    tops = (7, 6, 5, 4, 5, 7, 6, 8, 9, 7)
    for index, x in enumerate(range(3, 13)):
        top = tops[index]
        for y in range(top, 17):
            flute = (x - 3) % 3
            layer.set(x, y, 'w' if flute == 0 else 'G' if flute == 1 else 'g')
        layer.set(x, top, 's')
    for x in range(3, 13):
        layer.set(x, 16, 'g')
    for x, y, key in ((13, 15, 's'), (14, 16, 'G'), (13, 16, 'g'), (0, 16, 'G'), (15, 16, 's')):
        layer.set(x, y, key)
    layer.outline()
    return layer.image()


STATUE = [
    '......sss.......',
    '.....swwsg......',
    '.....swGGg......',
    '.....skkkg......',
    '.....sGGGg......',
    '......Ggg.......',
    '...ssswGGGgg....',
    '..swwsGGGGgGg...',
    '..sGGsssGGgGg...',
    '..sGGwsGsgGGg...',
    '...GGGsGsGGg....',
    '...gGsswssGg....',
    '...gGGGwGGgg....',
    '....GGGwGGg.....',
    '....GGGwGGg.....',
    '....gggwggg.....',
    '....sGGwGGg.....',
    '....sGgwgGg.....',
    '....sGgwgGg.....',
    '....sGgwgGg.....',
    '....sGgwgGg.....',
    '....sGg.gGg.....',
    '....sGg.gGg.....',
    '...ssGg.gGgg....',
    '...sGGg.gGGg....',
    '...ggggggggg....',
    '..sssssssssss...',
    '..wwwwwwwwwwwg..',
    '..sGGGGGGGGGgg..',
    '..sGGgGGGGgGgg..',
    '..sGGGGGGGGGgg..',
    '..gggggggggggg..',
]


def statue():
    return sprite(STATUE, 16, 32)


def banner_purple():
    layer = Layer(12, 26, C)
    for y in range(2, 26):
        for x in range(1, 11):
            if y > 20:
                notch = (y - 20) * 0.85
                if 5.5 - notch < x + 0.5 < 6.5 + notch - 1:
                    continue
            key = 'm' if x == 2 else 'v' if x >= 9 or x == 6 else 'V'
            layer.set(x, y, key)
    for y in range(2, 22):
        layer.set(1, y, 'y')
        layer.set(10, y, 'y')
    for x, y in ((5, 7), (6, 7), (4, 8), (7, 8), (3, 9), (8, 9), (4, 10), (7, 10), (5, 11), (6, 11), (5, 9), (6, 9), (5, 13), (6, 13), (5, 14), (6, 14)):
        layer.set(x, y, 'Y' if y < 9 else 'y')
    layer.set(5, 9, 'W')
    rect(layer, 0, 0, 11, 1, 'u')
    rect(layer, 0, 0, 11, 0, 'U')
    layer.set(0, 0, 'y')
    layer.set(11, 0, 'y')
    layer.set(0, 1, 'o')
    layer.set(11, 1, 'o')
    for x, y in ((1, 25), (10, 25)):
        layer.set(x, y, 'y')
    layer.outline()
    return layer.image()


def pedestal():
    layer = Layer(12, 14, C)
    rect(layer, 0, 0, 11, 2, 'G')
    rect(layer, 0, 0, 11, 0, 's')
    rect(layer, 0, 2, 11, 2, 'g')
    for x in range(3, 9):
        for y in range(3, 11):
            layer.set(x, y, 'w' if x == 3 else 'g' if x in (6, 8) else 'G')
    rect(layer, 1, 11, 10, 13, 'G')
    rect(layer, 1, 11, 10, 11, 's')
    rect(layer, 1, 13, 10, 13, 'g')
    layer.outline()
    return layer.image()


def vacuum_tubes():
    layer = Layer(20, 22, C)
    rect(layer, 0, 2, 19, 21, 'k')
    rect(layer, 1, 3, 18, 20, 'K')
    for y in range(2, 22):
        layer.set(0, y, 'g')
    for shelf_y, tube_top in ((10, 3), (19, 12)):
        rect(layer, 1, shelf_y, 18, shelf_y, 'g')
        for index, x in enumerate((2, 6, 10, 14)):
            rect(layer, x, tube_top + 1, x + 2, shelf_y - 2, 'o')
            layer.set(x + 1, tube_top, 'o')
            rect(layer, x + 1, tube_top + 1, x + 1, shelf_y - 2, 'Y' if (index + shelf_y) % 3 else 'y')
            layer.set(x + 1, tube_top + 2, 'W')
            layer.set(x, tube_top + 1, 'y')
            rect(layer, x, shelf_y - 1, x + 2, shelf_y - 1, 'X')
    rect(layer, 1, 21, 2, 21, 'X')
    rect(layer, 17, 21, 18, 21, 'X')
    layer.outline()
    return layer.image()


def logbook_stand():
    layer = Layer(14, 18, C)
    layer.poly([(0.5, 7.5), (13.5, 2.5), (13.5, 6.0), (0.5, 11.0)], 'u')
    layer.poly([(0.5, 7.5), (13.5, 2.5), (13.5, 3.6), (0.5, 8.6)], 'U')
    layer.poly([(1.6, 6.4), (12.6, 2.2), (12.6, 4.6), (1.6, 8.8)], 'W')
    layer.poly([(7.1, 4.3), (12.6, 2.2), (12.6, 4.6), (7.1, 6.7)], 'w')
    for x in range(2, 13):
        for y in range(18):
            if layer.pixels.get((x, y)) in ('W', 'w') and (x + y) % 3 == 0 and layer.pixels.get((x, y - 1)) in ('W', 'w'):
                layer.set(x, y, 'G' if layer.pixels[(x, y)] == 'W' else 's')
    rect(layer, 6, 9, 7, 15, 'u')
    layer.set(6, 10, 'U')
    rect(layer, 2, 16, 11, 17, 'u')
    rect(layer, 2, 16, 11, 16, 'U')
    layer.outline()
    return layer.image()


def street_sign():
    layer = Layer(18, 20, C)
    rect(layer, 0, 0, 1, 3, 'k')
    rect(layer, 0, 1, 15, 1, 'k')
    layer.set(15, 2, 'k')
    for x in (4, 13):
        for y in range(2, 5):
            layer.set(x, y, 'G' if y % 2 == 0 else 'g')
    rect(layer, 2, 5, 15, 17, 'U')
    for y in (8, 11, 14):
        rect(layer, 2, y, 15, y, 'u')
    for y in range(5, 18):
        layer.set(2, y, 'f')
        layer.set(15, y, 'u')
    rect(layer, 2, 17, 15, 17, 'u')
    for x, y in ((3, 6), (14, 6), (3, 16), (14, 16)):
        layer.set(x, y, 's')
    rect(layer, 8, 6, 9, 11, 'W')
    for index, y in enumerate(range(11, 16)):
        rect(layer, 5 + index, y, 12 - index, y, 'W')
    for y in range(6, 12):
        layer.set(9, y, 'w')
    layer.outline()
    return layer.image()


def crate_box(layer, x0, y0, x1, y1):
    rect(layer, x0, y0, x1, y1, 'U')
    for x in range(x0, x1 + 1):
        layer.set(x, y0, 'f')
        layer.set(x, y1, 'u')
    for y in range(y0, y1 + 1):
        layer.set(x0, y, 'f')
        layer.set(x0 + 1, y, 'q')
        layer.set(x1, y, 'u')
        layer.set(x1 - 1, y, 'Q')
    rect(layer, x0, y0 + 1, x1, y0 + 1, 'Q')
    rect(layer, x0, y1 - 1, x1, y1 - 1, 'Q')
    layer.line(x0 + 2, y1 - 2, x1 - 2, y0 + 2, 'u')
    for x, y in ((x0 + 1, y0 + 1), (x1 - 1, y0 + 1), (x0 + 1, y1 - 1), (x1 - 1, y1 - 1)):
        layer.set(x, y, 's')


def crates():
    layer = Layer(18, 16, C)
    bottom = Layer(18, 16, C)
    crate_box(bottom, 0, 6, 15, 15)
    merge(layer, bottom)
    top = Layer(18, 16, C)
    crate_box(top, 6, 0, 16, 6)
    merge(layer, top)
    return layer.image()


def arrow_slit():
    layer = Layer(14, 12, C)
    for y in range(12):
        for x in range(14):
            dx, dy = (x + 0.5 - 7) / 7, (y + 0.5 - 6) / 6
            if dx * dx + dy * dy > 1.15 - 0.3 * noise(x, y, 97):
                continue
            row = y // 3
            joint = y % 3 == 2 or (x + (2 if row % 2 else 0)) % 5 == 4
            layer.set(x, y, 'g' if joint is True else 'G')
    rect(layer, 5, 0, 8, 11, 's')
    rect(layer, 3, 4, 10, 6, 's')
    rect(layer, 6, 1, 7, 10, 'X')
    rect(layer, 4, 5, 9, 5, 'X')
    for y in range(1, 11):
        layer.set(8, y, 'G')
    for x in range(4, 10):
        layer.set(x, 6, 'G' if x not in (6, 7) else 'X')
    layer.set(6, 6, 'X')
    layer.set(7, 6, 'X')
    rect(layer, 5, 11, 8, 11, 'g')
    return layer.image()


def end_arch():
    layer = Layer(32, 48, C)
    cx, cy = 16.0, 16.0
    for y in range(48):
        for x in range(32):
            px, py = x + 0.5, y + 0.5
            outer = py >= cy or math.hypot(px - cx, py - cy) <= 16
            inner = (5 <= x <= 26 and py >= cy) or (py < cy and math.hypot(px - cx, py - cy) <= 11)
            if outer is False:
                continue
            if inner is True:
                row = y // 3
                joint = y % 3 == 2 or (x + (3 if row % 2 else 0)) % 6 == 5
                layer.set(x, y, 'X' if joint is True else 'k' if y % 3 == 0 else 'K')
            elif py < cy:
                angle = math.degrees(math.atan2(cy - py, px - cx))
                segment = angle / (180 / 9)
                joint = abs(segment - round(segment)) < 0.1 and 0 < round(segment) < 9
                ring = math.hypot(px - cx, py - cy)
                if joint is True:
                    key = 'K'
                elif 4 <= segment <= 5:
                    key = 'G'
                else:
                    key = 'G' if ring > 15 else 'g'
                layer.set(x, y, key)
            else:
                local_y = (y + (0 if x < 16 else 2)) % 5
                key = 'K' if local_y == 4 else 'G' if local_y == 0 else 'g'
                if x in (4, 27):
                    key = 'K'
                layer.set(x, y, key)
    for x, y in ((9, 30), (10, 31), (10, 32), (11, 33), (21, 22), (22, 23), (22, 24)):
        layer.set(x, y, 'X')
    for x, y in ((2, 40), (3, 41), (28, 38), (29, 39), (1, 20)):
        layer.set(x, y, 'l')
    rect(layer, 0, 46, 31, 47, 'g')
    rect(layer, 0, 46, 31, 46, 'G')
    layer.outline()
    return layer.image()


CAT_ASLEEP = [
    '................',
    '................',
    '........UUUU....',
    '......UjXUjXjU..',
    '.j..j.jjXUjXUjX.',
    '.juXjXjjXUjjXUjj',
    'jjjjjjjXUjjXUjjX',
    'jXXjXXjXUjjXUjjX',
    'jEEPEEjjXUjjXUjX',
    '.EEEEEjjXUjjXUXX',
    '..EEjjjXUjjXUjX.',
    '.jjXjjXjjXjjXXX.',
]

CAT_AWAKE = [
    '.j...j..........',
    '.jj.jj..........',
    '.juXujX.........',
    'jjXjXjj.........',
    'jyXjyXj.........',
    'jEEPEEj.........',
    '.EEEEEjX........',
    '.EEEXjjX.....jj.',
    '.EEEjXXjX.....jX',
    '.EEEjjjXj.....jj',
    '.EEjXXjXjjXjjXj.',
    '.EE.EEjXXjXjjXX.',
]


def cat(rows):
    return sprite(rows, 16, 12)


def couch():
    layer = Layer(34, 16, C)
    rect(layer, 3, 1, 30, 9, 'o')
    rect(layer, 3, 1, 30, 1, 'y')
    rect(layer, 3, 2, 30, 2, 'y')
    for x in (12, 21):
        for y in range(3, 9):
            layer.set(x, y, 'U')
    for x0, x1 in ((0, 4), (29, 33)):
        rect(layer, x0, 5, x1, 13, 'o')
        rect(layer, x0, 4, x1, 5, 'y')
        layer.set(x0, 4, 'o')
        layer.set(x1, 4, 'o')
        for y in range(6, 14):
            layer.set(x1, y, 'U')
    rect(layer, 5, 9, 28, 11, 'y')
    rect(layer, 5, 11, 28, 11, 'o')
    for x in (12, 21):
        layer.set(x, 9, 'U')
        layer.set(x, 10, 'U')
        layer.set(x, 11, 'U')
    rect(layer, 1, 12, 32, 13, 'U')
    rect(layer, 5, 3, 9, 8, 'B')
    rect(layer, 5, 3, 9, 3, 'c')
    for y in range(3, 9):
        layer.set(9, y, 'b')
    layer.set(7, 5, 'c')
    rect(layer, 2, 14, 3, 15, 'u')
    rect(layer, 30, 14, 31, 15, 'u')
    layer.outline()
    return layer.image()


def crt_tv():
    layer = Layer(18, 16, C)
    rect(layer, 0, 1, 13, 13, 'g')
    rect(layer, 0, 1, 13, 1, 'G')
    for y in range(1, 14):
        layer.set(0, y, 'G')
        layer.set(13, y, 'k')
    rect(layer, 1, 2, 10, 11, 'k')
    rect(layer, 2, 3, 9, 10, 'l')
    for y in range(3, 11, 2):
        rect(layer, 2, y, 9, y, 'L')
    for x, y in ((4, 8), (5, 8), (5, 7), (7, 9), (8, 9), (8, 8), (3, 5)):
        layer.set(x, y, 'd')
    layer.set(2, 3, 'N')
    layer.set(12, 4, 's')
    layer.set(12, 6, 's')
    for y in range(8, 12, 2):
        layer.set(11, y, 'k')
        layer.set(12, y, 'k')
    rect(layer, 2, 14, 3, 15, 'k')
    rect(layer, 10, 14, 11, 15, 'k')
    layer.line(13, 11, 14, 9, 'X')
    layer.set(15, 9, 'X')
    rect(layer, 14, 10, 17, 15, 's')
    rect(layer, 15, 11, 16, 12, 'l')
    layer.set(14, 14, 'X')
    layer.set(16, 14, 'M')
    for y in range(10, 16):
        layer.set(17, y, 'G')
    layer.outline()
    return layer.image()


GAMEBOY = [
    'wwwwwwwwww',
    'wggggggggs',
    'wgLLLLLLgs',
    'wRLLlLLLgs',
    'wgLllLLLgs',
    'wgLLLLLLgs',
    'wggggggggs',
    'wwwwwwwwws',
    'wwXwwwwMws',
    'wXXXwwMwws',
    'wwXwwwwwws',
    'wwwGwGwGGs',
    'wwwwwwGGs.',
    'Gsssssss..',
]


def gameboy():
    return sprite(GAMEBOY, 10, 14)


PORTAL_SWIRL = ('V', 'm', 'c', 'B', 'v', 'm', 'W', 'c')


def portal(phase):
    layer = Layer(24, 34, C)
    cx, cy, rx, ry = 11.5, 15.5, 10.4, 14.8
    for y in range(34):
        for x in range(24):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            distance = math.hypot(dx, dy)
            if distance > 1:
                continue
            if distance > 0.82:
                angle = math.degrees(math.atan2(dy, dx)) % 360
                joint = int(angle / 24) != int((angle + 4) / 24)
                light = dx + dy < -0.3
                layer.set(x, y, 'k' if joint is True else 's' if light is True else 'G' if dx + dy < 0.4 else 'g')
                continue
            angle = math.atan2(dy, dx)
            swirl = angle * 2 + distance * 9 + phase
            band = int((swirl / (2 * math.pi)) * len(PORTAL_SWIRL) * 0.75) % len(PORTAL_SWIRL)
            key = PORTAL_SWIRL[band]
            if distance < 0.16:
                key = 'W'
            elif distance < 0.3 and key in ('v', 'V'):
                key = 'm'
            layer.set(x, y, key)
    rect(layer, 2, 30, 21, 33, 'G')
    rect(layer, 2, 30, 21, 30, 's')
    rect(layer, 2, 33, 21, 33, 'g')
    for x in (7, 16):
        layer.set(x, 31, 'g')
        layer.set(x, 32, 'g')
    layer.outline()
    for x, y in ((2, 3), (21, 7), (0, 19), (23, 25)) if phase < 1 else ((3, 6), (21, 3), (0, 24), (23, 18)):
        layer.set(x, y, 'c' if phase < 1 else 'm')
    return layer.image()


def rug():
    layer = Layer(36, 6, C)
    rows = {2: (3, 32), 3: (2, 33), 4: (1, 34), 5: (1, 34)}
    for y, (x0, x1) in rows.items():
        for x in range(x0, x1 + 1):
            edge = x <= x0 + 1 or x >= x1 - 1 or y == 2 or y == 5
            key = 'r' if edge is True else 'R'
            if edge is False and (x - 2 * y) % 6 in (0, 1):
                key = 'y'
            layer.set(x, y, key)
    for y in (3, 4, 5):
        layer.set(0, y, 'z')
        layer.set(35, y, 'z')
    layer.set(0, 2, 'q')
    layer.set(35, 2, 'q')
    layer.outline()
    return layer.image()


def poster_terminal():
    layer = Layer(18, 22, C)
    rect(layer, 0, 0, 17, 21, 'w')
    for y in range(0, 22):
        layer.set(17, y, 's')
    rect(layer, 0, 21, 17, 21, 's')
    rect(layer, 2, 2, 15, 16, 'X')
    rect(layer, 2, 2, 15, 3, 'g')
    for x, key in ((3, 'R'), (5, 'y'), (7, 'L')):
        layer.set(x, 2, key)
    rect(layer, 4, 5, 9, 5, 'n')
    rect(layer, 4, 7, 12, 7, 'd')
    for x, y in ((4, 9), (5, 10), (6, 11), (5, 12), (4, 13)):
        layer.set(x, y, 'L')
    rect(layer, 8, 13, 11, 13, 'N')
    rect(layer, 3, 18, 14, 18, 'G')
    rect(layer, 5, 19, 12, 19, 's')
    layer.set(1, 1, 'R')
    layer.set(16, 1, 'R')
    layer.outline()
    return layer.image()


def secret_mark():
    rows = [
        '...mmmm...',
        '..mVVVVm..',
        '.mVccWcVm.',
        'mVcXMMWcVm',
        'mVcMXXMcVm',
        'mVWXMXXcVm',
        'mVcMMMXcVm',
        '.mVcXXcVm.',
        '..mVVVVm..',
        '...mmmm...',
    ]
    layer = Layer(10, 10, C)
    stamp(layer, rows)
    return layer.image()


def mana_ward():
    layer = Layer(16, 16, C)

    def bubble(dx, dy, x, y):
        distance = math.hypot(dx, dy)
        if distance > 0.82:
            return 'c'
        if distance < 0.28:
            return 'W' if distance < 0.14 else 'c'
        return 'b' if dx + dy > 0.55 else 'B'

    ellipse(layer, 8.0, 8.0, 6.6, 6.6, bubble)
    for x, y in ((5, 4), (4, 5), (6, 3), (4, 6)):
        layer.set(x, y, 'W')
    layer.outline()
    for x, y in ((1, 2), (14, 3), (15, 12), (0, 11)):
        layer.set(x, y, 'c')
    layer.set(13, 1, 'W')
    return layer.image()


def rune_ward():
    layer = Layer(16, 16, C)

    def ring(dx, dy, x, y):
        distance = math.hypot(dx, dy)
        if distance > 0.74:
            return 'm' if dx + dy < -0.6 else 'v' if dx + dy > 0.6 else 'V'
        return 'K'

    ellipse(layer, 8.0, 8.0, 6.8, 6.8, ring)
    for x, y in ((8, 4), (8, 5), (8, 6), (8, 7), (8, 8), (8, 9), (8, 10), (8, 11), (7, 6), (6, 5), (5, 4), (9, 6), (10, 5), (11, 4), (7, 9), (6, 10), (9, 9), (10, 10)):
        layer.set(x, y, 'm')
    for x, y in ((8, 7), (8, 8)):
        layer.set(x, y, 'W')
    for angle in (45, 135, 225, 315):
        radians = math.radians(angle)
        layer.set(round(7.5 + 5.6 * math.cos(radians)), round(7.5 + 5.6 * math.sin(radians)), 'W')
    layer.outline()
    return layer.image()


def arcane_barrier():
    layer = Layer(16, 16, C)
    cx, cy = 8.0, 8.0
    points = [(cx + 6.6 * math.cos(math.radians(a)), cy + 6.6 * math.sin(math.radians(a))) for a in range(-90, 270, 60)]
    layer.poly(points, 'c')
    shades = ('W', 'c', 'B', 'b', 'B', 'c')
    for y in range(16):
        for x in range(16):
            if (x, y) in layer.pixels:
                angle = (math.degrees(math.atan2(y + 0.5 - cy, x + 0.5 - cx)) + 90 + 360) % 360
                layer.set(x, y, shades[int(angle // 60) % 6])
    inner = [(cx + 3.0 * math.cos(math.radians(a)), cy + 3.0 * math.sin(math.radians(a))) for a in range(-90, 270, 60)]
    for (x0, y0), (x1, y1) in zip(inner, inner[1:] + inner[:1]):
        layer.line(round(x0 - 0.5), round(y0 - 0.5), round(x1 - 0.5), round(y1 - 0.5), 'N')
    layer.set(7, 7, 'W')
    layer.set(8, 7, 'W')
    layer.set(7, 8, 'c')
    layer.set(8, 8, 'W')
    layer.outline()
    layer.set(14, 1, 'c')
    layer.set(1, 14, 'W')
    return layer.image()


def firewall():
    layer = Layer(16, 16, C)
    tongues = ((2, 3.5), (5, 1.0), (8, 2.5), (11, 0.5), (13.5, 3.0))
    for y in range(0, 10):
        for x in range(1, 15):
            height = max(10 - top - abs(x + 0.5 - cx) * 2.2 for cx, top in tongues)
            depth = height - (10 - y) + 0.0
            if depth < 0:
                continue
            key = 'R' if depth < 1.2 else 'o' if depth < 2.6 else 'y' if depth < 4.2 else 'Y'
            layer.set(x, y, key)
    for y in range(9, 16):
        row = (y - 9) // 2
        for x in range(1, 15):
            mortar = (y - 9) % 2 == 1 and y < 15 or (x + (2 if row % 2 else 0)) % 4 == 0
            key = 'r' if mortar is True else 'Y' if (y - 9) % 2 == 0 and x < 8 else 'o' if (y - 9) % 2 == 0 else 'U'
            layer.set(x, y, key)
    for x in range(1, 15):
        layer.set(x, 9, 'y' if x % 4 else 'r')
    layer.outline()
    for x, y in ((3, 0), (9, 0), (14, 1)):
        layer.set(x, y, 'Y')
    return layer.image()


POINTY_HAT = [
    '................',
    '.........bBb....',
    '.......bBBBbbb..',
    '.......bBBb..bB.',
    '......bBBb....y.',
    '......bBBBb.....',
    '.....bBBQzb.....',
    '.....bBBQQbb....',
    '....bBBBBBBb....',
    '....yyYyyyyo....',
    '...bBBBBBBBbb...',
    '.bBBBBBBBBBBBbb.',
    'bBBBBBBBBBBBBBbb',
    '.bbbbbbbbbbbbbb.',
]


def glitch(frame):
    layer = Layer(16, 16, C)
    body = Layer(16, 16, C)
    shapes = {3: (6, 10), 4: (5, 11), 5: (4, 11), 6: (4, 12), 7: (4, 12), 8: (4, 12), 9: (5, 11), 10: (6, 11), 11: (7, 10)}
    shifts = ({5: 1, 9: -2}, {4: -1, 8: 2, 10: -1})[frame]
    holes = (((10, 4), (11, 8), (7, 10)), ((6, 4), (10, 9), (9, 11)))[frame]
    for y, (x0, x1) in shapes.items():
        shift = shifts.get(y, 0)
        for x in range(x0, x1 + 1):
            if (x, y) in holes:
                continue
            key = 'g' if y == 3 or x == x0 and y < 7 else 'k'
            body.set(x + shift, y, key)
    eyes = ((5, 6), (6, 6), (5, 7), (6, 7), (8, 6), (9, 6), (8, 7), (9, 7))
    for x, y in eyes:
        body.set(x + shifts.get(y, 0), y, 'W')
    body.set(5 + shifts.get(7, 0), 7, 'X')
    body.set(8 + shifts.get(7, 0), 7, 'X')
    for x, y in ((6, 9), (7, 10), (8, 9)):
        body.set(x + shifts.get(y, 0), y, 'm')
    split = 1 if frame == 0 else 2
    for (x, y), key in list(body.pixels.items()):
        if (x - split, y) not in body.pixels:
            layer.set(x - split, y, 'c')
        if (x + split, y) not in body.pixels:
            layer.set(x + split, y, 'm')
    layer.pixels.update(body.pixels)
    fragments = (((7, 13, 'k'), (9, 14, 'c'), (5, 13, 'm'), (12, 2, 'k')), ((8, 13, 'k'), (6, 14, 'm'), (10, 13, 'c'), (3, 2, 'k')))[frame]
    for x, y, key in fragments:
        layer.set(x, y, key)
    layer.outline()
    sparks = (((1, 4), (2, 3), (2, 5), (14, 9), (15, 8), (13, 10)), ((14, 4), (13, 3), (13, 5), (1, 10), (2, 9), (0, 11)))[frame]
    for index, (x, y) in enumerate(sparks):
        layer.set(x, y, 'Y' if index % 3 == 0 else 'W')
    return layer.image()


PILL = [
    '.OOOOO.',
    'OpRWWWO',
    'ORrWssO',
    '.OOOOO.',
]

PILL_BOX = [
    '..........',
    '.wwwwwwww.',
    '.ssssssss.',
    '.WWWLLWWs.',
    '.WWLLLLWs.',
    '.WWWLLWWs.',
    '.WWWWWWWs.',
    '..........',
]


def diff_candle():
    layer = Layer(16, 16, C)
    rect(layer, 6, 7, 9, 13, 'z')
    for y in range(7, 14):
        layer.set(6, y, 'W')
        layer.set(9, y, 'q')
    rect(layer, 6, 7, 9, 7, 'W')
    layer.set(10, 8, 'z')
    layer.set(10, 9, 'q')
    rect(layer, 3, 14, 12, 14, 'y')
    rect(layer, 4, 15, 11, 15, 'o')
    layer.set(3, 14, 'Y')
    layer.set(12, 14, 'o')
    layer.set(13, 13, 'y')
    layer.set(8, 6, 'X')
    for x, y, key in ((8, 1, 'o'), (7, 2, 'o'), (8, 2, 'y'), (9, 2, 'o'), (7, 3, 'y'), (8, 3, 'Y'), (9, 3, 'o'), (7, 4, 'y'), (8, 4, 'W'), (9, 4, 'y'), (8, 5, 'Y'), (7, 5, 'o'), (9, 5, 'o')):
        layer.set(x, y, key)
    layer.outline()
    return layer.image()


def skull_icon(layer, top, eye, core, crack, radius_x=5.6, radius_y=5.0):
    ellipse(layer, 8.0, top + radius_y, radius_x, radius_y, lambda dx, dy, x, y: 'W' if dx + dy < -0.9 else 's' if dx + dy > 0.7 else 'w')
    jaw = top + round(radius_y * 1.8)
    rect(layer, 5, jaw, 10, jaw + 2, 'w')
    for x in range(5, 11):
        layer.set(x, jaw + 2, 's')
    for x in (6, 8):
        layer.set(x, jaw + 1, 'X')
    layer.set(10, jaw + 1, 's')
    eyes = top + round(radius_y)
    for x0 in (4, 9):
        rect(layer, x0, eyes, x0 + 2, eyes + 2, 'X')
        layer.set(x0 + 1, eyes + 1, eye)
        if core is not None:
            layer.set(x0 + 1, eyes, core)
    layer.set(7, eyes + 3, 'X')
    layer.set(8, eyes + 3, 'X')
    layer.set(7, eyes + 4, 'g')
    for x, y in crack:
        layer.set(x, top + y, 'k')


def diff_skull():
    layer = Layer(16, 16, C)
    skull_icon(layer, 2, 'r', None, ((10, 0), (10, 1), (9, 2), (10, 3)))
    layer.outline()
    return layer.image()


def diff_skull_fire():
    layer = Layer(16, 16, C)
    tongues = ((1.5, 4.0), (4.2, 0.8), (7.6, 0.0), (11.2, 0.6), (14.4, 3.6))
    for y in range(0, 14):
        for x in range(0, 16):
            height = max(14 - top - abs(x + 0.5 - cx) * 1.9 for cx, top in tongues)
            depth = height - (14 - y)
            if depth < 0:
                continue
            layer.set(x, y, 'r' if depth < 1.0 else 'R' if depth < 2.2 else 'o' if depth < 3.6 else 'y' if depth < 5.2 else 'Y')
    skull = Layer(16, 16, C)
    skull_icon(skull, 6, 'R', 'Y', ((4, 1), (5, 2), (6, 1), (7, 2), (8, 1), (9, 2), (10, 1), (11, 2)), 4.9, 4.2)
    skull.outline()
    layer.pixels.update(skull.pixels)
    layer.outline()
    return layer.image()


def coffee_table():
    layer = Layer(24, 8, C)
    rect(layer, 1, 1, 22, 3, 'u')
    rect(layer, 1, 1, 22, 1, 'U')
    for x in range(2, 22, 5):
        layer.set(x, 1, 'f')
    rect(layer, 1, 3, 22, 3, 'j')
    for x0 in (3, 19):
        rect(layer, x0, 4, x0 + 1, 7, 'u')
        for y in range(4, 8):
            layer.set(x0 + 1, y, 'j')
    layer.outline()
    return layer.image()


def laptop_back():
    layer = Layer(11, 9, C)
    rect(layer, 1, 1, 9, 6, 'k')
    rect(layer, 1, 1, 9, 1, 'g')
    for y in range(1, 7):
        layer.set(1, y, 'g')
        layer.set(9, y, 'K')
    rect(layer, 2, 6, 8, 6, 'K')
    for x, y in ((4, 3), (6, 3), (4, 4), (5, 4), (6, 4), (5, 5)):
        layer.set(x, y, 'c')
    rect(layer, 0, 7, 10, 8, 'G')
    rect(layer, 0, 7, 10, 7, 's')
    layer.outline()
    for x, key in ((2, 'b'), (3, 'B'), (4, 'c'), (5, 'c'), (6, 'c'), (7, 'B'), (8, 'b')):
        layer.set(x, 0, key)
    return layer.image()


GAMEBOY_SMALL = [
    '.......',
    '.......',
    '.......',
    '.Wzzzz.',
    '.zlLlQ.',
    '.zlllQ.',
    '.zXzzM.',
    '.XXXMQ.',
    '.QQQQQ.',
]


TROPHY = [
    '............',
    '...YYYyyy...',
    '.yyYWYyyEyE.',
    '.y.YYyyyE.E.',
    '..yyYyyyEE..',
    '....YyyE....',
    '.....yE.....',
    '.....yE.....',
    '....YyyE....',
    '...Uuuuuu...',
    '..jjjjjjjj..',
    '............',
]


def bug_fixed():
    return sprite(TROPHY, 12, 12)


def build_deep_icons():
    images = {}
    images['manager'] = manager('idle')
    images['managerTalk'] = manager('talk')
    images['managerAngry'] = manager('angry')
    images['managerMelon'] = manager('melon')
    images['managerMelonTalk'] = manager('melonTalk')
    images['managerHeadless'] = manager_headless()
    images['fairy0'] = fairy('up')
    images['fairy1'] = fairy('down')
    images['fairySad0'] = fairy('sadUp')
    images['fairySad1'] = fairy('sadDown')
    images['fairyMini0'] = fairy_mini('up')
    images['fairyMini1'] = fairy_mini('down')
    images['fairyMiniSad0'] = fairy_mini('sadUp')
    images['fairyMiniSad1'] = fairy_mini('sadDown')
    for index, pose in enumerate(('up', 'mid', 'down')):
        images[f'moth{index}'] = moth(pose, False)
    for index, pose in enumerate(('up', 'mid', 'down')):
        images[f'mothEnraged{index}'] = moth(pose, True)
    images['bug0'] = sprite(BUG_FRAMES['up'])
    images['bug1'] = sprite(BUG_FRAMES['down'])
    for name, rows in ITEMS.items():
        images[name] = centred(sprite(rows))
    images['twinDaggers'] = centred(twin_daggers())
    images['doorWood'] = arch_door(False)
    images['doorWoodOpen'] = arch_door(True)
    images['doorIron'] = iron_door(False)
    images['doorIronOpen'] = iron_door(True)
    images['bookshelf'] = bookshelf()
    images['desk'] = desk()
    images['officeChair'] = office_chair()
    images['plant'] = plant()
    images['waterCooler'] = water_cooler()
    images['whiteboard'] = whiteboard()
    images['windowNight'] = window_night()
    images['serverRack'] = server_rack()
    images['vendingMachine'] = vending_machine()
    images['coffeeMachine'] = coffee_machine()
    images['motivPoster'] = motiv_poster()
    images['managerDesk'] = manager_desk()
    images['relayPanel'] = relay_panel()
    images['lightBulb'] = light_bulb()
    images['cobweb'] = cobweb()
    images['chains'] = chains()
    images['bones'] = bones()
    images['brazier'] = brazier()
    images['neonBreak'] = neon_break()
    images['cocoon'] = cocoon()
    images['skeleton'] = skeleton()
    for name, (rows, width, height, outline) in SMALL_ITEMS.items():
        images[name] = sprite(rows, width, height, outline)
    images['fileCabinet'] = file_cabinet()
    images['scrollRack'] = scroll_rack()
    images['readingDesk'] = reading_desk()
    images['globe'] = globe()
    images['paperPile'] = paper_pile()
    images['wallClock'] = wall_clock()
    images['printer'] = printer()
    images['coatRack'] = coat_rack()
    images['meetingScreen'] = meeting_screen()
    images['wallCalendar'] = wall_calendar()
    images['serverRackOpen'] = server_rack_open()
    images['upsUnit'] = ups_unit()
    images['fireExtinguisher'] = fire_extinguisher()
    images['warningSign'] = warning_sign()
    images['cableBundle'] = cable_bundle()
    images['fridge'] = fridge()
    images['counter'] = counter()
    images['noticeBoard'] = notice_board()
    images['bin'] = trash_bin()
    images['cage'] = cage()
    images['skullPile'] = skull_pile()
    images['wallCrack'] = wall_crack()
    images['stairsDown'] = stairs_down()
    images['sarcophagus'] = sarcophagus()
    images['urn'] = urn()
    images['candles'] = candles()
    images['brokenPillar'] = broken_pillar()
    images['statue'] = statue()
    images['bannerPurple'] = banner_purple()
    images['pedestal'] = pedestal()
    images['vacuumTubes'] = vacuum_tubes()
    images['logbookStand'] = logbook_stand()
    images['streetSign'] = street_sign()
    images['crates'] = crates()
    images['noticeArrows'] = arrow_slit()
    images['endArch'] = end_arch()
    images['cat'] = cat(CAT_ASLEEP)
    images['catAwake'] = cat(CAT_AWAKE)
    images['couch'] = couch()
    images['crtTv'] = crt_tv()
    images['gameboy'] = gameboy()
    images['portal'] = portal(0.0)
    images['portal2'] = portal(math.pi / 2)
    images['rug'] = rug()
    images['posterTerminal'] = poster_terminal()
    images['manaWard'] = centred(mana_ward())
    images['runeWard'] = centred(rune_ward())
    images['arcaneBarrier'] = centred(arcane_barrier())
    images['firewall'] = centred(firewall())
    images['pointyHat'] = centred(sprite(POINTY_HAT))
    images['glitch0'] = glitch(0)
    images['glitch1'] = glitch(1)
    images['pill'] = sprite(PILL, 7, 4, False)
    images['pillBox'] = sprite(PILL_BOX, 10, 8)
    images['coffeeTable'] = coffee_table()
    images['laptopBack'] = laptop_back()
    images['gameboySmall'] = sprite(GAMEBOY_SMALL, 7, 9)
    images['bugFixed'] = bug_fixed()
    images['diffNormal'] = centred(diff_candle())
    images['diffHard'] = centred(diff_skull())
    images['diffTryhard'] = centred(diff_skull_fire())
    images['secretMark'] = secret_mark()
    return images
