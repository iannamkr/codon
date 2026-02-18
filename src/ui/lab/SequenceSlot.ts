// ─── SequenceSlot: 시퀀스 슬롯 카드 (BuildBoard 내부) ───

import Phaser from 'phaser';
import type { Sequence, Codon } from '../../data/types';
import { AMINO_ACIDS } from '../../data/codons';
import { previewInteractions } from '../../systems/sequence-builder';
import { THEME, getRoleColor, getInteractionColor } from './theme';
import { CodonChip } from './CodonChip';

const SLOT_W = 186;
const SLOT_H = 155;

export class SequenceSlot extends Phaser.GameObjects.Container {
  private sequence: Sequence | null = null;
  private readonly phaseIndex: number;
  private bg!: Phaser.GameObjects.Graphics;
  private highlightGfx!: Phaser.GameObjects.Graphics;
  private highlightTween: Phaser.Tweens.Tween | null = null;
  private phaseLabel!: Phaser.GameObjects.Text;
  private chips: CodonChip[] = [];
  private interIcons: Phaser.GameObjects.Text[] = [];
  private summaryText!: Phaser.GameObjects.Text;
  private emptyText!: Phaser.GameObjects.Text;
  private btnContainer!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, phaseIndex: number) {
    super(scene, x, y);
    this.phaseIndex = phaseIndex;
    this.buildUI();
  }

  private buildUI() {
    // 배경
    this.bg = this.scene.add.graphics();
    this.add(this.bg);

    // 하이라이트 테두리 (금색, 초기 invisible)
    this.highlightGfx = this.scene.add.graphics();
    this.highlightGfx.setAlpha(0);
    this.add(this.highlightGfx);

    // Phase 라벨
    this.phaseLabel = this.scene.add.text(6, 4, `Phase ${this.phaseIndex + 1}`, {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    });
    this.add(this.phaseLabel);

    // 코돈 칩 3개
    const chipW = THEME.layout.codonChipW;
    const chipH = THEME.layout.codonChipH;
    const iconW = THEME.layout.interIconW;
    const totalW = chipW * 3 + iconW * 2;
    const startX = (SLOT_W - totalW) / 2;
    const chipY = 22;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (chipW + iconW);
      const chip = new CodonChip(this.scene, cx, chipY, null, { interactive: true });
      const idx = i;
      chip.on('click', () => {
        this.emit('codonPosClick', { phaseIndex: this.phaseIndex, position: idx });
      });
      this.add(chip);
      this.chips.push(chip);
    }

    // 상호작용 아이콘 2개 (코돈 사이)
    for (let i = 0; i < 2; i++) {
      const ix = startX + chipW + i * (chipW + iconW) + (iconW - 4) / 2;
      const icon = this.scene.add.text(ix, chipY + chipH / 2, '', {
        fontFamily: THEME.font.family, fontSize: '9px',
        color: THEME.colors.textDim,
      }).setOrigin(0, 0.5);
      this.add(icon);
      this.interIcons.push(icon);
    }

    // 버튼 행
    this.btnContainer = this.scene.add.container(0, 98);
    this.add(this.btnContainer);
    this.buildButtons();

    // 역할태그 요약
    this.summaryText = this.scene.add.text(6, 122, '', {
      fontFamily: THEME.font.family, fontSize: '9px',
      color: THEME.colors.textDim,
      wordWrap: { width: SLOT_W - 12 },
    });
    this.add(this.summaryText);

    // 빈 상태 텍스트
    this.emptyText = this.scene.add.text(SLOT_W / 2, SLOT_H / 2, '시퀀스 선택', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textDim,
    }).setOrigin(0.5);
    this.add(this.emptyText);

    // 전체 클릭 영역
    const slotZone = this.scene.add.zone(SLOT_W / 2, SLOT_H / 2, SLOT_W, SLOT_H)
      .setInteractive({ useHandCursor: true });
    slotZone.on('pointerdown', () => {
      this.emit('slotClick', this.phaseIndex);
    });
    this.add(slotZone);

    this.redraw();
  }

  private buildButtons() {
    this.btnContainer.removeAll(true);

    const btnW = 50;
    const btnH = 18;
    const pad = 6;

    // [교체]
    const swapBg = this.scene.add.graphics();
    swapBg.fillStyle(THEME.colors.btnPrimary, 0.6);
    swapBg.fillRoundedRect(pad, 0, btnW, btnH, 2);
    this.btnContainer.add(swapBg);
    const swapText = this.scene.add.text(pad + btnW / 2, btnH / 2, '교체', {
      fontFamily: THEME.font.family, fontSize: '9px', color: '#ffffff',
    }).setOrigin(0.5);
    this.btnContainer.add(swapText);
    const swapZone = this.scene.add.zone(pad + btnW / 2, btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });
    swapZone.on('pointerdown', (p: Phaser.Input.Pointer, lx: number, ly: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.emit('swapClick', this.phaseIndex);
    });
    this.btnContainer.add(swapZone);

    // [비우기]
    const clearBg = this.scene.add.graphics();
    clearBg.fillStyle(THEME.colors.btnDanger, 0.6);
    clearBg.fillRoundedRect(pad + btnW + 6, 0, btnW, btnH, 2);
    this.btnContainer.add(clearBg);
    const clearText = this.scene.add.text(pad + btnW + 6 + btnW / 2, btnH / 2, '비우기', {
      fontFamily: THEME.font.family, fontSize: '9px', color: '#ffffff',
    }).setOrigin(0.5);
    this.btnContainer.add(clearText);
    const clearZone = this.scene.add.zone(pad + btnW + 6 + btnW / 2, btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });
    clearZone.on('pointerdown', (p: Phaser.Input.Pointer, lx: number, ly: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.emit('clearClick', this.phaseIndex);
    });
    this.btnContainer.add(clearZone);
  }

  setSequence(seq: Sequence | null) {
    this.sequence = seq;
    this.redraw();
  }

  getSequence(): Sequence | null {
    return this.sequence;
  }

  setHighlighted(on: boolean) {
    if (this.highlightTween) {
      this.highlightTween.destroy();
      this.highlightTween = null;
    }

    if (on) {
      this.highlightGfx.clear();
      this.highlightGfx.lineStyle(2, THEME.colors.resonance, 1);
      this.highlightGfx.strokeRoundedRect(-2, -2, SLOT_W + 4, SLOT_H + 4, 5);
      this.highlightGfx.setAlpha(0.5);

      this.highlightTween = this.scene.tweens.add({
        targets: this.highlightGfx,
        alpha: { from: 0.4, to: 1.0 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.highlightGfx.clear();
      this.highlightGfx.setAlpha(0);
    }
  }

  setActiveCodonPosition(pos: number | null) {
    this.chips.forEach((chip, i) => chip.setSelected(i === pos));
  }

  /** 특정 칩에 플래시 효과 */
  flashChip(position: number) {
    this.chips[position]?.flash();
  }

  /** 상호작용 아이콘 팝인 */
  popInteractionIcon(pairIndex: number) {
    const icon = this.interIcons[pairIndex];
    if (!icon) return;
    icon.setScale(0);
    this.scene.tweens.add({
      targets: icon,
      scaleX: 1, scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private redraw() {
    this.bg.clear();

    if (!this.sequence) {
      // 빈 슬롯
      this.bg.fillStyle(THEME.colors.panelBg, 0.5);
      this.bg.fillRoundedRect(0, 0, SLOT_W, SLOT_H, 4);
      // 점선 외곽
      this.drawDashedRect(0, 0, SLOT_W, SLOT_H);

      this.chips.forEach(c => c.setCodon(null));
      this.interIcons.forEach(ic => ic.setText(''));
      this.summaryText.setText('');
      this.emptyText.setVisible(true);
      this.btnContainer.setVisible(false);
      return;
    }

    this.emptyText.setVisible(false);
    this.btnContainer.setVisible(true);

    // 배경
    this.bg.fillStyle(THEME.colors.panelBg, 1);
    this.bg.fillRoundedRect(0, 0, SLOT_W, SLOT_H, 4);
    this.bg.lineStyle(1, THEME.colors.tabBorder, 0.5);
    this.bg.strokeRoundedRect(0, 0, SLOT_W, SLOT_H, 4);

    // 코돈 칩 업데이트
    const codons = this.sequence.codons;
    codons.forEach((c, i) => this.chips[i].setCodon(c));

    // 상호작용 계산
    const interactions = previewInteractions(codons);
    this.updateInteractionIcon(0, interactions.pair1, codons[0], codons[1]);
    this.updateInteractionIcon(1, interactions.pair2, codons[1], codons[2]);

    // 역할태그 요약
    const tags = codons.map(c => {
      const amino = AMINO_ACIDS[c.aminoAcidId];
      return amino?.roleTag?.slice(0, 3) ?? '?';
    });
    this.summaryText.setText(tags.join(' / '));
  }

  private updateInteractionIcon(pairIdx: number, interType: string, c1: Codon, c2: Codon) {
    const icon = this.interIcons[pairIdx];
    const color = getInteractionColor(interType);
    const hex = '#' + color.toString(16).padStart(6, '0');

    let symbol = '·';
    if (interType === 'Resonance') symbol = '◎';
    else if (interType === 'Opposition') symbol = '⚡';
    else if (interType === 'Fusion') symbol = '◈';

    icon.setText(symbol);
    icon.setStyle({ color: hex });
  }

  private drawDashedRect(x: number, y: number, w: number, h: number) {
    this.bg.lineStyle(1, 0x444466, 0.5);
    const step = 8;
    for (let dx = 0; dx < w; dx += step) {
      this.bg.lineBetween(x + dx, y, x + Math.min(dx + 4, w), y);
      this.bg.lineBetween(x + dx, y + h, x + Math.min(dx + 4, w), y + h);
    }
    for (let dy = 0; dy < h; dy += step) {
      this.bg.lineBetween(x, y + dy, x, y + Math.min(dy + 4, h));
      this.bg.lineBetween(x + w, y + dy, x + w, y + Math.min(dy + 4, h));
    }
  }
}
