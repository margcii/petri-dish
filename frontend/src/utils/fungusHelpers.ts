import type { Fungus } from '../api/dish'

// 真菌样式选项 (8 种独立形象)
export const FUNGUS_COLORS = [
  { id: 'layer4', label: 'F4' },
  { id: 'layer5', label: 'F5' },
  { id: 'layer6', label: 'F6' },
  { id: 'layer7', label: 'F7' },
  { id: 'layer8', label: 'F8' },
  { id: 'layer9', label: 'F9' },
  { id: 'layer10', label: 'F10' },
  { id: 'layer11', label: 'F11' },
]

// 旧 image_id → 新 image_id 映射（兼容旧数据）
const LEGACY_IMAGE_ID_MAP: Record<string, string> = {
  blue: 'layer4',
  yellow: 'layer5',
  green: 'layer6',
  purple: 'layer7',
  white: 'layer8',
  red: 'layer9',
}

/** 规范化 image_id：旧 ID 映射到新 ID，新 ID 原样返回 */
export const getFungusColor = (imageId: string) => {
  const normalizedId = LEGACY_IMAGE_ID_MAP[imageId] || imageId
  const matchedColor = FUNGUS_COLORS.find(c => c.id === normalizedId)
  if (matchedColor) return matchedColor
  // fallback: 按 hash 选择
  const index = imageId.charCodeAt(0) % FUNGUS_COLORS.length
  return FUNGUS_COLORS[index]
}

// 杂交组类型
export interface HybridGroup {
  groupId: string
  parents: Fungus[]
  isIncubating: boolean
  hybridResult?: Fungus
}

/**
 * 将真菌按杂交组分组
 * - parentFungi: 所有 is_parent=true 的真菌（将被显示的）
 * - hybridResults: 所有杂交结果真菌（用于确定分组关系，自身不显示）
 */
export const groupFungiByHybrid = (parentFungi: Fungus[], hybridResults: Fungus[]): HybridGroup[] => {
  const groups: Map<string, HybridGroup> = new Map()
  const standaloneFungi: Fungus[] = []
  const parentFungiMap: Map<string, Fungus> = new Map()

  for (const fungus of parentFungi) {
    parentFungiMap.set(fungus.fungus_id, fungus)
  }

  const groupedFungiIds: Set<string> = new Set()

  for (const result of hybridResults) {
    const parentIds = [result.parent1_id, result.parent2_id].filter((id): id is string => id !== null).sort()
    if (parentIds.length === 0) continue

    const groupId = parentIds.join('-')
    const groupParents: Fungus[] = []
    let isIncubating = result.status === 'incubating'

    for (const parentId of parentIds) {
      const parent = parentFungiMap.get(parentId)
      if (parent) {
        groupParents.push(parent)
        groupedFungiIds.add(parentId)
      }
    }

    if (groupParents.length > 0) {
      if (groups.has(groupId)) {
        const existingGroup = groups.get(groupId)!
        for (const p of groupParents) {
          if (!existingGroup.parents.find(ep => ep.fungus_id === p.fungus_id)) {
            existingGroup.parents.push(p)
          }
        }
        existingGroup.isIncubating = existingGroup.isIncubating || isIncubating
        if (!existingGroup.hybridResult || result.created_at > existingGroup.hybridResult.created_at) {
          existingGroup.hybridResult = result
        }
      } else {
        groups.set(groupId, {
          groupId,
          parents: groupParents,
          isIncubating,
          hybridResult: result,
        })
      }
    }
  }

  for (const fungus of parentFungi) {
    if (!groupedFungiIds.has(fungus.fungus_id)) {
      standaloneFungi.push(fungus)
    }
  }

  const result: HybridGroup[] = standaloneFungi.map(f => ({
    groupId: f.fungus_id,
    parents: [f],
    isIncubating: false,
  }))

  result.push(...groups.values())

  return result
}
