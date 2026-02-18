// ─── 플라스미드 효과 미리보기 ───
// 순수 함수. UI에서 호버 시 스탯 변화/설정 변경을 보여준다.

import type { Plasmid, Stats, DerivedStats } from "../data/types";
import { Constitution } from "../data/types";
import { deriveStats } from "./stats";
import { applyPlasmidRules, createDefaultConfig, BattleConfig } from "./plasmid-rules";

export interface StatDelta {
  key: string;
  label: string;
  before: number;
  after: number;
  delta: number;
}

export interface ConfigChange {
  key: string;
  label: string;
  before: string;
  after: string;
}

export interface PlasmidPreviewResult {
  statDeltas: StatDelta[];
  configChanges: ConfigChange[];
  hasStatChange: boolean;
}

/** BattleConfig 키 → 한글 레이블 */
const CONFIG_LABELS: Record<string, string> = {
  maxPhases: "최대 페이즈",
  codonsPerSequence: "시퀀스당 코돈",
  useSpdForTurnOrder: "SPD 선후공",
  reverseSlotOrder: "슬롯 역순",
  useInteractions: "인접 상호작용",
  mutationEnabled: "변이 시스템",
  mutationAutoAccept: "변이 자동수락",
  mutationPermanent: "변이 영구 적용",
  mutationMultiplier: "변이 확률 배율",
  elementEnabled: "속성 상성",
  damageMultiplier: "데미지 배율",
  resonatorMode: "공명체 모드",
  mirrorMode: "거울 모드",
  chimeraMode: "키메라 모드",
  parasiteMode: "기생체 모드",
  statMultiplier: "스탯 배율",
};

/** 파생 스탯 키 → 한글 레이블 */
const DERIVED_LABELS: Record<string, string> = {
  hp: "HP",
  atk: "ATK",
  spd: "SPD",
  defPct: "DEF%",
  critPct: "CRIT%",
  critDmg: "CRIT DMG",
  mutChance: "변이 확률",
};

function formatConfigValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "ON" : "OFF";
  return String(value);
}

/**
 * 플라스미드 적용 시 변화 미리보기.
 * statMultiplier가 1.0이 아니면 파생 스탯 델타 계산,
 * 나머지 BattleConfig 변경은 텍스트로 표시.
 */
export function previewPlasmidEffect(
  plasmid: Plasmid,
  baseStats: Stats,
  constitution: Constitution,
): PlasmidPreviewResult {
  const defaultConfig = createDefaultConfig();
  const newConfig = applyPlasmidRules(plasmid.id, defaultConfig);

  const statDeltas: StatDelta[] = [];
  const configChanges: ConfigChange[] = [];

  // statMultiplier 변화 시 파생 스탯 델타 계산
  const hasStatChange = newConfig.statMultiplier !== defaultConfig.statMultiplier;

  if (hasStatChange) {
    const before = deriveStats(baseStats, constitution);
    // after: 파생 스탯에 statMultiplier 적용
    const after: DerivedStats = { ...before };
    const mult = newConfig.statMultiplier;
    (Object.keys(after) as (keyof DerivedStats)[]).forEach((key) => {
      (after as any)[key] = before[key] * mult;
    });

    for (const key of Object.keys(before) as (keyof DerivedStats)[]) {
      const bVal = before[key];
      const aVal = after[key];
      const delta = aVal - bVal;
      if (Math.abs(delta) > 0.001) {
        statDeltas.push({
          key,
          label: DERIVED_LABELS[key] ?? key,
          before: bVal,
          after: aVal,
          delta,
        });
      }
    }
  }

  // BattleConfig 변경 비교 (statMultiplier 제외)
  for (const key of Object.keys(defaultConfig) as (keyof BattleConfig)[]) {
    if (key === "statMultiplier") continue;
    if (defaultConfig[key] !== newConfig[key]) {
      configChanges.push({
        key,
        label: CONFIG_LABELS[key] ?? key,
        before: formatConfigValue(defaultConfig[key]),
        after: formatConfigValue(newConfig[key]),
      });
    }
  }

  return { statDeltas, configChanges, hasStatChange };
}
