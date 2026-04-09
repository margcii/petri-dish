import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser, clearUser, type User } from '../api/user'
import { getUserDishes, createDish, getDish, type Dish, type Fungus } from '../api/dish'
import { uploadFungus, getAirFungi, triggerHybrid, checkHybridStatus, sendHeartbeat, checkNewHybrid, distributeAir, type CheckNewHybridResponse, type DistributeAirResponse } from '../api/fungus'

// 真菌颜色选项
const FUNGUS_COLORS = [
  { id: 'blue', emoji: '🟦', bg: 'bg-blue-500', border: 'border-blue-400' },
  { id: 'yellow', emoji: '🟨', bg: 'bg-yellow-500', border: 'border-yellow-400' },
  { id: 'green', emoji: '🟩', bg: 'bg-green-500', border: 'border-green-400' },
  { id: 'purple', emoji: '🟪', bg: 'bg-purple-500', border: 'border-purple-400' },
  { id: 'white', emoji: '⬜', bg: 'bg-slate-200', border: 'border-slate-100' },
  { id: 'red', emoji: '🟥', bg: 'bg-red-500', border: 'border-red-400' },
]

// 真菌颜色选项 - 基于 image_id 映射
const getFungusColor = (imageId: string) => {
  // 直接匹配颜色 id
  const matchedColor = FUNGUS_COLORS.find(c => c.id === imageId)
  if (matchedColor) return matchedColor

  // 如果无法匹配，使用旧逻辑作为后备
  const firstChar = imageId.charAt(0).toLowerCase()
  const colorIndex = firstChar.charCodeAt(0) % FUNGUS_COLORS.length
  return FUNGUS_COLORS[colorIndex]
}

// 真菌类型定义
interface HybridGroup {
  groupId: string;  // 用父母ID组合作为组ID
  parents: Fungus[];  // 组内的父母真菌
  isIncubating: boolean;  // 是否正在孵化
  hybridResult?: Fungus;  // 杂交结果真菌（包含AI生成的融合文本）
}

// 将真菌按杂交组分组
// 参数：
// - parentFungi: 所有is_parent=true的真菌（将被显示的真菌）
// - hybridResults: 所有杂交结果真菌（用于确定分组关系，但自身不显示）
// 规则：
// 1. 普通父母真菌（不在任何杂交组中的）：单独一组
// 2. 杂交父母真菌：根据hybridResults的parent1_id/parent2_id分组
const groupFungiByHybrid = (parentFungi: Fungus[], hybridResults: Fungus[]): HybridGroup[] => {
  const groups: Map<string, HybridGroup> = new Map()
  const standaloneFungi: Fungus[] = []
  const parentFungiMap: Map<string, Fungus> = new Map()

  // 建立父母真菌ID映射
  for (const fungus of parentFungi) {
    parentFungiMap.set(fungus.fungus_id, fungus)
  }

  // 跟踪已被分组的真菌
  const groupedFungiIds: Set<string> = new Set()

  // 根据杂交结果真菌创建分组（只显示父母，不显示杂交结果本身）
  for (const result of hybridResults) {
    const parentIds = [result.parent1_id, result.parent2_id].filter((id): id is string => id !== null).sort()
    if (parentIds.length === 0) continue

    const groupId = parentIds.join('-')
    const groupParents: Fungus[] = []
    let isIncubating = result.status === 'incubating'

    // 查找对应的父母真菌（从parentFungi中找）
    for (const parentId of parentIds) {
      const parent = parentFungiMap.get(parentId)
      if (parent) {
        groupParents.push(parent)
        groupedFungiIds.add(parentId)
      }
    }

    // 注意：杂交结果真菌本身不加入组（is_parent=false，不显示）
    // 组内只包含父母真菌

    if (groupParents.length > 0) {
      // 检查是否已存在相同组
      if (groups.has(groupId)) {
        // 合并到现有组
        const existingGroup = groups.get(groupId)!
        for (const p of groupParents) {
          if (!existingGroup.parents.find(ep => ep.fungus_id === p.fungus_id)) {
            existingGroup.parents.push(p)
          }
        }
        existingGroup.isIncubating = existingGroup.isIncubating || isIncubating
        // 保存杂交结果（取最新的）
        if (!existingGroup.hybridResult || result.created_at > existingGroup.hybridResult.created_at) {
          existingGroup.hybridResult = result
        }
      } else {
        groups.set(groupId, {
          groupId,
          parents: groupParents,
          isIncubating,
          hybridResult: result  // 保存杂交结果真菌（包含AI文本）
        })
      }
    }
  }

  // 处理未被分组的普通父母真菌
  for (const fungus of parentFungi) {
    if (!groupedFungiIds.has(fungus.fungus_id)) {
      standaloneFungi.push(fungus)
    }
  }

  // 构建最终结果：普通真菌每个单独成组
  const result: HybridGroup[] = standaloneFungi.map(f => ({
    groupId: f.fungus_id,
    parents: [f],
    isIncubating: false
  }))

  // 添加杂交组
  result.push(...groups.values())

  return result
}

// 渲染杂交组
// 两个真菌：横向排列，重叠50%
// 三个真菌：品字形排列，重叠50%
const renderHybridGroup = (
  group: HybridGroup,
  isCtrlPressed: boolean,
  setSelectedFungus: (f: Fungus) => void,
  setSelectedHybridGroup: (g: HybridGroup) => void,
  fallingFungusId: string | null
) => {
  const { parents, isIncubating } = group
  const parentCount = parents.length

  // 单个真菌 - 普通显示
  if (parentCount === 1) {
    const fungus = parents[0]
    const color = getFungusColor(fungus.image_id)
    const isFalling = fungus.fungus_id === fallingFungusId

    return (
      <div
        key={fungus.fungus_id}
        onClick={() => setSelectedFungus(fungus)}
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-2xl transition-all duration-300 relative cursor-pointer hover:ring-2 hover:ring-white hover:scale-110 ${color.bg} ${isFalling ? 'animate-fall-in' : ''}`}
        title={fungus.content.slice(0, 50) + (fungus.content.length > 50 ? '...' : '')}
      >
        {color.emoji}
      </div>
    )
  }

  // 两个真菌杂交组 - 横向排列，重叠50%
  if (parentCount === 2) {
    const [f1, f2] = parents
    const color1 = getFungusColor(f1.image_id)
    const color2 = getFungusColor(f2.image_id)
    const isFalling = f1.fungus_id === fallingFungusId || f2.fungus_id === fallingFungusId

    return (
      <div
        key={group.groupId}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const x = e.clientX - rect.left
          const width = rect.width

          if (isCtrlPressed) {
            // Ctrl模式：根据点击位置选择不同的真菌
            if (x < width / 2) {
              setSelectedFungus(f1)
            } else {
              setSelectedFungus(f2)
            }
          } else {
            setSelectedHybridGroup(group)
          }
        }}
        className={`relative w-14 h-10 sm:w-16 sm:h-12 rounded-lg cursor-pointer transition-all duration-300 ${isIncubating ? 'opacity-40 animate-pulse' : 'hover:scale-110'} ${isFalling ? 'animate-fall-in' : ''}`}
        title={isCtrlPressed ? 'Ctrl模式：点击左/右选择不同真菌' : '点击查看杂交组（2个真菌重叠）'}
      >
        {/* 横向排列，重叠50% */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* 真菌1 - 左侧 */}
          <div
            className={`absolute left-0 w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-sm ${color1.bg} ring-1 ring-white/30 z-10 ${isCtrlPressed ? 'hover:ring-2 hover:ring-blue-400 hover:scale-110 transition-all' : ''}`}
            title={isCtrlPressed ? f1.content.slice(0, 30) : ''}
          >
            {color1.emoji}
          </div>

          {/* 真菌2 - 右侧，向左重叠50% */}
          <div
            className={`absolute left-4 sm:left-5 w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-sm ${color2.bg} ring-1 ring-white/30 z-20 ${isCtrlPressed ? 'hover:ring-2 hover:ring-blue-400 hover:scale-110 transition-all' : ''}`}
            title={isCtrlPressed ? f2.content.slice(0, 30) : ''}
          >
            {color2.emoji}
          </div>
        </div>

        {/* 孵化标记或杂交标记 */}
        {isIncubating ? (
          <span className="absolute top-[-4px] right-[-4px] text-xs">⏳</span>
        ) : (
          <span className="absolute top-[-4px] right-[-4px] w-3 h-3 bg-yellow-400 rounded-full text-[8px] flex items-center justify-center">
            ⚡
          </span>
        )}
      </div>
    )
  }

  // 三个真菌杂交组 - 品字形排列，重叠50%
  if (parentCount === 3) {
    const [f1, f2, f3] = parents
    const color1 = getFungusColor(f1.image_id)
    const color2 = getFungusColor(f2.image_id)
    const color3 = getFungusColor(f3.image_id)
    const isFalling = f1.fungus_id === fallingFungusId || f2.fungus_id === fallingFungusId || f3.fungus_id === fallingFungusId

    return (
      <div
        key={group.groupId}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const width = rect.width
          const height = rect.height

          if (isCtrlPressed) {
            // Ctrl模式：根据点击位置选择不同的真菌
            // 品字形区域判断
            // 上半部分选f1（顶部），左下选f2，右下选f3
            if (y < height / 2) {
              setSelectedFungus(f1)  // 顶部真菌
            } else if (x < width / 2) {
              setSelectedFungus(f2)  // 左下真菌
            } else {
              setSelectedFungus(f3)  // 右下真菌
            }
          } else {
            setSelectedHybridGroup(group)
          }
        }}
        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg cursor-pointer transition-all duration-300 ${isIncubating ? 'opacity-40 animate-pulse' : 'hover:scale-110'} ${isFalling ? 'animate-fall-in' : ''}`}
        title={isCtrlPressed ? 'Ctrl模式：点击上/左下/右下选择不同真菌' : '点击查看杂交组（3个真菌重叠）'}
      >
        {/* 品字形排列，重叠50% */}
        <div className="relative w-full h-full">
          {/* 真菌1 - 顶部 */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-sm ${color1.bg} ring-1 ring-white/30 z-10 ${isCtrlPressed ? 'hover:ring-2 hover:ring-blue-400 hover:scale-110 transition-all' : ''}`}
            title={isCtrlPressed ? f1.content.slice(0, 30) : ''}
          >
            {color1.emoji}
          </div>

          {/* 真菌2 - 左下 */}
          <div
            className={`absolute bottom-1 left-1 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-sm ${color2.bg} ring-1 ring-white/30 z-20 ${isCtrlPressed ? 'hover:ring-2 hover:ring-blue-400 hover:scale-110 transition-all' : ''}`}
            title={isCtrlPressed ? f2.content.slice(0, 30) : ''}
          >
            {color2.emoji}
          </div>

          {/* 真菌3 - 右下，向左上重叠 */}
          <div
            className={`absolute bottom-1 right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-sm ${color3.bg} ring-1 ring-white/30 z-30 ${isCtrlPressed ? 'hover:ring-2 hover:ring-blue-400 hover:scale-110 transition-all' : ''}`}
            title={isCtrlPressed ? f3.content.slice(0, 30) : ''}
          >
            {color3.emoji}
          </div>
        </div>

        {/* 孵化标记或杂交标记 */}
        {isIncubating ? (
          <span className="absolute top-[-4px] right-[-4px] text-xs">⏳</span>
        ) : (
          <span className="absolute top-[-4px] right-[-4px] w-3 h-3 bg-yellow-400 rounded-full text-[8px] flex items-center justify-center">
            ⚡
          </span>
        )}
      </div>
    )
  }

  // 超过3个的情况 - 简化显示
  return (
    <div
      key={group.groupId}
      onClick={() => setSelectedHybridGroup(group)}
      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg cursor-pointer transition-all duration-300 ${isCtrlPressed ? 'ring-2 ring-yellow-400' : ''} ${isIncubating ? 'opacity-40 animate-pulse' : 'hover:scale-110'}`}
      title={`杂交组 (${parentCount}个真菌)`}
    >
      <div className={`w-full h-full rounded-lg flex items-center justify-center bg-slate-700 ring-1 ring-white/30`}>
        <span className="text-lg">{parentCount}x</span>
      </div>
      {isIncubating ? (
        <span className="absolute top-[-4px] right-[-4px] text-xs">⏳</span>
      ) : (
        <span className="absolute top-[-4px] right-[-4px] w-3 h-3 bg-yellow-400 rounded-full text-[8px] flex items-center justify-center">
          ⚡
        </span>
      )}
    </div>
  )
}

function Main() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [activeDishIndex, setActiveDishIndex] = useState(0)
  const [isLoadingFungi, setIsLoadingFungi] = useState(false)
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState(FUNGUS_COLORS[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newDishName, setNewDishName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFungus, setSelectedFungus] = useState<Fungus | null>(null)
  const [selectedHybridGroup, setSelectedHybridGroup] = useState<HybridGroup | null>(null)
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [lastHybridCheck, setLastHybridCheck] = useState<string | null>(null)
  const [hasNewHybrid, setHasNewHybrid] = useState(false)
  const [isDistributing, setIsDistributing] = useState(false)
  const [distributeMessage, setDistributeMessage] = useState<string | null>(null)
  const [isDishFullError, setIsDishFullError] = useState(false)
  const [fallingFungusId, setFallingFungusId] = useState<string | null>(null)
  const [selectedDishIndex, setSelectedDishIndex] = useState<number | null>(null)
  const dishListRef = useRef<HTMLDivElement>(null)

  // 杂交组数据（只包含父母真菌）
  const [hybridGroups, setHybridGroups] = useState<HybridGroup[]>([])

  // Ctrl 键检测
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // 空气区状态
  const [airFungi, setAirFungi] = useState<Fungus[]>([])

  // 心跳机制 - 每30秒发送一次
  useEffect(() => {
    if (!user) return

    const sendUserHeartbeat = async () => {
      try {
        await sendHeartbeat(user.user_id)
      } catch (err) {
        console.error('发送心跳失败:', err)
      }
    }

    // 立即发送一次
    sendUserHeartbeat()

    // 每30秒发送一次
    const interval = setInterval(sendUserHeartbeat, 30000)
    return () => clearInterval(interval)
  }, [user])

  // 计算活跃培养皿
  const activeDish = dishes[activeDishIndex]

  // 检测新杂交真菌
  useEffect(() => {
    if (!activeDish) {
      setHasNewHybrid(false)
      return
    }

    const checkNewHybrids = async () => {
      try {
        const result: CheckNewHybridResponse = await checkNewHybrid(
          activeDish.dish_id,
          lastHybridCheck || undefined
        )

        if (result.new_hybrids && result.new_hybrids.length > 0) {
          setHasNewHybrid(true)
          // 3秒后取消闪烁
          setTimeout(() => setHasNewHybrid(false), 3000)
        }

        if (result.latest_timestamp) {
          setLastHybridCheck(result.latest_timestamp)
        }
      } catch (err) {
        console.error('检查新杂交失败:', err)
      }
    }

    // 立即检测一次
    checkNewHybrids()

    // 每10秒检测一次
    const interval = setInterval(checkNewHybrids, 10000)
    return () => clearInterval(interval)
  }, [activeDish?.dish_id])

  // 加载空气真菌（5秒轮询）
  useEffect(() => {
    const fetchAirFungi = async () => {
      try {
        const fungi = await getAirFungi()
        setAirFungi(fungi)
      } catch (err) {
        console.error('加载空气真菌失败:', err)
      }
    }

    fetchAirFungi()
    const interval = setInterval(fetchAirFungi, 5000)
    return () => clearInterval(interval)
  }, [])

  // 处理发射到空气
  const handleLaunchToAir = async () => {
    if (!text.trim() || !user) return

    setIsUploading(true)
    try {
      await uploadFungus({
        user_id: user.user_id,
        content: text.trim(),
        image_id: selectedColor.id
      })
      setText('')
      // 刷新空气区
      const fungi = await getAirFungi()
      setAirFungi(fungi)
    } catch (err) {
      console.error('发射到空气失败:', err)
    } finally {
      setIsUploading(false)
    }
  }

  // 加载活跃培养皿的真菌数据
  const fetchActiveDishFungi = async () => {
    if (!activeDish) {
      setHybridGroups([])
      return
    }
    setIsLoadingFungi(true)
    try {
      const dishDetail = await getDish(activeDish.dish_id)
      const allFungi = dishDetail.fungi || []

      // 修正：显示所有真菌
      // - 未杂交的真菌：单独显示
      // - 已杂交的父母真菌：按组重叠显示
      // - 杂交结果真菌（is_parent=false）：不直接显示，只用于确定分组

      const hybridResults = allFungi.filter((f: Fungus) => f.parent1_id)
      const displayableFungi = allFungi.filter((f: Fungus) => !f.parent1_id) // 排除杂交结果本身

      // 按杂交组分组
      const groups = groupFungiByHybrid(displayableFungi, hybridResults)
      setHybridGroups(groups)
    } catch (err) {
      console.error('加载真菌失败:', err)
    } finally {
      setIsLoadingFungi(false)
    }
  }

  // 当活跃培养皿变化时，刷新真菌数据
  useEffect(() => {
    fetchActiveDishFungi()
  }, [activeDishIndex, dishes])

  // 自动检测杂交 + 检查孵化状态
  useEffect(() => {
    if (!activeDish) return

    const checkHybridAndIncubation = async () => {
      try {
        const dishDetail = await getDish(activeDish.dish_id)
        const fungi = dishDetail.fungi || []

        // 检查是否有 incubating 的真菌需要更新状态
        const incubatingFungi = fungi.filter((f: Fungus) => f.status === 'incubating')
        for (const fungus of incubatingFungi) {
          try {
            await checkHybridStatus(fungus.fungus_id)
          } catch (err) {
            console.error('检查孵化状态失败:', err)
          }
        }

        // 重新获取更新后的数据
        const updatedDishDetail = await getDish(activeDish.dish_id)
        const updatedFungi = updatedDishDetail.fungi || []
        // 修正：显示所有真菌（排除杂交结果本身）
        const hybridResults = updatedFungi.filter((f: Fungus) => f.parent1_id)
        const displayableFungi = updatedFungi.filter((f: Fungus) => !f.parent1_id)
        // 按杂交组分组
        const groups = groupFungiByHybrid(displayableFungi, hybridResults)
        setHybridGroups(groups)

        // 自动杂交检测：只选择非亲本的idle真菌（所有is_parent=true的都不参与）
        const idleFungi = updatedFungi.filter((f: Fungus) => f.status === 'idle' && !f.is_parent)
        console.log('检测杂交:', idleFungi.length, '个idle真菌（排除已杂交）', idleFungi.map((f: Fungus) => ({id: f.fungus_id.slice(0,8), is_parent: f.is_parent, status: f.status})))

        // 如果有 ≥2 个 idle 真菌，触发杂交
        if (idleFungi.length >= 2) {
          const shuffled = [...idleFungi].sort(() => Math.random() - 0.5)
          const selected = shuffled.slice(0, 2)

          console.log('触发杂交:', selected[0].fungus_id.slice(0,8), selected[1].fungus_id.slice(0,8))

          try {
            await triggerHybrid(selected[0].fungus_id, selected[1].fungus_id)
            // 刷新真菌列表
            await fetchActiveDishFungi()
          } catch (err) {
            console.error('自动杂交失败:', err)
          }
        }
      } catch (err) {
        console.error('检测杂交失败:', err)
      }
    }

    // 立即检测一次
    checkHybridAndIncubation()

    // 每5秒检测一次
    const interval = setInterval(checkHybridAndIncubation, 5000)
    return () => clearInterval(interval)
  }, [activeDish?.dish_id])

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      navigate('/')
      return
    }
    setUser(storedUser)
    fetchDishes(storedUser.user_id)
  }, [navigate])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchDishes = async (userId: string) => {
    try {
      const data = await getUserDishes(userId)
      setDishes(data)
      // 从 localStorage 读取活跃培养皿设置
      const savedActiveDishId = localStorage.getItem('activeDishId')
      if (savedActiveDishId) {
        const index = data.findIndex(d => d.dish_id === savedActiveDishId)
        if (index !== -1) {
          setActiveDishIndex(index)
        }
      }
    } catch {
      // 静默处理错误
    }
  }

  const handleLogout = () => {
    clearUser()
    navigate('/')
  }

  const handlePrevDish = () => {
    setActiveDishIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : prev
      if (dishes[newIndex]) {
        localStorage.setItem('activeDishId', dishes[newIndex].dish_id)
      }
      return newIndex
    })
  }

  const handleNextDish = () => {
    setActiveDishIndex((prev) => {
      const newIndex = prev < dishes.length - 1 ? prev + 1 : prev
      if (dishes[newIndex]) {
        localStorage.setItem('activeDishId', dishes[newIndex].dish_id)
      }
      return newIndex
    })
  }

  const handleRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * FUNGUS_COLORS.length)
    setSelectedColor(FUNGUS_COLORS[randomIndex])
  }

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDishName.trim() || !user) return

    try {
      await createDish(user.user_id, newDishName.trim())
      await fetchDishes(user.user_id)
      setIsCreateModalOpen(false)
      setNewDishName('')
      // 如果有新创建的培养皿，自动选中最后一个
      setActiveDishIndex(dishes.length)
    } catch (err) {
      console.error('创建培养皿失败:', err)
    }
  }

  // 处理从空气分配真菌到活跃培养皿
  const handleDistributeAir = async () => {
    if (!activeDish || !user) return

    setIsDistributing(true)
    setDistributeMessage(null)
    try {
      const result: DistributeAirResponse = await distributeAir(activeDish.dish_id, user.user_id)
      setDistributeMessage(result.message)

      // 设置落入动画状态
      if (result.data?.fungus_id) {
        setFallingFungusId(result.data.fungus_id)
        // 动画持续1秒后清除
        setTimeout(() => setFallingFungusId(null), 1000)
      }

      // 3秒后清除消息
      setTimeout(() => setDistributeMessage(null), 3000)
      // 刷新空气区和活跃培养皿
      const fungi = await getAirFungi()
      setAirFungi(fungi)
      await fetchActiveDishFungi()
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '分配失败'
      setDistributeMessage(errorMsg)
      setTimeout(() => setDistributeMessage(null), 3000)
    } finally {
      setIsDistributing(false)
    }
  }
  const handleAddToActiveDish = async () => {
    if (!text.trim() || !user || !activeDish) return

    // 检查容量限制（按组计算，每组占用1个位置）
    if (hybridGroups.length >= 10) {
      setIsDishFullError(true)
      setTimeout(() => setIsDishFullError(false), 3000)
      return
    }

    setIsUploading(true)
    console.log('选择的颜色:', selectedColor)
    console.log('发送的 image_id:', selectedColor.id)
    try {
      const result = await uploadFungus({
        user_id: user.user_id,
        content: text.trim(),
        dish_id: activeDish.dish_id,
        image_id: selectedColor.id
      })
      console.log('返回的真菌:', result)
      console.log('返回的 image_id:', result.image_id)
      // 清空输入框
      setText('')
      // 刷新真菌列表
      await fetchActiveDishFungi()
      // 关闭下拉菜单
      setIsDropdownOpen(false)
    } catch (err) {
      console.error('上传真菌失败:', err)
    } finally {
      setIsUploading(false)
    }
  }

  // 处理放入选中的培养皿
  const handleAddToSelectedDish = async (dishIndex: number) => {
    if (!text.trim() || !user) return

    const targetDish = dishes[dishIndex]
    if (!targetDish) return

    // 获取目标培养皿的真菌数量
    try {
      const dishDetail = await getDish(targetDish.dish_id)
      // 只计算父母真菌的数量
      const targetFungiCount = (dishDetail.fungi || []).filter(
        (f: Fungus) => f.is_parent
      ).length

      // 检查容量限制
      if (targetFungiCount >= 10) {
        setIsDishFullError(true)
        setTimeout(() => setIsDishFullError(false), 3000)
        return
      }

      setIsUploading(true)
      await uploadFungus({
        user_id: user.user_id,
        content: text.trim(),
        dish_id: targetDish.dish_id,
        image_id: selectedColor.id
      })
      setText('')
      await fetchActiveDishFungi()
      setIsDropdownOpen(false)
      setSelectedDishIndex(null)
    } catch (err) {
      console.error('上传真菌失败:', err)
    } finally {
      setIsUploading(false)
    }
  }

  // 处理滚轮滑动选择
  const handleDishScroll = () => {
    if (!dishListRef.current) return
    const container = dishListRef.current
    const scrollLeft = container.scrollLeft
    const itemWidth = 140 // 每个卡片宽度 + gap
    const newIndex = Math.round(scrollLeft / itemWidth)
    if (newIndex >= 0 && newIndex < dishes.length) {
      setSelectedDishIndex(newIndex)
    }
  }

  // 渲染真菌展示区域
  // 按杂交组渲染，每组占用一个格子
  const renderFungusGrid = () => {
    if (isLoadingFungi) {
      return (
        <div className="col-span-full text-center py-4 text-slate-400">
          加载中...
        </div>
      )
    }

    return (
      <>
        {hybridGroups.slice(0, 10).map((group) =>
          renderHybridGroup(group, isCtrlPressed, setSelectedFungus, setSelectedHybridGroup, fallingFungusId)
        )}
        {/* 空位占位 */}
        {Array.from({ length: Math.max(0, 10 - hybridGroups.length) }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-dashed border-slate-600/50 flex items-center justify-center"
          >
            <span className="text-slate-600 text-xs">{hybridGroups.length + index + 1}</span>
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* 顶部活跃培养皿区域 */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm py-4">
        <div className="max-w-6xl mx-auto px-4">
          {/* 培养皿切换栏 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevDish}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-30"
              disabled={activeDishIndex === 0}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <span className="text-slate-400 text-sm">活跃培养皿</span>
              <h2 className="text-white font-semibold">
                {activeDish ? activeDish.name : '未选择'}
              </h2>
            </div>

            <button
              onClick={handleNextDish}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-30"
              disabled={activeDishIndex >= dishes.length - 1}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 真菌展示区域（10个位置） */}
          <div className={`bg-slate-800/30 rounded-2xl p-4 min-h-[100px] transition-all duration-300 ${hasNewHybrid ? 'animate-pulse ring-2 ring-yellow-400' : ''}`}>
            {dishes.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>还没有培养皿</p>
                <p className="text-sm mt-1">点击下方"➕ 创建"按钮开始</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
                {renderFungusGrid()}
              </div>
            )}
          </div>

          {/* 空气展示区 */}
          <div className="mt-4 bg-gradient-to-r from-slate-800/30 via-blue-900/20 to-slate-800/30 rounded-2xl p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💨</span>
              <span className="text-slate-300 font-medium">空气</span>
              <span className="text-slate-500 text-sm">({airFungi.length} 个真菌)</span>
            </div>
            {/* 漂浮的真菌 */}
            <div className="flex flex-wrap gap-2 min-h-[60px]">
              {airFungi.length === 0 ? (
                <span className="text-slate-500 text-sm italic">空气空无一物...</span>
              ) : (
                airFungi.map((fungus, index) => (
                  <div
                    key={fungus.fungus_id}
                    className={`w-10 h-10 rounded-lg ${getFungusColor(fungus.image_id).bg} flex items-center justify-center text-lg animate-pulse`}
                    style={{
                      animationDelay: `${index * 0.2}s`,
                      animationDuration: '3s'
                    }}
                    title={fungus.content.slice(0, 50)}
                  >
                    {getFungusColor(fungus.image_id).emoji}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="max-w-2xl mx-auto">
          {/* 真菌预览区 */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className={`w-24 h-24 rounded-2xl ${selectedColor.bg} flex items-center justify-center shadow-lg shadow-${selectedColor.bg}/30`}>
                <span className="text-5xl">{selectedColor.emoji}</span>
              </div>
              {/* 随机切换按钮 */}
              <button
                onClick={handleRandomColor}
                className="absolute -bottom-2 -right-2 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
                title="随机切换样式"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* 文本输入框 */}
          <div className="mb-8">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入你的文本..."
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all resize-none"
            />
            <div className="flex justify-between mt-2 text-sm text-slate-500">
              <span>{text.length}/500</span>
              <span className={hybridGroups.length >= 10 ? 'text-red-400 font-semibold' : ''}>
                {hybridGroups.length}/10 真菌
              </span>
            </div>
            {/* 满员错误提示 */}
            {isDishFullError && (
              <div className="mt-2 text-red-400 text-sm animate-pulse">
                培养皿已满（10/10），无法添加更多真菌
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="border-t border-slate-700/50 my-8"></div>

          {/* 四按钮布局 */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {/* 发射按钮 */}
            <button
              onClick={handleLaunchToAir}
              disabled={!text.trim() || isUploading}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <span>🚀</span>
              <span>发射</span>
              {isUploading && <span className="animate-spin">⏳</span>}
            </button>

            {/* 放入培养皿按钮（带下拉） */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen)
                  if (!isDropdownOpen) {
                    // 打开时初始化选中状态为活跃培养皿
                    setSelectedDishIndex(activeDishIndex)
                    // 滚动到活跃培养皿位置
                    setTimeout(() => {
                      if (dishListRef.current && activeDishIndex >= 0) {
                        dishListRef.current.scrollTo({
                          left: activeDishIndex * 140,
                          behavior: 'smooth'
                        })
                      }
                    }, 100)
                  }
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl transition-all flex items-center gap-2"
              >
                <span>🧫</span>
                <span>放入培养皿</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 下拉菜单 */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20">
                  {/* 活跃培养皿选项 */}
                  <div className="p-2">
                    <button
                      onClick={handleAddToActiveDish}
                      disabled={!text.trim() || isUploading || !activeDish}
                      className="w-full px-3 py-2 text-left text-white bg-emerald-600/20 border border-emerald-500/30 rounded-lg flex items-center gap-2 hover:bg-emerald-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>🧫</span>
                      <span className="flex-1 truncate">{activeDish ? `放入${activeDish.name}` : '放入活跃培养皿'}</span>
                      {isUploading && <span className="animate-spin">⏳</span>}
                    </button>
                  </div>

                  {/* 分隔线 */}
                  <div className="border-t border-slate-700"></div>

                  {/* 从空气吸入真菌按钮 */}
                  <div className="p-2">
                    <button
                      onClick={handleDistributeAir}
                      disabled={isDistributing || !activeDish || airFungi.length === 0}
                      className="w-full px-3 py-2 text-left text-white bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center gap-2 hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>🌬️</span>
                      <span className="flex-1 truncate">从空气吸入真菌</span>
                      {isDistributing && <span className="animate-spin">⏳</span>}
                    </button>
                    {distributeMessage && (
                      <p className={`text-xs mt-1 px-1 ${distributeMessage.includes('已满') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {distributeMessage}
                      </p>
                    )}
                  </div>

                  {/* 分隔线 */}
                  <div className="border-t border-slate-700"></div>

                  {/* 培养皿库列表 - 滚轮切换 */}
                  <div className="p-2">
                    <p className="text-slate-500 text-xs px-2 mb-2">培养皿库（滑动选择）</p>
                    {dishes.length === 0 ? (
                      <p className="text-slate-500 text-sm px-2 py-2">暂无培养皿</p>
                    ) : (
                      <>
                        {/* 横向滚轮列表 */}
                        <div
                          ref={dishListRef}
                          onScroll={handleDishScroll}
                          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 scrollbar-thin"
                          style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}
                        >
                          {dishes.map((dish, index) => (
                            <div
                              key={dish.dish_id}
                              className={`snap-center flex-shrink-0 w-[130px] p-3 rounded-lg border transition-all cursor-pointer ${
                                selectedDishIndex === index
                                  ? 'bg-emerald-600/30 border-emerald-500/50 ring-2 ring-emerald-400'
                                  : index === activeDishIndex
                                    ? 'bg-slate-700/30 border-slate-600'
                                    : 'bg-slate-700/20 border-slate-600/50 hover:bg-slate-700/40'
                              }`}
                              onClick={() => setSelectedDishIndex(index)}
                            >
                              <div className="text-center">
                                <span className="text-2xl">🧫</span>
                                <p className={`text-sm truncate mt-1 ${
                                  selectedDishIndex === index ? 'text-emerald-300' : 'text-slate-300'
                                }`}>
                                  {dish.name}
                                </p>
                                {index === activeDishIndex && (
                                  <span className="text-xs text-emerald-400 mt-1">活跃</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 放入选中培养皿按钮 */}
                        {selectedDishIndex !== null && selectedDishIndex !== activeDishIndex && dishes[selectedDishIndex] && (
                          <button
                            onClick={() => handleAddToSelectedDish(selectedDishIndex)}
                            disabled={!text.trim() || isUploading}
                            className="w-full mt-3 px-3 py-2 text-white bg-emerald-600/40 border border-emerald-500/40 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span>📤</span>
                            <span className="truncate">放入 {dishes[selectedDishIndex].name}</span>
                            {isUploading && <span className="animate-spin">⏳</span>}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 创建按钮 */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <span>➕</span>
              <span>创建</span>
            </button>

            {/* 查看库按钮 */}
            <button
              onClick={() => navigate('/dishes')}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <span>📋</span>
              <span>查看库</span>
            </button>
          </div>
        </div>
      </main>

      {/* 底部信息栏 */}
      <footer className="bg-slate-800/50 border-t border-slate-700/50 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm">
          <span className="text-slate-400">
            拥有 <span className="text-emerald-400 font-semibold">{dishes.length}</span> 个培养皿
          </span>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              用户: <span className="text-white">{user?.name || '未登录'}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </footer>

      {/* 创建培养皿弹窗 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">新建培养皿</h3>
            <form onSubmit={handleCreateDish}>
              <div className="mb-4">
                <input
                  type="text"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="培养皿名称"
                  maxLength={30}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setNewDishName('')
                  }}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newDishName.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 真菌详情弹窗 */}
      {selectedFungus && (
        <FungusDetailModal
          fungus={selectedFungus}
          onClose={() => setSelectedFungus(null)}
        />
      )}

      {/* 杂交组详情弹窗 */}
      {selectedHybridGroup && (
        <HybridGroupDetailModal
          group={selectedHybridGroup}
          onClose={() => setSelectedHybridGroup(null)}
        />
      )}
    </div>
  )
}

// 真菌详情弹窗组件 - 现在只显示单个真菌（可能是杂交父母）
function FungusDetailModal({
  fungus,
  onClose
}: {
  fungus: Fungus
  onClose: () => void
}) {
  const color = getFungusColor(fungus.image_id)

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl ${color.bg} flex items-center justify-center`}>
              <span className="text-3xl">{color.emoji}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">真菌详情</h3>
              <p className="text-slate-400 text-sm">
                状态: <span className={fungus.status === 'idle' ? 'text-emerald-400' : 'text-amber-400'}>
                  {fungus.status === 'idle' ? '活跃' : fungus.status}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 文本内容 */}
          <div className="bg-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-2">内容</p>
            <p className="text-white whitespace-pre-wrap">{fungus.content}</p>
          </div>

          {/* 信息列表 */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">真菌 ID</span>
              <span className="text-slate-300 font-mono">{fungus.fungus_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">颜色 ID</span>
              <span className="text-slate-300 font-mono">{fungus.image_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">创建者 ID</span>
              <span className="text-slate-300 font-mono">{fungus.user_id.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">创建时间</span>
              <span className="text-slate-300">{new Date(fungus.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  )
}

// 杂交组详情弹窗组件
function HybridGroupDetailModal({
  group,
  onClose
}: {
  group: HybridGroup
  onClose: () => void
}) {
  const { parents, isIncubating } = group
  const parentCount = parents.length

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              {parentCount === 2 ? (
                // 两个真菌：横向排列
                <>
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg ${getFungusColor(parents[0].image_id).bg} flex items-center justify-center ring-1 ring-white/30`}>
                    <span className="text-lg">{getFungusColor(parents[0].image_id).emoji}</span>
                  </div>
                  <div className={`absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg ${getFungusColor(parents[1].image_id).bg} flex items-center justify-center ring-1 ring-white/30`}>
                    <span className="text-lg">{getFungusColor(parents[1].image_id).emoji}</span>
                  </div>
                </>
              ) : parentCount === 3 ? (
                // 三个真菌：品字形
                <>
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 rounded-lg ${getFungusColor(parents[0].image_id).bg} flex items-center justify-center ring-1 ring-white/30`}>
                    <span className="text-base">{getFungusColor(parents[0].image_id).emoji}</span>
                  </div>
                  <div className={`absolute bottom-1 left-1 w-7 h-7 rounded-lg ${getFungusColor(parents[1].image_id).bg} flex items-center justify-center ring-1 ring-white/30`}>
                    <span className="text-base">{getFungusColor(parents[1].image_id).emoji}</span>
                  </div>
                  <div className={`absolute bottom-1 right-1 w-7 h-7 rounded-lg ${getFungusColor(parents[2].image_id).bg} flex items-center justify-center ring-1 ring-white/30`}>
                    <span className="text-base">{getFungusColor(parents[2].image_id).emoji}</span>
                  </div>
                </>
              ) : (
                // 单个或更多：显示数量
                <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center">
                  <span className="text-2xl">{parentCount}x</span>
                </div>
              )}
              {isIncubating ? (
                <span className="absolute top-[-2px] right-[-2px] text-sm">⏳</span>
              ) : (
                <span className="absolute top-[-2px] right-[-2px] w-4 h-4 bg-yellow-400 rounded-full text-[10px] flex items-center justify-center">
                  ⚡
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {parentCount === 2 ? '双真菌杂交组' : parentCount === 3 ? '三真菌杂交组' : `杂交组 (${parentCount}个)`}
              </h3>
              <p className="text-slate-400 text-sm">
                状态: <span className={isIncubating ? 'text-amber-400' : 'text-emerald-400'}>
                  {isIncubating ? '孵化中' : '已完成'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 杂交结果（AI生成的融合文本）*/}
          {group.hybridResult && (
            <div className="bg-gradient-to-r from-emerald-900/50 to-blue-900/50 rounded-xl p-4 border border-emerald-500/30">
              <p className="text-emerald-400 text-xs mb-2 flex items-center gap-1">
                <span>⚡</span> 杂交结果（AI融合文本）
              </p>
              <p className="text-white text-sm leading-relaxed">
                {group.hybridResult.content}
              </p>
            </div>
          )}

          {/* 组内真菌列表 */}
          <div className="bg-slate-700/30 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-3">组内真菌（父母）</p>
            <div className="space-y-3">
              {parents.map((fungus, index) => {
                const color = getFungusColor(fungus.image_id)
                return (
                  <div key={fungus.fungus_id} className="flex items-start gap-3 bg-slate-700/50 rounded-lg p-3">
                    <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xl">{color.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">真菌 #{index + 1}</p>
                      <p className="text-slate-400 text-xs truncate">{fungus.content.slice(0, 60)}{fungus.content.length > 60 ? '...' : ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 统计信息 */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">真菌数量</span>
              <span className="text-slate-300">{parentCount} 个</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700/50">
              <span className="text-slate-400">组 ID</span>
              <span className="text-slate-300 font-mono text-xs">{group.groupId.slice(0, 16)}...</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  )
}

export default Main
