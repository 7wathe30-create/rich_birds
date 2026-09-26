from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "landmarks"


def rect(x, y, width, height, fill):
    return f'<rect x="{x}" y="{y}" width="{width}" height="{height}" fill="{fill}"/>'


def path(d, fill):
    return f'<path d="{d}" fill="{fill}"/>'


def portrait(name, palette, shapes):
    background, accent = palette
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" role="img" aria-label="Иллюстративный портрет: {name}; не владелец участка">
<defs>
 <linearGradient id="background" x2="0" y2="1"><stop stop-color="{background[0]}"/><stop offset="1" stop-color="{background[1]}"/></linearGradient>
 <pattern id="micro" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="#c7e7b1" stroke-opacity=".07"/></pattern>
</defs>
<rect width="240" height="240" fill="url(#background)"/>
<rect width="240" height="240" fill="url(#micro)"/>
<rect x="25" y="25" width="8" height="8" fill="{accent}"/>
<rect x="205" y="39" width="6" height="6" fill="{accent}"/>
{''.join(shapes)}
</svg>
'''


LANDMARKS = [
    {
        "id": 48216,
        "name": "Виталик Бутерин",
        "file": "vitalik.svg",
        "palette": (("#3e4782", "#171f3c"), "#a49bdc"),
        "shapes": [
            rect(38, 189, 161, 49, "#242b49"),
            rect(55, 174, 130, 63, "#343550"),
            rect(90, 158, 54, 30, "#b88a6d"),
            rect(83, 181, 68, 12, "#555270"),
            rect(76, 59, 82, 112, "#e1b48f"),
            rect(158, 67, 15, 98, "#ac7f61"),
            rect(83, 48, 72, 16, "#edcaa5"),
            rect(66, 95, 12, 37, "#ce9c7b"),
            rect(169, 95, 9, 35, "#967354"),
            rect(70, 45, 90, 25, "#483b38"),
            rect(83, 33, 64, 17, "#59463d"),
            rect(70, 61, 16, 30, "#493c36"),
            rect(153, 54, 17, 36, "#382f2f"),
            rect(87, 43, 47, 8, "#755743"),
            rect(126, 56, 28, 10, "#6a4d3c"),
            rect(89, 92, 22, 6, "#73513b"),
            rect(131, 92, 20, 6, "#73513b"),
            rect(89, 105, 22, 11, "#ecdfc9"),
            rect(130, 105, 22, 11, "#ecdfc9"),
            rect(102, 105, 7, 11, "#567770"),
            rect(131, 105, 7, 11, "#567770"),
            rect(105, 106, 4, 8, "#1c3439"),
            rect(131, 106, 4, 8, "#1c3439"),
            rect(117, 113, 9, 24, "#c59570"),
            rect(119, 131, 14, 7, "#b78561"),
            rect(105, 149, 35, 5, "#996b55"),
            rect(113, 157, 17, 5, "#edc3a0"),
            path("M118 199L102 220L118 229L134 220Z", "#c6c9e2"),
            path("M102 224L118 241L134 224L118 234Z", "#8b91be"),
        ],
    },
    {
        "id": 47011,
        "name": "Чанпэн Чжао (CZ)",
        "file": "cz.svg",
        "palette": (("#716536", "#282b26"), "#d2b960"),
        "shapes": [
            rect(32, 191, 178, 47, "#1b2427"),
            rect(47, 177, 145, 61, "#2c3331"),
            rect(90, 155, 64, 37, "#b1845e"),
            rect(61, 181, 25, 56, "#45483b"),
            rect(163, 181, 21, 56, "#343b32"),
            rect(80, 187, 16, 30, "#58604b"),
            rect(148, 187, 17, 30, "#58604b"),
            rect(76, 58, 87, 110, "#cfaa7f"),
            rect(163, 66, 14, 91, "#a27b55"),
            rect(85, 48, 71, 18, "#dfbb93"),
            rect(67, 95, 10, 30, "#b68c64"),
            rect(173, 95, 8, 28, "#a17a56"),
            rect(77, 49, 82, 11, "#3f4333"),
            rect(87, 39, 61, 11, "#4b5038"),
            rect(77, 59, 10, 23, "#484937"),
            rect(156, 53, 12, 28, "#343d30"),
            rect(89, 48, 53, 7, "#657056"),
            rect(79, 92, 36, 31, "#273634"),
            rect(130, 92, 37, 31, "#273634"),
            rect(114, 99, 17, 5, "#26312b"),
            rect(85, 99, 24, 17, "#b4b397"),
            rect(136, 99, 25, 17, "#aaa58b"),
            rect(91, 105, 14, 5, "#584c36"),
            rect(140, 105, 14, 5, "#584c36"),
            rect(99, 105, 5, 6, "#222f2a"),
            rect(140, 105, 5, 6, "#222f2a"),
            rect(119, 114, 9, 21, "#b48a60"),
            rect(116, 132, 17, 5, "#a57b57"),
            rect(100, 145, 46, 7, "#855d44"),
            rect(107, 145, 33, 4, "#e3d8b8"),
            rect(109, 154, 25, 5, "#b4825d"),
        ]
        + [
            path(
                f"M{123 + dx} {203 + dy}L{129 + dx} {209 + dy}L{123 + dx} {215 + dy}L{117 + dx} {209 + dy}Z",
                "#e4bb49",
            )
            for dx, dy in [(0, 0), (-12, 12), (12, 12), (0, 24)]
        ],
    },
    {
        "id": 49021,
        "name": "Майкл Сэйлор",
        "file": "michael-saylor.svg",
        "palette": (("#2b5970", "#142a3a"), "#76adb9"),
        "shapes": [
            rect(31, 193, 181, 45, "#1c303e"),
            rect(46, 180, 149, 58, "#2c4250"),
            rect(92, 163, 60, 24, "#c59c77"),
            path("M91 180H154L131 238H111Z", "#d1d9d5"),
            path("M121 198L131 206L126 221L132 240H111L117 221L112 207Z", "#436b6d"),
            path("M63 180H88L108 238H86L73 219L80 211Z", "#3a5562"),
            path("M156 180H180L164 211L171 219L152 238H137Z", "#324f5c"),
            rect(76, 58, 88, 104, "#d8b58c"),
            rect(164, 66, 14, 86, "#b58a65"),
            rect(66, 96, 11, 30, "#c4a07b"),
            rect(172, 96, 10, 26, "#a98562"),
            rect(82, 48, 72, 16, "#e1c9a4"),
            rect(70, 50, 97, 19, "#a8b0a9"),
            rect(85, 36, 69, 17, "#cdd2c3"),
            rect(77, 45, 49, 13, "#d8ddca"),
            rect(68, 64, 15, 34, "#b6bcae"),
            rect(161, 58, 16, 39, "#7e928b"),
            rect(134, 46, 30, 14, "#d4d5c0"),
            rect(91, 58, 50, 8, "#ebddbf"),
            rect(90, 91, 24, 6, "#8a8165"),
            rect(133, 91, 25, 6, "#8a8165"),
            rect(90, 103, 23, 10, "#e6debe"),
            rect(135, 103, 22, 10, "#e6debe"),
            rect(104, 103, 7, 10, "#517c79"),
            rect(136, 103, 7, 10, "#517c79"),
            rect(119, 110, 10, 24, "#c19d75"),
            rect(118, 132, 17, 5, "#ab8865"),
            rect(80, 134, 19, 20, "#a9b0a0"),
            rect(150, 133, 15, 23, "#9ba897"),
            rect(91, 151, 65, 17, "#b5bbaa"),
            rect(101, 168, 47, 10, "#bac2b0"),
            rect(111, 178, 28, 7, "#a4b09f"),
            rect(96, 138, 58, 9, "#d5d4bc"),
            rect(107, 148, 36, 4, "#867b61"),
            rect(116, 156, 22, 6, "#d3d9c0"),
            rect(67, 205, 11, 11, "#d4b259"),
            '<text x="69" y="214" fill="#3b493d" font-size="9" font-weight="800">₿</text>',
        ],
    },
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for landmark in LANDMARKS:
        svg = portrait(landmark["name"], landmark["palette"], landmark["shapes"])
        (OUT / landmark["file"]).write_text(svg, encoding="utf-8")

    rows = [
        "export const LANDMARKS = [",
        *[
            f'  {{ id: {item["id"]}, name: "{item["name"]}", src: "/landmarks/{item["file"]}", caption: "Иллюстративный портрет · не владелец участка" }},'
            for item in LANDMARKS
        ],
        "];",
        "",
    ]
    (ROOT / "src" / "landmarks.js").write_text("\n".join(rows), encoding="utf-8")


if __name__ == "__main__":
    main()
