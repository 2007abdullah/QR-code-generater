#!/usr/bin/env python3
"""
Generate printable SVG QR codes for every product in products.json.

    python3 tools/generate-qr.py https://your-domain.com

Each QR encodes  <base-url>/q/<CODE>  (the permanent short address).
No third-party packages needed: this is a small self-contained QR encoder
(byte mode, error-correction level M, versions 1-5 = URLs up to ~84 chars).
"""
import json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# (EC codewords per block, number of blocks, data codewords per block) for level M
EC_M = {1: (10, 1, 16), 2: (16, 1, 28), 3: (26, 1, 44), 4: (18, 2, 32), 5: (24, 2, 43)}
ALIGN = {1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30]}

# ---- Reed-Solomon over GF(256) ------------------------------------------
EXP, LOG = [0] * 512, [0] * 256
_x = 1
for _i in range(255):
    EXP[_i], LOG[_x] = _x, _i
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11D
for _i in range(255, 512):
    EXP[_i] = EXP[_i - 255]


def gf_mul(a, b):
    return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]


def rs_generator(n):
    poly = [1]
    for i in range(n):
        nxt = [0] * (len(poly) + 1)
        for j, c in enumerate(poly):
            nxt[j] ^= c
            nxt[j + 1] ^= gf_mul(c, EXP[i])
        poly = nxt
    return poly


def rs_remainder(data, n):
    gen = rs_generator(n)
    rem = [0] * n
    for byte in data:
        factor = byte ^ rem[0]
        rem = rem[1:] + [0]
        for i in range(n):
            rem[i] ^= gf_mul(gen[i + 1], factor)
    return rem


# ---- Encoder --------------------------------------------------------------
def build_codewords(text):
    raw = text.encode("utf-8")
    for version in range(1, 6):
        ec, blocks, per_block = EC_M[version]
        capacity = blocks * per_block
        if len(raw) + 2 <= capacity:  # mode + length header take ~2 bytes
            break
    else:
        raise ValueError("Text too long for this mini encoder (max ~84 characters).")
    bits = "0100" + format(len(raw), "08b") + "".join(format(b, "08b") for b in raw)
    bits += "0" * min(4, capacity * 8 - len(bits))
    bits += "0" * (-len(bits) % 8)
    data = [int(bits[i:i + 8], 2) for i in range(0, len(bits), 8)]
    n_data = len(data)
    pad = [0xEC, 0x11]
    while len(data) < capacity:
        data.append(pad[(len(data) - n_data) % 2])
    chunks = [data[i * per_block:(i + 1) * per_block] for i in range(blocks)]
    eccs = [rs_remainder(c, ec) for c in chunks]
    out = [c[i] for i in range(per_block) for c in chunks]
    out += [e[i] for i in range(ec) for e in eccs]
    return version, out


MASKS = [
    lambda x, y: (x + y) % 2 == 0,
    lambda x, y: y % 2 == 0,
    lambda x, y: x % 3 == 0,
    lambda x, y: (x + y) % 3 == 0,
    lambda x, y: (x // 3 + y // 2) % 2 == 0,
    lambda x, y: x * y % 2 + x * y % 3 == 0,
    lambda x, y: (x * y % 2 + x * y % 3) % 2 == 0,
    lambda x, y: ((x + y) % 2 + x * y % 3) % 2 == 0,
]


def format_bits(mask):
    rem = mask  # error-correction level M = 00
    for _ in range(10):
        rem = (rem << 1) ^ ((rem >> 9) * 0x537)
    return ((mask << 10) | rem) ^ 0x5412


def make_matrix(version, codewords):
    size = 17 + 4 * version
    mod = [[False] * size for _ in range(size)]
    fn = [[False] * size for _ in range(size)]

    def put(x, y, dark):
        if 0 <= x < size and 0 <= y < size:
            mod[y][x] = dark
            fn[y][x] = True

    for i in range(size):
        put(6, i, i % 2 == 0)
        put(i, 6, i % 2 == 0)
    for cx, cy in ((3, 3), (size - 4, 3), (3, size - 4)):
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                put(cx + dx, cy + dy, max(abs(dx), abs(dy)) not in (2, 4))
    pos = ALIGN[version]
    for cx in pos:
        for cy in pos:
            if (cx, cy) in ((6, 6), (6, pos[-1]), (pos[-1], 6)):
                continue
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    put(cx + dx, cy + dy, max(abs(dx), abs(dy)) != 1)

    def draw_format(m, mask):
        bits = format_bits(mask)
        bit = lambda i: (bits >> i) & 1 == 1
        def setm(x, y, d):
            m[y][x] = d
        for i in range(6): setm(8, i, bit(i))
        setm(8, 7, bit(6)); setm(8, 8, bit(7)); setm(7, 8, bit(8))
        for i in range(9, 15): setm(14 - i, 8, bit(i))
        for i in range(8): setm(size - 1 - i, 8, bit(i))
        for i in range(8, 15): setm(8, size - 15 + i, bit(i))
        setm(8, size - 8, True)

    # mark the format area as "function" modules so data skips it
    draw_format(mod, 0)
    for i in range(9):
        fn[8][i] = fn[i][8] = True
    for i in range(8):
        fn[8][size - 1 - i] = fn[size - 1 - i][8] = True

    i, total = 0, len(codewords) * 8
    for right in range(size - 1, 0, -2):
        if right == 6:
            right = 5
        for vert in range(size):
            for j in range(2):
                x = right - j
                upward = ((right + 1) & 2) == 0
                y = size - 1 - vert if upward else vert
                if not fn[y][x] and i < total:
                    mod[y][x] = (codewords[i >> 3] >> (7 - (i & 7))) & 1 == 1
                    i += 1

    def penalty(m):
        n, score = len(m), 0
        for grid in (m, [list(r) for r in zip(*m)]):
            for row in grid:
                run = 1
                for k in range(1, n):
                    if row[k] == row[k - 1]:
                        run += 1
                    else:
                        score += run - 2 if run >= 5 else 0
                        run = 1
                score += run - 2 if run >= 5 else 0
                s = "".join("1" if c else "0" for c in row)
                score += 40 * (s.count("000010111010") + s.count("010111010000"))
        for y in range(n - 1):
            for x in range(n - 1):
                if m[y][x] == m[y][x + 1] == m[y + 1][x] == m[y + 1][x + 1]:
                    score += 3
        dark = sum(c for r in m for c in r)
        return score + 10 * (abs(dark * 20 - n * n * 10) // (n * n))

    best = None
    for mask in range(8):
        cand = [row[:] for row in mod]
        for y in range(size):
            for x in range(size):
                if not fn[y][x] and MASKS[mask](x, y):
                    cand[y][x] = not cand[y][x]
        draw_format(cand, mask)
        p = penalty(cand)
        if best is None or p < best[0]:
            best = (p, cand)
    return size, best[1]


def to_svg(text, label, quiet=4, color="#0B1620"):
    version, cw = build_codewords(text)
    size, mod = make_matrix(version, cw)
    w = size + quiet * 2
    h = w + 3  # room for the label under the code
    path = []
    for y in range(size):
        x = 0
        while x < size:
            if mod[y][x]:
                start = x
                while x < size and mod[y][x]:
                    x += 1
                path.append(f"M{start + quiet} {y + quiet}h{x - start}v1h-{x - start}z")
            else:
                x += 1
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" '
        f'aria-label="QR code {label}">'
        f'<title>QR code {label}</title><rect width="{w}" height="{h}" fill="#fff"/>'
        f'<path d="{"".join(path)}" fill="{color}" shape-rendering="crispEdges"/>'
        f'<text x="{w / 2}" y="{w + 1.4}" text-anchor="middle" font-size="2" font-weight="700" '
        f'font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif" fill="{color}">{label}</text></svg>\n'
    )


def main():
    cfg = json.loads((ROOT / "products.json").read_text(encoding="utf-8"))
    base = (sys.argv[1] if len(sys.argv) > 1 else cfg["site"]["baseUrl"]).rstrip("/")
    out = ROOT / "qr"
    out.mkdir(exist_ok=True)
    for p in cfg["products"]:
        url = f"{base}/q/{p['qrCode']}"
        name = p["name"] if isinstance(p["name"], str) else p["name"]["en"]
        (out / f"{p['qrCode']}.svg").write_text(to_svg(url, f"{p['qrCode']} - {name}"), encoding="utf-8")
        print(f"qr/{p['qrCode']}.svg -> {url}")


if __name__ == "__main__":
    main()
