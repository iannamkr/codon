// ─── ScrollContainer: 마스크 기반 스크롤 컨테이너 ───

import Phaser from 'phaser';

export class ScrollContainer extends Phaser.GameObjects.Container {
  private maskGraphics: Phaser.GameObjects.Graphics;
  private content: Phaser.GameObjects.Container;
  private maskW: number;
  private maskH: number;
  private scrollY = 0;
  private contentHeight = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    super(scene, x, y);
    this.maskW = width;
    this.maskH = height;

    // 마스크 그래픽
    this.maskGraphics = scene.add.graphics();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(x, y, width, height);
    this.maskGraphics.setVisible(false);

    // 콘텐츠 컨테이너
    this.content = scene.add.container(0, 0);
    this.add(this.content);

    // 마스크 적용
    const mask = this.maskGraphics.createGeometryMask();
    this.content.setMask(mask);

    // 마우스 휠 스크롤
    scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _dx: number, dy: number) => {
      // 이 컨테이너가 보이는지 확인
      if (!this.visible) return;
      this.scroll(dy * 0.5);
    });
  }

  /** 콘텐츠 컨테이너에 게임 오브젝트 추가 */
  addContent(obj: Phaser.GameObjects.GameObject) {
    this.content.add(obj);
  }

  /** 콘텐츠 교체 */
  setContent(container: Phaser.GameObjects.Container) {
    this.content.removeAll(true);
    this.content.add(container);
  }

  /** 콘텐츠 전체 높이 설정 (스크롤 범위 계산용) */
  setContentHeight(h: number) {
    this.contentHeight = h;
  }

  /** 콘텐츠 클리어 */
  clearContent() {
    this.content.removeAll(true);
    this.scrollY = 0;
    this.content.setY(0);
  }

  /** 스크롤 위치 이동 */
  scrollTo(y: number) {
    const maxScroll = Math.max(0, this.contentHeight - this.maskH);
    this.scrollY = Phaser.Math.Clamp(y, 0, maxScroll);
    this.content.setY(-this.scrollY);
  }

  private scroll(delta: number) {
    this.scrollTo(this.scrollY + delta);
  }

  /** 마스크 위치 업데이트 (부모 위치 변경 시 호출) */
  updateMaskPosition(x: number, y: number) {
    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(x, y, this.maskW, this.maskH);
  }
}
