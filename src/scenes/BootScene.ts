import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // Galmuri11 폰트 로딩 대기 후 LabScene 전환
    document.fonts.ready.then(() => {
      this.scene.start('LabScene');
    });
  }
}
