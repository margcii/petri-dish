import { FabricImage, Group } from 'fabric'

// 8 种独立形象，image_id 直接映射 PNG 文件名
const IMAGE_SHAPE_MAP: Record<string, string> = {
  layer4: 'layer4',
  layer5: 'layer5',
  layer6: 'layer6',
  layer7: 'layer7',
  layer8: 'layer8',
  layer9: 'layer9',
  layer10: 'layer10',
  layer11: 'layer11',
  // 旧 ID 兼容：映射到 layer4.png 作为 fallback
  blue: 'layer4',
  yellow: 'layer5',
  green: 'layer6',
  purple: 'layer7',
  white: 'layer8',
  red: 'layer9',
}

/** 规范化 image_id 为 PNG 文件名（不含扩展名） */
function resolveShapeName(imageId: string): string {
  return IMAGE_SHAPE_MAP[imageId] || 'layer4'
}

// 模块级图片缓存
const imageCache: Map<string, HTMLImageElement> = new Map()

/** 预加载真菌图片到缓存 */
export async function preloadImages(): Promise<void> {
  const imgs = ['layer4', 'layer5', 'layer6', 'layer7', 'layer8', 'layer9', 'layer10', 'layer11']
  await Promise.all(
    imgs.map(async (name) => {
      if (imageCache.has(name)) return
      const img = await FabricImage.fromURL(`/${name}.png`, {
        crossOrigin: 'anonymous',
      })
      imageCache.set(name, img.getElement() as HTMLImageElement)
    })
  )
}

/**
 * 获取 image_id 对应的图片路径（用于 <img> src）
 * 保留此函数作为公共 API，返回 /layerN.png 路径
 */
export function getImageSrc(imageId: string): string {
  const shapeName = resolveShapeName(imageId)
  return `/${shapeName}.png`
}

/**
 * 兼容旧代码的 getRingColor — 不再返回颜色，返回统一蓝色
 * 用于 boxShadow 等需要颜色值的场景
 */
export function getRingColor(_imageId: string): string {
  return '#404040'
}

/** 创建真菌视觉对象（纯图片，无 ring 边框） */
export async function createFungusVisual(
  imageId: string,
  size: number
): Promise<Group> {
  const shapeName = resolveShapeName(imageId)

  // 从缓存获取图片源，创建新 FabricImage 实例
  const cachedEl = imageCache.get(shapeName)
  let img: FabricImage
  if (cachedEl) {
    img = new FabricImage(cachedEl, {
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
    })
  } else {
    // fallback: 直接加载
    img = await FabricImage.fromURL(`/${shapeName}.png`, {
      crossOrigin: 'anonymous',
    })
    img.set({ originX: 'center', originY: 'center', left: 0, top: 0 })
  }

  // 缩放图片适配 size
  const imgWidth = img.width || size
  const imgHeight = img.height || size
  const scale = size / Math.max(imgWidth, imgHeight)
  img.set({ scaleX: scale, scaleY: scale })

  const group = new Group([img], {
    originX: 'center',
    originY: 'center',
    subTargetCheck: true,
  })

  return group
}
