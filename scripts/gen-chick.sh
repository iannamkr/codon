#!/bin/bash
API_KEY="8e6fdbb8-ca01-4fa3-949c-0420e28d72f3"
OUT_DIR="/Users/ian.nam/Projects/dawchkins-new/public/assets/sprites/experiments"
mkdir -p "$OUT_DIR"

generate() {
  local name="$1"
  local desc="$2"
  local neg="$3"
  local seed="$4"

  echo "Generating: $name ..."

  local body
  body=$(cat <<ENDJSON
{
  "description": "$desc",
  "negative_description": "$neg",
  "image_size": {"width": 64, "height": 64},
  "text_guidance_scale": 10,
  "no_background": true,
  "view": "side",
  "direction": "east",
  "seed": $seed
}
ENDJSON
)

  local response
  response=$(curl -s -X POST "https://api.pixellab.ai/v1/generate-image-pixflux" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body")

  # Check if response contains image data
  local has_image
  has_image=$(echo "$response" | python3 -c "
import sys, json, base64
try:
    d = json.load(sys.stdin)
    if 'image' in d:
        img = base64.b64decode(d['image'])
        with open('$OUT_DIR/$name.png', 'wb') as f:
            f.write(img)
        print('OK')
    elif 'base64' in str(d):
        # try to find base64 data in response
        for k,v in d.items():
            if isinstance(v, str) and len(v) > 100:
                try:
                    img = base64.b64decode(v)
                    with open('$OUT_DIR/$name.png', 'wb') as f:
                        f.write(img)
                    print('OK')
                    break
                except: pass
        else:
            print(json.dumps(d)[:300])
    else:
        print(json.dumps(d)[:300])
except Exception as e:
    print(f'ERROR: {e}')
    print(sys.stdin.read()[:200])
" 2>&1)

  echo "  Result: $has_image"
}

# 1. 기본 병아리 - ugly-cute
generate "chick_01_base" \
  "tiny baby chick creature, round blob body, stubby legs, huge bulging asymmetric eyes, slightly unsettling cute, grotesque cartoon style like Binding of Isaac, lab experiment subject, pale yellow skin, messy sparse feathers, front facing pixel art character sprite, simple design" \
  "realistic, photograph, 3d render, human, background, text, beautiful, clean, detailed background" \
  42

# 2. Fire 변이체
generate "chick_02_fire" \
  "tiny mutant chick creature, round body, big mismatched eyes, fire element, orange-red skin with ember spots, small flame on head, grotesque cute cartoon style, lab experiment creature, pixel art sprite, front view, transparent background" \
  "realistic, photograph, 3d, human, background, text, beautiful, smooth" \
  123

# 3. Water 변이체
generate "chick_03_water" \
  "tiny mutant chick creature, round blobby body, one big eye one small eye, water element, blue translucent skin, dripping wet feathers, bubble on head, grotesque cute cartoon like Binding of Isaac, lab experiment, pixel art sprite, front view" \
  "realistic, photograph, 3d, human, background, text, beautiful" \
  234

# 4. Plant 변이체
generate "chick_04_plant" \
  "tiny mutant chick creature, round body, creepy cute eyes, plant element, green skin with leaf sprouts growing from body, vine-like tail, grotesque cute cartoon style, lab experiment creature, pixel art sprite, front view" \
  "realistic, photograph, 3d, human, background, text" \
  345

# 5. Earth 변이체
generate "chick_05_earth" \
  "tiny mutant chick creature, round heavy body, tired droopy eyes, earth element, brown rocky skin with crystal growths, small stone horn, grotesque cute cartoon style, lab experiment creature, pixel art sprite, front view" \
  "realistic, photograph, 3d, human, background, text" \
  456

# 6. 돌연변이체 (MUT 높음)
generate "chick_06_mutant" \
  "tiny heavily mutated chick creature, asymmetric body, three eyes, extra tiny wing, mismatched colors purple and pink, unstable genetic experiment gone wrong, grotesque cute cartoon like Binding of Isaac, creepy adorable, pixel art sprite, front view" \
  "realistic, photograph, 3d, human, background, text, beautiful, clean" \
  567

echo ""
echo "Done! Check $OUT_DIR/"
ls -la "$OUT_DIR/"
