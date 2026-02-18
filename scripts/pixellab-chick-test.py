#!/usr/bin/env python3
"""병아리 이미지에서 5가지 액션 스프라이트 애니메이션 생성 (16프레임)"""

import os
import sys
from pathlib import Path
from PIL import Image
from dotenv import load_dotenv
import pixellab

load_dotenv(Path(__file__).parent.parent / ".env")

API_KEY = os.getenv("PIXELLAB_API_KEY")
if not API_KEY:
    print("ERROR: PIXELLAB_API_KEY not found in .env")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).parent.parent
INPUT_IMAGE = Path("/Users/ian.nam/Downloads/Gemini_Generated_Image_qbxgavqbxgavqbxg.png")
OUTPUT_DIR = PROJECT_ROOT / "public/assets/sprites/chick-test"

ACTIONS = {
    "idle": "idle breathing animation",
    "attack": "attack hitting animation",
    "die": "dying falling animation",
    "hurt": "hurt flinching animation",
    "cast_spell": "cast spell magic animation",
}

N_FRAMES = 16


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    client = pixellab.Client(secret=API_KEY)

    # 입력 이미지 로드 + 64x64 리사이즈
    raw = Image.open(INPUT_IMAGE).convert("RGBA")
    print(f"원본 이미지: {raw.size}")
    ref_image = raw.resize((64, 64), Image.LANCZOS)
    ref_image.save(OUTPUT_DIR / "reference_64x64.png")
    print(f"리사이즈: {ref_image.size}")

    for action_name, action_desc in ACTIONS.items():
        print(f"\n--- {action_name} ({N_FRAMES}프레임) 생성 중... ---")
        try:
            response = client.animate_with_text(
                image_size={"width": 64, "height": 64},
                description="cute round chick bird, cartoon style game character, black outline",
                action=action_desc,
                reference_image=ref_image,
                view="side",
                direction="east",
                n_frames=N_FRAMES,
                negative_description="",
                image_guidance_scale=1.5,
                text_guidance_scale=7.5,
                seed=42,
            )

            # 개별 프레임 저장
            frames_dir = OUTPUT_DIR / action_name
            frames_dir.mkdir(parents=True, exist_ok=True)

            pil_frames = []
            for i, img in enumerate(response.images):
                frame = img.pil_image()
                frame.save(frames_dir / f"frame_{i:02d}.png")
                pil_frames.append(frame)

            # 스프라이트 시트 (가로)
            w, h = pil_frames[0].size
            sheet = Image.new("RGBA", (w * len(pil_frames), h), (0, 0, 0, 0))
            for i, frame in enumerate(pil_frames):
                sheet.paste(frame, (i * w, 0))
            sheet.save(OUTPUT_DIR / f"{action_name}_sheet.png")

            print(f"  완료: {len(pil_frames)}프레임, 시트: {sheet.size}, 비용: {response.usage}")

        except Exception as e:
            print(f"  ERROR: {e}")

    print(f"\n전체 완료! 결과: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
