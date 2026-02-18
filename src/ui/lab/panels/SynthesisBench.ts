// ─── SynthesisBench: SYNTH 모드 왼쪽 패널 (Gene 선택 + 코돈 합성) ───

import Phaser from 'phaser';
import type { Creature, Gene } from '../../../data/types';
import { GENES } from '../../../data/types';
import { getAminoAcid } from '../../../data/codons';
import { createCodon } from '../../../systems/creature-factory';
import { addCodon, CODON_POOL_MAX } from '../../../systems/pool-manager';
import { GeneButton } from '../../shared/GeneButton';
import { THEME, getRoleColor, getRarityLabel } from '../theme';

const GENE_ROLE_KO: Record<string, string> = {
  A: '\ud30c\uad34',
  T: '\uc0dd\uc874',
  G: '\uc9c8\uc11c',
  C: '\ud63c\ub3c8',
};

const PANEL_W = 280;
const PANEL_H = 400;
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

export class SynthesisBench extends Phaser.GameObjects.Container {
  private creature: Creature;
  private selectedGenes: (Gene | null)[] = [null, null, null];
  private geneButtons: GeneButton[][] = [[], [], []];
  private focusedSlot = 0;
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private subGeneIndices: [number, number, number] = [0, 0, 0];

  // Preview + Synth
  private previewText!: Phaser.GameObjects.Text;
  private synthButtonBg!: Phaser.GameObjects.Graphics;
  private synthButtonText!: Phaser.GameObjects.Text;
  private synthButtonZone!: Phaser.GameObjects.Zone;
  private errorText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, creature: Creature) {
    super(scene, x, y);
    this.creature = creature;

    this.buildUI();

    // Listen for sub-gene indices from GeneInfo panel
    this.scene.events.on('synthSubGeneIndices', this.onSubGeneIndices, this);
    this.once('destroy', () => {
      this.scene.events.off('synthSubGeneIndices', this.onSubGeneIndices, this);
    });
  }

  private onSubGeneIndices(indices: [number, number, number]) {
    this.subGeneIndices = indices;
  }

  private buildUI() {
    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.colors.panelBg, 1);
    bg.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 4);
    this.add(bg);

    // Title
    const title = this.scene.add.text(PAD, PAD, '\ud569\uc131', {
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
      // 4 buttons * 60px + 3 gaps * 4px = 252px, start at x=PAD
      GENES.forEach((gene, gi) => {
        const bx = PAD + gi * (60 + 4); // 60px width + 4px gap
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

    // Preview text area
    this.previewText = this.scene.add.text(PAD, PREVIEW_Y, 'Gene 3\uac1c\ub97c \uc120\ud0dd\ud558\uba74\n\ubbf8\ub9ac\ubcf4\uae30\uac00 \ud45c\uc2dc\ub429\ub2c8\ub2e4', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textDim,
      wordWrap: { width: PANEL_W - PAD * 2 },
    });
    this.add(this.previewText);

    // Synth button
    this.synthButtonBg = this.scene.add.graphics();
    this.drawSynthButton(false);
    this.add(this.synthButtonBg);

    this.synthButtonText = this.scene.add.text(
      PAD + SYNTH_BTN_W / 2,
      SYNTH_BTN_Y + SYNTH_BTN_H / 2,
      '\ud569\uc131\ud558\uae30',
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
    this.emitGeneFocused();
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
    this.updateSlotLabels();
    this.updatePreview();
    this.emitGeneFocused();
  }

  private emitGeneFocused() {
    const gene = this.selectedGenes[this.focusedSlot] ?? null;
    this.scene.events.emit('geneFocused', {
      slot: this.focusedSlot,
      gene,
    });
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

  private updatePreview() {
    const allSelected = this.selectedGenes.every(g => g !== null);
    this.errorText.setText('');

    if (!allSelected) {
      this.previewText
        .setText('Gene 3\uac1c\ub97c \uc120\ud0dd\ud558\uba74\n\ubbf8\ub9ac\ubcf4\uae30\uac00 \ud45c\uc2dc\ub429\ub2c8\ub2e4')
        .setStyle({ color: THEME.colors.textDim });
      this.drawSynthButton(false);
      return;
    }

    const triplet = this.selectedGenes.join('');
    const amino = getAminoAcid(triplet);
    if (!amino) {
      this.previewText
        .setText(`${triplet} \u2014 \uc720\ud6a8\ud558\uc9c0 \uc54a\uc740 \ucf54\ub3c8`)
        .setStyle({ color: '#cc3333' });
      this.drawSynthButton(false);
      return;
    }

    const rarity = getRarityLabel(amino.pathCount);
    const roleColor = getRoleColor(amino.roleTag);
    const roleHex = '#' + roleColor.toString(16).padStart(6, '0');

    this.previewText.setText([
      `[${triplet}] ${amino.skillName}${rarity ? ' ' + rarity : ''}`,
      `\uc5ed\ud560: ${amino.roleTag} | \uacbd\ub85c: ${amino.pathCount}`,
      amino.description,
    ].join('\n')).setStyle({ color: roleHex });

    const isFull = this.creature.codonPool.length >= CODON_POOL_MAX;
    this.drawSynthButton(!isFull);
    if (isFull) {
      this.errorText.setText(`\ucf54\ub3c8 \ud480 \uac00\ub4dd\ucc38 (${CODON_POOL_MAX}/${CODON_POOL_MAX})`);
    }
  }

  private synthesize() {
    if (!this.selectedGenes.every(g => g !== null)) return;

    const triplet = this.selectedGenes.join('');

    try {
      const codon = createCodon(triplet, this.subGeneIndices);
      const result = addCodon(this.creature.codonPool, codon);
      if (!result.success) {
        this.errorText.setText(result.reason ?? '\ud569\uc131 \uc2e4\ud328');
        return;
      }

      this.resetSelection();
      this.scene.events.emit('poolChanged');
      this.previewText
        .setText(`${triplet} \ud569\uc131 \uc644\ub8cc!`)
        .setStyle({ color: THEME.colors.textGold });
      this.scene.time.delayedCall(1500, () => this.updatePreview());
    } catch (e) {
      this.errorText.setText(e instanceof Error ? e.message : '\ud569\uc131 \uc2e4\ud328');
    }
  }

  private resetSelection() {
    for (let slot = 0; slot < 3; slot++) {
      this.selectedGenes[slot] = null;
      this.geneButtons[slot].forEach(btn => btn.setSelected(false));
    }
    this.focusedSlot = 0;
    this.updateSlotLabels();
    this.updatePreview();
    this.emitGeneFocused();
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
