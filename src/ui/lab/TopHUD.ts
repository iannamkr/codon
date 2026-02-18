// ─── TopHUD: 실험체 정보 상단 HUD (HeaderBar 대체) ───

import Phaser from 'phaser';
import { THEME, getElementColor } from './theme';
import type { Creature, Constitution } from '../../data/types';

/** 체질 한글명 매핑 */
const CONSTITUTION_KO: Record<Constitution, string> = {
  Aggro: '맹공',
  Fortress: '철벽',
  Swift: '신속',
  Regen: '재생',
  Mutant: '변이',
  Balance: '균형',
};

/** 스탯 키 목록 (표시 순서) */
const STAT_KEYS = ['str', 'dex', 'res', 'mut'] as const;
const STAT_LABELS: Record<string, string> = {
  str: 'STR',
  dex: 'DEX',
  res: 'RES',
  mut: 'MUT',
};

/** 미니 바 최대값 */
const STAT_MAX = 50;
/** 미니 바 너비 */
const BAR_WIDTH = 30;
/** 미니 바 높이 */
const BAR_HEIGHT = 6;

/** 스탯 색상 */
const STAT_COLORS: Record<string, number> = {
  str: 0xff4444,
  dex: 0x44bb44,
  res: 0x4488ff,
  mut: 0xcc44cc,
};

export class TopHUD extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;

  // Row 1
  private nameText: Phaser.GameObjects.Text;
  private genBadgeBg: Phaser.GameObjects.Graphics;
  private genText: Phaser.GameObjects.Text;
  private elementText: Phaser.GameObjects.Text;
  private constitutionText: Phaser.GameObjects.Text;

  // Row 2 — stat labels + mini bars
  private statLabels: Phaser.GameObjects.Text[] = [];
  private statBars: Phaser.GameObjects.Graphics;
  private poolText: Phaser.GameObjects.Text;

  // Cached creature for stat bar redraws
  private cachedStats = { str: 0, dex: 0, res: 0, mut: 0 };

  constructor(scene: Phaser.Scene, creature: Creature) {
    super(scene, 0, 0);

    const { width, topHudH, padding } = THEME.layout;
    const font = THEME.font;

    // ── 배경 ──
    this.bg = new Phaser.GameObjects.Graphics(scene);
    this.bg.fillStyle(THEME.colors.panelBg, 1);
    this.bg.fillRect(0, 0, width, topHudH);
    this.bg.lineStyle(1, THEME.colors.tabBorder, 0.5);
    this.bg.lineBetween(0, topHudH - 1, width, topHudH - 1);
    this.add(this.bg);

    // ════════════════════════════════════════
    // Row 1 (y=8): 이름 + 세대 뱃지 + 속성 + 체질
    // ════════════════════════════════════════

    const row1Y = 8;

    // 이름
    this.nameText = new Phaser.GameObjects.Text(scene, padding + 8, row1Y, '', {
      fontFamily: font.family,
      fontSize: font.sizeLarge,
      color: THEME.colors.textMain,
    });
    this.add(this.nameText);

    // 세대 뱃지 배경 (둥근 사각형)
    this.genBadgeBg = new Phaser.GameObjects.Graphics(scene);
    this.add(this.genBadgeBg);

    // 세대 텍스트
    this.genText = new Phaser.GameObjects.Text(scene, 0, row1Y, '', {
      fontFamily: font.family,
      fontSize: font.sizeSmall,
      color: THEME.colors.textGold,
    });
    this.add(this.genText);

    // 속성 텍스트
    this.elementText = new Phaser.GameObjects.Text(scene, 0, row1Y, '', {
      fontFamily: font.family,
      fontSize: font.sizeMedium,
      color: THEME.colors.textMain,
    });
    this.add(this.elementText);

    // 체질 텍스트
    this.constitutionText = new Phaser.GameObjects.Text(scene, 0, row1Y, '', {
      fontFamily: font.family,
      fontSize: font.sizeMedium,
      color: THEME.colors.textDim,
    });
    this.add(this.constitutionText);

    // ════════════════════════════════════════
    // Row 2 (y=32): 스탯 라벨 + 미니 바 + 풀 카운트
    // ════════════════════════════════════════

    const row2Y = 32;

    // 스탯 라벨들 (텍스트)
    let statX = padding + 8;
    for (const key of STAT_KEYS) {
      const label = new Phaser.GameObjects.Text(scene, statX, row2Y, '', {
        fontFamily: font.family,
        fontSize: font.sizeSmall,
        color: THEME.colors.textDim,
      });
      this.add(label);
      this.statLabels.push(label);
      // 각 스탯은 라벨(~40px) + 바(30px) + 간격(12px) = ~82px
      statX += 82;
    }

    // 스탯 미니 바 (Graphics 하나로 전부)
    this.statBars = new Phaser.GameObjects.Graphics(scene);
    this.add(this.statBars);

    // 풀 카운트 (오른쪽 정렬)
    this.poolText = new Phaser.GameObjects.Text(scene, width - padding - 8, row2Y + 2, '', {
      fontFamily: font.family,
      fontSize: font.sizeSmall,
      color: THEME.colors.textDim,
    }).setOrigin(1, 0);
    this.add(this.poolText);

    // 초기 데이터 표시
    this.update(creature);
  }

  /** 실험체 데이터 갱신 */
  update(creature: Creature): void {
    const { padding } = THEME.layout;
    const row1Y = 8;
    const row2Y = 32;

    // ── Row 1 ──
    let x = padding + 8;

    // 이름
    this.nameText.setText(creature.name);
    this.nameText.setPosition(x, row1Y);
    x += this.nameText.width + 10;

    // 세대 뱃지
    const genStr = `G${creature.generation}`;
    this.genText.setText(genStr);
    // 뱃지 위치 계산 후 배경 그리기
    const badgePadX = 6;
    const badgePadY = 2;
    const badgeW = this.genText.width + badgePadX * 2;
    const badgeH = this.genText.height + badgePadY * 2;
    this.genBadgeBg.clear();
    this.genBadgeBg.fillStyle(0x332800, 1);
    this.genBadgeBg.lineStyle(1, 0x665500, 0.8);
    this.genBadgeBg.fillRoundedRect(x, row1Y - badgePadY, badgeW, badgeH, 3);
    this.genBadgeBg.strokeRoundedRect(x, row1Y - badgePadY, badgeW, badgeH, 3);
    this.genText.setPosition(x + badgePadX, row1Y);
    x += badgeW + 12;

    // 속성 (색상 반영)
    const elColor = getElementColor(creature.primaryElement);
    const elHex = '#' + elColor.toString(16).padStart(6, '0');
    this.elementText.setText(creature.primaryElement);
    this.elementText.setStyle({ color: elHex });
    this.elementText.setPosition(x, row1Y + 1);
    x += this.elementText.width + 12;

    // 체질
    const constKo = CONSTITUTION_KO[creature.constitution] ?? creature.constitution;
    this.constitutionText.setText(constKo);
    this.constitutionText.setPosition(x, row1Y + 1);

    // ── Row 2: 스탯 ──
    this.cachedStats = { ...creature.stats };
    this.redrawStatBars(row2Y);

    // 풀 카운트 (기본값)
    this.updatePoolCounts(creature.codonPool.length, creature.sequencePool.length);
  }

  /** 풀 카운트 갱신 */
  updatePoolCounts(codonCount: number, seqCount: number): void {
    this.poolText.setText(`코돈: ${codonCount}/15  시퀀스: ${seqCount}/6`);
  }

  /** 스탯 미니 바 다시 그리기 */
  private redrawStatBars(row2Y: number): void {
    const { padding } = THEME.layout;
    let statX = padding + 8;

    this.statBars.clear();

    for (let i = 0; i < STAT_KEYS.length; i++) {
      const key = STAT_KEYS[i];
      const value = this.cachedStats[key];
      const label = this.statLabels[i];

      // 라벨 텍스트: "STR:12"
      label.setText(`${STAT_LABELS[key]}:${value}`);
      label.setPosition(statX, row2Y);

      // 미니 바: 라벨 오른쪽에 위치
      const barX = statX + label.width + 4;
      const barY = row2Y + 4;
      const fillRatio = Math.min(value / STAT_MAX, 1);
      const fillW = Math.round(BAR_WIDTH * fillRatio);
      const color = STAT_COLORS[key] ?? 0x888888;

      // 바 배경
      this.statBars.fillStyle(0x1a1a2a, 1);
      this.statBars.fillRect(barX, barY, BAR_WIDTH, BAR_HEIGHT);

      // 바 채우기
      if (fillW > 0) {
        this.statBars.fillStyle(color, 0.8);
        this.statBars.fillRect(barX, barY, fillW, BAR_HEIGHT);
      }

      // 바 테두리
      this.statBars.lineStyle(1, color, 0.4);
      this.statBars.strokeRect(barX, barY, BAR_WIDTH, BAR_HEIGHT);

      statX += 82;
    }
  }
}
