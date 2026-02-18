#!/usr/bin/env python3
"""Mewgenics-style 병아리 스프라이트 생성"""
import json, base64, os, sys, time
import urllib.request

API_KEY = "8e6fdbb8-ca01-4fa3-949c-0420e28d72f3"
API_URL = "https://api.pixellab.ai/v1/generate-image-pixflux"
OUT_DIR = "/Users/ian.nam/Projects/dawchkins-new/public/assets/sprites/experiments"
os.makedirs(OUT_DIR, exist_ok=True)

def generate(name, desc, neg="", seed=0, size=64):
    print(f"Generating: {name} ...", flush=True)
    body = {
        "description": desc,
        "negative_description": neg,
        "image_size": {"width": size, "height": size},
        "text_guidance_scale": 10,
        "no_background": True,
        "view": "side",
        "direction": "east",
        "seed": seed,
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())

        # Extract base64 image
        img_data = data.get("image", {})
        if isinstance(img_data, dict):
            b64 = img_data.get("base64", "")
        elif isinstance(img_data, str):
            b64 = img_data
        else:
            print(f"  ERROR: unexpected image format: {type(img_data)}")
            return

        if b64:
            img_bytes = base64.b64decode(b64)
            path = os.path.join(OUT_DIR, f"{name}.png")
            with open(path, "wb") as f:
                f.write(img_bytes)
            print(f"  OK -> {path} ({len(img_bytes)} bytes)")
        else:
            print(f"  ERROR: no image data in response")
            print(f"  Response keys: {list(data.keys())}")
    except Exception as e:
        print(f"  ERROR: {e}")

# ---------- Mewgenics ugly-cute 스타일 병아리 6종 ----------

NEG = "realistic, photograph, 3d render, human, detailed background, text, UI, beautiful, smooth, clean lines"

# 1. 기본 병아리 — 노란색, 둥글고 약간 불안한 눈
generate("chick_01_base",
    "a tiny round baby chick, blob-like body shape, stubby legs, huge bulging asymmetric eyes, "
    "slightly unsettling but cute, pale yellow body, sparse messy feathers sticking out, "
    "Edmund McMillen grotesque cartoon style, Binding of Isaac aesthetic, "
    "lab experiment subject number tag, simple pixel art character sprite, side view",
    NEG, seed=42)

# 2. Fire 변이체 — 주황빨강, 머리에 불꽃
generate("chick_02_fire",
    "a tiny mutant baby chick creature, round body, big worried mismatched eyes, "
    "orange-red skin with dark ember spots, small flickering flame on top of head, "
    "charred feather tips, grotesque cute cartoon style like Binding of Isaac, "
    "genetic experiment creature, pixel art sprite, side view",
    NEG, seed=123)

# 3. Water 변이체 — 파란 반투명, 물방울
generate("chick_03_water",
    "a tiny mutant baby chick creature, round blobby translucent body, "
    "one big eye and one tiny eye, blue-cyan translucent wet skin, water droplets dripping, "
    "small bubble floating above head, webbed feet, "
    "grotesque cute cartoon style like Binding of Isaac, lab experiment, pixel art sprite, side view",
    NEG, seed=234)

# 4. Plant 변이체 — 초록, 잎사귀 돋아남
generate("chick_04_plant",
    "a tiny mutant baby chick creature, round body, creepy cute wide eyes with leaf pupils, "
    "green mossy skin, small leaf sprouts growing from back and head, "
    "tiny vine curling from tail, flower bud on head, "
    "grotesque cute cartoon style like Binding of Isaac, genetic experiment, pixel art sprite, side view",
    NEG, seed=345)

# 5. Earth 변이체 — 갈색 바위, 결정체
generate("chick_05_earth",
    "a tiny mutant baby chick creature, round heavy body, tired droopy half-closed eyes, "
    "brown rocky textured skin, small crystal growths on back, "
    "tiny stone horn on forehead, cracked shell fragments on body, "
    "grotesque cute cartoon style like Binding of Isaac, lab experiment, pixel art sprite, side view",
    NEG, seed=456)

# 6. 고MUT 돌연변이체 — 비대칭, 3눈, 보라+분홍
generate("chick_06_mutant",
    "a tiny heavily mutated baby chick creature, asymmetric lopsided body, three misaligned eyes, "
    "extra tiny vestigial wing, patches of purple and pink skin, "
    "oozing unknown substance, unstable genetic experiment gone wrong, "
    "grotesque cute cartoon style like Binding of Isaac, creepy adorable abomination, "
    "pixel art sprite, side view",
    NEG, seed=567)

# 7. 사이드뷰 idle 포즈 변형 (seed만 다르게)
generate("chick_07_albino",
    "a tiny albino baby chick creature, round pale white body, large pink-red glowing eyes, "
    "almost no feathers, visible veins under translucent skin, "
    "lab specimen number tattooed on body, eerie but cute, "
    "grotesque cartoon style like Binding of Isaac, genetic anomaly, pixel art sprite, side view",
    NEG, seed=789)

# 8. 키메라 — 두 속성 혼합
generate("chick_08_chimera",
    "a tiny chimera baby chick creature, body split in half vertically, "
    "left half is blue water element with dripping wet skin, right half is red fire element with embers, "
    "two different colored eyes, confused expression, "
    "grotesque cute cartoon style like Binding of Isaac, failed genetic splice experiment, "
    "pixel art sprite, side view",
    NEG, seed=999)

print(f"\nDone! Generated sprites in {OUT_DIR}/")
for f in sorted(os.listdir(OUT_DIR)):
    if f.endswith(".png"):
        size = os.path.getsize(os.path.join(OUT_DIR, f))
        print(f"  {f} ({size} bytes)")
