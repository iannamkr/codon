// ─── PlasmidBench: 실험체 정보 + 플라스미드 선택 작업대 ───
// 왼쪽(310px): CreatureInfo — 실험체 정보, 스탯, 파생 스탯, 열화
// 오른쪽(620px): PlasmidSelector — 플라스미드 카드 리스트, 선택
// 하단(전체 너비, 40px): PoolSummary — 코돈/시퀀스 풀 + 역할 분포

import Phaser from 'phaser';
import type { Creature, Plasmid, Constitution, CodonRoleTag } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { deriveStats } from '../../systems/stats';
import { getDegradationLevel, isRetirementReady, DEFAULT_RETIREMENT_THRESHOLD } from '../../systems/degradation';
import { THEME, getRoleColor, getElementColor } from './theme';

// ─── 한글 매핑 ───

const CONSTITUTION_KO: Record<Constitution, string> = {
  Aggro: '맹공',
  Fortress: '철벽',
  Swift: '신속',
  Regen: '재생',
  Mutant: '변이',
  Balance: '균형',
};

const ELEMENT_KO: Record<string, string> = {
  Fire: '화염',
  Water: '수류',
  Earth: '대지',
  Plant: '식물',
};

const CATEGORY_KO: Record<string, string> = {
  Combat: '전투',
  Mutation: '변이',
  Attribute: '속성',
  Structure: '구조',
  Meta: '메타',
};

// ─── 레이아웃 ───

const L = THEME.layout.workbench.plasmid;
const TOTAL_W = L.selectorX + L.selectorW;

// 스탯 관련
const STAT_KEYS = ['str', 'dex', 'res', 'mut'] as const;
const STAT_LABELS: Record<string, string> = { str: 'STR', dex: 'DEX', res: 'RES', mut: 'MUT' };
const STAT_COLORS: Record<string, number> = {
  str: 0xff4444, dex: 0x44bb44, res: 0x4488ff, mut: 0xcc44cc,
};
const STAT_MAX = 50;
const STAT_BAR_W = 80;
const STAT_BAR_H = 8;

// 플라스미드 카드 크기
const CARD_W = 590;
const CARD_H = 96;
const CARD_GAP = 8;

export class PlasmidBench extends Phaser.GameObjects.Container {
  private creature: Creature;
  private selectedPlasmid: Plasmid | null = null;

  // CreatureInfo 요소
  private creatureBg!: Phaser.GameObjects.Graphics;
  private creatureContainer!: Phaser.GameObjects.Container;

  // PlasmidSelector 요소
  private selectorBg!: Phaser.GameObjects.Graphics;
  private selectorContainer!: Phaser.GameObjects.Container;
  private cardHighlights: Phaser.GameObjects.Graphics[] = [];

  // PoolSummary 요소
  private summaryBg!: Phaser.GameObjects.Graphics;
  private summaryText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, creature: Creature) {
    super(scene, x, y);
    this.creature = creature;
    this.selectedPlasmid = creature.plasmidPool[0] ?? null;

    this.buildCreatureInfo();
    this.buildPlasmidSelector();
    this.buildPoolSummary();
  }

  // ═══════════════════════════════════════
  //  공개 API
  // ═══════════════════════════════════════

  setCreature(creature: Creature): void {
    this.creature = creature;
    this.selectedPlasmid = creature.plasmidPool[0] ?? null;
    this.redrawCreatureInfo();
    this.redrawPlasmidSelector();
    this.redrawPoolSummary();
  }

  getSelectedPlasmid(): Plasmid | null {
    return this.selectedPlasmid;
  }

  // ═══════════════════════════════════════
  //  왼쪽: CreatureInfo (310px)
  // ═══════════════════════════════════════

  private buildCreatureInfo() {
    // 패널 배경
    this.creatureBg = this.scene.add.graphics();
    this.creatureBg.fillStyle(THEME.colors.panelBg, 1);
    this.creatureBg.fillRoundedRect(L.creatureX, 0, L.creatureW, L.creatureH, 4);
    this.add(this.creatureBg);

    this.creatureContainer = this.scene.add.container(L.creatureX, 0);
    this.add(this.creatureContainer);

    this.redrawCreatureInfo();
  }

  private redrawCreatureInfo() {
    this.creatureContainer.removeAll(true);
    const c = this.creature;
    const pad = 12;
    let ly = 12;

    // ── 이름 + 세대 ──
    const nameStr = `${c.name}`;
    const nameText = this.scene.add.text(pad, ly, nameStr, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeLarge,
      color: THEME.colors.textMain,
    });
    this.creatureContainer.add(nameText);

    // 세대 뱃지
    const genStr = `G${c.generation}`;
    const genX = pad + nameText.width + 10;
    const genBg = this.scene.add.graphics();
    const genText = this.scene.add.text(genX + 6, ly + 2, genStr, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textGold,
    });
    const badgeW = genText.width + 12;
    const badgeH = genText.height + 4;
    genBg.fillStyle(0x332800, 1);
    genBg.lineStyle(1, 0x665500, 0.8);
    genBg.fillRoundedRect(genX, ly, badgeW, badgeH, 3);
    genBg.strokeRoundedRect(genX, ly, badgeW, badgeH, 3);
    this.creatureContainer.add(genBg);
    this.creatureContainer.add(genText);

    ly += 26;

    // ── 체질 + 속성 ──
    const constKo = CONSTITUTION_KO[c.constitution] ?? c.constitution;
    const elKo = ELEMENT_KO[c.primaryElement] ?? c.primaryElement;
    const elColor = getElementColor(c.primaryElement);
    const elHex = '#' + elColor.toString(16).padStart(6, '0');

    const constText = this.scene.add.text(pad, ly, `체질: ${constKo}`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textDim,
    });
    this.creatureContainer.add(constText);

    const elText = this.scene.add.text(pad + constText.width + 16, ly, `속성: ${elKo}`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: elHex,
    });
    this.creatureContainer.add(elText);

    ly += 24;

    // ── 구분선 ──
    const divider1 = this.scene.add.graphics();
    divider1.lineStyle(1, THEME.colors.tabBorder, 0.3);
    divider1.lineBetween(pad, ly, L.creatureW - pad, ly);
    this.creatureContainer.add(divider1);
    ly += 8;

    // ── 기본 스탯 (STR/DEX/RES/MUT) ──
    const sectionTitle1 = this.scene.add.text(pad, ly, '기본 스탯', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    });
    this.creatureContainer.add(sectionTitle1);
    ly += 18;

    for (const key of STAT_KEYS) {
      const value = c.stats[key];
      const color = STAT_COLORS[key] ?? 0x888888;
      const colorHex = '#' + color.toString(16).padStart(6, '0');

      // 라벨
      const label = this.scene.add.text(pad, ly, `${STAT_LABELS[key]}`, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: colorHex,
      });
      this.creatureContainer.add(label);

      // 수치
      const valText = this.scene.add.text(pad + 40, ly, `${value}`, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textMain,
      });
      this.creatureContainer.add(valText);

      // 바
      const barX = pad + 70;
      const barY = ly + 3;
      const fillRatio = Math.min(value / STAT_MAX, 1);
      const fillW = Math.round(STAT_BAR_W * fillRatio);

      const barGfx = this.scene.add.graphics();
      barGfx.fillStyle(0x1a1a2a, 1);
      barGfx.fillRect(barX, barY, STAT_BAR_W, STAT_BAR_H);
      if (fillW > 0) {
        barGfx.fillStyle(color, 0.7);
        barGfx.fillRect(barX, barY, fillW, STAT_BAR_H);
      }
      barGfx.lineStyle(1, color, 0.3);
      barGfx.strokeRect(barX, barY, STAT_BAR_W, STAT_BAR_H);
      this.creatureContainer.add(barGfx);

      ly += 20;
    }

    ly += 4;

    // ── 구분선 ──
    const divider2 = this.scene.add.graphics();
    divider2.lineStyle(1, THEME.colors.tabBorder, 0.3);
    divider2.lineBetween(pad, ly, L.creatureW - pad, ly);
    this.creatureContainer.add(divider2);
    ly += 8;

    // ── 파생 스탯 (HP/ATK/SPD) ──
    const derived = deriveStats(c.stats, c.constitution);

    const sectionTitle2 = this.scene.add.text(pad, ly, '파생 스탯', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    });
    this.creatureContainer.add(sectionTitle2);
    ly += 18;

    const derivedEntries = [
      { label: 'HP', value: Math.round(derived.hp), color: THEME.colors.textMain },
      { label: 'ATK', value: Math.round(derived.atk), color: THEME.colors.textMain },
      { label: 'SPD', value: derived.spd.toFixed(1), color: THEME.colors.textMain },
      { label: 'DEF', value: `${(derived.defPct * 100).toFixed(1)}%`, color: THEME.colors.textDim },
      { label: 'CRIT', value: `${(derived.critPct * 100).toFixed(1)}%`, color: THEME.colors.textDim },
    ];

    // 2열로 표시
    const colW = 140;
    derivedEntries.forEach((entry, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const dx = pad + col * colW;
      const dy = ly + row * 18;

      const derivedLabel = this.scene.add.text(dx, dy, `${entry.label}:`, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textDim,
      });
      this.creatureContainer.add(derivedLabel);

      const derivedVal = this.scene.add.text(dx + 42, dy, `${entry.value}`, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: entry.color,
      });
      this.creatureContainer.add(derivedVal);
    });

    ly += Math.ceil(derivedEntries.length / 2) * 18 + 8;

    // ── 구분선 ──
    const divider3 = this.scene.add.graphics();
    divider3.lineStyle(1, THEME.colors.tabBorder, 0.3);
    divider3.lineBetween(pad, ly, L.creatureW - pad, ly);
    this.creatureContainer.add(divider3);
    ly += 8;

    // ── 열화 상태 ──
    const sectionTitle3 = this.scene.add.text(pad, ly, '열화 상태', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    });
    this.creatureContainer.add(sectionTitle3);
    ly += 18;

    const degradation = c.degradation;
    const expCount = degradation?.expeditionCount ?? 0;
    const degLevel = getDegradationLevel(c);
    const isRetReady = isRetirementReady(c);
    const isRetired = degradation?.isRetired ?? false;
    const isDead = degradation?.isDead ?? false;

    // 출격 횟수
    const expText = this.scene.add.text(pad, ly, `출격: ${expCount}/${DEFAULT_RETIREMENT_THRESHOLD}`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textMain,
    });
    this.creatureContainer.add(expText);
    ly += 16;

    // 열화 단계
    const degColor = degLevel >= 3 ? '#cc3333' : degLevel >= 1 ? '#cc9933' : THEME.colors.textDim;
    const degText = this.scene.add.text(pad, ly, `열화 Lv.${degLevel}`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: degColor,
    });
    this.creatureContainer.add(degText);
    ly += 16;

    // 은퇴/사망 경고
    if (isDead) {
      const deadText = this.scene.add.text(pad, ly, '!! 사망 !!', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: '#ff0000',
      });
      this.creatureContainer.add(deadText);
    } else if (isRetired) {
      const retiredText = this.scene.add.text(pad, ly, '은퇴 완료', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: '#cc6633',
      });
      this.creatureContainer.add(retiredText);
    } else if (isRetReady) {
      const warnText = this.scene.add.text(pad, ly, '\u26A0 은퇴 권장', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: '#cc9933',
      });
      this.creatureContainer.add(warnText);
    }
  }

  // ═══════════════════════════════════════
  //  오른쪽: PlasmidSelector (620px)
  // ═══════════════════════════════════════

  private buildPlasmidSelector() {
    // 패널 배경
    this.selectorBg = this.scene.add.graphics();
    this.selectorBg.fillStyle(THEME.colors.panelBg, 1);
    this.selectorBg.fillRoundedRect(L.selectorX, 0, L.selectorW, L.selectorH, 4);
    this.add(this.selectorBg);

    this.selectorContainer = this.scene.add.container(L.selectorX, 0);
    this.add(this.selectorContainer);

    this.redrawPlasmidSelector();
  }

  private redrawPlasmidSelector() {
    this.selectorContainer.removeAll(true);
    this.cardHighlights = [];

    const pad = 14;
    let ly = 10;

    // 섹션 제목
    const title = this.scene.add.text(pad, ly, '플라스미드 선택', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeLarge,
      color: THEME.colors.textMain,
    });
    this.selectorContainer.add(title);

    const countText = this.scene.add.text(L.selectorW - pad, ly + 2, `${this.creature.plasmidPool.length}/4`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textDim,
    }).setOrigin(1, 0);
    this.selectorContainer.add(countText);

    ly += 28;

    const pool = this.creature.plasmidPool;

    if (pool.length === 0) {
      const emptyText = this.scene.add.text(CARD_W / 2 + pad, ly + 60, '플라스미드가 없습니다', {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: THEME.colors.textDim,
      }).setOrigin(0.5);
      this.selectorContainer.add(emptyText);
      return;
    }

    for (let i = 0; i < pool.length; i++) {
      const plasmid = pool[i];
      const cardY = ly + i * (CARD_H + CARD_GAP);
      this.renderPlasmidCard(plasmid, pad, cardY, i);
    }
  }

  private renderPlasmidCard(plasmid: Plasmid, x: number, y: number, index: number) {
    const isSelected = this.selectedPlasmid?.id === plasmid.id;

    // 카드 배경
    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(THEME.colors.cardBg, 1);
    cardBg.fillRoundedRect(x, y, CARD_W, CARD_H, 5);

    // 선택 강조 (금색 테두리)
    if (isSelected) {
      cardBg.lineStyle(2, THEME.colors.resonance, 1);
      cardBg.strokeRoundedRect(x, y, CARD_W, CARD_H, 5);
    } else {
      cardBg.lineStyle(1, THEME.colors.tabBorder, 0.3);
      cardBg.strokeRoundedRect(x, y, CARD_W, CARD_H, 5);
    }

    // 왼쪽 카테고리 색상 바
    const catColor = this.getCategoryColor(plasmid.category);
    cardBg.fillStyle(catColor, 1);
    cardBg.fillRect(x, y + 4, 4, CARD_H - 8);

    this.selectorContainer.add(cardBg);
    this.cardHighlights.push(cardBg);

    // 이름 + 카테고리
    const catKo = CATEGORY_KO[plasmid.category] ?? plasmid.category;
    const nameColor = isSelected ? THEME.colors.textGold : THEME.colors.textMain;
    const nameText = this.scene.add.text(x + 12, y + 8, `${plasmid.nameKo} (${plasmid.nameEn})`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: nameColor,
    });
    this.selectorContainer.add(nameText);

    const catHex = '#' + catColor.toString(16).padStart(6, '0');
    const catTag = this.scene.add.text(x + 12 + nameText.width + 8, y + 9, catKo, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: catHex,
    });
    this.selectorContainer.add(catTag);

    // 제거 규칙
    const removedText = this.scene.add.text(x + 12, y + 28, `\u2716 ${plasmid.removedRule}`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: '#cc4444',
      wordWrap: { width: CARD_W - 24 },
    });
    this.selectorContainer.add(removedText);

    // 추가 규칙
    const newRuleY = y + 28 + removedText.height + 2;
    const newText = this.scene.add.text(x + 12, newRuleY, `\u2714 ${plasmid.newRule}`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: '#44cc44',
      wordWrap: { width: CARD_W - 24 },
    });
    this.selectorContainer.add(newText);

    // 시퀀스 슬롯 수 (오른쪽 하단)
    const slotCount = this.getSlotCount(plasmid);
    const slotText = this.scene.add.text(x + CARD_W - 12, y + CARD_H - 12, `${slotCount}Phase`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    }).setOrigin(1, 1);
    this.selectorContainer.add(slotText);

    // 클릭 영역
    const zone = this.scene.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.selectPlasmid(index));
    this.selectorContainer.add(zone);
  }

  private selectPlasmid(index: number) {
    const pool = this.creature.plasmidPool;
    if (index < 0 || index >= pool.length) return;

    this.selectedPlasmid = pool[index];
    this.redrawPlasmidSelector();
    this.emit('plasmidSelected', this.selectedPlasmid);
  }

  private getCategoryColor(category: string): number {
    switch (category) {
      case 'Combat': return 0xff4444;
      case 'Mutation': return 0xcc44cc;
      case 'Attribute': return 0x4488ff;
      case 'Structure': return 0x44bb44;
      case 'Meta': return 0xffcc00;
      default: return 0x888888;
    }
  }

  private getSlotCount(plasmid: Plasmid): number {
    if (plasmid.id === 'overcharge') return 5;
    if (plasmid.id === 'compress') return 2;
    return 4;
  }

  // ═══════════════════════════════════════
  //  하단: PoolSummary (전체 너비, 40px)
  // ═══════════════════════════════════════

  private buildPoolSummary() {
    this.summaryBg = this.scene.add.graphics();
    this.summaryBg.fillStyle(THEME.colors.panelBg, 0.8);
    this.summaryBg.fillRoundedRect(L.creatureX, L.summaryY, TOTAL_W - L.creatureX, L.summaryH, 4);
    this.add(this.summaryBg);

    this.summaryText = this.scene.add.text(L.creatureX + 12, L.summaryY + 12, '', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    });
    this.add(this.summaryText);

    this.redrawPoolSummary();
  }

  private redrawPoolSummary() {
    const c = this.creature;
    const codonCount = c.codonPool.length;
    const seqCount = c.sequencePool.length;

    // 역할 분포 계산
    const roleCounts: Record<CodonRoleTag, number> = {
      Destroy: 0, Survive: 0, Order: 0, Chaos: 0,
    };
    for (const codon of c.codonPool) {
      const amino = AMINO_ACIDS[codon.aminoAcidId];
      if (amino) {
        roleCounts[amino.roleTag]++;
      }
    }

    const parts = [
      `코돈: ${codonCount}/15`,
      `시퀀스: ${seqCount}/6`,
      '|',
      `Destroy ${roleCounts.Destroy}`,
      `Survive ${roleCounts.Survive}`,
      `Order ${roleCounts.Order}`,
      `Chaos ${roleCounts.Chaos}`,
    ];

    this.summaryText.setText(parts.join('  '));
  }
}
