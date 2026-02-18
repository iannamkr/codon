// ─── ActionColumn: 빌드 테이블 우측 액션 컬럼 ───
// 코돈 보기 / 빌드 초기화 / 상태 메시지 / 출격 버튼

import Phaser from 'phaser';
import { THEME } from './theme';

const COL_W = 240;
const COL_H = 380;

export class ActionColumn extends Phaser.GameObjects.Container {
  // 코돈 보기 버튼
  private viewCodonsBtnBg: Phaser.GameObjects.Graphics;
  private viewCodonsBtnText: Phaser.GameObjects.Text;

  // 빌드 초기화 버튼
  private resetBtnBg: Phaser.GameObjects.Graphics;
  private resetBtnText: Phaser.GameObjects.Text;

  // 상태 메시지
  private statusText: Phaser.GameObjects.Text;

  // 출격 버튼 + 글로우
  private deployGlowGfx: Phaser.GameObjects.Graphics;
  private deployBtnBg: Phaser.GameObjects.Graphics;
  private deployBtnText: Phaser.GameObjects.Text;
  private deployEnabled = false;
  private glowTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const font = THEME.font;
    const centerX = COL_W / 2;

    // ════════════════════════════════════════
    // [코돈 보기] 아웃라인 버튼 (y=20)
    // ════════════════════════════════════════

    const viewBtnW = 160;
    const viewBtnH = 32;
    const viewBtnX = centerX - viewBtnW / 2;
    const viewBtnY = 20;

    this.viewCodonsBtnBg = this.scene.add.graphics();
    this.drawOutlineButton(this.viewCodonsBtnBg, viewBtnX, viewBtnY, viewBtnW, viewBtnH, THEME.colors.btnPrimary);
    this.add(this.viewCodonsBtnBg);

    this.viewCodonsBtnText = this.scene.add.text(
      centerX,
      viewBtnY + viewBtnH / 2,
      '코돈 보기',
      {
        fontFamily: font.family,
        fontSize: font.sizeMedium,
        color: THEME.colors.textMain,
      },
    ).setOrigin(0.5);
    this.add(this.viewCodonsBtnText);

    // 코돈 보기 클릭 영역
    const viewZone = this.scene.add.zone(
      centerX,
      viewBtnY + viewBtnH / 2,
      viewBtnW,
      viewBtnH,
    ).setInteractive({ useHandCursor: true });
    viewZone.on('pointerdown', () => this.emit('viewCodons'));
    this.add(viewZone);

    // ════════════════════════════════════════
    // [빌드 초기화] 위험 아웃라인 버튼 (y=68)
    // ════════════════════════════════════════

    const resetBtnW = 160;
    const resetBtnH = 32;
    const resetBtnX = centerX - resetBtnW / 2;
    const resetBtnY = 68;

    this.resetBtnBg = this.scene.add.graphics();
    this.drawOutlineButton(this.resetBtnBg, resetBtnX, resetBtnY, resetBtnW, resetBtnH, THEME.colors.btnDanger);
    this.add(this.resetBtnBg);

    this.resetBtnText = this.scene.add.text(
      centerX,
      resetBtnY + resetBtnH / 2,
      '빌드 초기화',
      {
        fontFamily: font.family,
        fontSize: font.sizeMedium,
        color: '#cc3333',
      },
    ).setOrigin(0.5);
    this.add(this.resetBtnText);

    // 초기화 클릭 영역
    const resetZone = this.scene.add.zone(
      centerX,
      resetBtnY + resetBtnH / 2,
      resetBtnW,
      resetBtnH,
    ).setInteractive({ useHandCursor: true });
    resetZone.on('pointerdown', () => this.emit('reset'));
    this.add(resetZone);

    // ════════════════════════════════════════
    // 상태 메시지 (y=120, 중앙 정렬)
    // ════════════════════════════════════════

    this.statusText = this.scene.add.text(centerX, 120, '', {
      fontFamily: font.family,
      fontSize: font.sizeSmall,
      color: THEME.colors.textDim,
      wordWrap: { width: 220 },
      align: 'center',
    }).setOrigin(0.5, 0);
    this.add(this.statusText);

    // ════════════════════════════════════════
    // [=== 출격 ===] 버튼 + 글로우 (y=320)
    // ════════════════════════════════════════

    const deployBtnW = 200;
    const deployBtnH = 48;
    const deployBtnX = centerX - deployBtnW / 2;
    const deployBtnY = 320;

    // 글로우 (버튼 뒤에 깔리는 Graphics)
    this.deployGlowGfx = this.scene.add.graphics();
    this.deployGlowGfx.setAlpha(0);
    this.add(this.deployGlowGfx);

    // 메인 버튼 배경
    this.deployBtnBg = this.scene.add.graphics();
    this.add(this.deployBtnBg);

    // 버튼 텍스트
    this.deployBtnText = this.scene.add.text(
      centerX,
      deployBtnY + deployBtnH / 2,
      '=== 출격 ===',
      {
        fontFamily: font.family,
        fontSize: font.sizeLarge,
        color: '#666677',
      },
    ).setOrigin(0.5);
    this.add(this.deployBtnText);

    // 출격 클릭 영역
    const deployZone = this.scene.add.zone(
      centerX,
      deployBtnY + deployBtnH / 2,
      deployBtnW,
      deployBtnH,
    ).setInteractive({ useHandCursor: true });
    deployZone.on('pointerdown', () => {
      if (this.deployEnabled) {
        this.emit('deploy');
      }
    });
    this.add(deployZone);

    // 초기 상태: 비활성
    this.drawDeployButton(false);
  }

  // ─── Public API ───

  /** 출격 버튼 활성/비활성 토글 */
  setDeployEnabled(enabled: boolean): void {
    if (this.deployEnabled === enabled) return;
    this.deployEnabled = enabled;
    this.drawDeployButton(enabled);
  }

  /** 상태 메시지 갱신 */
  setStatus(msg: string, color?: string): void {
    this.statusText.setText(msg);
    if (color) {
      this.statusText.setStyle({ color });
    }
  }

  // ─── 내부 헬퍼 ───

  /** 아웃라인 버튼 그리기 */
  private drawOutlineButton(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
  ): void {
    g.clear();
    g.lineStyle(1, color, 0.8);
    g.strokeRoundedRect(x, y, w, h, 4);
  }

  /** 출격 버튼 + 글로우 그리기 */
  private drawDeployButton(enabled: boolean): void {
    const deployBtnW = 200;
    const deployBtnH = 48;
    const centerX = COL_W / 2;
    const deployBtnX = centerX - deployBtnW / 2;
    const deployBtnY = 320;

    const fillColor = enabled ? THEME.colors.btnPrimary : THEME.colors.btnDisabled;

    // 메인 버튼 배경
    this.deployBtnBg.clear();
    this.deployBtnBg.fillStyle(fillColor, 1);
    this.deployBtnBg.fillRoundedRect(deployBtnX, deployBtnY, deployBtnW, deployBtnH, 6);

    // 텍스트 색상
    this.deployBtnText.setStyle({
      color: enabled ? '#ffffff' : '#666677',
    });

    // 기존 글로우 트윈 정리
    if (this.glowTween) {
      this.glowTween.destroy();
      this.glowTween = null;
    }

    if (enabled) {
      // 글로우 배경 (버튼보다 약간 큰 둥근 사각형)
      const glowPad = 6;
      this.deployGlowGfx.clear();
      this.deployGlowGfx.fillStyle(THEME.colors.btnPrimary, 1);
      this.deployGlowGfx.fillRoundedRect(
        deployBtnX - glowPad,
        deployBtnY - glowPad,
        deployBtnW + glowPad * 2,
        deployBtnH + glowPad * 2,
        10,
      );
      this.deployGlowGfx.setAlpha(0.15);

      // 글로우 펄스 트윈
      this.glowTween = this.scene.tweens.add({
        targets: this.deployGlowGfx,
        alpha: { from: 0.15, to: 0.5 },
        duration: 1000,
        ease: 'Sine.easeInOut',
        repeat: -1,
        yoyo: true,
      });
    } else {
      // 비활성 시 글로우 제거
      this.deployGlowGfx.clear();
      this.deployGlowGfx.setAlpha(0);
    }
  }
}
