// ─── SynthesisBench: SYNTH 모드 왼쪽 패널 (Gene 선택 + 하위 Gene 선택 + 코돈 합성) ───

import Phaser from 'phaser';
import type { Creature, Gene } from '../../../data/types';
import { GENES } from '../../../data/types';
import { getAminoAcid } from '../../../data/codons';
import { getSubGenesForGene } from '../../../data/sub-genes';
import { createCodon } from '../../../systems/creature-factory';
import { addCodon, CODON_POOL_MAX } from '../../../systems/pool-manager';
import { GeneButton } from '../../shared/GeneButton';
import { THEME, getRoleColor, getRarityLabel, getGeneColor } from '../theme';

const GENE_ROLE_KO: Record<string, string> = {
  A: '파괴',
  T: '생존',
  G: '질서',
  C: '혼돈',
};

const PANEL_W = 300;
const PANEL_H = 440;
const PAD = THEME.layout.padding; // 8
const SLOT_H = 74;
const SLOT_START_Y = 24;
const DIVIDER_Y = 248;
const PREVIEW_Y = 256;
const PREVIEW_H = 80;
const SYNTH_BTN_Y = 342;
const SYNTH_BTN_W = 120;
const SYNTH_BTN_H = 30;
const ERROR_Y = 380;

// 하위 Gene 그리드 상수
const GRID_CHIP_W = 48;
const GRID_CHIP_H = 20;
const GRID_COLS = 5;
const GRID_GAP_X = 4;
const GRID_GAP_Y = 4;

export class SynthesisBench extends Phaser.GameObjects.Container {
  private creature: Creature;
  private selectedGenes: (Gene | null)[] = [null, null, null];
  private geneButtons: GeneButton[][] = [[], [], []];
  private focusedSlot = 0;
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private subGeneIndices: [number, number, number] = [0, 0, 0];

  // Preview + Synth
  private previewContainer!: Phaser.GameObjects.Container;
  private previewText!: Phaser.GameObjects.Text;
  private synthButtonBg!: Phaser.GameObjects.Graphics;
  private synthButtonText!: Phaser.GameObjects.Text;
  private synthButtonZone!: Phaser.GameObjects.Zone;
  private errorText!: Phaser.GameObjects.Text;

  // Sub-gene 그리드 (프리뷰 영역에 듀얼 퍼포즈)
  private subGeneGridContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, creature: Creature) {
    super(scene, x, y);
    this.creature = creature;

    this.buildUI();
  }

  private buildUI() {
    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.colors.panelBg, 1);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 4);
    this.add(bg);

    // Title
    const title = this.scene.add.text(PAD, PAD, '합성', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeLarge,
      color: THEME.colors.textMain,
    });
    this.add(title);

    // Gene slot rows (3 slots)
    for (let slot = 0; slot < 3; slot++) {
      const sy = SLOT_START_Y + slot * SLOT_H;

      // Slot label (clickable to focus)
      const isFocused = slot === 0;
      const label = this.scene.add.text(PAD, sy, `\u25b8 Pos ${slot + 1}`, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeSmall,
        color: isFocused ? THEME.colors.textMain : THEME.colors.textDim,
      });
      this.add(label);
      this.slotLabels.push(label);

      // Label click zone
      const labelZone = this.scene.add.zone(PAD + 40, sy + 6, 90, 14)
        .setInteractive({ useHandCursor: true });
      const s = slot;
      labelZone.on('pointerdown', () => {
        this.setFocusedSlot(s);
      });
      this.add(labelZone);

      // 4 GeneButtons (A/T/G/C)
      GENES.forEach((gene, gi) => {
        const bx = PAD + gi * (60 + 4);
        const by = sy + 16;
        const btn = new GeneButton(this.scene, bx, by, gene);
        btn.on('select', (g: Gene) => this.onGeneSelect(slot, g));
        this.add(btn);
        this.geneButtons[slot].push(btn);
      });
    }

    // Divider line
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, THEME.colors.tabBorder, 0.4);
    divider.lineBetween(PAD, DIVIDER_Y, PANEL_W - PAD, DIVIDER_Y);
    this.add(divider);

    // Preview container (듀얼 퍼포즈: 프리뷰 또는 하위 Gene 그리드)
    this.previewContainer = this.scene.add.container(0, 0);
    this.add(this.previewContainer);

    // Preview text area
    this.previewText = this.scene.add.text(PAD, PREVIEW_Y, 'Gene 3개를 선택하면\n미리보기가 표시됩니다', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textDim,
      wordWrap: { width: PANEL_W - PAD * 2 },
    });
    this.previewContainer.add(this.previewText);

    // Synth button
    this.synthButtonBg = this.scene.add.graphics();
    this.drawSynthButton(false);
    this.add(this.synthButtonBg);

    this.synthButtonText = this.scene.add.text(
      PAD + SYNTH_BTN_W / 2,
      SYNTH_BTN_Y + SYNTH_BTN_H / 2,
      '합성하기',
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: '#ffffff',
      },
    ).setOrigin(0.5);
    this.add(this.synthButtonText);

    this.synthButtonZone = this.scene.add.zone(
      PAD + SYNTH_BTN_W / 2,
      SYNTH_BTN_Y + SYNTH_BTN_H / 2,
      SYNTH_BTN_W,
      SYNTH_BTN_H,
    ).setInteractive({ useHandCursor: true });
    this.synthButtonZone.on('pointerdown', () => this.synthesize());
    this.add(this.synthButtonZone);

    // Error text
    this.errorText = this.scene.add.text(PAD, ERROR_Y, '', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: '#cc3333',
    });
    this.add(this.errorText);
  }

  // ─── Handlers ───

  private setFocusedSlot(slot: number) {
    this.focusedSlot = slot;
    this.updateSlotLabels();
    this.updatePreviewArea();
  }

  private onGeneSelect(slot: number, gene: Gene) {
    // Toggle if same gene re-selected
    if (this.selectedGenes[slot] === gene) {
      this.selectedGenes[slot] = null;
      this.geneButtons[slot].forEach(btn => btn.setSelected(false));
    } else {
      this.selectedGenes[slot] = gene;
      this.geneButtons[slot].forEach(btn => btn.setSelected(btn.gene === gene));
    }

    this.focusedSlot = slot;
    this.subGeneIndices[slot] = 0; // Gene 변경 시 하위 Gene 인덱스 리셋
    this.updateSlotLabels();
    this.updatePreviewArea();
  }

  private updateSlotLabels() {
    for (let i = 0; i < 3; i++) {
      const isFocused = i === this.focusedSlot;
      const gene = this.selectedGenes[i];
      const prefix = isFocused ? '\u25b8' : '  ';
      const suffix = gene ? ` [${gene}]` : '';
      this.slotLabels[i].setText(`${prefix} Pos ${i + 1}${suffix}`);
      this.slotLabels[i].setStyle({
        color: isFocused ? THEME.colors.textMain : THEME.colors.textDim,
      });
    }
  }

  /** 프리뷰 영역을 상태에 따라 갱신 (하위 Gene 그리드 또는 코돈 프리뷰) */
  private updatePreviewArea() {
    const allSelected = this.selectedGenes.every(g => g !== null);
    this.errorText.setText('');

    // 하위 Gene 그리드 정리
    if (this.subGeneGridContainer) {
      this.subGeneGridContainer.destroy();
      this.subGeneGridContainer = null;
    }

    const focusedGene = this.selectedGenes[this.focusedSlot];

    if (allSelected) {
      // 모든 Gene 선택 완료 → 코돈 프리뷰 표시
      this.previewText.setVisible(true);
      this.updateCodonPreview();

      // 현재 포커스된 슬롯에 Gene이 있으면 그리드도 표시
      if (focusedGene) {
        this.buildSubGeneGrid(this.focusedSlot, focusedGene);
      }
    } else if (focusedGene) {
      // 부분 선택 중 + 포커스 슬롯에 Gene 있음 → 하위 Gene 그리드 표시
      this.previewText.setVisible(false);
      this.buildSubGeneGrid(this.focusedSlot, focusedGene);
      this.drawSynthButton(false);
    } else {
      // 아무것도 없음
      this.previewText.setVisible(true);
      this.previewText
        .setText('Gene 3개를 선택하면\n미리보기가 표시됩니다')
        .setStyle({ color: THEME.colors.textDim });
      this.drawSynthButton(false);
    }
  }

  private updateCodonPreview() {
    const triplet = this.selectedGenes.join('');
    const amino = getAminoAcid(triplet);
    if (!amino) {
      this.previewText
        .setText(`${triplet} — 유효하지 않은 코돈`)
        .setStyle({ color: '#cc3333' });
      this.drawSynthButton(false);
      return;
    }

    const rarity = getRarityLabel(amino.pathCount);
    const roleColor = getRoleColor(amino.roleTag);
    const roleHex = '#' + roleColor.toString(16).padStart(6, '0');

    this.previewText.setText([
      `[${triplet}] ${amino.skillName}${rarity ? ' ' + rarity : ''}`,
      `역할: ${amino.roleTag} | 경로: ${amino.pathCount}`,
      amino.description,
    ].join('\n')).setStyle({ color: roleHex });

    const isFull = this.creature.codonPool.length >= CODON_POOL_MAX;
    this.drawSynthButton(!isFull);
    if (isFull) {
      this.errorText.setText(`코돈 풀 가득참 (${CODON_POOL_MAX}/${CODON_POOL_MAX})`);
    }
  }

  // ─── 하위 Gene 컴팩트 그리드 ───

  private buildSubGeneGrid(slot: number, gene: Gene) {
    const subGenes = getSubGenesForGene(gene);
    if (subGenes.length === 0) return;

    this.subGeneGridContainer = this.scene.add.container(0, 0);
    this.previewContainer.add(this.subGeneGridContainer);

    const geneColor = getGeneColor(gene);
    const geneHex = '#' + geneColor.toString(16).padStart(6, '0');
    const roleKo = GENE_ROLE_KO[gene] ?? gene;

    // 타이틀
    const gridTitleY = PREVIEW_Y;
    const gridTitle = this.scene.add.text(PAD, gridTitleY, `하위 Gene: Pos ${slot + 1} (${gene}-${roleKo})`, {
      fontFamily: THEME.font.family,
      fontSize: '10px',
      color: geneHex,
    });
    this.subGeneGridContainer.add(gridTitle);

    // 5×2 그리드
    const gridStartY = gridTitleY + 16;
    const selectedIdx = this.subGeneIndices[slot];

    for (let i = 0; i < subGenes.length; i++) {
      const row = Math.floor(i / GRID_COLS);
      const col = i % GRID_COLS;
      const chipX = PAD + col * (GRID_CHIP_W + GRID_GAP_X);
      const chipY = gridStartY + row * (GRID_CHIP_H + GRID_GAP_Y);
      const isSelected = i === selectedIdx;

      // 칩 배경
      const chipBg = this.scene.add.graphics();
      chipBg.fillStyle(isSelected ? geneColor : THEME.colors.cardBg, isSelected ? 0.3 : 0.6);
      chipBg.fillRoundedRect(chipX, chipY, GRID_CHIP_W, GRID_CHIP_H, 3);
      if (isSelected) {
        chipBg.lineStyle(1, geneColor, 0.8);
        chipBg.strokeRoundedRect(chipX, chipY, GRID_CHIP_W, GRID_CHIP_H, 3);
      }
      this.subGeneGridContainer.add(chipBg);

      // 이름
      const chipText = this.scene.add.text(
        chipX + GRID_CHIP_W / 2, chipY + GRID_CHIP_H / 2,
        subGenes[i].nameKo,
        {
          fontFamily: THEME.font.family,
          fontSize: '9px',
          color: isSelected ? geneHex : THEME.colors.textDim,
        },
      ).setOrigin(0.5);
      this.subGeneGridContainer.add(chipText);

      // 클릭 영역
      const zone = this.scene.add.zone(
        chipX + GRID_CHIP_W / 2, chipY + GRID_CHIP_H / 2,
        GRID_CHIP_W, GRID_CHIP_H,
      ).setInteractive({ useHandCursor: true });
      const idx = i;
      zone.on('pointerdown', () => {
        this.subGeneIndices[slot] = idx;
        this.updatePreviewArea(); // 그리드 다시 그리기
      });
      this.subGeneGridContainer.add(zone);
    }

    // 선택된 하위 Gene 설명 (그리드 아래)
    const descY = gridStartY + 2 * (GRID_CHIP_H + GRID_GAP_Y) + 2;
    const selectedSg = subGenes[selectedIdx];
    if (selectedSg) {
      const descText = this.scene.add.text(PAD, descY, `${selectedSg.nameKo}: ${selectedSg.description}`, {
        fontFamily: THEME.font.family,
        fontSize: '9px',
        color: THEME.colors.textDim,
        wordWrap: { width: PANEL_W - PAD * 2 },
      });
      this.subGeneGridContainer.add(descText);
    }
  }

  // ─── 합성 ───

  private synthesize() {
    if (!this.selectedGenes.every(g => g !== null)) return;

    const triplet = this.selectedGenes.join('');

    try {
      const codon = createCodon(triplet, this.subGeneIndices);
      const result = addCodon(this.creature.codonPool, codon);
      if (!result.success) {
        this.errorText.setText(result.reason ?? '합성 실패');
        this.playFailAnimation();
        return;
      }

      // 성공 애니메이션용 triplet 보존
      const successTriplet = triplet;

      this.resetSelection();
      this.scene.events.emit('poolChanged');

      // 성공 텍스트
      this.previewText.setVisible(true);
      this.previewText
        .setText(`${successTriplet} 합성 완료!`)
        .setStyle({ color: THEME.colors.textGold });

      this.playSuccessAnimation(successTriplet);

      this.scene.time.delayedCall(1500, () => this.updatePreviewArea());
    } catch (e) {
      this.errorText.setText(e instanceof Error ? e.message : '합성 실패');
      this.playFailAnimation();
    }
  }

  // ─── 합성 애니메이션 ───

  private playSuccessAnimation(triplet: string) {
    // 1. 금색 플래시
    const flash = this.scene.add.graphics();
    flash.fillStyle(THEME.colors.resonance, 1);
    flash.fillRoundedRect(PAD, PREVIEW_Y, PANEL_W - PAD * 2, PREVIEW_H, 4);
    flash.setAlpha(0.4);
    this.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // 2. 고스트 코돈 텍스트 → 오른쪽으로 날아감 (CraftingInventory 방향)
    const ghost = this.scene.add.text(PANEL_W / 2, PREVIEW_Y + PREVIEW_H / 2, `[${triplet}]`, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textGold,
    }).setOrigin(0.5).setAlpha(0.8);
    this.add(ghost);

    this.scene.tweens.add({
      targets: ghost,
      x: PANEL_W + 60,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => ghost.destroy(),
    });
  }

  private playFailAnimation() {
    // 1. 패널 좌우 흔들림
    const origX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: { from: origX - 4, to: origX + 4 },
      duration: 50,
      repeat: 3,
      yoyo: true,
      onComplete: () => { this.x = origX; },
    });

    // 2. 에러 영역 붉은 플래시
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xcc3333, 1);
    flash.fillRoundedRect(PAD, ERROR_Y - 4, PANEL_W - PAD * 2, 20, 3);
    flash.setAlpha(0.3);
    this.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      onComplete: () => flash.destroy(),
    });
  }

  // ─── 리셋 ───

  private resetSelection() {
    for (let slot = 0; slot < 3; slot++) {
      this.selectedGenes[slot] = null;
      this.geneButtons[slot].forEach(btn => btn.setSelected(false));
    }
    this.subGeneIndices = [0, 0, 0];
    this.focusedSlot = 0;
    this.updateSlotLabels();
    this.updatePreviewArea();
  }

  private drawSynthButton(enabled: boolean) {
    this.synthButtonBg.clear();
    this.synthButtonBg.fillStyle(
      enabled ? THEME.colors.btnPrimary : THEME.colors.btnDisabled,
      1,
    );
    this.synthButtonBg.fillRoundedRect(PAD, SYNTH_BTN_Y, SYNTH_BTN_W, SYNTH_BTN_H, 4);
  }
}
