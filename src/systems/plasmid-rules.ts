// ─── 플라스미드 규칙 적용 ───
// 12종 플라스미드 각각이 전투 설정(BattleConfig)을 어떻게 변경하는지 정의한다.

/** 전투 설정. 플라스미드에 의해 변경됨. */
export interface BattleConfig {
  maxPhases: number;           // 기본 4
  codonsPerSequence: number;   // 기본 3
  useSpdForTurnOrder: boolean; // 기본 true
  reverseSlotOrder: boolean;   // 기본 false
  useInteractions: boolean;    // 기본 true
  mutationEnabled: boolean;    // 기본 true
  mutationAutoAccept: boolean; // 기본 false
  mutationPermanent: boolean;  // 기본 true
  mutationMultiplier: number;  // 기본 1.0
  elementEnabled: boolean;     // 기본 true
  damageMultiplier: number;    // 기본 1.0
  resonatorMode: boolean;      // 기본 false (공명체: 3코돈 같은태그 시 x3)
  mirrorMode: boolean;         // 기본 false (거울: 상대 시퀀스 복사)
  chimeraMode: boolean;        // 기본 false (키메라: 랜덤 속성)
  parasiteMode: boolean;       // 기본 false (기생체: 상대 플라스미드 무효)
  statMultiplier: number;      // 기본 1.0 (순수 서열: 1.2)
}

/** 기본 BattleConfig 생성 */
export function createDefaultConfig(): BattleConfig {
  return {
    maxPhases: 4,
    codonsPerSequence: 3,
    useSpdForTurnOrder: true,
    reverseSlotOrder: false,
    useInteractions: true,
    mutationEnabled: true,
    mutationAutoAccept: false,
    mutationPermanent: true,
    mutationMultiplier: 1.0,
    elementEnabled: true,
    damageMultiplier: 1.0,
    resonatorMode: false,
    mirrorMode: false,
    chimeraMode: false,
    parasiteMode: false,
    statMultiplier: 1.0,
  };
}

/** 플라스미드 규칙을 BattleConfig에 적용. 원본을 변경하지 않고 새 객체 반환. */
export function applyPlasmidRules(
  plasmidId: string,
  config: BattleConfig,
): BattleConfig {
  const c = { ...config };

  switch (plasmidId) {
    // ── 전투 (Combat) ──
    case "reverse":
      c.reverseSlotOrder = true;
      c.useSpdForTurnOrder = false;
      break;
    case "resonator":
      c.useInteractions = false;
      c.resonatorMode = true;
      break;
    case "mirror":
      c.mirrorMode = true;
      break;
    case "venom":
      c.maxPhases = 1;
      c.damageMultiplier = 4.0;
      break;

    // ── 변이 (Mutation) ──
    case "unstable":
      c.mutationAutoAccept = true;
      c.mutationMultiplier = 2.0;
      break;
    case "pure":
      c.mutationEnabled = false;
      c.statMultiplier = 1.2;
      break;
    case "adaptive":
      c.mutationPermanent = false;
      break;

    // ── 속성 (Attribute) ──
    case "null_attr":
      c.elementEnabled = false;
      c.damageMultiplier = 1.3;
      break;
    case "chimera":
      c.chimeraMode = true;
      break;

    // ── 구조 (Structure) ──
    case "overcharge":
      c.codonsPerSequence = 2;
      c.maxPhases = 5;
      break;
    case "compress":
      c.maxPhases = 2;
      c.codonsPerSequence = 6;
      break;

    // ── 메타 (Meta) ──
    case "parasite":
      c.parasiteMode = true;
      break;

    // 알 수 없는 플라스미드 → 변경 없음
    default:
      break;
  }

  return c;
}
