#!/usr/bin/env python3
"""우파루파 100종 대량 생성 — 파일명에 특성 포함"""
import json, base64, os, urllib.request, time, concurrent.futures

API_KEY = "8e6fdbb8-ca01-4fa3-949c-0420e28d72f3"
OUT_DIR = "/Users/ian.nam/Projects/dawchkins-new/public/assets/sprites/axolotl-100"
os.makedirs(OUT_DIR, exist_ok=True)

NEG = "realistic, photograph, 3d render, human, detailed background, text, UI, beautiful, smooth, clean, multiple characters, words, letters"

# 생성 카운터
success = 0
fail = 0

def gen(name, desc, seed, engine="pixflux", size=64):
    global success, fail
    url = f"https://api.pixellab.ai/v1/generate-image-{engine}"
    body = {
        "description": desc,
        "negative_description": NEG,
        "image_size": {"width": size, "height": size},
        "text_guidance_scale": 10,
        "no_background": True,
        "view": "side",
        "direction": "east",
        "seed": seed,
    }
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    )
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read())
            img = data.get("image", {})
            b64 = img.get("base64", "") if isinstance(img, dict) else ""
            if b64:
                path = os.path.join(OUT_DIR, f"{name}.png")
                with open(path, "wb") as f:
                    f.write(base64.b64decode(b64))
                success += 1
                return True
        except Exception as e:
            if attempt == 0:
                time.sleep(2)
            else:
                fail += 1
                print(f"  FAIL: {name} — {e}")
    return False

# ═══════════════════════════════════════════════════════════
# 프롬프트 빌더
# ═══════════════════════════════════════════════════════════
BASE = "a tiny axolotl creature, thick bold black outlines, pixel art sprite, side view"
STYLE = "Edmund McMillen Binding of Isaac grotesque cute style, lab experiment creature"

def p(traits): return f"{BASE}, {traits}, {STYLE}"

# ═══════════════════════════════════════════════════════════
# 100종 정의
# ═══════════════════════════════════════════════════════════
sprites = []
sid = 1000  # seed 시작

# ── 1. 베이스 변형 (10종) ──
print("Defining 100 sprites...")

bases = [
    ("base_pale-white_round-body_big-eyes", "round blobby body, pale white skin, big round innocent eyes, small pink gills"),
    ("base_cream_chubby_sleepy-eyes", "chubby fat body, cream colored skin, sleepy half-closed eyes, droopy gills"),
    ("base_pink_tiny-body_huge-head", "oversized head tiny body, pink skin, huge curious eyes, fluffy gills"),
    ("base_grey_flat-body_wide-mouth", "flat wide body, grey pale skin, wide mouth, spiky short gills"),
    ("base_white_long-body_dot-eyes", "elongated body, pure white skin, tiny dot eyes, feathery long gills"),
    ("base_beige_egg-shape_one-big-eye", "egg shaped body, beige skin, one eye bigger than other, messy gills"),
    ("base_lavender_blob_no-legs", "blob shape no visible legs, faint lavender skin, round eyes, stubby gills"),
    ("base_ivory_angular_sharp-eyes", "slightly angular body, ivory skin, sharp alert eyes, pointed gills"),
    ("base_peach_pear-shape_worried", "pear shaped body, peach skin, worried expression, curled gills"),
    ("base_ghost-white_transparent_visible-organs", "nearly transparent ghost white body, faintly visible internal organs, eerie eyes, translucent gills"),
]
for name, desc in bases:
    sprites.append((name, p(desc), sid)); sid += 1

# ── 2. Fire 변이 (10종) ──
fires = [
    ("fire_magma-skin_flame-gills_ember-eyes", "orange-red magma skin with cracks of light, gills are flickering flames, glowing ember eyes"),
    ("fire_dark-red_smoke-gills_angry", "dark crimson red skin, gills emit black smoke wisps, angry squinting eyes"),
    ("fire_orange_candle-gills_calm", "warm orange skin, gills are calm candle flames, peaceful half-closed eyes"),
    ("fire_charred_ash-gills_scarred", "charred black skin with glowing red cracks, gills are smoldering ash, scarred eye"),
    ("fire_yellow_solar-gills_bright", "bright yellow sun-like skin, gills are solar flare rays, intensely bright eyes"),
    ("fire_pink-flame_wisp-gills_cute", "soft pink flame colored skin, gills are floating wisps, cute surprised eyes"),
    ("fire_volcanic_crystal-gills_fierce", "dark volcanic skin with lava veins, gills are obsidian crystals glowing red, fierce eyes"),
    ("fire_ember_spark-gills_tired", "dull ember colored skin, gills crackle with tiny sparks, tired worn out eyes"),
    ("fire_white-hot_plasma-gills_intense", "white hot glowing skin, gills are blue-white plasma tendrils, intense focused eyes"),
    ("fire_rust_iron-gills_ancient", "rusted iron colored skin, gills are corroded metal spikes glowing faint red, ancient weary eyes"),
]
for name, desc in fires:
    sprites.append((name, p(desc + ", fire elemental mutation"), sid)); sid += 1

# ── 3. Water 변이 (10종) ──
waters = [
    ("water_blue_bubble-gills_glossy-eyes", "translucent blue skin, gills are floating bubble clusters, big glossy teary eyes"),
    ("water_teal_wave-gills_serene", "teal colored flowing skin, gills are gentle wave shapes, serene calm eyes"),
    ("water_ice-blue_crystal-gills_frozen", "pale ice blue frozen skin, gills are ice crystal formations, cold blank stare"),
    ("water_deep-navy_abyss-gills_glowing", "deep dark navy skin, gills are bioluminescent tendrils, glowing dot eyes in darkness"),
    ("water_cyan_foam-gills_bubbly", "bright cyan skin with foam texture, gills are sea foam puffs, bubbly happy eyes"),
    ("water_storm-grey_lightning-gills_charged", "dark storm grey skin, gills crackle with electric blue, intense charged eyes"),
    ("water_clear_jellyfish-gills_transparent", "almost clear transparent skin, gills are jellyfish-like tendrils, visible brain through head"),
    ("water_turquoise_coral-gills_tropical", "turquoise skin with patterns, gills are coral branch shapes, tropical colorful eyes"),
    ("water_indigo_ink-gills_mysterious", "deep indigo skin, gills drip dark ink, mysterious half-hidden eyes"),
    ("water_frost_snowflake-gills_delicate", "white frost covered skin, gills are intricate snowflake shapes, gentle blue eyes"),
]
for name, desc in waters:
    sprites.append((name, p(desc + ", water elemental mutation"), sid)); sid += 1

# ── 4. Plant 변이 (10종) ──
plants = [
    ("plant_green_leaf-gills_vine-tail", "bright green mossy skin, gills are leaf branches, vine curling from tail, leaf pupils"),
    ("plant_moss_mushroom-gills_spore", "dark moss skin, gills replaced by small mushrooms, spore particles floating"),
    ("plant_flower_petal-gills_blooming", "light green skin with flower patterns, gills are colorful petals, blooming from head"),
    ("plant_bark_branch-gills_ancient-tree", "brown bark textured skin, gills are tree branches with leaves, old wise eyes"),
    ("plant_cactus_thorn-gills_desert", "pale green cactus skin with tiny thorns, gills are cactus flower blooms, squinting dry eyes"),
    ("plant_seaweed_kelp-gills_underwater", "dark green seaweed skin, gills are flowing kelp fronds, underwater bubbles"),
    ("plant_toxic_poison-gills_neon", "neon green toxic skin, gills drip glowing green poison, wild dilated eyes"),
    ("plant_autumn_maple-gills_falling", "orange-red autumn colored skin, gills are maple leaves, some leaves falling off"),
    ("plant_sprout_seed-gills_baby", "light green fresh skin, gills are tiny sprout seedlings, innocent baby eyes"),
    ("plant_carnivorous_trap-gills_hungry", "red-green skin, gills are venus flytrap mouths, hungry predatory eyes"),
]
for name, desc in plants:
    sprites.append((name, p(desc + ", plant elemental mutation"), sid)); sid += 1

# ── 5. Earth 변이 (10종) ──
earths = [
    ("earth_brown_crystal-gills_heavy", "brown rocky skin, gills are crystal formations, heavy tired eyes"),
    ("earth_sandstone_fossil-gills_ancient", "sandstone colored skin with fossil imprints, gills are petrified, ancient squinting eyes"),
    ("earth_obsidian_glass-gills_sharp", "black obsidian glossy skin, gills are sharp volcanic glass shards, reflective eyes"),
    ("earth_clay_muddy-gills_soft", "terracotta clay skin, gills are wet mud dripping, soft dopey eyes"),
    ("earth_marble_smooth-gills_elegant", "white marble skin with grey veins, gills are polished stone, elegant calm eyes"),
    ("earth_copper_ore-gills_metallic", "copper green metallic skin, gills are raw ore formations, shiny metallic eyes"),
    ("earth_granite_pebble-gills_sturdy", "grey granite skin, gills are clusters of round pebbles, sturdy determined eyes"),
    ("earth_amber_resin-gills_preserved", "golden amber translucent skin, gills are hardened resin, perfectly preserved insect visible inside body"),
    ("earth_dust_crumbling-gills_dying", "pale dust colored skin crumbling at edges, gills are falling apart into sand, fading eyes"),
    ("earth_diamond_prism-gills_radiant", "clear diamond crystalline skin refracting light, gills are geometric prism shapes, rainbow refracting eyes"),
]
for name, desc in earths:
    sprites.append((name, p(desc + ", earth elemental mutation"), sid)); sid += 1

# ── 6. 고MUT 돌연변이 (15종) ──
mutants = [
    ("mut_3eyes_purple_asymmetric", "three misaligned eyes, purple-pink patchy skin, asymmetric body, gills different on each side"),
    ("mut_glitch_rgb-split_corrupted", "body glitching with chromatic aberration, RGB color split, pixelated corruption patches"),
    ("mut_extra-limbs_6legs_chaotic", "six tiny legs, extra vestigial arms, chaotic misshapen body, confused multiple eyes"),
    ("mut_melting_dripping_unstable", "body slowly melting and dripping, unstable jelly-like form, panicked eyes, dissolving gills"),
    ("mut_split_two-heads_arguing", "two heads on one body, each head different color, arguing expressions, tangled gills"),
    ("mut_void_black-hole_consuming", "dark void black skin absorbing light, gills are swirling darkness, single white glowing eye"),
    ("mut_crystal_geometric_angular", "body transforming into geometric crystal shapes, faceted skin, prismatic gills, multifaceted eyes"),
    ("mut_tentacle_eldritch_lovecraft", "tentacles replacing gills and legs, eldritch horror appearance, too many small eyes, cosmic horror cute"),
    ("mut_baby_fetal_translucent", "tiny fetal stage, extremely translucent, visible developing organs, enormous head tiny body, barely formed gills"),
    ("mut_ancient_overgrown_ruins", "ancient weathered body covered in moss and tiny ruins, crumbling stone gills, tired thousand-year-old eyes"),
    ("mut_neon_cyberpunk_circuitry", "neon pink and cyan skin, circuit board patterns on body, LED gills, digital pixel eyes"),
    ("mut_invisible_outline-only_ghost", "nearly invisible body, only thick black outline visible with faint shimmer, ghost-like transparent gills"),
    ("mut_mirror_chrome_reflective", "mirror chrome reflective skin, everything reflected distorted, metallic liquid gills, mercury eyes"),
    ("mut_patchwork_stitched_frankenstein", "body stitched together from different colored patches, mismatched gills sewn on, button eye and real eye"),
    ("mut_spiral_hypnotic_warped", "body in spiral warped pattern, hypnotic swirl skin, corkscrew shaped gills, spiral pattern eyes"),
]
for name, desc in mutants:
    sprites.append((name, p(desc + ", high MUT genetic instability"), sid)); sid += 1

# ── 7. 감정/성격 표현 (10종) ──
emotions = [
    ("mood_angry_red-face_steam", "angry furious expression, reddened face, steam coming from gills, gritted teeth, furrowed brow"),
    ("mood_scared_shaking_wide-eyes", "terrified shaking body, extremely wide eyes with tiny pupils, gills flattened back, cowering"),
    ("mood_happy_bouncing_sparkle", "extremely happy bouncing, sparkles around, gills perked up cheerfully, huge grin, closed happy eyes"),
    ("mood_sleeping_zzz_peaceful", "sleeping peacefully curled up, tiny z particles floating, gills relaxed drooping, content smile"),
    ("mood_confused_question_tilted", "confused tilted head, question mark above, one eyebrow raised, gills twisted in confusion"),
    ("mood_smug_grin_half-eyes", "smug self-satisfied grin, half-lidded confident eyes, gills puffed up proudly"),
    ("mood_crying_tears_rain", "crying rivers of tears, blue tinted sad body, wilting gills, trembling lower lip"),
    ("mood_excited_vibrating_stars", "so excited body is vibrating blur, star particles around, gills standing straight up, huge eyes"),
    ("mood_bored_yawning_droopy", "incredibly bored yawning wide, droopy everything, gills hanging limp, half-asleep eyes"),
    ("mood_feral_wild_berserk", "gone feral wild berserk, glowing red eyes, gills sharp like spikes, drooling, primal rage stance"),
]
for name, desc in emotions:
    sprites.append((name, p(desc), sid)); sid += 1

# ── 8. 크기/체형 변이 (10종) ──
shapes = [
    ("shape_tiny_microscopic_minimal", "extremely tiny microscopic, barely visible stubby body, huge eyes relative to body, micro gills"),
    ("shape_fat_round_balloon", "extremely fat balloon round body, tiny eyes buried in fat, stubby gills squished by body"),
    ("shape_long_snake_noodle", "extremely elongated noodle snake body, tiny head, flowing ribbon gills, beady eyes"),
    ("shape_spiky_hedgehog_defensive", "body covered in defensive spikes, armored plating, gills hidden behind spikes, peeking eyes"),
    ("shape_flat_pancake_squished", "completely flat pancake squished body, eyes on top like flounder, gills spread flat"),
    ("shape_tall_stilts_lanky", "extremely tall on stilt-like long legs, thin lanky body, tiny head way up high, dangling gills"),
    ("shape_muscular_buff_strong", "ridiculously muscular buff body, tiny head on huge body, flexing, gills like mohawk"),
    ("shape_fluffy_puffball_cotton", "extremely fluffy puffball covered in fur cotton, barely visible eyes peeking through fluff, fluffy gills"),
    ("shape_skeletal_thin_bony", "emaciated skeletal thin body, visible ribs and bones, hollow eyes, brittle thin gills"),
    ("shape_cube_blocky_minecraft", "perfectly cube shaped blocky body, square eyes, geometric block gills, angular everything"),
]
for name, desc in shapes:
    sprites.append((name, p(desc), sid)); sid += 1

# ── 9. 특수 컨셉 (10종) ──
specials = [
    ("special_angel_halo_wings", "angelic glowing white body, tiny halo floating above, feathered wing gills, serene divine eyes"),
    ("special_demon_horns_hellfire", "demonic dark red body, tiny horns, gills are hellfire, evil glowing slit eyes"),
    ("special_robot_mech_circuit", "mechanical robot body with rivets, antenna gills, LED screen eyes, metal plating"),
    ("special_ghost_floating_chains", "ghostly transparent floating body with chains, spectral gills fading in and out, hollow white eyes"),
    ("special_royal_crown_cape", "regal bearing, tiny golden crown, gills like royal cape, haughty aristocratic eyes"),
    ("special_zombie_rotting_undead", "rotting zombie undead body, missing patches of skin, skeletal gills, one eye hanging out"),
    ("special_alien_tentacle_ufo", "alien grey skin, antenna gills with glowing tips, huge black almond eyes, UFO hovering above"),
    ("special_candy_sweet_frosting", "candy colored body with frosting swirls, gills are candy canes and lollipops, sugar sprinkle eyes"),
    ("special_shadow_dark_silhouette", "pure dark shadow silhouette body, only glowing white eyes visible, smoky shadow gills"),
    ("special_golden_statue_treasure", "solid gold statue body, jewel encrusted, golden branch gills, ruby gem eyes, treasure coins around"),
]
for name, desc in specials:
    sprites.append((name, p(desc), sid)); sid += 1

# ── 10. Bitforge 엔진 비교 (5종) ──
bitforges = [
    ("bf_base_clean_pink", "round blobby body, pale pink skin, big eyes, feathery gills, clean simple design"),
    ("bf_fire_magma_intense", "magma orange skin, flame gills, ember eyes, fire mutation"),
    ("bf_water_blue_dripping", "blue translucent skin, bubble gills, glossy teary eyes, water mutation"),
    ("bf_mut_glitch_corrupted", "glitching body, RGB split, corrupted pixelated patches, three eyes, unstable"),
    ("bf_shadow_dark_minimal", "dark shadow body, minimal detail, glowing white eyes only, smoky gills"),
]
for name, desc in bitforges:
    sprites.append((f"bf_{name}" if not name.startswith("bf_") else name, p(desc), sid))
    sid += 1

print(f"Total sprites to generate: {len(sprites)}")
print(f"Generating into: {OUT_DIR}\n")

# ═══════════════════════════════════════════════════════════
# 순차 생성 (API rate limit 고려)
# ═══════════════════════════════════════════════════════════
for i, (name, desc, seed) in enumerate(sprites):
    engine = "bitforge" if name.startswith("bf_") else "pixflux"
    print(f"[{i+1:3d}/{len(sprites)}] {name}", flush=True)
    gen(name, desc, seed, engine=engine)
    # 연속 요청 시 약간의 딜레이
    if (i + 1) % 10 == 0:
        print(f"  --- {success} OK / {fail} FAIL so far ---")
        time.sleep(1)

print(f"\n{'='*50}")
print(f"DONE! {success} OK / {fail} FAIL")
print(f"Output: {OUT_DIR}/")
