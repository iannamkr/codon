#!/usr/bin/env node

/**
 * 파츠 이미지 자동 생성 스크립트
 * Gemini API (Nano Banana) 네이티브 이미지 생성 사용
 *
 * 사용법:
 *   node scripts/gen-parts.js                    # 전체 생성
 *   node scripts/gen-parts.js --type head        # 머리만
 *   node scripts/gen-parts.js --type body        # 몸통만
 *   node scripts/gen-parts.js --index 1,3,5      # 특정 번호만
 *   node scripts/gen-parts.js --model gemini-2.5-flash-image  # 모델 변경
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── 설정 ───────────────────────────────────────────────
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY가 .env에 없습니다");
  process.exit(1);
}

const DEFAULT_MODEL = "gemini-2.5-flash-image";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DELAY_MS = 5000; // API 호출 간 딜레이 (rate limit 방지)

// ─── 머리 프롬프트 ──────────────────────────────────────
const HEAD_PROMPTS = [
  {
    name: "01_둥근아기_round-cute",
    prompt: `isolated baby chick head, round chubby face,
big sparkly innocent eyes, tiny short beak,
small soft comb on top of head,
fluffy puffy cheeks, soft downy feathers,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "02_찡그린납작이_flat-grumpy",
    prompt: `isolated baby chick head, flat wide squished face,
tiny squinting angry eyes, small short pointy beak frowning,
floppy drooping comb falling to one side,
saggy cheeks, grumpy expression,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic, NOT duck`,
  },
  {
    name: "03_비대칭변이_asymmetric-mutant",
    prompt: `isolated baby chick head, lumpy asymmetric face,
one big eye one tiny eye, crooked bent beak,
uneven bumpy comb with extra bits,
rough skin, patchy feathers, small bumps on forehead,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "04_길쭉이도도_tall-snooty",
    prompt: `isolated baby chick head, tall elongated egg shaped face,
half closed sleepy droopy eyes, long thin pointy beak,
tall narrow comb standing straight up,
thin gaunt cheeks, snooty arrogant expression,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "05_해골뼈다귀_skeletal-skull",
    prompt: `isolated baby chick head, very thin sickly face,
sunken hollow dark eyes, sharp cracked beak,
withered small comb barely visible,
skin stretched tight over skull, bony ridges showing,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic, NOT bare skull, NOT skeleton`,
  },
  {
    name: "06_솜뭉치_fluffy-cotton",
    prompt: `isolated baby chick head, extremely fluffy round face,
tiny dot eyes hidden in thick fluff, small beak poking out of feathers,
fluffy feather tuft on top instead of comb,
wild messy plumage covering entire head, cotton ball shape,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "07_각진전투형_boxy-fierce",
    prompt: `isolated baby chick head, boxy angular square face,
fierce determined eyes with thick brows, strong short beak,
sharp pointed comb like a mohawk,
blocky jaw, tough battle hardened expression,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "08_외눈_cyclops",
    prompt: `isolated baby chick head, round face with one single large eye in center,
cyclops mutation, one giant eye taking up most of the face,
small beak below the eye, tiny comb on top,
smooth round head, curious confused expression,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "09_졸보_sleepy-droopy",
    prompt: `isolated baby chick head, soft round droopy face,
extremely sleepy half closed heavy eyelids, yawning open beak,
tilted floppy comb drooping forward over face,
relaxed slack jaw, drooling, about to fall asleep,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "10_뿔닭_devil-horns",
    prompt: `isolated baby chick head, round head with two small devil horns,
menacing grinning eyes with sharp pupils, pointy sharp beak,
dark jagged comb between the horns,
mischievous evil smirk, devilish expression,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "11_사이보그_cyborg-mechanical",
    prompt: `isolated baby chick head, half mechanical half organic face,
one normal eye one glowing robot eye, metal plated beak,
mechanical antenna replacing comb, bolts and screws,
exposed wires on one side, half feathers half metal,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "12_녹아내림_melting-gooey",
    prompt: `isolated baby chick head, melting gooey dripping face,
droopy liquid eyes sliding down the face, melting soft beak,
dissolved comb dripping like candle wax,
slime and goo oozing, unstable melting shape,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "13_알껍질_eggshell-hatching",
    prompt: `isolated baby chick head, half hatched with broken eggshell on top,
small peeking eyes looking out from cracked shell,
tiny beak poking through shell crack,
eggshell pieces still covering top half of head like a helmet,
shy scared expression, just born,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "14_결정체_crystalline-gem",
    prompt: `isolated baby chick head, crystalline angular geometric face,
sharp gem-like eyes with faceted surfaces, crystal beak,
cluster of crystal shards growing from top of head like comb,
hard angular faceted skin, mineral rock texture,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "15_왕관귀족_royal-crown",
    prompt: `isolated baby chick head, plump proud regal face,
condescending looking down eyes, elegant refined beak,
magnificent large ornate comb resembling a crown,
puffed up cheeks, double chin, pompous royal expression,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "16_용_dragon",
    prompt: `isolated baby chick head, dragon-like reptilian face,
fierce slitted dragon eyes, short snout with tiny nostrils instead of beak,
two small curved horns on top of head, no comb,
scaly skin with small spikes along jawline,
cute but intimidating baby dragon expression,
three quarter view facing right,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
];

// ─── 몸통 프롬프트 ──────────────────────────────────────
const BODY_PROMPTS = [
  {
    name: "01_통통_round-chubby",
    prompt: `a sealed plush short and fat round body,
a fictional character's torso only,
naturally born without a head,
no arms, no legs, no limbs, no appendages,
chubby egg-like shape, continuous curved top,
no flat top, no cut surface,
fully sealed smooth surface,
only a small tail on the left side,
three quarter view, facing right,
entire body visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "02_길쭉이_tall-slim",
    prompt: `a sealed capsule-like tall narrow body,
a fictional character's torso only,
naturally born without a head,
no arms, no legs, no limbs, no appendages,
slim elongated egg shape, continuous curved top,
no flat top, no cut surface,
fully sealed smooth surface,
only a small tail on the left side,
three quarter view, facing right,
entire body visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "03_근육질_muscular",
    prompt: `a sealed plush wide bulky muscular body,
a fictional character's torso only,
naturally born without a head,
no arms, no legs, no limbs, no appendages,
broad and strong barrel chest shape, continuous curved top,
no flat top, no cut surface,
fully sealed smooth surface,
only a small tail on the left side,
three quarter view, facing right,
entire body visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "04_가시갑옷_spiky-armored",
    prompt: `a sealed armored shell-like body,
a fictional character's torso only,
naturally born without a head,
no arms, no legs, no limbs, no appendages,
covered with scales and bone spines, continuous curved top,
no flat top, no cut surface,
fully sealed smooth surface,
only a small tail on the left side,
three quarter view, facing right,
entire body visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "05_녹아내림_melting-blob",
    prompt: `a sealed melting glob-like body,
a fictional character's torso only,
naturally born without a head,
no arms, no legs, no limbs, no appendages,
oozing dripping deformed shape, continuous curved top,
no flat top, no cut surface,
fully sealed smooth surface,
only a small tail on the left side,
three quarter view, facing right,
entire body visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "06_납작이_flat-pancake",
    prompt: `a sealed plush extremely flat squished body,
a fictional character's torso only,
naturally born without a head,
no arms, no legs, no limbs, no appendages,
pancake shaped wide and thin compressed form, continuous curved top,
no flat top, no cut surface,
fully sealed smooth surface,
only a small tail on the left side,
three quarter view, facing right,
entire body visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "07_풍선_inflated-balloon",
    prompt: `a sealed plush inflated balloon-like body,
a fictional character's torso only,
naturally born without a head,
no arms, no legs, no limbs, no appendages,
puffed up sphere about to pop, stretched tight skin, continuous curved top,
no flat top, no cut surface,
fully sealed smooth surface,
only a small tail on the left side,
three quarter view, facing right,
entire body visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "08_뼈다귀_skeletal-bony",
    prompt: `a sealed bony pouch-like thin body,
a fictional character's torso only,
naturally born without a head,
no arms, no legs, no limbs, no appendages,
starving shape with visible ribs showing through skin, continuous curved top,
no flat top, no cut surface,
fully sealed smooth surface,
only a small tail on the left side,
three quarter view, facing right,
entire body visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "09_솜뭉치_fluffy-cotton",
    prompt: `isolated baby chick torso, extremely fluffy cotton ball body,
no head, no legs, no face, no eyes, no neck, no neck stump,
flat clean top edge, overflowing feathers, puffball shape, messy plumage,
three quarter view, chest facing right, neck stump opening on the right side, tail on the left side,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "10_결정체_crystalline",
    prompt: `isolated baby chick torso, crystalline angular body,
no head, no legs, no face, no eyes, no neck, no neck stump,
flat clean top edge, geometric faceted surface, gem-like structure,
three quarter view, chest facing right, neck stump opening on the right side, tail on the left side,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "11_슬라임_gelatinous-slime",
    prompt: `isolated baby chick torso, gelatinous translucent body,
no head, no legs, no face, no eyes, no neck, no neck stump,
flat clean top edge, jelly-like wobbling shape, see-through slime,
three quarter view, chest facing right, neck stump opening on the right side, tail on the left side,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "12_봉합_stitched-franken",
    prompt: `isolated baby chick torso, stitched together patchwork body,
no head, no legs, no face, no eyes, no neck, no neck stump,
flat clean top edge, visible stitches and seams, mismatched body parts sewn together,
three quarter view, chest facing right, neck stump opening on the right side, tail on the left side,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "13_기계_cyborg-mechanical",
    prompt: `isolated baby chick torso, half mechanical cyborg body,
no head, no legs, no face, no eyes, no neck, no neck stump,
flat clean top edge, metal plates, exposed gears, bolts and screws,
three quarter view, chest facing right, neck stump opening on the right side, tail on the left side,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "14_촉수_eldritch-tentacle",
    prompt: `isolated baby chick torso, eldritch tentacle body,
no head, no legs, no face, no eyes, no neck, no neck stump,
flat clean top edge, small tentacles sprouting from torso, lovecraftian mutation,
three quarter view, chest facing right, neck stump opening on the right side, tail on the left side,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "15_알껍질_cracked-eggshell",
    prompt: `isolated baby chick torso, cracked eggshell body,
no head, no legs, no face, no eyes, no neck, no neck stump,
flat clean top edge, half hatched, broken shell pieces still attached,
three quarter view, chest facing right, neck stump opening on the right side, tail on the left side,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
  {
    name: "16_용_dragon",
    prompt: `isolated baby chick torso, dragon-like scaly body,
no head, no legs, no face, no eyes, no neck, no neck stump,
flat clean top edge, small dragon wings on back, reptilian scales covering body,
spiky ridges along the spine, thick muscular chest,
three quarter view, chest facing right, neck stump opening on the right side, tail on the left side,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
high resolution digital art, cartoon style,
Edmund McMillen grotesque cute style,
grayscale monochrome, white background,
NOT pixel art, NOT pixelated, NOT 3d, NOT realistic`,
  },
];

// ─── 날개 프롬프트 ──────────────────────────────────────
const WING_PROMPTS = [
  {
    name: "01_뭉툭기본_stubby-basic",
    prompt: `a single isolated small stubby wing,
a cartoon baby bird wing, short and round,
soft downy feathers, cute and tiny,
wing base on the left, wing tip extending to the right, horizontal angle,
entire wing visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "02_천사날개_angel-feathered",
    prompt: `a single isolated small angel wing,
layered soft feathers, elegant and fluffy,
cute miniature angelic wing,
wing base on the left, wing tip extending to the right, horizontal angle,
entire wing visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "03_박쥐날개_bat-leather",
    prompt: `a single isolated small bat wing,
leathery membrane stretched between thin bones,
cute miniature bat wing, slightly torn edges,
wing base on the left, wing tip extending to the right, horizontal angle,
entire wing visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "04_뼈날개_bone-skeletal",
    prompt: `a single isolated small skeletal bone wing,
bare bones with no membrane, exposed joint structure,
cute miniature skeleton wing,
wing base on the left, wing tip extending to the right, horizontal angle,
entire wing visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "05_곤충날개_insect-transparent",
    prompt: `a single isolated small insect wing,
transparent veined dragonfly-like wing, delicate and thin,
cute miniature bug wing,
wing base on the left, wing tip extending to the right, horizontal angle,
entire wing visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "06_촉수날개_tentacle-fleshy",
    prompt: `a single isolated small fleshy tentacle appendage,
meat-like wing replacement, organic and grotesque,
cute miniature fleshy protrusion with suckers,
wing base on the left, wing tip extending to the right, horizontal angle,
entire wing visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "07_기계날개_mech-cyber",
    prompt: `a single isolated small mechanical wing,
metal plates and gears, cybernetic prosthetic wing,
cute miniature robot wing,
wing base on the left, wing tip extending to the right, horizontal angle,
entire wing visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "08_결정날개_crystal-gem",
    prompt: `a single isolated small crystal wing,
jagged gem-like structure, translucent mineral formation,
cute miniature crystalline wing,
wing base on the left, wing tip extending to the right, horizontal angle,
entire wing visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
];

// ─── 다리 프롬프트 ──────────────────────────────────────
const LEG_PROMPTS = [
  {
    name: "01_통통기본_stubby-basic",
    prompt: `a pair of small stubby baby bird legs,
short chubby round legs with tiny round feet,
soft and pudgy, cute cartoon baby chick legs,
three quarter view facing right, both legs visible,
entire legs visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "02_길다리_long-stilt",
    prompt: `a pair of tall thin stilt-like bird legs,
very long skinny stick legs with knobby knees,
elegant but absurdly long, cute cartoon crane legs,
three quarter view facing right, both legs visible,
entire legs visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "03_맹금발톱_raptor-clawed",
    prompt: `a pair of strong raptor bird legs,
muscular scaly legs with sharp curved talons,
fierce predator claws, dinosaur-like feet,
three quarter view facing right, both legs visible,
entire legs visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "04_뼈다리_bone-skeletal",
    prompt: `a pair of thin skeletal bone bird legs,
bare bones with visible joints, bony knees,
withered undead skeleton legs, no flesh,
three quarter view facing right, both legs visible,
entire legs visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "05_물갈퀴_webbed-duck",
    prompt: `a pair of flat webbed duck feet legs,
short legs with wide flat webbed toes,
cute cartoon duck feet, orange-style webbing,
three quarter view facing right, both legs visible,
entire legs visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "06_촉수다리_tentacle-fleshy",
    prompt: `a pair of fleshy tentacle legs,
organic meat-like appendages replacing legs,
short squid tentacles with suckers, grotesque mutation,
three quarter view facing right, both tentacles visible,
entire tentacles visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "07_기계다리_mech-cyber",
    prompt: `a pair of mechanical robot bird legs,
metal prosthetic legs with joints and pistons,
cybernetic chicken legs, bolts and gears visible,
three quarter view facing right, both legs visible,
entire legs visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
  {
    name: "08_결정다리_crystal-gem",
    prompt: `a pair of crystalline gem bird legs,
jagged mineral crystal legs, translucent stone formation,
faceted geometric legs ending in crystal feet,
three quarter view facing right, both legs visible,
entire legs visible within frame, centered composition with margin,
thick black outlines, flat cel shading,
smooth vector illustration, clean smooth lines,
grayscale monochrome, white background,
grotesque cute cartoon style`,
  },
];

// ─── API 호출 ───────────────────────────────────────────
async function generateImage(prompt, model) {
  const url = `${API_BASE}/${model}:generateContent?key=${API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `API 오류 (${response.status}): ${error.error?.message || JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];

  // 이미지 파트 찾기
  const imagePart = parts.find((p) => p.inlineData || p.inline_data);
  if (!imagePart) {
    const textPart = parts.find((p) => p.text);
    throw new Error(
      `이미지가 생성되지 않았습니다. 응답: ${textPart?.text || "빈 응답"}`
    );
  }

  const imageData = imagePart.inlineData || imagePart.inline_data;
  return Buffer.from(imageData.data, "base64");
}

// ─── 메인 ───────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  // 인자 파싱
  let type = "all"; // head, body, wing, leg, all
  let indices = null; // null = 전체, [1,3,5] = 특정 번호
  let model = DEFAULT_MODEL;
  let outputBase = path.resolve(__dirname, "../output/parts");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--type" && args[i + 1]) {
      type = args[i + 1];
      i++;
    } else if (args[i] === "--index" && args[i + 1]) {
      indices = args[i + 1].split(",").map(Number);
      i++;
    } else if (args[i] === "--model" && args[i + 1]) {
      model = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputBase = path.resolve(args[i + 1]);
      i++;
    }
  }

  console.log(`모델: ${model}`);
  console.log(`타입: ${type}`);
  console.log(`출력: ${outputBase}`);
  if (indices) console.log(`선택 번호: ${indices.join(", ")}`);
  console.log("---");

  // 생성할 프롬프트 목록
  const tasks = [];

  if (type === "all" || type === "head") {
    HEAD_PROMPTS.forEach((p, i) => {
      const num = i + 1;
      if (!indices || indices.includes(num)) {
        tasks.push({ ...p, category: "head", num });
      }
    });
  }

  if (type === "all" || type === "body") {
    BODY_PROMPTS.forEach((p, i) => {
      const num = i + 1;
      if (!indices || indices.includes(num)) {
        tasks.push({ ...p, category: "body", num });
      }
    });
  }

  if (type === "all" || type === "wing") {
    WING_PROMPTS.forEach((p, i) => {
      const num = i + 1;
      if (!indices || indices.includes(num)) {
        tasks.push({ ...p, category: "wing", num });
      }
    });
  }

  if (type === "all" || type === "leg") {
    LEG_PROMPTS.forEach((p, i) => {
      const num = i + 1;
      if (!indices || indices.includes(num)) {
        tasks.push({ ...p, category: "leg", num });
      }
    });
  }

  console.log(`총 ${tasks.length}개 이미지 생성 예정\n`);

  let success = 0;
  let fail = 0;

  for (const task of tasks) {
    const outDir = path.join(outputBase, task.category);
    fs.mkdirSync(outDir, { recursive: true });

    const outFile = path.join(outDir, `${task.name}.png`);

    // 이미 존재하면 건너뛰기
    if (fs.existsSync(outFile)) {
      console.log(`[건너뜀] ${task.category}/${task.name} (이미 존재)`);
      continue;
    }

    console.log(
      `[생성 중] ${task.category}/${task.name} (${success + fail + 1}/${tasks.length})...`
    );

    try {
      const imageBuffer = await generateImage(task.prompt, model);
      fs.writeFileSync(outFile, imageBuffer);
      console.log(`  -> 저장 완료: ${outFile}`);
      success++;
    } catch (error) {
      console.error(`  -> 실패: ${error.message}`);
      fail++;
    }

    // rate limit 방지 딜레이
    if (tasks.indexOf(task) < tasks.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n완료! 성공: ${success}, 실패: ${fail}`);
  console.log(`출력 경로: ${outputBase}`);
}

main().catch(console.error);
