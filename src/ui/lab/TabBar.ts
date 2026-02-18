// ─── TabBar: 4탭 네비게이션 바 ───

import Phaser from 'phaser';
import { THEME } from './theme';

const TAB_LABELS = ['합성', '코돈 풀', '시퀀스', '빌드'];

export class TabBar extends Phaser.GameObjects.Container {
  private tabs: { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }[] = [];
  private activeIndex = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, THEME.layout.headerHeight);

    const { width, tabBarHeight } = THEME.layout;
    const tabWidth = width / TAB_LABELS.length;

    // 전체 배경
    const fullBg = scene.add.graphics();
    fullBg.fillStyle(THEME.colors.panelBg, 1);
    fullBg.fillRect(0, 0, width, tabBarHeight);
    this.add(fullBg);

    TAB_LABELS.forEach((label, i) => {
      const x = i * tabWidth;

      // 탭 배경
      const bg = scene.add.graphics();
      this.drawTabBg(bg, x, tabWidth, tabBarHeight, i === 0);
      this.add(bg);

      // 탭 텍스트
      const text = scene.add.text(x + tabWidth / 2, tabBarHeight / 2, label, {
        fontFamily: THEME.font.family,
        fontSize: THEME.font.sizeMedium,
        color: i === 0 ? THEME.colors.textMain : THEME.colors.textDim,
      }).setOrigin(0.5);
      this.add(text);

      // 클릭 영역
      const hitArea = scene.add.zone(x + tabWidth / 2, tabBarHeight / 2, tabWidth, tabBarHeight)
        .setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.setActiveTab(i);
        this.emit('tabChange', i);
      });
      this.add(hitArea);

      this.tabs.push({ bg, text });
    });
  }

  /** 활성 탭 변경 */
  setActiveTab(index: number) {
    const { width, tabBarHeight } = THEME.layout;
    const tabWidth = width / TAB_LABELS.length;

    this.tabs.forEach((tab, i) => {
      const isActive = i === index;
      const x = i * tabWidth;
      this.drawTabBg(tab.bg, x, tabWidth, tabBarHeight, isActive);
      tab.text.setStyle({
        color: isActive ? THEME.colors.textMain : THEME.colors.textDim,
      });
    });

    this.activeIndex = index;
  }

  private drawTabBg(
    g: Phaser.GameObjects.Graphics,
    x: number,
    w: number,
    h: number,
    active: boolean,
  ) {
    g.clear();
    g.fillStyle(active ? THEME.colors.tabActive : THEME.colors.tabInactive, 1);
    g.fillRect(x, 0, w, h);

    // 하단 하이라이트 (활성 탭)
    if (active) {
      g.lineStyle(2, THEME.colors.tabBorder, 1);
      g.lineBetween(x, h - 1, x + w, h - 1);
    }

    // 세로 구분선
    g.lineStyle(1, THEME.colors.tabBorder, 0.3);
    g.lineBetween(x + w, 0, x + w, h);
  }
}
