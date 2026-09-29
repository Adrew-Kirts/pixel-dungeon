import math
from pathlib import Path

from PIL import Image

from pixel import Layer, char_map, draw_text, text_width

P = {
    'X': '#181425',
    'K': '#262b44',
    'k': '#3a4466',
    'g': '#5a6988',
    'G': '#8b9bb4',
    's': '#c0cbdc',
    'w': '#e4edf9',
    'W': '#ffffff',
    'r': '#a22633',
    'R': '#e43b44',
    'p': '#ff706d',
    'o': '#f77622',
    'y': '#feae34',
    'Y': '#fee761',
    'b': '#124e89',
    'B': '#0099db',
    'c': '#75e3ff',
    'n': '#25956a',
    'N': '#43e1b3',
    'u': '#763b36',
    'U': '#bd6c4a',
    'f': '#eaa56c',
    'F': '#f7c282',
    'v': '#68386c',
    'V': '#9b4ca3',
    'm': '#d176d0',
    'q': '#e8c28f',
    'Q': '#c28569',
}


def icon(rows, width=16, height=16):
    padded = [row.ljust(width, '.')[:width] for row in rows]
    while len(padded) < height:
        padded.append('.' * width)
    layer = char_map(padded[:height], P)
    layer.outline()
    return layer.image()


def flag(colors, vertical):
    layer = Layer(16, 16, P)
    for y in range(2, 15):
        layer.set(2, y, 'u')
    for y in range(3, 11):
        for x in range(3, 14):
            index = (x - 3) * 3 // 11 if vertical is True else (y - 3) * 3 // 8
            layer.set(x, y, colors[index])
    layer.outline()
    return layer.image()


THUMB_UP = [
    '................',
    '......ff........',
    '.....ffff.......',
    '.....ffff.......',
    '.....fff........',
    '....ffff........',
    '..ffffffffff....',
    '.BBffffffffff...',
    '.BBfffffffuf....',
    '.BBffffffffff...',
    '.BBffffffffu....',
    '.BBfffffffff....',
    '..ffffffffff....',
]

ICONS = {
    'skill': [
        '................',
        '.kkkkkkkkkkkkkk.',
        '.kRYNkkkkkkkkkk.',
        '.kkkkkkkkkkkkkk.',
        '.kKKKKKKKKKKKKk.',
        '.kKKNKKKKKKNKKk.',
        '.kKNKKKKNKKKNKk.',
        '.kNKKKKNKKKKKNk.',
        '.kKNKKNKKKKKNKk.',
        '.kKKNKKKKKKNKKk.',
        '.kKKKKKKKKKKKKk.',
        '.kkkkkkkkkkkkkk.',
    ],
    'cherryCola': [
        '................',
        '......ssss......',
        '.....sWWWWs.....',
        '.....rRRRRr.....',
        '.....rRRRRr.....',
        '.....WWWWWW.....',
        '.....WWnWWW.....',
        '.....WnWnWW.....',
        '.....WRWRWW.....',
        '.....WWWWWW.....',
        '.....rRRRRr.....',
        '.....rRRRRr.....',
        '.....rrrrrr.....',
        '.....sWWWWs.....',
        '......ssss......',
    ],
    'beer': [
        '................',
        '....WWWWWWW.....',
        '...WWWWWWWWW....',
        '...WyYYYYYYW....',
        '...yYYYYYYYyss..',
        '...yYyYYYYYy.s..',
        '...yYYYYyYYy.s..',
        '...yYYYYYYYy.s..',
        '...yYYyYYYYyss..',
        '...yYYYYYYYy....',
        '...yYYYYYYYy....',
        '...sssssssss....',
    ],
    'wine': [
        '................',
        '.....ssssss.....',
        '.....srRRrs.....',
        '.....srRRRs.....',
        '.....srRRrs.....',
        '......srrs......',
        '.......ss.......',
        '.......ss.......',
        '.......ss.......',
        '......ssss......',
        '.....ssssss.....',
    ],
    'cocktail': [
        '...........m....',
        '..........mmm...',
        '.........mmmmm..',
        '...........u....',
        '..sssssssssus...',
        '...sBBBBBBBs....',
        '....sBBBBBs.....',
        '.....sBnBs......',
        '......sBs.......',
        '.......s........',
        '.......s........',
        '.......s........',
        '.....sssss......',
    ],
    'consoleSwitch': [
        '................',
        '................',
        '................',
        '..BBkkkkkkkkRR..',
        '.BBBkggggggkRRR.',
        '.BKBkgcccggkRRR.',
        '.BBBkgccgggkRKR.',
        '.BBBkggggggkRRR.',
        '..BBkkkkkkkkRR..',
    ],
    'consolePlay': [
        '................',
        '..KKKKKKKKKKKK..',
        '..KkkkkkkkkkkK..',
        '..KKKKKKKKKKKK..',
        '..KkkkkkkkBkkK..',
        '..KKKKKKKKKKKK..',
        '................',
        '....KKK..KKK....',
        '...KKkKKKKcKK...',
        '...KkkkKKcKcK...',
        '...KKkKKKKcKK...',
        '....KK....KK....',
    ],
    'consoleBox': [
        '................',
        '................',
        '...wwwwwwwwww...',
        '...wWWWWWWWWw...',
        '...wWWWnnWWWw...',
        '...wWWnNNnWWw...',
        '...wWWnNNnWWw...',
        '...wWWWnnWWWw...',
        '...wWWWWWWWWw...',
        '...wwwwwwwwww...',
    ],
    'consoleHandheld': [
        '....ssssssss....',
        '....sKKKKKKs....',
        '....sKnnnnKs....',
        '....sKnNNnKs....',
        '....sKnnnnKs....',
        '....sKKKKKKs....',
        '....ssssssss....',
        '....skssssrs....',
        '....kkksssrs....',
        '....skssrsss....',
        '....ssssssss....',
        '....ssgsgsss....',
        '....ssssssss....',
    ],
    'petCat': [
        '................',
        '..o..........o..',
        '..oo........oo..',
        '..ooo......ooo..',
        '..oooooooooooo..',
        '.oooooooooooooo.',
        '.ooKKooooooKKoo.',
        '.ooKWooooooKWoo.',
        '.oooooooooooooo.',
        '.ooooooppoooooo.',
        '.oooooopooooooo.',
        '..oyyyyyyyyyyo..',
        '...oooooooooo...',
    ],
    'petDog': [
        '................',
        '..uu........uu..',
        '.uuuUUUUUUUUuuu.',
        '.uuUUUUUUUUUUuu.',
        '.uuUKKUUUUKKUuu.',
        '.uuUKWUUUUKWUuu.',
        '..uUUUUUUUUUUu..',
        '...UUUffffUUU...',
        '...UUfKKKKfUU...',
        '...UUffKKffUU...',
        '...UUUfppfUUU...',
        '....UUUUUUUU....',
    ],
    'petFish': [
        '................',
        '................',
        '........BBB.....',
        '......BBBBBB..B.',
        '.....BBBBBBBBBB.',
        '....BWKBBBBBBBB.',
        '....BBBBBBBBBB..',
        '.....BBBBBBBBBB.',
        '......cBBBBB..B.',
        '........BBB.....',
    ],
    'osPenguin': [
        '................',
        '......KKKK......',
        '.....KKKKKK.....',
        '.....KWKKWK.....',
        '.....KKyyKK.....',
        '....KKWyyWKK....',
        '....KWWWWWWK....',
        '...KKWWWWWWKK...',
        '...KKWWWWWWKK...',
        '....KWWWWWWK....',
        '....KKWWWWKK....',
        '....yy.KK.yy....',
    ],
    'osApple': [
        '................',
        '........n.......',
        '.......nn.......',
        '....sss..sss....',
        '...sssssssssss..',
        '..ssssssssssW...',
        '..sssssssssW....',
        '..ssssssssss....',
        '..sssssssssss...',
        '...sssssssssss..',
        '....ssssssss....',
        '.....ss..ss.....',
    ],
    'osWindow': [
        '................',
        '................',
        '..BBBBBB.BBBBBB.',
        '..BBBBBB.BBBBBB.',
        '..BcBBBB.BcBBBB.',
        '..BBBBBB.BBBBBB.',
        '..BBBBBB.BBBBBB.',
        '................',
        '..BBBBBB.BBBBBB.',
        '..BcBBBB.BcBBBB.',
        '..BBBBBB.BBBBBB.',
        '..BBBBBB.BBBBBB.',
        '..BBBBBB.BBBBBB.',
    ],
    'jobFirefighter': [
        '......RRRR......',
        '.....RRRRRR.....',
        '....RRRYYRRR....',
        '...RRRRRRRRRR...',
        '.....ffffff.....',
        '.....fKffKf.....',
        '.....ffffff.....',
        '......ffff......',
        '....uuuuuuuu....',
        '...uuuuuuuuuu...',
        '...uYYYYYYYYu...',
        '...uuuuuuuuuu...',
        '...uu.uuuu.uu...',
        '....KK....KK....',
    ],
    'jobGendarme': [
        '.....KKKKKK.....',
        '.....bbbbbb.....',
        '.....bYYYYb.....',
        '....KKKKKKKK....',
        '.....ffffff.....',
        '.....fKffKf.....',
        '.....ffffff.....',
        '......ffff......',
        '....bbbbbbbb....',
        '...bbbbYYbbbb...',
        '...bbbbbbbbbb...',
        '...bbWbbbbWbb...',
        '...bb.bbbb.bb...',
        '....KK....KK....',
    ],
    'jobDuck': [
        '................',
        '.......YYYY.....',
        '......YYYYYY....',
        '......YKYYYYoo..',
        '......YYYYYooo..',
        '.......YYYY.....',
        '...YYYYYYYYYY...',
        '..YYYYYYYYYYYY..',
        '.RRWWRRWWRRWWRR.',
        '.RWWRRWWRRWWRRW.',
        '..YYYYYYYYYYYY..',
        '....YYYYYYYY....',
    ],
    'thumbUp': THUMB_UP,
    'thumbDown': list(reversed(THUMB_UP + ['................'] * 3)),
}

GENIE_TOP = [
    '..........KK............',
    '.........KKKK...........',
    '..........KK............',
    '........BBBBBB..........',
    '.......BBBBBBBB.........',
    '.......BKBBBBKB.........',
    '.......BWKBBWKB.........',
    '.......BBBBBBBB.........',
    '.......BBWWWWBB.........',
    '........BBBBBB..........',
    '......yyyBBBByyy........',
    '....BBBBBBBBBBBBBB......',
    '...BBBByyBBBByyBBBB.....',
    '...BBBBBBBBBBBBBBBB.....',
    '....BBBBBBBBBBBBBB......',
    '.....bBBBBBBBBBBb.......',
    '......bBBBBBBBBb........',
    '.......bBBBBBBb.........',
    '........bBBBBb..........',
]

GENIE_TAILS = [
    [
        '.........cBBc...........',
        '..........ccc...........',
        '...........cc...........',
        '..........cc............',
        '.........cc.............',
        '........ccc.............',
        '........cccc............',
    ],
    [
        '.........cBBc...........',
        '.........ccc............',
        '.........cc.............',
        '..........cc............',
        '...........cc...........',
        '...........ccc..........',
        '..........cccc..........',
    ],
]

LAMP = [
    '..................',
    '........yy........',
    '.......yYYy.......',
    '...yyyyyyyyyyy....',
    '..yYYYYYYYYYYYyyy.',
    'yyyYYYYYYYYYYYy..y',
    '..yyYYYYYYYYYy....',
    '....yyyyyyyyy.....',
    '......yyyyy.......',
]

ARROW = [
    '............',
    'WW......G...',
    'sUUUUUUUUGG.',
    'WW......G...',
    '............',
]


POSTER_PHONE_FILE = Path(__file__).with_name('poster-phone.local.txt')


def poster_phone_lines():
    if POSTER_PHONE_FILE.exists():
        lines = [line.strip() for line in POSTER_PHONE_FILE.read_text().splitlines() if line.strip() != '']
        if len(lines) == 2:
            return lines
    return ['+33 6 XX', 'XX XX XX']


def poster():
    width, height = 52, 48
    layer = Layer(width, height, P)
    for y in range(height):
        layer.span(y, 0, width - 1, 'q')
    for x in range(width):
        layer.set(x, 0, 'Q')
        layer.set(x, height - 1, 'Q')
    for y in range(height):
        layer.set(0, y, 'Q')
        layer.set(width - 1, y, 'Q')
    layer.set(2, 2, 'k')
    layer.set(width - 3, 2, 'k')
    phone = poster_phone_lines()
    lines = [('DEV FOR HIRE', 3, 'r'), ('CALL EZRA', 11, 'u'), (phone[0], 19, 'K'), (phone[1], 26, 'K')]
    for text, y, key in lines:
        draw_text(layer, text, (width - text_width(text)) // 2, y, key)
    torn = 3
    for tab in range(6):
        x = 3 + tab * 8
        for y in range(35, height - 1):
            layer.set(x + 6, y, 'Q')
        for y in range(37, height - 2, 2):
            layer.set(x + 2, y, 'u')
            layer.set(x + 3, y, 'u')
    x = 3 + torn * 8
    for y in range(35, height):
        for column in range(x - 1, x + 6):
            layer.pixels.pop((column, y), None)
    for column, depth in zip(range(x - 1, x + 6), (0, 1, 0, 2, 1, 0, 1)):
        for y in range(35, 35 + depth):
            layer.set(column, y, 'q')
    layer.outline()
    return layer.image()


def scope_creep():
    width, height = 38, 32
    layer = Layer(width, height, P)
    cx = width / 2
    for y in range(3, 30):
        t = (y - 3) / 26
        half = 17 * math.sin(min(1, t * 1.25) * math.pi / 2) if t < 0.8 else 17
        for x in range(width):
            if abs(x + 0.5 - cx) <= half:
                layer.set(x, y, 'N' if y < 26 else 'n')
    for x in (6, 14, 25, 31):
        layer.set(x, 30, 'n')
    for x, y in ((9, 7), (10, 6), (11, 6), (12, 7)):
        layer.set(x, y, 'c')
    for ex in (13, 23):
        for dx in range(3):
            for dy in range(3):
                layer.set(ex + dx, 13 + dy, 'W')
        layer.set(ex + 1, 14, 'K')
        layer.set(ex + 2, 15, 'K')
    for dx in range(4):
        layer.set(12 + dx, 11 - (dx // 2), 'K')
        layer.set(25 - dx, 11 - (dx // 2), 'K')
    for x in range(15, 24):
        layer.set(x, 20, 'K')
    layer.set(14, 19, 'K')
    layer.set(24, 19, 'K')
    for nx, ny in ((5, 16), (27, 18), (8, 23), (29, 9), (17, 24)):
        for dx in range(5):
            for dy in range(5):
                layer.set(nx + dx, ny + dy, 'Y')
        layer.set(nx + 1, ny + 1, 'y')
        layer.set(nx + 2, ny + 1, 'y')
        layer.set(nx + 1, ny + 3, 'y')
        layer.set(nx + 2, ny + 3, 'y')
        layer.set(nx + 3, ny + 3, 'y')
    layer.outline()
    return layer.image()


def lens(layer, cx, cy, radius, highlight=True):
    for y in range(int(cy - radius - 1), int(cy + radius + 2)):
        for x in range(int(cx - radius - 1), int(cx + radius + 2)):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            distance = math.hypot(dx, dy)
            if distance > radius:
                continue
            ratio = distance / radius
            if ratio > 0.8:
                light = (-dx - dy) / (distance + 0.001)
                layer.set(x, y, 'w' if light > 0.55 else 's' if light > -0.1 else 'g' if light > -0.6 else 'k')
            elif ratio > 0.7:
                layer.set(x, y, 'X')
            elif ratio > 0.5:
                layer.set(x, y, 'r')
            elif ratio > 0.3:
                layer.set(x, y, 'R')
            elif ratio > 0.14:
                layer.set(x, y, 'y')
            else:
                layer.set(x, y, 'Y')
    if highlight is True:
        hx, hy = int(cx - radius * 0.42), int(cy - radius * 0.42)
        layer.set(hx, hy, 'W')
        layer.set(hx + 1, hy, 'p')


def slab_surface(layer, width, height):
    for y in range(height):
        for x in range(width):
            layer.set(x, y, 'X')
    for y in range(height):
        for x in (3, 4, 9):
            layer.set(x, y, 'K')
        layer.set(width - 5, y, 'K')


def monolith_face():
    width, height = 64, 48
    layer = Layer(width, height, P)
    slab_surface(layer, width, height)
    left, right, top, bottom = 18, 45, 1, 46
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            layer.set(x, y, 'K')
    for x in range(left, right + 1):
        layer.set(x, top, 's')
        layer.set(x, bottom, 'g')
    for y in range(top, bottom + 1):
        layer.set(left, y, 's')
        layer.set(right, y, 'g')
    for y in range(top + 1, bottom):
        layer.set(left + 1, y, 'k')
    for x in range(left + 3, right - 2):
        for y in range(3, 10):
            layer.set(x, y, 'X')
    draw_text(layer, 'LEGACY', (width - text_width('LEGACY')) // 2, 4, 's')
    lens(layer, 32, 21.6, 11.2)
    for index in range(3):
        y = 34 + index * 2
        for x in range(24, 40):
            layer.set(x, y, 'X')
    draw_text(layer, '9000', (width - text_width('9000')) // 2, 40, 'B')
    for y, key in ((6, 'N'), (12, 'y'), (18, 'N'), (24, 'R'), (30, 'N')):
        layer.set(6, y, key)
        layer.set(width - 8, y + 3, key)
    for x0, y0, x1, y1 in ((12, 22, 14, 27), (14, 27, 13, 31), (50, 8, 52, 13), (52, 13, 55, 15)):
        layer.line(x0, y0, x1, y1, 'o')
    cable(layer, [(-3, 46), (5, 44), (10, 38), (14, 35.5)], 'R', 1.8)
    cable(layer, [(67, 46), (59, 44), (54, 38), (50, 35.5)], 'B', 1.8)
    return layer.image()


def catmull(points, per_segment=12):
    padded = [points[0]] + points + [points[-1]]
    samples = []
    for index in range(1, len(padded) - 2):
        p0, p1, p2, p3 = padded[index - 1], padded[index], padded[index + 1], padded[index + 2]
        for step in range(per_segment):
            t = step / per_segment
            t2, t3 = t * t, t * t * t
            samples.append(tuple(0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3) for a in (0, 1)))
    samples.append(points[-1])
    return samples


def cable(layer, points, band, radius=1.6):
    samples = catmull(points)
    for index, (x, y) in enumerate(samples):
        banded = index % 10 in (0, 1, 2)
        for py in range(int(y - radius - 1), int(y + radius + 2)):
            for px in range(int(x - radius - 1), int(x + radius + 2)):
                distance = math.hypot(px + 0.5 - x, py + 0.5 - y)
                if distance > radius:
                    continue
                shade = (px + 0.5 - x) + (py + 0.5 - y)
                if banded is True:
                    layer.set(px, py, band)
                else:
                    layer.set(px, py, 'G' if shade < -0.9 else 'g' if shade < 0.4 else 'k')
    tx, ty = points[-1]
    for py in range(int(ty) - 2, int(ty) + 2):
        for px in range(int(tx) - 2, int(tx) + 2):
            layer.set(px, py, 'y' if (px + py) % 3 != 0 else 'o')
    layer.set(int(tx) - 1, int(ty) - 3, 's')
    layer.set(int(tx) + 1, int(ty) - 3, 's')


def build_real_icons(dragon_head):
    images = {name: icon(rows) for name, rows in ICONS.items()}
    images['flagNL'] = flag(['R', 'W', 'b'], vertical=False)
    images['flagBE'] = flag(['X', 'Y', 'R'], vertical=True)
    images['flagDE'] = flag(['X', 'R', 'y'], vertical=False)
    images['flagFR'] = flag(['b', 'W', 'R'], vertical=True)
    images['petDragon'] = dragon_head
    for index, tail in enumerate(GENIE_TAILS):
        images[f'genie{index}'] = icon(GENIE_TOP + tail, 24, 26)
    images['lamp'] = icon(LAMP, 18, 9)
    images['arrow'] = icon(ARROW, 12, 5)
    images['poster'] = poster()
    images['scopeCreep'] = scope_creep()
    images['monolithFace'] = monolith_face()
    images['monolithPanel'] = monolith_face().crop((18, 1, 46, 47))
    return images
