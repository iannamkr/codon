#!/usr/bin/env python3
"""병아리 컨셉 10종 — 병렬 생성"""
import json, base64, os, urllib.request, concurrent.futures

API_KEY = "8e6fdbb8-ca01-4fa3-949c-0420e28d72f3"
OUT_DIR = "/Users/ian.nam/Projects/dawchkins-new/public/assets/sprites/chick-10"
os.makedirs(OUT_DIR, exist_ok=True)

NEG = "realistic, photograph, 3d render, human, detailed background, text, UI, beautiful, smooth, clean, multiple characters"
BASE = "a tiny baby chick creature, thick bold black outlines, pixel art sprite, side view, Edmund McMillen Binding of Isaac grotesque cute style, lab experiment creature"

def gen(name, desc, seed):
    body = {
        "description": f"{BASE}, {desc}",
        "negative_description": NEG,
        "image_size": {"width": 64, "height": 64},
        "text_guidance_scale": 10,
        "no_background": True,
        "view": "side",
        "direction": "east",
        "seed": seed,
    }
    req = urllib.request.Request(
        "https://api.pixellab.ai/v1/generate-image-pixflux",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read())
        b64 = data.get("image", {}).get("base64", "")
        if b64:
            path = os.path.join(OUT_DIR, f"{name}.png")
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            print(f"  OK: {name}")
            return True
    except Exception as e:
        print(f"  FAIL: {name} — {e}")
    return False

chicks = [
    ("chick_base_pale-yellow_round_big-eyes", "round blob body, pale yellow skin, huge round eyes, tiny beak, small fluffy crest on head", 2001),
    ("chick_fire_orange_flame-crest_ember", "orange-red skin, crest is flickering flame, ember glowing eyes, charred wing tips", 2002),
    ("chick_water_blue_dripping_bubble", "blue translucent skin, dripping wet feathers, bubble floating above, teary glossy eyes", 2003),
    ("chick_plant_green_leaf-crest_vine", "green mossy skin, crest replaced by leaf sprouts, vine tail, flower bud on head", 2004),
    ("chick_earth_brown_crystal-crest_rocky", "brown rocky skin, crest is crystal formation, stone horn, cracked shell fragments", 2005),
    ("chick_mut_3eyes_purple_asymmetric", "three misaligned eyes, purple-pink patchy skin, asymmetric body, extra tiny wing, oozing", 2006),
    ("chick_albino_white_red-eyes_translucent", "pure white translucent skin, visible veins, red glowing eyes, almost no feathers, eerie", 2007),
    ("chick_shadow_dark_silhouette_glowing-eyes", "pure dark shadow body, only glowing white eyes visible, smoky wispy feathers", 2008),
    ("chick_angry_puffed-up_red-face_steam", "angry puffed up body twice normal size, reddened face, steam from ears, gritted beak", 2009),
    ("chick_chimera_half-fire-half-ice_split", "body split vertically, left half blue ice, right half red fire, two different eyes, confused", 2010),
]

print(f"Generating {len(chicks)} chick sprites in parallel...")

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
    futures = {ex.submit(gen, n, d, s): n for n, d, s in chicks}
    for f in concurrent.futures.as_completed(futures):
        pass

print(f"\nDone! {OUT_DIR}/")
for f in sorted(os.listdir(OUT_DIR)):
    if f.endswith(".png"):
        print(f"  {f}")
