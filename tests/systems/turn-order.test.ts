import { describe, it, expect } from "vitest";
import { determineOrder } from "../../src/systems/turn-order";

describe("선후공 판정: determineOrder()", () => {
  it("SPD가 높은 쪽이 선공한다", () => {
    expect(determineOrder(40, 30)).toBe("my");
    expect(determineOrder(30, 40)).toBe("enemy");
  });

  it("SPD 차이가 매우 클 때도 정상 동작한다", () => {
    expect(determineOrder(100, 1)).toBe("my");
    expect(determineOrder(1, 100)).toBe("enemy");
  });

  it("SPD 동점 시 rng로 결정한다 (rng < 0.5 = my)", () => {
    expect(determineOrder(30, 30, () => 0.3)).toBe("my");
  });

  it("SPD 동점 시 rng로 결정한다 (rng >= 0.5 = enemy)", () => {
    expect(determineOrder(30, 30, () => 0.5)).toBe("enemy");
    expect(determineOrder(30, 30, () => 0.9)).toBe("enemy");
  });

  it("SPD 0 동점도 rng로 결정한다", () => {
    expect(determineOrder(0, 0, () => 0.1)).toBe("my");
    expect(determineOrder(0, 0, () => 0.7)).toBe("enemy");
  });
});
