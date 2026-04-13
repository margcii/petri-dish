export interface FungusPlacement {
  x: number
  y: number
  rotation: number // degrees, ±15
  scale: number // 0.85-1.15
  groupId: string
  parentIndices: number[] // which parents are in this placement
  isHybrid: boolean
}

interface HybridGroupLike {
  groupId: string
  parents: unknown[]
  isIncubating: boolean
  hybridResult?: unknown
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

/**
 * 在培养皿圆形区域内散布真菌，避免重叠
 * @param groups 杂交组列表
 * @param dishCenter 培养皿中心坐标
 * @param dishRadius 培养皿半径
 * @param baseSize 单个真菌基准尺寸
 */
export function scatterFungi(
  groups: HybridGroupLike[],
  dishCenter: { x: number; y: number },
  dishRadius: number,
  baseSize: number
): FungusPlacement[] {
  const placements: FungusPlacement[] = []
  const placedCircles: { x: number; y: number; r: number }[] = []

  // 优先独立真菌，再处理杂交组
  const sorted = [...groups].sort((a, b) => a.parents.length - b.parents.length)

  for (const group of sorted) {
    const parentCount = group.parents.length
    const isHybrid = parentCount > 1
    // 杂交组 bounding radius 更大
    const boundingRadius = isHybrid
      ? baseSize * 0.75
      : baseSize / 2
    const margin = boundingRadius + 5 // 离培养皿边缘的最小距离

    let bestX = 0
    let bestY = 0
    let placed = false
    let padding = 10

    for (let attempt = 0; attempt < 50; attempt++) {
      // 极坐标随机点（在圆内均匀分布）
      const angle = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * (dishRadius - margin)
      const x = dishCenter.x + r * Math.cos(angle)
      const y = dishCenter.y + r * Math.sin(angle)

      // 碰撞检测
      const overlaps = placedCircles.some(
        (circle) =>
          distance(x, y, circle.x, circle.y) <
          boundingRadius + circle.r + padding
      )

      if (!overlaps) {
        bestX = x
        bestY = y
        placed = true
        break
      }
    }

    // 50 次失败：缩减间距强制放置
    if (!placed) {
      padding = 0
      const angle = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * (dishRadius - margin)
      bestX = dishCenter.x + r * Math.cos(angle)
      bestY = dishCenter.y + r * Math.sin(angle)
    }

    placedCircles.push({ x: bestX, y: bestY, r: boundingRadius })

    placements.push({
      x: bestX,
      y: bestY,
      rotation: randomBetween(-15, 15),
      scale: randomBetween(0.85, 1.15),
      groupId: group.groupId,
      parentIndices: Array.from({ length: parentCount }, (_, i) => i),
      isHybrid,
    })
  }

  return placements
}
