// ─── 선후공 판정 ───
// SPD 비교로 선공/후공을 결정한다. 동점 시 랜덤.

/**
 * SPD 기반 선후공 판정.
 * SPD가 높은 쪽이 선공. 동점 시 rng로 결정 (< 0.5 = my).
 */
export function determineOrder(
  mySpd: number,
  enemySpd: number,
  rng: () => number = Math.random,
): "my" | "enemy" {
  if (mySpd > enemySpd) return "my";
  if (enemySpd > mySpd) return "enemy";
  return rng() < 0.5 ? "my" : "enemy";
}
