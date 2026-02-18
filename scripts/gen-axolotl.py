#!/usr/bin/env python3
"""우파루파 베이스 스프라이트 생성 — 쉐이더 최적화 버전"""
import json, base64, os, urllib.request

API_KEY = "8e6fdbb8-ca01-4fa3-949c-0420e28d72f3"
OUT_DIR = "/Users/ian.nam/Projects/dawchkins-new/public/assets/sprites/axolotl"
os.makedirs(OUT_DIR, exist_ok=True)

def gen(name, desc, neg, seed, engine="pixflux", size=64, **kwargs):
    print(f"  [{engine}] {name} ...", flush=True)
    url = f"https://api.pixellab.ai/v1/generate-image-{engine}"
    body = {
        "description": desc,
        "negative_description": neg,
        "image_size": {"width": size, "height": size},
        "text_guidance_scale": 10,
        "no_background": True,
        "view": "side",
        "direction": "east",
        "seed": seed,
        **kwargs,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
        img_data = data.get("image", {})
        b64 = img_data.get("base64", "") if isinstance(img_data, dict) else img_data if isinstance(img_data, str) else ""
        if b64:
            path = os.path.join(OUT_DIR, f"{name}.png")
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            print(f"    OK ({os.path.getsize(path)} bytes)")
        else:
            print(f"    FAIL: {str(data)[:200]}")
    except Exception as e:
        print(f"    ERROR: {e}")

NEG = "realistic, photograph, 3d render, human, detailed background, text, UI, beautiful, smooth, clean, multiple characters"

# ══════════════════════════════════════════
# A. 쉐이더용 베이스 (창백한 캔버스)
# ══════════════════════════════════════════
print("=== A. 쉐이더용 베이스 (창백/심플) ===")

gen("base_01_pale",
    "a tiny cute axolotl creature, very round blobby body, stubby legs, "
    "thick bold black outlines, pale white-pink skin almost blank, "
    "prominent feathery external gills on head, big round dark eyes, small smile, "
    "Edmund McMillen Binding of Isaac grotesque cartoon style, "
    "lab experiment subject, simple minimal pixel art sprite, side view",
    NEG, seed=42)

gen("base_02_minimal",
    "a tiny axolotl lab specimen, extremely simple design, round body like a blob, "
    "very thick black outlines 3 pixels wide, nearly white interior with faint pink, "
    "three branching external gills on each side of head, beady black eyes, "
    "grotesque cute style like Binding of Isaac, pixel art, side view, "
    "designed as base for shader overlay effects",
    NEG, seed=88)

gen("base_03_chubby",
    "a fat round baby axolotl creature, oversized head with tiny body, "
    "thick bold black outlines, very pale cream white skin, "
    "large feathery gills sticking out from head like antennae, "
    "huge worried round eyes, tiny limbs, "
    "Edmund McMillen ugly-cute grotesque style, pixel art sprite, side view",
    NEG, seed=137)

# ══════════════════════════════════════════
# B. Mewgenics ugly-cute 강조
# ══════════════════════════════════════════
print("\n=== B. Mewgenics ugly-cute ===")

gen("ugly_01_bulge",
    "a tiny unsettling axolotl creature, round squishy body, "
    "huge bulging asymmetric eyes one bigger than the other, "
    "thick black outlines, pale sickly skin, prominent gills like tentacles, "
    "slightly drooling, creepy but adorable, "
    "Edmund McMillen Binding of Isaac style, genetic lab experiment, "
    "pixel art sprite, side view",
    NEG, seed=222)

gen("ugly_02_sad",
    "a tiny pathetic axolotl creature, droopy sad round body, "
    "thick black outlines, pale grey-pink skin with slight dark circles under eyes, "
    "wilting gills hanging down, teary huge eyes, "
    "ugly cute grotesque cartoon like Binding of Isaac, "
    "pitiful lab experiment specimen, pixel art sprite, side view",
    NEG, seed=333)

gen("ugly_03_grin",
    "a tiny creepy axolotl creature, round body, "
    "thick black outlines, pale skin, unnervingly wide grin showing tiny teeth, "
    "wild spiky gills sticking in all directions, "
    "one normal eye one squinting eye, "
    "Edmund McMillen grotesque cute style, disturbing but lovable, "
    "lab experiment creature, pixel art sprite, side view",
    NEG, seed=444)

# ══════════════════════════════════════════
# C. 원소 프리뷰 (쉐이더 적용 시뮬레이션)
# ══════════════════════════════════════════
print("\n=== C. 원소 변이 프리뷰 ===")

gen("elem_fire",
    "a tiny axolotl creature, round body, thick black outlines, "
    "orange-red glowing skin like magma, gills are flickering flames, "
    "ember particles around body, eyes glowing hot yellow, "
    "Edmund McMillen grotesque cute style, fire elemental mutation, "
    "pixel art sprite, side view",
    NEG, seed=555)

gen("elem_water",
    "a tiny axolotl creature, round body, thick black outlines, "
    "blue translucent wet skin with water flowing inside, "
    "gills are flowing water streams with bubbles, "
    "big glossy teary eyes, dripping, "
    "Edmund McMillen grotesque cute style, water elemental mutation, "
    "pixel art sprite, side view",
    NEG, seed=666)

gen("elem_plant",
    "a tiny axolotl creature, round body, thick black outlines, "
    "green mossy skin, gills replaced by leafy vine branches with small flowers, "
    "eyes have leaf-shaped pupils, small mushroom growing on back, "
    "Edmund McMillen grotesque cute style, plant elemental mutation, "
    "pixel art sprite, side view",
    NEG, seed=777)

gen("elem_earth",
    "a tiny axolotl creature, round heavy body, thick black outlines, "
    "brown rocky cracked skin, gills are crystal formations, "
    "small gemstones embedded in body, tired heavy-lidded eyes, "
    "Edmund McMillen grotesque cute style, earth elemental mutation, "
    "pixel art sprite, side view",
    NEG, seed=888)

# ══════════════════════════════════════════
# D. 고MUT / 특수 변이
# ══════════════════════════════════════════
print("\n=== D. 고MUT / 특수 변이 ===")

gen("mut_glitch",
    "a tiny axolotl creature, round body, thick black outlines, "
    "body glitching with chromatic aberration effect, "
    "parts of body pixelated and corrupted, RGB color split, "
    "three eyes in wrong positions, gills flickering between shapes, "
    "unstable genetic data, pixel art sprite, side view",
    NEG, seed=911)

gen("mut_chimera",
    "a tiny axolotl creature, body split vertically in half, "
    "left half blue ice with frozen crystalline gills, "
    "right half red fire with flame gills, "
    "thick black outlines, two different colored eyes, "
    "genetic chimera experiment, pixel art sprite, side view",
    NEG, seed=999)

# ══════════════════════════════════════════
# E. Bitforge 엔진 비교
# ══════════════════════════════════════════
print("\n=== E. Bitforge 엔진 비교 ===")

gen("bf_base",
    "a tiny cute axolotl creature, round blobby body, "
    "thick bold black outlines, pale white-pink skin, "
    "prominent feathery gills, big round eyes, "
    "Edmund McMillen Binding of Isaac grotesque cute style, "
    "lab experiment, pixel art sprite, side view",
    NEG, seed=42, engine="bitforge")

gen("bf_ugly",
    "a tiny unsettling axolotl, huge asymmetric bulging eyes, "
    "thick black outlines, pale sickly skin, wild spiky gills, "
    "slightly drooling, creepy adorable, "
    "Binding of Isaac style, lab specimen, pixel art, side view",
    NEG, seed=222, engine="bitforge")

gen("bf_fire",
    "a tiny axolotl creature, round body, thick black outlines, "
    "orange-red glowing magma skin, flame gills, ember eyes, "
    "Edmund McMillen grotesque cute, fire mutation, pixel art, side view",
    NEG, seed=555, engine="bitforge")

print(f"\nDone! {OUT_DIR}/")
for f in sorted(os.listdir(OUT_DIR)):
    if f.endswith(".png"):
        print(f"  {f} ({os.path.getsize(os.path.join(OUT_DIR, f))} bytes)")
