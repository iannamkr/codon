import { describe, it, expect } from "vitest";
import { generateOrganicVertices } from "../../src/ui/lab/organic-rect";

describe("generateOrganicVertices()", () => {
  it("같은 시드 → 같은 결과", () => {
    const v1 = generateOrganicVertices(0, 0, 100, 50, { seed: 42 });
    const v2 = generateOrganicVertices(0, 0, 100, 50, { seed: 42 });
    expect(v1).toEqual(v2);
  });

  it("다른 시드 → 다른 결과", () => {
    const v1 = generateOrganicVertices(0, 0, 100, 50, { seed: 1 });
    const v2 = generateOrganicVertices(0, 0, 100, 50, { seed: 2 });
    expect(v1).not.toEqual(v2);
  });

  it("정점 수 = segments * 4", () => {
    const segments = 6;
    const v = generateOrganicVertices(0, 0, 100, 50, { segments });
    expect(v.length).toBe(segments * 4);
  });

  it("기본 segments=8 → 정점 32개", () => {
    const v = generateOrganicVertices(10, 20, 100, 50);
    expect(v.length).toBe(32);
  });

  it("모든 정점이 amplitude 범위 내", () => {
    const amplitude = 3;
    const x = 10, y = 20, w = 100, h = 50;
    const v = generateOrganicVertices(x, y, w, h, { amplitude, seed: 99 });
    for (const p of v) {
      expect(p.x).toBeGreaterThanOrEqual(x - amplitude);
      expect(p.x).toBeLessThanOrEqual(x + w + amplitude);
      expect(p.y).toBeGreaterThanOrEqual(y - amplitude);
      expect(p.y).toBeLessThanOrEqual(y + h + amplitude);
    }
  });

  it("amplitude=0이면 정점이 정확히 사각형 위에 위치", () => {
    const x = 0, y = 0, w = 100, h = 50;
    const v = generateOrganicVertices(x, y, w, h, { amplitude: 0, segments: 4 });
    // 모든 정점이 사각형 경계 위에 있어야 함
    for (const p of v) {
      const onTopBottom = (p.y === y || p.y === y + h) && p.x >= x && p.x <= x + w;
      const onLeftRight = (p.x === x || p.x === x + w) && p.y >= y && p.y <= y + h;
      expect(onTopBottom || onLeftRight).toBe(true);
    }
  });
});
