// ─── GeneButton: A/T/G/C 선택 버튼 ───

import Phaser from 'phaser';
import type { Gene } from '../../data/types';
import { THEME, getGeneColor } from '../lab/theme';

const GENE_ROLE_KO: Record<Gene, string> = {
  A: '파괴',
  T: '생존',
  G: '질서',
  C: '혼돈',
};

const BTN_W = 60;
const BTN_H = 50;

export class GeneButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private selected = false;
  readonly gene: Gene;

  constructor(scene: Phaser.Scene, x: number, y: number, gene: Gene) {
    super(scene, x, y);
    this.gene = gene;

    const color = getGeneColor(gene);

    // 배경
    this.bg = scene.add.graphics();
    this.drawBg(false, color);
    this.add(this.bg);

    // Gene 문자
    const geneText = scene.add.text(BTN_W / 2, 16, gene, {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeLarge,
      color: '#' + color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    this.add(geneText);

    // 역할명
    const roleText = scene.add.text(BTN_W / 2, 36, GENE_ROLE_KO[gene], {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeSmall,
      color: THEME.colors.textDim,
    }).setOrigin(0.5);
    this.add(roleText);

    // 클릭 영역
    const zone = scene.add.zone(BTN_W / 2, BTN_H / 2, BTN_W, BTN_H)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.emit('select', gene);
    });
    this.add(zone);
  }

  setSelected(value: boolean) {
    this.selected = value;
    const color = getGeneColor(this.gene);
    this.drawBg(value, color);
  }

  private drawBg(active: boolean, color: number) {
    this.bg.clear();
    if (active) {
      this.bg.fillStyle(color, 0.25);
      this.bg.lineStyle(2, color, 1);
    } else {
      this.bg.fillStyle(THEME.colors.cardBg, 1);
      this.bg.lineStyle(1, 0x333344, 0.5);
    }
    this.bg.fillRoundedRect(0, 0, BTN_W, BTN_H, 4);
    this.bg.strokeRoundedRect(0, 0, BTN_W, BTN_H, 4);
  }
}
