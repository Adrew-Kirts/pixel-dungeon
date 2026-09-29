from PIL import Image

OUTLINE = '#3f2631'


def hex_rgba(value):
    value = value.lstrip('#')
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (255,)


class Layer:
    def __init__(self, width, height, palette=None):
        self.width = width
        self.height = height
        self.palette = palette
        self.pixels = {}

    def set(self, x, y, key):
        if 0 <= x < self.width and 0 <= y < self.height:
            self.pixels[(x, y)] = key

    def span(self, y, x0, x1, key):
        for x in range(x0, x1 + 1):
            self.set(x, y, key)

    def line(self, x0, y0, x1, y1, key):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        error = dx + dy
        while True:
            self.set(x0, y0, key)
            if x0 == x1 and y0 == y1:
                return
            doubled = 2 * error
            if doubled >= dy:
                error += dy
                x0 += sx
            if doubled <= dx:
                error += dx
                y0 += sy

    def poly(self, points, key):
        for y in range(self.height):
            center_y = y + 0.5
            crossings = []
            for index, (ax, ay) in enumerate(points):
                bx, by = points[(index + 1) % len(points)]
                if (ay <= center_y < by) or (by <= center_y < ay):
                    crossings.append(ax + (center_y - ay) * (bx - ax) / (by - ay))
            crossings.sort()
            for left, right in zip(crossings[0::2], crossings[1::2]):
                for x in range(self.width):
                    if left <= x + 0.5 <= right:
                        self.set(x, y, key)

    def filled(self, x, y):
        return (x, y) in self.pixels

    def shade_bottom(self, base, shade):
        snapshot = dict(self.pixels)
        for (x, y), key in snapshot.items():
            if key == base and (x, y + 1) not in snapshot:
                self.pixels[(x, y)] = shade

    def outline(self):
        snapshot = set(self.pixels)
        for x in range(self.width):
            for y in range(self.height):
                if (x, y) in snapshot:
                    continue
                if any((x + dx, y + dy) in snapshot for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    self.pixels[(x, y)] = 'O'

    def image(self):
        image = Image.new('RGBA', (self.width, self.height), (0, 0, 0, 0))
        for (x, y), key in self.pixels.items():
            image.putpixel((x, y), hex_rgba(self.palette[key] if key != 'O' or 'O' in self.palette else OUTLINE))
        return image


GLYPHS = {
    'B': ['##.', '#.#', '##.', '#.#', '##.'],
    'C': ['.##', '#..', '#..', '#..', '.##'],
    'F': ['###', '#..', '##.', '#..', '#..'],
    'G': ['.##', '#..', '#.#', '#.#', '.##'],
    'I': ['###', '.#.', '.#.', '.#.', '###'],
    'K': ['#.#', '#.#', '##.', '#.#', '#.#'],
    'L': ['#..', '#..', '#..', '#..', '###'],
    'M': ['#.#', '###', '###', '#.#', '#.#'],
    'O': ['.#.', '#.#', '#.#', '#.#', '.#.'],
    'P': ['##.', '#.#', '##.', '#..', '#..'],
    'U': ['#.#', '#.#', '#.#', '#.#', '###'],
    'V': ['#.#', '#.#', '#.#', '#.#', '.#.'],
    'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'],
    '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'],
    '5': ['###', '#..', '##.', '..#', '##.'],
    '6': ['.##', '#..', '##.', '#.#', '.#.'],
    '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['.#.', '#.#', '.#.', '#.#', '.#.'],
    '9': ['.#.', '#.#', '.##', '..#', '##.'],
    '+': ['...', '.#.', '###', '.#.', '...'],
    '!': ['.#.', '.#.', '.#.', '...', '.#.'],
    'A': ['.#.', '#.#', '###', '#.#', '#.#'],
    'D': ['##.', '#.#', '#.#', '#.#', '##.'],
    'E': ['###', '#..', '##.', '#..', '###'],
    'H': ['#.#', '#.#', '###', '#.#', '#.#'],
    'N': ['#.#', '###', '###', '#.#', '#.#'],
    'R': ['##.', '#.#', '##.', '#.#', '#.#'],
    'S': ['.##', '#..', '.#.', '..#', '##.'],
    'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'W': ['#.#', '#.#', '#.#', '###', '#.#'],
    'Z': ['###', '..#', '.#.', '#..', '###'],
    '0': ['###', '#.#', '#.#', '#.#', '###'],
    '2': ['##.', '..#', '.#.', '#..', '###'],
    '3': ['##.', '..#', '.#.', '..#', '##.'],
    ' ': ['...', '...', '...', '...', '...'],
}


def text_width(text):
    return len(text) * 4 - 1


def draw_text(layer, text, x, y, key):
    for index, char in enumerate(text):
        for row, line in enumerate(GLYPHS[char]):
            for column, cell in enumerate(line):
                if cell == '#':
                    layer.set(x + index * 4 + column, y + row, key)




def char_map(rows, palette):
    layer = Layer(len(rows[0]), len(rows), palette)
    for y, row in enumerate(rows):
        for x, key in enumerate(row):
            if key != '.':
                layer.set(x, y, key)
    return layer
