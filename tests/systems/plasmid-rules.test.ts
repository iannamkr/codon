import { describe, it, expect, beforeEach } from "vitest";
import { applyPlasmidRules, createDefaultConfig } from "../../src/systems/plasmid-rules";
import type { BattleConfig } from "../../src/systems/plasmid-rules";

describe("플라스미드 규칙 적용: applyPlasmidRules()", () => {
  let defaultConfig: BattleConfig;

  beforeEach(() => {
    defaultConfig = createDefaultConfig();
  });

  it("기본 설정이 올바르다", () => {
    expect(defaultConfig.maxPhases).toBe(4);
    expect(defaultConfig.codonsPerSequence).toBe(3);
    expect(defaultConfig.useSpdForTurnOrder).toBe(true);
    expect(defaultConfig.reverseSlotOrder).toBe(false);
    expect(defaultConfig.useInteractions).toBe(true);
    expect(defaultConfig.mutationEnabled).toBe(true);
    expect(defaultConfig.mutationAutoAccept).toBe(false);
    expect(defaultConfig.mutationPermanent).toBe(true);
    expect(defaultConfig.mutationMultiplier).toBe(1.0);
    expect(defaultConfig.elementEnabled).toBe(true);
    expect(defaultConfig.damageMultiplier).toBe(1.0);
    expect(defaultConfig.resonatorMode).toBe(false);
    expect(defaultConfig.mirrorMode).toBe(false);
    expect(defaultConfig.chimeraMode).toBe(false);
    expect(defaultConfig.parasiteMode).toBe(false);
    expect(defaultConfig.statMultiplier).toBe(1.0);
  });

  // ── 전투 (Combat) ──

  it("역행(reverse): SPD 선후공 제거 + 슬롯 역순", () => {
    const config = applyPlasmidRules("reverse", defaultConfig);
    expect(config.reverseSlotOrder).toBe(true);
    expect(config.useSpdForTurnOrder).toBe(false);
  });

  it("공명체(resonator): 인접 상호작용 제거 + resonatorMode", () => {
    const config = applyPlasmidRules("resonator", defaultConfig);
    expect(config.useInteractions).toBe(false);
    expect(config.resonatorMode).toBe(true);
  });

  it("거울(mirror): mirrorMode 활성", () => {
    const config = applyPlasmidRules("mirror", defaultConfig);
    expect(config.mirrorMode).toBe(true);
  });

  it("선독(venom): Phase 1만 + 위력 x4", () => {
    const config = applyPlasmidRules("venom", defaultConfig);
    expect(config.maxPhases).toBe(1);
    expect(config.damageMultiplier).toBe(4.0);
  });

  // ── 변이 (Mutation) ──

  it("불안정 서열(unstable): 자동 수락 + 확률 2배", () => {
    const config = applyPlasmidRules("unstable", defaultConfig);
    expect(config.mutationAutoAccept).toBe(true);
    expect(config.mutationMultiplier).toBe(2.0);
  });

  it("순수 서열(pure): 변이 제거 + 스탯 +20%", () => {
    const config = applyPlasmidRules("pure", defaultConfig);
    expect(config.mutationEnabled).toBe(false);
    expect(config.statMultiplier).toBe(1.2);
  });

  it("적응체(adaptive): 변이 비영구 + 효과 0.5", () => {
    const config = applyPlasmidRules("adaptive", defaultConfig);
    expect(config.mutationPermanent).toBe(false);
    // 적응체의 변이 효과 감소는 구조적 플래그만 설정
  });

  // ── 속성 (Attribute) ──

  it("무속성(null_attr): 상성 제거 + 데미지 +30%", () => {
    const config = applyPlasmidRules("null_attr", defaultConfig);
    expect(config.elementEnabled).toBe(false);
    expect(config.damageMultiplier).toBe(1.3);
  });

  it("키메라(chimera): chimeraMode 활성", () => {
    const config = applyPlasmidRules("chimera", defaultConfig);
    expect(config.chimeraMode).toBe(true);
  });

  // ── 구조 (Structure) ──

  it("과부하(overcharge): 코돈 2개/시퀀스 + 5페이즈", () => {
    const config = applyPlasmidRules("overcharge", defaultConfig);
    expect(config.codonsPerSequence).toBe(2);
    expect(config.maxPhases).toBe(5);
  });

  it("압축(compress): 2페이즈 + 코돈 6개", () => {
    const config = applyPlasmidRules("compress", defaultConfig);
    expect(config.maxPhases).toBe(2);
    expect(config.codonsPerSequence).toBe(6);
  });

  // ── 메타 (Meta) ──

  it("기생체(parasite): parasiteMode 활성", () => {
    const config = applyPlasmidRules("parasite", defaultConfig);
    expect(config.parasiteMode).toBe(true);
  });

  // ── 에지 케이스 ──

  it("알 수 없는 플라스미드 ID는 설정을 변경하지 않는다", () => {
    const config = applyPlasmidRules("unknown_plasmid", defaultConfig);
    expect(config).toEqual(defaultConfig);
  });
});
