import { THEME } from './theme';

export type WorkbenchTab = 'BUILD' | 'CRAFT';

/**
 * WorkbenchNav — 연구실 2탭 네비게이션 바 (빌드대 / 제작대)
 *
 * 부모(LabScene)가 (0, 56)에 배치.
 * 전체 너비 960, 높이 32.
 * 탭 전환 시 'tabChange' 이벤트 emit.
 */
export class WorkbenchNav extends Phaser.GameObjects.Container {
  private readonly WIDTH = 960;
  private readonly HEIGHT = 32;
  private readonly DIVIDER_WIDTH = 1;

  private activeTab: WorkbenchTab = 'BUILD';

  // 그래픽 요소
  private buildBg!: Phaser.GameObjects.Graphics;
  private craftBg!: Phaser.GameObjects.Graphics;
  private buildLabel!: Phaser.GameObjects.Text;
  private craftLabel!: Phaser.GameObjects.Text;
  private divider!: Phaser.GameObjects.Graphics;
  private bottomBorder!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const tabWidth = (this.WIDTH - this.DIVIDER_WIDTH) / 2;

    // --- 빌드대 탭 배경 ---
    this.buildBg = this.scene.add.graphics();
    this.add(this.buildBg);

    // --- 제작대 탭 배경 ---
    this.craftBg = this.scene.add.graphics();
    this.add(this.craftBg);

    // --- 탭 사이 구분선 (1px) ---
    this.divider = this.scene.add.graphics();
    this.divider.fillStyle(THEME.colors.tabBorder, 1);
    this.divider.fillRect(tabWidth, 0, this.DIVIDER_WIDTH, this.HEIGHT);
    this.add(this.divider);

    // --- 하단 보더 라인 (1px, 반투명) ---
    this.bottomBorder = this.scene.add.graphics();
    this.bottomBorder.fillStyle(THEME.colors.tabBorder, 0.5);
    this.bottomBorder.fillRect(0, this.HEIGHT - 1, this.WIDTH, 1);
    this.add(this.bottomBorder);

    // --- 빌드대 라벨 ---
    this.buildLabel = this.scene.add.text(tabWidth / 2, this.HEIGHT / 2, '빌드대', {
      fontFamily: THEME.font.family,
      fontSize: THEME.font.sizeMedium,
      color: '#ffffff',
    });
    this.buildLabel.setOrigin(0.5);
    this.add(this.buildLabel);

    // --- 제작대 라벨 ---
    const craftTabX = tabWidth + this.DIVIDER_WIDTH;
    this.craftLabel = this.scene.add.text(
      craftTabX + tabWidth / 2,
      this.HEIGHT / 2,
      '제작대',
      {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: '#ffffff',
      },
    );
    this.craftLabel.setOrigin(0.5);
    this.add(this.craftLabel);

    // --- 클릭 영역: 빌드대 ---
    const buildZone = this.scene.add
      .zone(tabWidth / 2, this.HEIGHT / 2, tabWidth, this.HEIGHT)
      .setInteractive({ useHandCursor: true });
    buildZone.on('pointerdown', () => this.setTab('BUILD'));
    this.add(buildZone);

    // --- 클릭 영역: 제작대 ---
    const craftZone = this.scene.add
      .zone(craftTabX + tabWidth / 2, this.HEIGHT / 2, tabWidth, this.HEIGHT)
      .setInteractive({ useHandCursor: true });
    craftZone.on('pointerdown', () => this.setTab('CRAFT'));
    this.add(craftZone);

    // 초기 상태 렌더
    this.render();
  }

  /** 탭을 프로그래밍 방식으로 전환 */
  setTab(tab: WorkbenchTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.render();
    this.emit('tabChange', tab);
  }

  /** 현재 활성 탭 반환 */
  getActiveTab(): WorkbenchTab {
    return this.activeTab;
  }

  /** 활성/비활성 상태에 따라 배경·텍스트 색상 갱신 */
  private render(): void {
    const tabWidth = (this.WIDTH - this.DIVIDER_WIDTH) / 2;
    const isBuild = this.activeTab === 'BUILD';

    // 빌드대 탭 배경
    this.buildBg.clear();
    this.buildBg.fillStyle(isBuild ? THEME.colors.tabActive : THEME.colors.panelBg, 1);
    this.buildBg.fillRect(0, 0, tabWidth, this.HEIGHT);

    // 제작대 탭 배경
    const craftTabX = tabWidth + this.DIVIDER_WIDTH;
    this.craftBg.clear();
    this.craftBg.fillStyle(!isBuild ? THEME.colors.tabActive : THEME.colors.panelBg, 1);
    this.craftBg.fillRect(craftTabX, 0, tabWidth, this.HEIGHT);

    // 텍스트 색상 갱신
    this.buildLabel.setColor(isBuild ? THEME.colors.textMain : THEME.colors.textDim);
    this.craftLabel.setColor(!isBuild ? THEME.colors.textMain : THEME.colors.textDim);
  }
}
