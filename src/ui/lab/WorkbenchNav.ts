import { THEME } from './theme';

export type WorkbenchTab = 'PLASMID' | 'ASSEMBLE' | 'BUILD';

const TAB_CONFIG: { key: WorkbenchTab; label: string }[] = [
  { key: 'PLASMID', label: '실험체' },
  { key: 'ASSEMBLE', label: '조립' },
  { key: 'BUILD', label: '빌드' },
];

/**
 * WorkbenchNav — 연구실 3탭 네비게이션 바 (실험체 / 조립 / 빌드)
 *
 * 부모(LabScene)가 (0, 56)에 배치.
 * 전체 너비 960, 높이 32.
 * 탭 전환 시 'tabChange' 이벤트 emit.
 */
export class WorkbenchNav extends Phaser.GameObjects.Container {
  private readonly WIDTH = 960;
  private readonly HEIGHT = 32;
  private readonly DIVIDER_WIDTH = 1;
  private readonly TAB_COUNT = TAB_CONFIG.length;

  private activeTab: WorkbenchTab = 'BUILD';

  // 탭별 UI 요소
  private tabBgs: Phaser.GameObjects.Graphics[] = [];
  private tabLabels: Phaser.GameObjects.Text[] = [];
  private dividers: Phaser.GameObjects.Graphics[] = [];
  private bottomBorder!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const tabWidth = (this.WIDTH - this.DIVIDER_WIDTH * (this.TAB_COUNT - 1)) / this.TAB_COUNT;

    // --- 탭 생성 ---
    TAB_CONFIG.forEach((tab, i) => {
      const tabX = i * (tabWidth + this.DIVIDER_WIDTH);

      // 배경
      const bg = this.scene.add.graphics();
      this.add(bg);
      this.tabBgs.push(bg);

      // 라벨
      const label = this.scene.add.text(tabX + tabWidth / 2, this.HEIGHT / 2, tab.label, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: '#ffffff',
      });
      label.setOrigin(0.5);
      this.add(label);
      this.tabLabels.push(label);

      // 클릭 영역
      const zone = this.scene.add
        .zone(tabX + tabWidth / 2, this.HEIGHT / 2, tabWidth, this.HEIGHT)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.setTab(tab.key));
      this.add(zone);
    });

    // --- 구분선 (탭 사이) ---
    for (let i = 1; i < this.TAB_COUNT; i++) {
      const divX = i * (tabWidth + this.DIVIDER_WIDTH) - this.DIVIDER_WIDTH;
      const divider = this.scene.add.graphics();
      divider.fillStyle(THEME.colors.tabBorder, 1);
      divider.fillRect(divX, 0, this.DIVIDER_WIDTH, this.HEIGHT);
      this.add(divider);
      this.dividers.push(divider);
    }

    // --- 하단 보더 라인 (1px, 반투명) ---
    this.bottomBorder = this.scene.add.graphics();
    this.bottomBorder.fillStyle(THEME.colors.tabBorder, 0.5);
    this.bottomBorder.fillRect(0, this.HEIGHT - 1, this.WIDTH, 1);
    this.add(this.bottomBorder);

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
    const tabWidth = (this.WIDTH - this.DIVIDER_WIDTH * (this.TAB_COUNT - 1)) / this.TAB_COUNT;

    TAB_CONFIG.forEach((tab, i) => {
      const tabX = i * (tabWidth + this.DIVIDER_WIDTH);
      const isActive = tab.key === this.activeTab;

      this.tabBgs[i].clear();
      this.tabBgs[i].fillStyle(
        isActive ? THEME.colors.tabActive : THEME.colors.panelBg,
        1,
      );
      this.tabBgs[i].fillRect(tabX, 0, tabWidth, this.HEIGHT);

      this.tabLabels[i].setColor(isActive ? THEME.colors.textMain : THEME.colors.textDim);
    });
  }
}
