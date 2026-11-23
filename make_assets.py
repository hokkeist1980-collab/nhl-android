from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

base = r"C:\Users\hokke\OneDrive\Dokumenter\deepseek-harness\default-workspace\nhl-android\assets"
os.makedirs(base, exist_ok=True)


def nhl_icon(size, mono=False, transparent=False):
    bg = (11, 15, 20, 255)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else bg)
    d = ImageDraw.Draw(img)
    margin = int(size * 0.14)
    top = int(size * 0.11)
    bottom = int(size * 0.89)
    left = margin
    right = size - margin
    midx = size // 2
    pts = [(left, top), (right, top), (right, int(size * 0.60)), (midx, bottom), (left, int(size * 0.60))]
    if not mono:
        # black shield with silver border and red diagonal like NHL mark (stylized)
        d.polygon(pts, fill=(18, 18, 20, 255))
        inset = int(size * 0.018)
        pts2 = [(left + inset, top + inset), (right - inset, top + inset), (right - inset, int(size * 0.595)), (midx, bottom - int(inset * 1.4)), (left + inset, int(size * 0.595))]
        d.line(pts + [pts[0]], fill=(210, 214, 220, 255), width=max(2, size // 90))
        d.polygon([(int(size * 0.64), top + inset), (right - inset, top + inset), (right - inset, int(size * 0.595)), (int(size * 0.43), bottom - int(inset * 1.4)), (int(size * 0.29), bottom - int(inset * 1.4))], fill=(200, 32, 46, 255))
        text = "NHL"
        try:
            font = ImageFont.truetype("ariblk.ttf", int(size * 0.28))
        except Exception:
            try:
                font = ImageFont.truetype("arialbd.ttf", int(size * 0.28))
            except Exception:
                font = ImageFont.load_default()
        layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        bbox = ld.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        ld.text(((size - tw) // 2, int(size * 0.31)), text, fill=(242, 244, 248, 255), font=font)
        layer = layer.rotate(-12, resample=Image.BICUBIC, center=(midx, int(size * 0.45)))
        img.alpha_composite(layer)
    else:
        d.polygon(pts, fill=(255, 255, 255, 255))
        text = "NHL"
        try:
            font = ImageFont.truetype("arialbd.ttf", int(size * 0.28))
        except Exception:
            font = ImageFont.load_default()
        layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        bbox = ld.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        ld.text(((size - tw) // 2, int(size * 0.31)), text, fill=(0, 0, 0, 255), font=font)
        layer = layer.rotate(-12, resample=Image.BICUBIC, center=(midx, int(size * 0.45)))
        img.alpha_composite(layer)
    return img


nhl_icon(1024).save(os.path.join(base, "icon.png"))
nhl_icon(1024).save(os.path.join(base, "splash-icon.png"))
nhl_icon(1024, transparent=True).save(os.path.join(base, "android-icon-foreground.png"))
nhl_icon(1024, mono=True, transparent=True).save(os.path.join(base, "android-icon-monochrome.png"))
nhl_icon(64).save(os.path.join(base, "favicon.png"))
print("ok")
