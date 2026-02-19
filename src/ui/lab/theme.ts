// ─── 테마: 색상, 폰트, 레이아웃 상수 ───

export const THEME = {
  colors: {
    // Gene 역할 색상
    geneA: 0xff4444,  // 파괴 - 빨강
    geneT: 0x44bb44,  // 생존 - 초록
    geneG: 0x4488ff,  // 질서 - 파랑
    geneC: 0xcc44cc,  // 혼돈 - 보라
    // 상호작용
    resonance: 0xffcc00,  // 공명 - 금색
    opposition: 0xff6633, // 대립 - 주황
    fusion: 0x33ccff,     // 융합 - 시안
    // UI 기본
    bg: 0x0a0a0f,
    panelBg: 0x14141f,
    cardBg: 0x1e1e2e,
    textMain: '#e0e0e0',
    textDim: '#808090',
    textGold: '#ffd700',
    // Gene 색상 매핑
    gene: { A: 0xff4444, T: 0x44bb44, G: 0x4488ff, C: 0xcc44cc } as Record<string, number>,
    // 탭 바
    tabActive: 0x2a2a3f,
    tabInactive: 0x14141f,
    tabBorder: 0x3a3a5f,
    // 버튼
    btnPrimary: 0x3366cc,
    btnDanger: 0xcc3333,
    btnDisabled: 0x333344,
    // 속성
    fire: 0xff6633,
    water: 0x3399ff,
    earth: 0x99aa44,
    plant: 0x33cc66,
  },
  font: {
    family: 'Galmuri11',
    sizeSmall: '11px',
    sizeMedium: '13px',
    sizeLarge: '16px',
    sizeTitle: '20px',
  },
  layout: {
    width: 960,
    height: 540,
    padding: 8,
    // 기존 호환용 (deprecated — 신규 코드는 아래 3컬럼 사용)
    headerHeight: 48,
    tabBarHeight: 32,
    footerHeight: 40,
    workspaceY: 80,
    workspaceH: 420,
    leftPanelW: 300,
    rightPanelW: 660,
    dividerX: 300,
    listItemH: 36,
    listPadding: 6,
    // ─── 3컬럼 허브 레이아웃 ───
    topHudH: 56,
    actionBarH: 84,
    middleY: 56,
    middleH: 400,
    leftPanelX: 0,
    leftW: 280,
    centerBoardX: 280,
    centerBoardW: 400,
    rightPanelX: 680,
    rightW: 280,
    // BuildBoard 내부
    seqSlotW: 186,
    seqSlotH: 155,
    seqSlotGap: 8,
    plasmidCardH: 36,
    codonChipW: 52,
    codonChipH: 68,
    interIconW: 16,
    // ─── 3작업대 레이아웃 ───
    // 탭 순서 (좌→우): 실험체 | 조립 | 빌드
    // 콘텐츠 배치: 실험체 x=0, 조립 x=960, 빌드 x=1920
    // 기본 활성 탭: 빌드 (container.x = -1920)
    workbench: {
      navY: 56,       // WorkbenchNav y (TopHUD 바로 아래)
      navH: 32,       // WorkbenchNav 높이
      contentY: 88,   // 작업대 콘텐츠 y (navY + navH)
      contentH: 452,  // 작업대 콘텐츠 높이 (540 - 88)
      contentW: 960,
      panOffset: 960,  // 작업대 간 x 오프셋 (패닝 거리)
      panDuration: 250, // 패닝 애니메이션 ms
      // 플라스미드대 (실험체 정보 + 플라스미드 선택) — x=0..959
      plasmid: {
        creatureX: 10,
        creatureW: 310,
        creatureH: 440,
        selectorX: 330,
        selectorW: 620,
        selectorH: 440,
        summaryY: 400,
        summaryH: 40,
      },
      // 조립대 (합성 + 코돈풀 + 시퀀스 조립) — x=960..1919
      assemble: {
        synthX: 10,
        synthW: 300,
        synthH: 440,
        poolX: 320,
        poolW: 300,
        poolH: 440,
        assemblerX: 630,
        assemblerW: 320,
        assemblerH: 440,
      },
      // 빌드대 (빌드 보드 + 분석) — x=1920..2879
      build: {
        boardX: 10,
        boardW: 460,
        boardH: 440,
        analysisX: 480,
        analysisW: 470,
        analysisH: 440,
      },
      // 코돈 미리보기 오버레이 (빌드대 위)
      overlay: {
        x: 580,
        w: 380,
        h: 452,
      },
    },
  },
} as const;

/** Gene → 색상 */
export function getGeneColor(gene: string): number {
  return THEME.colors.gene[gene] ?? 0x888888;
}

/** 역할 태그 → 색상 */
export function getRoleColor(role: string): number {
  switch (role) {
    case 'Destroy': return THEME.colors.geneA;
    case 'Survive': return THEME.colors.geneT;
    case 'Order':   return THEME.colors.geneG;
    case 'Chaos':   return THEME.colors.geneC;
    default:        return 0x888888;
  }
}

/** 상호작용 타입 → 색상 */
export function getInteractionColor(type: string): number {
  switch (type) {
    case 'Resonance':  return THEME.colors.resonance;
    case 'Opposition': return THEME.colors.opposition;
    case 'Fusion':     return THEME.colors.fusion;
    default:           return 0x888888;
  }
}

/** 속성 → 색상 */
export function getElementColor(element: string): number {
  switch (element) {
    case 'Fire':  return THEME.colors.fire;
    case 'Water': return THEME.colors.water;
    case 'Earth': return THEME.colors.earth;
    case 'Plant': return THEME.colors.plant;
    default:      return 0x888888;
  }
}

/** 희귀도 표시 (pathCount 기반) */
export function getRarityLabel(pathCount: number): string {
  if (pathCount === 1) return '\u2605'; // ★
  if (pathCount === 2) return '\u2606'; // ☆
  return '';
}
