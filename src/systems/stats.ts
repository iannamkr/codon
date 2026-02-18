// ─── 스탯 파생 시스템 ───
// 기본 4스탯(STR/DEX/RES/MUT)에서 전투 파생 스탯을 계산한다.
// 체질에 따라 파생 배율이 달라진다.

import type { Stats, DerivedStats } from "../data/types";
import { Constitution } from "../data/types";

/** 체질별 보정 배율 (임시값, 밸런싱 후 조정) */
const CONSTITUTION_MODIFIERS: Record<
  Constitution,
  Partial<Record<keyof DerivedStats, number>>
> = {
  [Constitution.Aggro]: { atk: 1.2, defPct: 0.8 },
  [Constitution.Fortress]: { defPct: 1.2, atk: 0.8 },
  [Constitution.Swift]: { spd: 1.2, hp: 0.8 },
  [Constitution.Regen]: { hp: 1.2, spd: 0.8 },
  [Constitution.Mutant]: { critPct: 1.2, mutChance: 1.2, defPct: 0.8 },
  [Constitution.Balance]: {},
};

/**
 * 기본 스탯 + 체질로부터 전투 파생 스탯을 계산한다.
 *
 * 공식:
 *   HP       = 200 * (1 + STR/50)
 *   ATK      = 20  * (1 + STR/50)
 *   SPD      = 20  * (1 + DEX/50)
 *   DEF%     = RES / (RES + 100)
 *   CRIT%    = MUT / (MUT + 100)
 *   CRIT_DMG = 1.5 + MUT/200
 *   MUT_CHANCE = MUT / (MUT + 100)
 */
export function deriveStats(
  base: Stats,
  constitution: Constitution,
): DerivedStats {
  // 기본 파생값 계산
  let hp = 200 * (1 + base.str / 50);
  let atk = 20 * (1 + base.str / 50);
  let spd = 20 * (1 + base.dex / 50);
  let defPct = base.res / (base.res + 100);
  let critPct = base.mut / (base.mut + 100);
  let critDmg = 1.5 + base.mut / 200;
  let mutChance = base.mut / (base.mut + 100);

  // 체질 보정 적용
  const mods = CONSTITUTION_MODIFIERS[constitution];
  if (mods.hp != null) hp *= mods.hp;
  if (mods.atk != null) atk *= mods.atk;
  if (mods.spd != null) spd *= mods.spd;
  if (mods.defPct != null) defPct *= mods.defPct;
  if (mods.critPct != null) critPct *= mods.critPct;
  if (mods.mutChance != null) mutChance *= mods.mutChance;

  return {
    hp,
    atk,
    spd,
    defPct,
    critPct,
    critDmg,
    mutChance,
  };
}
