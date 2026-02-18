// ─── 데미지 계산기 ───
// 플레이스홀더 구현. 아미노산별 base power, 하위 Gene 보너스 등은 기획 미정.

/** 데미지 계산 입력 */
export interface DamageParams {
  attackerAtk: number;
  defenderDefPct: number;   // 0~1
  critPct: number;           // 0~1
  critDmg: number;           // 배율 (예: 1.75)
  elementMultiplier: number; // 속성 상성 배율
  damageMultiplier: number;  // 플라스미드 등 외부 배율
  rng?: () => number;
}

/** 데미지 계산 결과 */
export interface DamageResult {
  damage: number;
  isCrit: boolean;
}

/**
 * 데미지 계산 (플레이스홀더).
 *
 * damage = ATK * (1 - DEF%) * elementMultiplier * damageMultiplier
 * 크리티컬: rng() < critPct 이면 damage * critDmg
 *
 * !! 이것은 플레이스홀더. 아미노산별 base power, 하위 Gene 보너스 등은 기획 미정.
 */
export function calculateDamage(params: DamageParams): DamageResult {
  const rng = params.rng ?? Math.random;

  let damage =
    params.attackerAtk *
    (1 - params.defenderDefPct) *
    params.elementMultiplier *
    params.damageMultiplier;

  const isCrit = params.critPct > 0 && rng() < params.critPct;
  if (isCrit) {
    damage *= params.critDmg;
  }

  return { damage, isCrit };
}
