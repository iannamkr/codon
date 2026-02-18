#!/usr/bin/env python3
"""PixelLab API를 사용하여 실험체 이미지에서 스프라이트 애니메이션 생성 (샘플 테스트)"""

import os
import sys
from pathlib import Path
from PIL import Image
from dotenv import load_dotenv
import pixellab

# .env 로드
load_dotenv(Path(__file__).parent.parent / ".env")

API_KEY = os.getenv("PIXELLAB_API_KEY")
if not API_KEY:
    print("ERROR: PIXELLAB_API_KEY not found in .env")
    sys.exit(1)

# 설정
PROJECT_ROOT = Path(__file__).parent.parent
INPUT_IMAGE = PROJECT_ROOT / "public/assets/experiments/base_pale-white_round-body_big-eyes.png"
OUTPUT_DIR = PROJECT_ROOT / "public/assets/sprites"

ACTIONS = {
    "idle": {"action": "idle breathing animation", "n_frames": 4},
    "attack": {"action": "attack hitting animation", "n_frames": 4},
    "die": {"action": "dying falling animation", "n_frames": 4},
}

def main():
    # 출력 디렉토리 생성
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 클라이언트 초기화
    client = pixellab.Client(secret=API_KEY)

    # 레퍼런스 이미지 로드
    ref_image = Image.open(INPUT_IMAGE).convert("RGBA")
    print(f"입력 이미지: {INPUT_IMAGE.name} ({ref_image.size})")

    # 캐릭터 이름 추출 (파일명에서)
    char_name = INPUT_IMAGE.stem  # e.g. "base_pale-white_round-body_big-eyes"

    for action_name, config in ACTIONS.items():
        print(f"\n--- {action_name} 애니메이션 생성 중... ---")
        try:
            response = client.animate_with_text(
                image_size={"width": 64, "height": 64},
                description="cute small round creature, pixel art game character",
                action=config["action"],
                reference_image=ref_image,
                view="side",
                direction="east",
                n_frames=config["n_frames"],
                negative_description="",
                image_guidance_scale=1.5,
                text_guidance_scale=7.5,
                seed=42,
            )

            # 개별 프레임 저장
            frames_dir = OUTPUT_DIR / char_name / action_name
            frames_dir.mkdir(parents=True, exist_ok=True)

            pil_frames = []
            for i, img in enumerate(response.images):
                frame = img.pil_image()
                frame_path = frames_dir / f"frame_{i:02d}.png"
                frame.save(frame_path)
                pil_frames.append(frame)
                print(f"  프레임 {i}: {frame_path} ({frame.size})")

            # 스프라이트 시트 생성 (가로 연결)
            n = len(pil_frames)
            w, h = pil_frames[0].size
            sheet = Image.new("RGBA", (w * n, h), (0, 0, 0, 0))
            for i, frame in enumerate(pil_frames):
                sheet.paste(frame, (i * w, 0))

            sheet_path = OUTPUT_DIR / char_name / f"{action_name}_sheet.png"
            sheet.save(sheet_path)
            print(f"  시트: {sheet_path} ({sheet.size})")

            print(f"  사용량: {response.usage}")

        except Exception as e:
            print(f"  ERROR: {e}")

    print(f"\n완료! 결과: {OUTPUT_DIR / char_name}")


if __name__ == "__main__":
    main()
