// ─── PlasmidCard: 플라스미드 카드 (BuildBoard 상단) ───

import Phaser from 'phaser';
import type { Plasmid } from '../../data/types';
import { THEME } from './theme';

export class PlasmidCard extends Phaser.GameObjects.Container {
  private plasmid: Plasmid | null = null;
  private bg!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;
  private changeBtn!: Phaser.GameObjects.Graphics;
  private changeBtnText!: Phaser.GameObjects.Text;

  private readonly cardW: number;
  private readonly cardH: number;

  constructor(scene: Phaser.Scene, x: number, y: number, plasmid: Plasmid | null, w = 380, h = 36) {
    super(scene, x, y);
    this.cardW = w;
    this.cardH = h;

    // 배경
    this.bg = scene.add.graphics();
    this.add(this.bg);

    // 라벨 텍스트
    this.labelText = scene.add.text(12, this.cardH / 2, '', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeMedium,
      color: THEME.colors.textMain,
    }).setOrigin(0, 0.5);
    this.add(this.labelText);

    // [변경] 버튼
    const btnW = 48;
    const btnH = 24;
    const btnX = this.cardW - btnW - 6;
    const btnY = (this.cardH - btnH) / 2;

    this.changeBtn = scene.add.graphics();
    this.changeBtn.fillStyle(THEME.colors.btnPrimary, 0.8);
    this.changeBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 3);
    this.add(this.changeBtn);

    this.changeBtnText = scene.add.text(btnX + btnW / 2, btnY + btnH / 2, '변경', {
      fontFamily: THEME.font.family, fontSize: THEME.font.sizeSmall,
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add(this.changeBtnText);

    const zone = scene.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.emit('changeClick'));
    this.add(zone);

    this.setPlasmid(plasmid);
  }

  setPlasmid(plasmid: Plasmid | null) {
    this.plasmid = plasmid;
    this.redraw();
  }

  getPlasmid(): Plasmid | null {
    return this.plasmid;
  }

  private redraw() {
    this.bg.clear();
    this.bg.fillStyle(THEME.colors.cardBg, 1);
    this.bg.fillRoundedRect(0, 0, this.cardW, this.cardH, 4);

    if (this.plasmid) {
      // 골드 좌측바
      this.bg.fillStyle(THEME.colors.resonance, 1);
      this.bg.fillRect(0, 2, 4, this.cardH - 4);

      const cat = this.plasmid.category;
      this.labelText.setText(`[${this.plasmid.nameKo}] — ${cat}`);
      this.labelText.setStyle({ color: THEME.colors.textGold });
    } else {
      // 빈 상태
      this.bg.lineStyle(1, 0x444466, 0.6);
      this.bg.strokeRoundedRect(0, 0, this.cardW, this.cardH, 4);
      this.labelText.setText('플라스미드를 선택하세요');
      this.labelText.setStyle({ color: THEME.colors.textDim });
    }
  }
}
