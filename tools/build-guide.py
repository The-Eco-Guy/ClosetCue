"""Draw tutorial frames for record-guide.cjs. Build dependency: Pillow."""
from pathlib import Path
from contextlib import nullcontext
import textwrap
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = Path('C:/Windows/Fonts')
bold = lambda size: ImageFont.truetype(str(FONT_DIR / 'arialbd.ttf'), size)
regular = lambda size: ImageFont.truetype(str(FONT_DIR / 'arial.ttf'), size)
slides = [
    (4, 'YOUR WARDROBE,\nIN GOOD ORDER.', "Welcome to ClosetCue's Wardrobe Organization Guide!", 'A place for every piece.'),
    (4, '01 / SORT BY\nCATEGORY.', 'Sort your clothes by category: Tops, Bottoms, One-Pieces, and Footwear.', 'Start with four simple groups.'),
    (5, '02 / GROUP BY\nOCCASION.', 'Within each category, group by occasion: Casual, Formal, Party, and Festive.', 'Find your next outfit faster.'),
    (5, '03 / GIVE IT\nA HOME.', 'Note the shelf location for each group so you can find items quickly.', 'For example: Shelf A - Top Row.'),
    (5, '04 / SNAP IT.\nADD IT.', 'Add each item to ClosetCue with a photo and its shelf location.', 'Open Add Garment to get started.'),
    (5, 'LESS SEARCHING.\nMORE WEARING.', 'Now you can browse, filter, and pick outfits without messing up your shelves!', 'Your next good outfit is already yours.')
]
photos = [('Top', 'blouse1.jpg'), ('Bottom', 'jeans1.jpg'), ('One-Piece', 'jumpsuit1.jpg'), ('Footwear', 'loafers1.jpg')]

with nullcontext(ROOT / 'qa' / 'guide-frames') as folder:
    folder.mkdir(parents=True, exist_ok=True)
    for index, (duration, heading, body, note) in enumerate(slides):
        frame = Image.new('RGB', (1280, 720), '#d4d4d4')
        draw = ImageDraw.Draw(frame)
        draw.rectangle((12, 12, 1267, 56), fill='#000080')
        draw.text((30, 22), 'ClosetCue / Wardrobe Organization Guide', font=bold(24), fill='white')
        draw.rectangle((14, 70, 742, 638), fill='#ffff00', outline='black', width=2)
        draw.text((48, 110), 'A LITTLE ORGANIZATION GOES A LONG WAY', font=regular(18), fill='black')
        draw.multiline_text((45, 185), heading, font=bold(62), fill='black', spacing=10)
        body_lines = '\n'.join(textwrap.wrap(body, width=44))
        draw.multiline_text((48, 389), body_lines, font=regular(27), fill='black', spacing=13)
        draw.text((48, 581), note, font=bold(20), fill='#000080')
        for j, (label, filename) in enumerate(photos):
            x, y = 772 + (j % 2) * 245, 86 + (j // 2) * 268
            draw.rectangle((x, y, x + 222, y + 247), fill='white', outline='black', width=2)
            photo = ImageOps.contain(Image.open(ROOT / 'uploads' / filename).convert('RGB'), (212, 206))
            frame.paste(photo, (x + (222 - photo.width) // 2, y + 7 + (206 - photo.height) // 2))
            draw.text((x + 12, y + 217), label, font=bold(19), fill='black')
        for j in range(6):
            x = 32 + j * 204
            draw.rectangle((x, 665, x + 184, 683), fill='#6600ff' if j <= index else 'white', outline='black', width=1)
        frame.save(folder / f'frame-{index}.png')
        if index == 0:
            frame.save(ROOT / 'media' / 'guide-poster.jpg', quality=90)
print('Built six tutorial frames and guide poster. Run tools/record-guide.cjs to encode.')
