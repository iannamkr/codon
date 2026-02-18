import Phaser from 'phaser';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    // 스텁: 전투 준비 중 텍스트만 표시
    this.add.text(480, 270, '전투 준비 중...', {
      fontFamily: 'Galmuri11',
      fontSize: '20px',
      color: '#e0e0e0',
    }).setOrigin(0.5);
  }
}
