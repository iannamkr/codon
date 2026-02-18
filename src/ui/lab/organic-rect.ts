// ─── 유기적 사각형 렌더링 유틸리티 ───
// fillRoundedRect 대체. 비정형 테두리로 "살아있는" 느낌

export interface OrganicRectOptions {
  seed?: number;        // 노이즈 시드 (같은 시드 = 같은 형태)
  amplitude?: number;   // 변형 크기 (px, 기본 1.5)
  segments?: number;    // 변당 분할 수 (기본 8)
}

/** 시드 기반 의사 난수 (0~1). mulberry32 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 유기적 사각형 정점 생성 (순수 함수, 테스트 가능).
 * 사각형 4변을 segments개로 분할하고 수직 방향으로 노이즈 오프셋.
 */
export function generateOrganicVertices(
  x: number, y: number, w: number, h: number,
  options?: OrganicRectOptions,
): { x: number; y: number }[] {
  const seed = options?.seed ?? 0;
  const amplitude = options?.amplitude ?? 1.5;
  const segments = options?.segments ?? 8;
  const rand = seededRandom(seed);

  const vertices: { x: number; y: number }[] = [];

  // 상변 (좌→우): y 방향으로 오프셋
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const px = x + t * w;
    const py = y + (rand() * 2 - 1) * amplitude;
    vertices.push({ x: px, y: py });
  }

  // 우변 (상→하): x 방향으로 오프셋
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const px = x + w + (rand() * 2 - 1) * amplitude;
    const py = y + t * h;
    vertices.push({ x: px, y: py });
  }

  // 하변 (우→좌): y 방향으로 오프셋
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const px = x + w - t * w;
    const py = y + h + (rand() * 2 - 1) * amplitude;
    vertices.push({ x: px, y: py });
  }

  // 좌변 (하→상): x 방향으로 오프셋
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const px = x + (rand() * 2 - 1) * amplitude;
    const py = y + h - t * h;
    vertices.push({ x: px, y: py });
  }

  return vertices;
}

/** Phaser Graphics에 유기적 사각형 채우기 */
export function drawOrganicRect(
  graphics: { beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; closePath(): void; fillPath(): void },
  x: number, y: number, w: number, h: number,
  options?: OrganicRectOptions,
): void {
  const verts = generateOrganicVertices(x, y, w, h, options);
  if (verts.length === 0) return;

  graphics.beginPath();
  graphics.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    graphics.lineTo(verts[i].x, verts[i].y);
  }
  graphics.closePath();
  graphics.fillPath();
}

/** Phaser Graphics에 유기적 사각형 외곽선 */
export function strokeOrganicRect(
  graphics: { beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; closePath(): void; strokePath(): void },
  x: number, y: number, w: number, h: number,
  options?: OrganicRectOptions,
): void {
  const verts = generateOrganicVertices(x, y, w, h, options);
  if (verts.length === 0) return;

  graphics.beginPath();
  graphics.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    graphics.lineTo(verts[i].x, verts[i].y);
  }
  graphics.closePath();
  graphics.strokePath();
}
