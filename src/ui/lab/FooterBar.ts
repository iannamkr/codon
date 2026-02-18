// ─── FooterBar: 하단 정보 + 출격 버튼 ───

import Phaser from 'phaser';
import { THEME } from './theme';

export class FooterBar extends Phaser.GameObjects.Container {
  private countsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, THEME.layout.height - THEME.layout.footerHeight);

    const { width, footerHeight, padding } = THEME.layout;
    const font = THEME.font;

    // 배경
    const bg = scene.add.graphics();
    bg.fillStyle(THEME.colors.panelBg, 1);
    bg.fillRect(0, 0, width, footerHeight);
    // 상단 구분선
    bg.lineStyle(1, THEME.colors.tabBorder, 0.5);
    bg.lineBetween(0, 0, width, 0);
    this.add(bg);

    // 출격 버튼
    const btnW = 120;
    const btnH = 28;
    const btnX = padding + 8;
    const btnY = (footerHeight - btnH) / 2;

    const btnBg = scene.add.graphics();
    btnBg.fillStyle(THEME.colors.btnPrimary, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
    this.add(btnBg);

    const btnText = scene.add.text(btnX + btnW / 2, footerHeight / 2, '출격 >>>', {
      fontFamily: font.family,
      fontSize: font.sizeMedium,
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add(btnText);

    // 버튼 클릭 영역
    const btnZone = scene.add.zone(btnX + btnW / 2, footerHeight / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });
    btnZone.on('pointerdown', () => {
      this.emit('deploy');
    });
    this.add(btnZone);

    // 풀 카운터 (오른쪽 정렬)
    this.countsText = scene.add.text(width - padding - 8, footerHeight / 2, '', {
      fontFamily: font.family,
      fontSize: font.sizeSmall,
      color: THEME.colors.textDim,
    }).setOrigin(1, 0.5);
    this.add(this.countsText);
  }

  /** 풀 카운터 갱신 */
  updateCounts(codonCount: number, sequenceCount: number) {
    this.countsText.setText(`코돈: ${codonCount}/15  시퀀스: ${sequenceCount}/6`);
  }
}
