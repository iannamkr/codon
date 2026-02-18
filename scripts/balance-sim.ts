/**
 * 밸런스 시뮬레이션 배치 프로그램
 * ────────────────────────────────
 * 1000회 런을 시뮬레이션하여 게임 밸런스 지표를 수집한다.
 *
 * 실행: npx tsx scripts/balance-sim.ts
 */

import { initPool } from "../src/systems/BreedingPool";
import { createFromParent } from "../src/systems/CreatureFactory";
import { getBreedingCandidates, breed, getExpressionRate, generatePassiveChoices, rollBreedingDisorders } from "../src/systems/BreedingEngine";
import {
  startRun,
  generateEnemy,
  generateEnemySequence,
  applyBattleResult,
  applyBreeding,
  applyAbsorptionToRun,
  canBreed,
} from "../src/systems/RunManager";
import { resolveBattleWithPassives } from "../src/systems/BattleEngine";
import { generateAbsorptionChoices, canAbsorb } from "../src/systems/AbsorptionManager";
import { generatePlasmidReward, equipPlasmid, MAX_ACTIVE_PLASMIDS } from "../src/systems/PlasmidEngine";
import { MAX_PASSIVE_SLOTS, POOL_CANDIDATES } from "../src/data/balance";
import type { ICreature, ISequence, IPoolCreature } from "../src/data/types";

// ─── 설정 ───

const TOTAL_RUNS = 1000;
const SEED_BASE = 12345;

// ─── 시드 RNG ───

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── 결과 수집기 ───

interface RunResult {
  battles: number;
  wins: number;
  generation: number;
  breedingCount: number;
  finalHpPct: number;
  skillCount: number;
  passiveCount: number;
  plasmidCount: number;
  element: string;
}

interface ElementStats {
  count: number;
  totalBattles: number;
  totalWins: number;
  totalGen: number;
}

// ─── 시퀀스 생성 (플레이어) ───

function generatePlayerSequence(creature: ICreature, rng: () => number): ISequence {
  // 플레이어도 랜덤 배치 (AI vs AI 시뮬레이션)
  const skills = [...creature.skills.slice(0, 4)];
  for (let i = skills.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [skills[i], skills[j]] = [skills[j], skills[i]];
  }
  return skills as unknown as ISequence;
}

// ─── 단일 런 시뮬레이션 ───

function simulateRun(pool: IPoolCreature[], rng: () => number): RunResult {
  // 1. 부모 선택 → 자식 생성
  const candidates = getBreedingCandidates(pool, POOL_CANDIDATES, [], rng);
  const parentPc = candidates[Math.floor(rng() * candidates.length)];
  const expressionRate = getExpressionRate(parentPc.pickCount);
  const starter = createFromParent(parentPc.creature, rng, expressionRate);

  let state = startRun(starter, pool);

  // 2. 전투 루프 (최대 30전투 안전장치)
  const MAX_BATTLES = 30;

  while (!state.isOver && state.battleCount < MAX_BATTLES) {
    const enemy = generateEnemy(state.battleCount, rng);
    const playerSeq = generatePlayerSequence(state.creature, rng);
    const enemySeq = generateEnemySequence(enemy, rng);

    const result = resolveBattleWithPassives(
      state.creature,
      enemy,
      playerSeq,
      enemySeq,
      rng,
    );

    state = applyBattleResult(state, result);

    if (state.isOver) break;

    // 승리 보상: 스킬 흡수
    if (canAbsorb(state.creature)) {
      const choices = generateAbsorptionChoices(enemy, state.creature);
      if (choices.length > 0) {
        const picked = choices[Math.floor(rng() * choices.length)];
        state = applyAbsorptionToRun(state, picked);
      }
    }

    // 승리 보상: 플라스미드
    const plasmidReward = generatePlasmidReward(rng);
    if (plasmidReward) {
      const current = state.creature.activePlasmids ?? [];
      if (current.length < MAX_ACTIVE_PLASMIDS) {
        state = {
          ...state,
          creature: equipPlasmid(state.creature, plasmidReward),
        };
      }
    }

    // 교배 체크
    if (canBreed(state)) {
      const breedCandidates = getBreedingCandidates(state.pool, POOL_CANDIDATES, [state.creature.id], rng);
      if (breedCandidates.length > 0) {
        const partner = breedCandidates[Math.floor(rng() * breedCandidates.length)];
        const breedResult = breed(state.creature, partner.creature, rng, partner.pickCount);
        let child = breedResult.child;

        // 장애 부여
        const disorders = rollBreedingDisorders(rng);
        child = { ...child, disorders };

        // 패시브 유전 + 새 패시브
        const inheritedPassives = [...state.creature.passives];
        if (inheritedPassives.length < MAX_PASSIVE_SLOTS) {
          const passiveChoices = generatePassiveChoices(state.creature.passives, 3, rng);
          if (passiveChoices.length > 0) {
            inheritedPassives.push(passiveChoices[Math.floor(rng() * passiveChoices.length)]);
          }
        }
        child = { ...child, passives: inheritedPassives };

        state = applyBreeding(state, child);
      }
    }
  }

  return {
    battles: state.battleCount,
    wins: state.battleCount > 0 && !state.isOver
      ? state.battleCount
      : Math.max(0, state.battleCount - 1),
    generation: state.generation,
    breedingCount: state.breedingCount,
    finalHpPct: state.creature.stats.hp > 0
      ? Math.max(0, state.currentHp / state.creature.stats.hp)
      : 0,
    skillCount: state.creature.skills.length,
    passiveCount: state.creature.passives.length,
    plasmidCount: (state.creature.activePlasmids ?? []).length,
    element: state.creature.primaryElement,
  };
}

// ─── 메인 ───

function main(): void {
  console.log("═══════════════════════════════════════════");
  console.log(" 닭킨스 밸런스 시뮬레이션");
  console.log(`  ${TOTAL_RUNS}회 런 시뮬레이션`);
  console.log("═══════════════════════════════════════════\n");

  // 공유 풀 생성
  const poolRng = seededRng(SEED_BASE);
  const pool = initPool(poolRng);
  console.log(`교배풀: ${pool.length}마리 초기화 완료\n`);

  const results: RunResult[] = [];
  const t0 = Date.now();

  for (let i = 0; i < TOTAL_RUNS; i++) {
    const rng = seededRng(SEED_BASE + i + 1);
    results.push(simulateRun(pool, rng));
  }

  const elapsed = Date.now() - t0;

  // ─── 통계 계산 ───

  const battles = results.map((r) => r.battles);
  const wins = results.map((r) => r.wins);
  const gens = results.map((r) => r.generation);
  const breeds = results.map((r) => r.breedingCount);
  const skills = results.map((r) => r.skillCount);
  const passives = results.map((r) => r.passiveCount);
  const plasmids = results.map((r) => r.plasmidCount);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const max = (arr: number[]) => Math.max(...arr);
  const min = (arr: number[]) => Math.min(...arr);
  const pct = (arr: number[], p: number) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length * p)];
  };

  // 세대 도달 분포
  const genDist: Record<number, number> = {};
  for (const g of gens) genDist[g] = (genDist[g] ?? 0) + 1;

  // 전투 수 분포 (히스토그램 버킷)
  const battleBuckets = [
    { label: "1-3", min: 1, max: 3 },
    { label: "4-6", min: 4, max: 6 },
    { label: "7-9", min: 7, max: 9 },
    { label: "10-12", min: 10, max: 12 },
    { label: "13-15", min: 13, max: 15 },
    { label: "16+", min: 16, max: 999 },
  ];

  // 속성별 통계
  const elementStats: Record<string, ElementStats> = {};
  for (const r of results) {
    if (!elementStats[r.element]) {
      elementStats[r.element] = { count: 0, totalBattles: 0, totalWins: 0, totalGen: 0 };
    }
    const es = elementStats[r.element];
    es.count++;
    es.totalBattles += r.battles;
    es.totalWins += r.wins;
    es.totalGen += r.generation;
  }

  // ─── 출력 ───

  console.log("───────────────────────────────────────────");
  console.log(" 전투 수 통계");
  console.log("───────────────────────────────────────────");
  console.log(`  평균: ${avg(battles).toFixed(1)}`);
  console.log(`  중앙값: ${median(battles)}`);
  console.log(`  최소/최대: ${min(battles)} / ${max(battles)}`);
  console.log(`  25%: ${pct(battles, 0.25)}  75%: ${pct(battles, 0.75)}  90%: ${pct(battles, 0.9)}`);

  console.log("\n  분포:");
  for (const b of battleBuckets) {
    const count = battles.filter((v) => v >= b.min && v <= b.max).length;
    const bar = "█".repeat(Math.round((count / TOTAL_RUNS) * 50));
    console.log(`    ${b.label.padStart(5)}: ${bar} ${count} (${((count / TOTAL_RUNS) * 100).toFixed(1)}%)`);
  }

  console.log("\n───────────────────────────────────────────");
  console.log(" 세대 도달 분포");
  console.log("───────────────────────────────────────────");
  for (let g = 1; g <= 4; g++) {
    const count = genDist[g] ?? 0;
    const bar = "█".repeat(Math.round((count / TOTAL_RUNS) * 50));
    console.log(`  GEN ${g}: ${bar} ${count} (${((count / TOTAL_RUNS) * 100).toFixed(1)}%)`);
  }

  console.log("\n───────────────────────────────────────────");
  console.log(" 교배 횟수 분포");
  console.log("───────────────────────────────────────────");
  for (let b = 0; b <= 3; b++) {
    const count = breeds.filter((v) => v === b).length;
    const bar = "█".repeat(Math.round((count / TOTAL_RUNS) * 50));
    console.log(`  ${b}회: ${bar} ${count} (${((count / TOTAL_RUNS) * 100).toFixed(1)}%)`);
  }

  console.log("\n───────────────────────────────────────────");
  console.log(" 성장 지표");
  console.log("───────────────────────────────────────────");
  console.log(`  스킬 수 (평균/중앙/최대): ${avg(skills).toFixed(1)} / ${median(skills)} / ${max(skills)}`);
  console.log(`  패시브 수 (평균/중앙/최대): ${avg(passives).toFixed(1)} / ${median(passives)} / ${max(passives)}`);
  console.log(`  플라스미드 수 (평균/중앙/최대): ${avg(plasmids).toFixed(1)} / ${median(plasmids)} / ${max(plasmids)}`);

  console.log("\n───────────────────────────────────────────");
  console.log(" 속성별 통계");
  console.log("───────────────────────────────────────────");
  console.log("  속성     | 횟수 | 평균전투 | 평균승리 | 평균세대");
  console.log("  ─────────┼──────┼─────────┼─────────┼────────");
  for (const [el, es] of Object.entries(elementStats).sort((a, b) => a[0].localeCompare(b[0]))) {
    const avgB = (es.totalBattles / es.count).toFixed(1);
    const avgW = (es.totalWins / es.count).toFixed(1);
    const avgG = (es.totalGen / es.count).toFixed(2);
    console.log(`  ${el.padEnd(9)}| ${String(es.count).padStart(4)} | ${avgB.padStart(7)} | ${avgW.padStart(7)} | ${avgG.padStart(6)}`);
  }

  // 승률 (전투 대비 승리)
  const totalBattles = battles.reduce((a, b) => a + b, 0);
  const totalWins = wins.reduce((a, b) => a + b, 0);
  const winRate = totalBattles > 0 ? (totalWins / totalBattles * 100).toFixed(1) : "0";

  console.log("\n───────────────────────────────────────────");
  console.log(" 요약");
  console.log("───────────────────────────────────────────");
  console.log(`  총 전투: ${totalBattles} | 총 승리: ${totalWins} | 전체 승률: ${winRate}%`);
  console.log(`  평균 런 길이: ${avg(battles).toFixed(1)}전투`);
  console.log(`  GEN 2+ 도달률: ${(((TOTAL_RUNS - (genDist[1] ?? 0)) / TOTAL_RUNS) * 100).toFixed(1)}%`);
  console.log(`  GEN 3+ 도달률: ${((((genDist[3] ?? 0) + (genDist[4] ?? 0)) / TOTAL_RUNS) * 100).toFixed(1)}%`);
  console.log(`  GEN 4 도달률: ${(((genDist[4] ?? 0) / TOTAL_RUNS) * 100).toFixed(1)}%`);
  console.log(`  실행 시간: ${elapsed}ms`);

  // ─── 밸런스 진단 ───

  console.log("\n═══════════════════════════════════════════");
  console.log(" 밸런스 진단");
  console.log("═══════════════════════════════════════════");

  const avgBattles = avg(battles);
  const gen4Rate = ((genDist[4] ?? 0) / TOTAL_RUNS) * 100;
  const gen2Rate = ((TOTAL_RUNS - (genDist[1] ?? 0)) / TOTAL_RUNS) * 100;

  const issues: string[] = [];
  const goods: string[] = [];

  // 기획 목표: 평균 런 ~8전투 (3~5분 세션)
  if (avgBattles < 3) issues.push(`[위험] 평균 전투 ${avgBattles.toFixed(1)}회 — 너무 짧음 (목표: ~8)`);
  else if (avgBattles < 5) issues.push(`[주의] 평균 전투 ${avgBattles.toFixed(1)}회 — 다소 짧음 (목표: ~8)`);
  else if (avgBattles > 15) issues.push(`[주의] 평균 전투 ${avgBattles.toFixed(1)}회 — 너무 김 (목표: ~8)`);
  else goods.push(`평균 전투 ${avgBattles.toFixed(1)}회 — 적정 범위`);

  // GEN 4 도달은 어려워야 함 (5~15%)
  if (gen4Rate < 1) issues.push(`[위험] GEN4 도달률 ${gen4Rate.toFixed(1)}% — 거의 불가능`);
  else if (gen4Rate < 5) issues.push(`[주의] GEN4 도달률 ${gen4Rate.toFixed(1)}% — 다소 어려움`);
  else if (gen4Rate > 30) issues.push(`[주의] GEN4 도달률 ${gen4Rate.toFixed(1)}% — 너무 쉬움`);
  else goods.push(`GEN4 도달률 ${gen4Rate.toFixed(1)}% — 적절한 도전 난이도`);

  // GEN 2 도달은 대부분 가능해야 함 (60~80%)
  if (gen2Rate < 30) issues.push(`[위험] GEN2 도달률 ${gen2Rate.toFixed(1)}% — 첫 교배도 어려움`);
  else if (gen2Rate < 50) issues.push(`[주의] GEN2 도달률 ${gen2Rate.toFixed(1)}% — 첫 교배 어려움`);
  else goods.push(`GEN2 도달률 ${gen2Rate.toFixed(1)}%`);

  // 속성 밸런스: 편차 20% 이내
  const elAvgs = Object.values(elementStats).map((es) => es.totalBattles / es.count);
  const elStd = Math.sqrt(elAvgs.reduce((a, b) => a + (b - avg(elAvgs)) ** 2, 0) / elAvgs.length);
  const elCV = avg(elAvgs) > 0 ? (elStd / avg(elAvgs)) * 100 : 0;
  if (elCV > 20) issues.push(`[주의] 속성간 전투 수 편차 ${elCV.toFixed(1)}% — 밸런스 불균형`);
  else goods.push(`속성간 편차 ${elCV.toFixed(1)}% — 균형적`);

  if (goods.length > 0) {
    console.log("\n  ✓ 양호:");
    for (const g of goods) console.log(`    ${g}`);
  }
  if (issues.length > 0) {
    console.log("\n  ✗ 문제:");
    for (const iss of issues) console.log(`    ${iss}`);
  }
  if (issues.length === 0) {
    console.log("\n  전체적으로 밸런스 양호!");
  }

  console.log("\n═══════════════════════════════════════════\n");
}

main();
