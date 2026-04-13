import { useEffect, useRef, useCallback } from 'react'
import { Canvas, FabricImage, Group, Circle, util } from 'fabric'
import { preloadImages, createFungusVisual } from '../utils/fungusImage'
import { scatterFungi } from '../utils/layout'
import type { Fungus } from '../api/dish'

export interface HybridGroup {
  groupId: string
  parents: Fungus[]
  isIncubating: boolean
  hybridResult?: Fungus
}

interface PetriDishCanvasProps {
  hybridGroups: HybridGroup[]
  fallingFungusId: string | null
  hasNewHybrid: boolean
  onSelectFungus: (fungus: Fungus) => void
  onSelectHybridGroup: (group: HybridGroup) => void
}

// 附加在 Fabric 对象上的元数据
interface FungusObjectData {
  fungusData?: Fungus
  groupData?: HybridGroup
  fungusId?: string
}

const BASE_FUNGUS_SIZE = 60

export default function PetriDishCanvas({
  hybridGroups,
  fallingFungusId,
  hasNewHybrid,
  onSelectFungus,
  onSelectHybridGroup,
}: PetriDishCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const groupsRef = useRef<HybridGroup[]>(hybridGroups)
  const animationRef = useRef<number[]>([])
  const dishBgRef = useRef<FabricImage | null>(null)

  // 保持 refs 同步
  groupsRef.current = hybridGroups

  // 清理所有动画
  const clearAnimations = useCallback(() => {
    animationRef.current.forEach((id) => cancelAnimationFrame(id))
    animationRef.current = []
  }, [])

  // 计算培养皿在 canvas 内的位置参数
  const getDishLayout = useCallback((canvasWidth: number, canvasHeight: number) => {
    const canvasMin = Math.min(canvasWidth, canvasHeight)
    const dishRadius = canvasMin * 0.42
    return {
      centerX: canvasWidth / 2,
      centerY: canvasHeight / 2,
      dishRadius,
    }
  }, [])

  // 渲染真菌到 canvas
  const renderFungi = useCallback(
    async (canvas: Canvas, groups: HybridGroup[]) => {
      // 移除旧真菌对象（保留背景）
      const objectsToRemove = canvas.getObjects().filter((obj) => {
        const data = (obj as unknown as FungusObjectData)
        return data.fungusData || data.groupData || data.fungusId
      })
      canvas.remove(...objectsToRemove)

      clearAnimations()

      if (groups.length === 0) return

      const { centerX, centerY, dishRadius } = getDishLayout(canvas.getWidth(), canvas.getHeight())

      // 散布布局
      const placements = scatterFungi(groups, { x: centerX, y: centerY }, dishRadius, BASE_FUNGUS_SIZE)

      for (let i = 0; i < placements.length; i++) {
        const placement = placements[i]
        const group = groups[i]
        if (!group) continue

        const { x, y, rotation, scale, isHybrid, parentIndices } = placement

        if (!isHybrid && parentIndices.length === 1) {
          // 单个真菌
          const fungus = group.parents[0]
          if (!fungus) continue

          const visual = await createFungusVisual(fungus.image_id, BASE_FUNGUS_SIZE)
          visual.set({
            left: x,
            top: y,
            angle: rotation,
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: true,
          })
          ;(visual as unknown as FungusObjectData).fungusData = fungus
          ;(visual as unknown as FungusObjectData).groupData = group
          ;(visual as unknown as FungusObjectData).fungusId = fungus.fungus_id

          canvas.add(visual)

          // 孵化脉冲动画
          if (group.isIncubating) {
            startIncubatingPulse(canvas, visual)
          }
        } else if (isHybrid && parentIndices.length >= 2) {
          // 杂交组 — 创建多个真菌视觉对象重叠，半透明
          const fungusSize = BASE_FUNGUS_SIZE * 0.8
          const visuals: InstanceType<typeof Group>[] = []

          for (let pi = 0; pi < parentIndices.length && pi < group.parents.length; pi++) {
            const fungus = group.parents[pi]
            if (!fungus) continue

            const visual = await createFungusVisual(fungus.image_id, fungusSize)

            // 重叠偏移
            let offsetX = 0
            let offsetY = 0
            if (parentIndices.length === 2) {
              offsetX = pi === 0 ? -fungusSize * 0.3 : fungusSize * 0.3
            } else if (parentIndices.length === 3) {
              if (pi === 0) {
                offsetY = -fungusSize * 0.25
              } else if (pi === 1) {
                offsetX = -fungusSize * 0.3
                offsetY = fungusSize * 0.25
              } else {
                offsetX = fungusSize * 0.3
                offsetY = fungusSize * 0.25
              }
            }

            // 半透明
            visual.set({ left: offsetX, top: offsetY, opacity: 0.75, selectable: false, evented: false })
            ;(visual as unknown as FungusObjectData).fungusData = fungus
            ;(visual as unknown as FungusObjectData).fungusId = fungus.fungus_id
            visuals.push(visual)
          }

          const hybridGroup = new Group(visuals, {
            left: x,
            top: y,
            angle: rotation,
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: true,
            subTargetCheck: false,
          })
          ;(hybridGroup as unknown as FungusObjectData).groupData = group
          ;(hybridGroup as unknown as FungusObjectData).fungusId = group.groupId

          canvas.add(hybridGroup)

          // 孵化脉冲
          if (group.isIncubating) {
            startIncubatingPulse(canvas, hybridGroup)
          }
        }
      }

      canvas.renderAll()
    },
    [getDishLayout, clearAnimations]
  )

  // 孵化脉冲动画
  const startIncubatingPulse = (canvas: Canvas, obj: unknown) => {
    const fabricObj = obj as { opacity: number; set: (props: Record<string, unknown>) => void }
    let forward = true
    const pulse = () => {
      if (forward) {
        fabricObj.set({ opacity: 0.3 })
      } else {
        fabricObj.set({ opacity: 1 })
      }
      forward = !forward
      canvas.renderAll()
    }
    const intervalId = window.setInterval(pulse, 500)
    animationRef.current.push(intervalId as unknown as number)
  }

  // 初始化 Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = Math.min(width, 500)

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      selection: false,
      hoverCursor: 'pointer',
    })

    fabricRef.current = canvas

    // 加载培养皿背景
    const initCanvas = async () => {
      await preloadImages()

      const bgImg = await FabricImage.fromURL('/petridish.png', {
        crossOrigin: 'anonymous',
      })

      const scaleX = width / (bgImg.width || width)
      const scaleY = height / (bgImg.height || height)
      const bgScale = Math.min(scaleX, scaleY) * 0.9

      bgImg.set({
        originX: 'center',
        originY: 'center',
        left: width / 2,
        top: height / 2,
        scaleX: bgScale,
        scaleY: bgScale,
        selectable: false,
        evented: false,
      })

      canvas.backgroundImage = bgImg
      dishBgRef.current = bgImg
      canvas.renderAll()
    }

    initCanvas()

    // 点击事件 — 统一交互模式（无 Ctrl 区分）
    canvas.on('mouse:down', (opt) => {
      const target = opt.target
      if (!target) return

      const data = target as unknown as FungusObjectData

      if (data.groupData) {
        const g = data.groupData
        if (g.parents.length === 1 && !g.hybridResult && !g.isIncubating) {
          // Standalone fungus — open FungusDetailModal instead
          onSelectFungus(data.fungusData || g.parents[0])
        } else {
          // Genuine hybrid group → HybridGroupDetailModal
          onSelectHybridGroup(g)
        }
      } else if (data.fungusData) {
        onSelectFungus(data.fungusData)
      }
    })

    // ── 悬浮透明度效果：非悬浮对象淡出 ──
    let lastHovered: any = null

    // 保存每个真菌/组的原始透明度
    const originalOpacities = new Map<any, number>()

    const applyHover = (target: any) => {
      const data = target as unknown as FungusObjectData
      if (!data.fungusData && !data.groupData) return

      // 保存所有真菌对象的原始透明度（仅首次）
      const allObjects = canvas.getObjects()
      for (const obj of allObjects) {
        const od = obj as unknown as FungusObjectData
        if (od.fungusData || od.groupData || od.fungusId) {
          if (!originalOpacities.has(obj)) {
            originalOpacities.set(obj, (obj as any).opacity ?? 1)
          }
        }
      }

      // 淡出非悬浮对象
      for (const obj of allObjects) {
        const od = obj as unknown as FungusObjectData
        if (od.fungusData || od.groupData || od.fungusId) {
          if (obj === target) {
            ;(obj as any).set({ opacity: originalOpacities.get(obj) ?? 1 })
          } else {
            ;(obj as any).set({ opacity: 0.25 })
          }
        }
      }
      canvas.renderAll()
    }

    const clearHover = () => {
      // 恢复所有对象原始透明度
      const allObjects = canvas.getObjects()
      for (const obj of allObjects) {
        if (originalOpacities.has(obj)) {
          ;(obj as any).set({ opacity: originalOpacities.get(obj) })
        }
      }
      lastHovered = null
      canvas.renderAll()
    }

    canvas.on('mouse:over', (opt) => {
      const target = opt.target
      if (!target) return
      const data = target as unknown as FungusObjectData
      if (!data.fungusData && !data.groupData) return

      lastHovered = target
      applyHover(target)
    })

    canvas.on('mouse:out', (opt) => {
      const target = opt.target
      if (target === lastHovered || !target) {
        clearHover()
      }
    })

    // 响应式
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !fabricRef.current) return
      const newWidth = container.clientWidth
      const newHeight = Math.min(newWidth, 500)

      const c = fabricRef.current
      c.setDimensions({ width: newWidth, height: newHeight })

      if (dishBgRef.current) {
        const bg = dishBgRef.current
        const bgScale = Math.min(
          newWidth / (bg.getOriginalSize().width || newWidth),
          newHeight / (bg.getOriginalSize().height || newHeight)
        ) * 0.9
        bg.set({
          left: newWidth / 2,
          top: newHeight / 2,
          scaleX: bgScale,
          scaleY: bgScale,
        })
      }

      renderFungi(c, groupsRef.current)
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      clearAnimations()
      canvas.dispose()
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 同步 hybridGroups → Canvas
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    renderFungi(canvas, hybridGroups)
  }, [hybridGroups, renderFungi])

  // 下落动画
  useEffect(() => {
    if (!fallingFungusId || !fabricRef.current) return

    const canvas = fabricRef.current
    const target = canvas.getObjects().find((obj) => {
      const data = obj as unknown as FungusObjectData
      return data.fungusId === fallingFungusId
    })

    if (target) {
      const currentTop = target.top || 0
      const currentScaleX = target.scaleX || 1
      target.set({ top: currentTop - 100, scaleX: currentScaleX * 0.5, scaleY: (target.scaleY || 1) * 0.5 })
      target.animate(
        { top: currentTop, scaleX: currentScaleX, scaleY: currentScaleX },
        {
          duration: 800,
          onChange: () => canvas.renderAll(),
          easing: util.ease.easeOutBounce,
        }
      )
    }
  }, [fallingFungusId])

  // 新杂交脉冲
  useEffect(() => {
    if (!hasNewHybrid || !fabricRef.current) return

    const canvas = fabricRef.current
    const { centerX, centerY, dishRadius } = getDishLayout(canvas.getWidth(), canvas.getHeight())

    const pulseRing = new Circle({
      left: centerX,
      top: centerY,
      radius: dishRadius + 5,
      originX: 'center',
      originY: 'center',
      fill: 'transparent',
      stroke: '#d4d4d4',
      strokeWidth: 3,
      opacity: 0.3,
      selectable: false,
      evented: false,
    })

    canvas.add(pulseRing)
    let pulseCount = 0

    const pulseInterval = window.setInterval(() => {
      const newOpacity = pulseRing.opacity === 0.3 ? 1 : 0.3
      pulseRing.set({ opacity: newOpacity })
      canvas.renderAll()
      pulseCount++
      if (pulseCount >= 6) {
        clearInterval(pulseInterval)
        canvas.remove(pulseRing)
        canvas.renderAll()
      }
    }, 500)

    return () => {
      clearInterval(pulseInterval)
      canvas.remove(pulseRing)
    }
  }, [hasNewHybrid, getDishLayout])

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} />
    </div>
  )
}