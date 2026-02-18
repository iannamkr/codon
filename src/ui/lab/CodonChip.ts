// ─── CodonChip: 코돈 칩 (보드/트레이 공용) ───

import Phaser from 'phaser';
import type { Codon } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { THEME, getRoleColor, getRarityLabel } from './theme';

export interface CodonChipOptions {
  /** 보드 모드(52×68) vs 트레이 모드(130×50) */
  compact?: boolean;
  interactive?: boolean;
}

export class CodonChip extends Phaser.GameObjects.Container {
  private codon: Codon | null = null;
  private bg!: Phaser.GameObjects.Graphics;
  private contentContainer!: Phaser.GameObjects.Container;
  private readonly chipW: number;
  private readonly chipH: number;
  private readonly isCompact: boolean;
  private selected = false;

  constructor(
    scene: Phaser.Scene, x: number, y: number,
    codon: Codon | null,
    options: CodonChipOptions = {},
  ) {
    super(scene, x, y);
    this.isCompact = options.compact ?? false;
    this.chipW = this.isCompact ? 130 : THEME.layout.codonChipW;
    this.chipH = this.isCompact ? 50 : THEME.layout.codonChipH;

    this.bg = new Phaser.GameObjects.Graphics(scene);
    this.add(this.bg);

    // 텍스트 등 동적 콘텐츠 컨테이너 (redraw 시 이것만 교체)
    this.contentContainer = new Phaser.GameObjects.Container(scene, 0, 0);
    this.add(this.contentContainer);

    if (options.interactive !== false) {
      const zone = new Phaser.GameObjects.Zone(scene, this.chipW / 2, this.chipH / 2, this.chipW, this.chipH)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.emit('click', this.codon));
      this.add(zone);
    }

    this.setCodon(codon);
  }

  setCodon(codon: Codon | null) {
    this.codon = codon;
    this.redraw();
  }

  getCodon(): Codon | null {
    return this.codon;
  }

  setSelected(on: boolean) {
    this.selected = on;
    this.redraw();
  }

  /** 배치 시 흰색 플래시 */
  flash() {
    const flashRect = this.scene.add.graphics();
    flashRect.fillStyle(0xffffff, 0.6);
    flashRect.fillRoundedRect(0, 0, this.chipW, this.chipH, 3);
    this.add(flashRect);
    this.scene.tweens.add({
      targets: flashRect,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flashRect.destroy(),
    });
  }

  getChipWidth(): number { return this.chipW; }
  getChipHeight(): number { return this.chipH; }

  private redraw() {
    // 동적 콘텐츠만 클리어 (bg, zone은 유지)
    this.contentContainer.removeAll(true);
    this.bg.clear();

    if (!this.codon) {
      this.drawEmpty();
      return;
    }

    const amino = AMINO_ACIDS[this.codon.aminoAcidId];
    if (!amino) { this.drawEmpty(); return; }

    const roleColor = getRoleColor(amino.roleTag);
    const roleHex = '#' + roleColor.toString(16).padStart(6, '0');
    const rarity = getRarityLabel(amino.pathCount);

    // 배경
    const borderColor = this.selected ? roleColor : 0x333344;
    const borderAlpha = this.selected ? 1 : 0.5;
    this.bg.fillStyle(THEME.colors.cardBg, 1);
    this.bg.fillRoundedRect(0, 0, this.chipW, this.chipH, 3);
    this.bg.lineStyle(this.selected ? 2 : 1, borderColor, borderAlpha);
    this.bg.strokeRoundedRect(0, 0, this.chipW, this.chipH, 3);
    // 좌측 역할 컬러바
    this.bg.fillStyle(roleColor, 1);
    this.bg.fillRect(0, 2, 3, this.chipH - 4);

    if (this.isCompact) {
      this.drawCompact(amino, rarity, roleHex);
    } else {
      this.drawBoard(amino, rarity, roleHex);
    }
  }

  /** 보드 모드 (52×68) */
  private drawBoard(amino: { skillName: string; roleTag: string }, rarity: string, roleHex: string) {
    const cx = this.chipW / 2;
    const c = this.contentContainer;

    // Triplet
    const tripletText = new Phaser.GameObjects.Text(this.scene, cx, 10, this.codon!.triplet, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textMain,
    }).setOrigin(0.5, 0);
    c.add(tripletText);

    // 스킬명 (최대 4자까지만)
    const name = amino.skillName.length > 4
      ? amino.skillName.slice(0, 4)
      : amino.skillName;
    const nameText = new Phaser.GameObjects.Text(this.scene, cx, 26, name, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    }).setOrigin(0.5, 0);
    c.add(nameText);

    // 희귀도
    if (rarity) {
      const rarityText = new Phaser.GameObjects.Text(this.scene, cx, 40, rarity, {
        fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
        color: THEME.colors.textGold,
      }).setOrigin(0.5, 0);
      c.add(rarityText);
    }

    // 역할태그
    const tagText = new Phaser.GameObjects.Text(this.scene, cx, this.chipH - 14, amino.roleTag.slice(0, 3), {
      fontFamily: THEME.font.family, fontSize: '9px',
      color: roleHex,
    }).setOrigin(0.5, 0);
    c.add(tagText);
  }

  /** 트레이 모드 (130×50) */
  private drawCompact(amino: { skillName: string; roleTag: string; pathCount?: number }, rarity: string, roleHex: string) {
    const c = this.contentContainer;

    // Line 1: triplet + skillName + rarity
    const line1 = `${this.codon!.triplet} ${amino.skillName}${rarity ? ' ' + rarity : ''}`;
    const t1 = new Phaser.GameObjects.Text(this.scene, 8, 6, line1, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textMain,
    });
    c.add(t1);

    // Line 2: roleTag
    const t2 = new Phaser.GameObjects.Text(this.scene, 8, 24, amino.roleTag, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: roleHex,
    });
    c.add(t2);
  }

  /** 빈 상태 */
  private drawEmpty() {
    // 점선 외곽
    this.bg.lineStyle(1, 0x444466, 0.6);
    const step = 6;
    for (let dx = 0; dx < this.chipW; dx += step) {
      this.bg.lineBetween(dx, 0, Math.min(dx + 3, this.chipW), 0);
    }
    for (let dx = 0; dx < this.chipW; dx += step) {
      this.bg.lineBetween(dx, this.chipH, Math.min(dx + 3, this.chipW), this.chipH);
    }
    for (let dy = 0; dy < this.chipH; dy += step) {
      this.bg.lineBetween(0, dy, 0, Math.min(dy + 3, this.chipH));
    }
    for (let dy = 0; dy < this.chipH; dy += step) {
      this.bg.lineBetween(this.chipW, dy, this.chipW, Math.min(dy + 3, this.chipH));
    }

    const label = this.isCompact ? '[빈]' : '·';
    const emptyText = new Phaser.GameObjects.Text(this.scene, this.chipW / 2, this.chipH / 2, label, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    }).setOrigin(0.5);
    this.contentContainer.add(emptyText);
  }
}
