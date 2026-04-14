import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser, clearUser, type User } from '../api/user'
import { getUserDishes, createDish, getDish, type Dish, type Fungus } from '../api/dish'
import { uploadFungus, getAirFungi, triggerHybrid, checkHybridStatus, sendHeartbeat, checkNewHybrid, distributeAir, type CheckNewHybridResponse } from '../api/fungus'
import { FUNGUS_COLORS, groupFungiByHybrid, type HybridGroup } from '../utils/fungusHelpers'
import { getImageSrc } from '../utils/fungusImage'
import AirBackground from '../components/AirBackground'
import PetriDishCanvas from '../components/PetriDishCanvas'
import FungusDetailModal from '../components/FungusDetailModal'
import HybridGroupDetailModal from '../components/HybridGroupDetailModal'

// image_id → 素材文件：使用 getImageSrc() 统一获取
// 保留 local map 仅用于预览区快速查找
const IMAGE_SRC_MAP: Record<string, string> = {
  layer4: '/layer4.png', layer5: '/layer5.png', layer6: '/layer6.png', layer7: '/layer7.png',
  layer8: '/layer8.png', layer9: '/layer9.png', layer10: '/layer10.png', layer11: '/layer11.png',
  // 旧 ID 兼容
  blue: '/layer4.png', yellow: '/layer5.png', green: '/layer6.png',
  purple: '/layer7.png', white: '/layer8.png', red: '/layer9.png',
}

function Main() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [activeDishIndex, setActiveDishIndex] = useState(0)
  const [_isLoadingFungi, setIsLoadingFungi] = useState(false)
  const [text, setText] = useState('')
  const [dnaPrompt, setDnaPrompt] = useState('')
  const [selectedColor, setSelectedColor] = useState(FUNGUS_COLORS[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newDishName, setNewDishName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFungus, setSelectedFungus] = useState<Fungus | null>(null)
  const [selectedHybridGroup, setSelectedHybridGroup] = useState<HybridGroup | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
  const [lastHybridCheck, setLastHybridCheck] = useState<string | null>(null)
  const [hasNewHybrid, setHasNewHybrid] = useState(false)
  const [isDishFullError, setIsDishFullError] = useState(false)
  const [fallingFungusId, setFallingFungusId] = useState<string | null>(null)
  const [_selectedDishIndex, setSelectedDishIndex] = useState<number | null>(null)
  const dishListRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // 发射动画状态
  const [launchingFungus, setLaunchingFungus] = useState<{ imageId: string; key: number; startX: number; startY: number; angle: number } | null>(null)

  // 培养皿列表滚轮事件
  useEffect(() => {
    const element = dishListRef.current
    if (!element) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      element.scrollLeft += e.deltaY
    }
    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [isDropdownOpen])

  // 杂交组数据
  const [hybridGroups, setHybridGroups] = useState<HybridGroup[]>([])
  const hybridGroupsRef = useRef<HybridGroup[]>([])

  /** 仅在数据真正变化时更新 hybridGroups，避免定时刷新触发位置重排 */
  const updateHybridGroupsIfChanged = (newGroups: HybridGroup[]) => {
    const oldGroups = hybridGroupsRef.current
    // 快速比较：长度不同则一定变化
    if (oldGroups.length !== newGroups.length) {
      hybridGroupsRef.current = newGroups
      setHybridGroups(newGroups)
      return
    }
    // 逐个比较关键属性
    for (let i = 0; i < newGroups.length; i++) {
      const o = oldGroups[i]
      const n = newGroups[i]
      if (!o || !n) {
        hybridGroupsRef.current = newGroups
        setHybridGroups(newGroups)
        return
      }
      if (
        o.groupId !== n.groupId ||
        o.isIncubating !== n.isIncubating ||
        o.hybridResult?.fungus_id !== n.hybridResult?.fungus_id ||
        o.parents.length !== n.parents.length ||
        o.parents.some((p, j) => p.fungus_id !== n.parents[j]?.fungus_id || p.status !== n.parents[j]?.status)
      ) {
        hybridGroupsRef.current = newGroups
        setHybridGroups(newGroups)
        return
      }
    }
    // 无变化，不 setState
  }

  
  // 空气区状态
  const [airFungi, setAirFungi] = useState<Fungus[]>([])

  // 心跳
  useEffect(() => {
    if (!user) return
    const sendUserHeartbeat = async () => {
      try { await sendHeartbeat(user.user_id) } catch (err) { console.error('发送心跳失败:', err) }
    }
    sendUserHeartbeat()
    const interval = setInterval(sendUserHeartbeat, 30000)
    return () => clearInterval(interval)
  }, [user])

  // 活跃培养皿
  const activeDish = dishes[activeDishIndex]

  // 检测新杂交
  useEffect(() => {
    if (!activeDish) { setHasNewHybrid(false); return }
    const checkNewHybrids = async () => {
      try {
        const result: CheckNewHybridResponse = await checkNewHybrid(activeDish.dish_id, lastHybridCheck || undefined)
        if (result.new_hybrids && result.new_hybrids.length > 0) {
          setHasNewHybrid(true)
          setTimeout(() => setHasNewHybrid(false), 3000)
        }
        if (result.latest_timestamp) setLastHybridCheck(result.latest_timestamp)
      } catch (err) { console.error('检查新杂交失败:', err) }
    }
    checkNewHybrids()
    const interval = setInterval(checkNewHybrids, 10000)
    return () => clearInterval(interval)
  }, [activeDish?.dish_id, lastHybridCheck])

  // 自动分配空气真菌
  useEffect(() => {
    if (!activeDish || !user || airFungi.length === 0) return
    let intervalId: ReturnType<typeof setInterval> | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const autoDistribute = async () => {
      try {
        const result = await distributeAir(activeDish.dish_id, user.user_id)
        if (result.data?.fungus_id) {
          setFallingFungusId(result.data.fungus_id)
          setTimeout(() => setFallingFungusId(null), 1000)
        }
        const fungi = await getAirFungi()
        setAirFungi(fungi)
        await fetchActiveDishFungi()
      } catch {
        // 静默：培养皿可能已满
      }
    }

    // 3秒后首次执行，之后每15秒执行
    timeoutId = setTimeout(() => {
      autoDistribute()
      intervalId = setInterval(autoDistribute, 15000)
    }, 3000)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [activeDish?.dish_id, user?.user_id, airFungi.length])

  // 加载空气真菌
  useEffect(() => {
    const fetchAirFungi = async () => {
      try { const fungi = await getAirFungi(); setAirFungi(fungi) } catch (err) { console.error('加载空气真菌失败:', err) }
    }
    fetchAirFungi()
    const interval = setInterval(fetchAirFungi, 5000)
    return () => clearInterval(interval)
  }, [])

  // 发射到空气
  const handleLaunchToAir = useCallback(async () => {
    if (!text.trim() || !user) return

    // 启动发射动画
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect()
      const angle = -60 + Math.random() * 120
      setLaunchingFungus({
        imageId: selectedColor.id,
        key: Date.now(),
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
        angle,
      })
    }

    setIsUploading(true)
    try {
      await uploadFungus({ user_id: user.user_id, content: text.trim(), image_id: selectedColor.id, dna_prompt: dnaPrompt.trim() || undefined })
      setText('')
      setDnaPrompt('')
      const fungi = await getAirFungi()
      setAirFungi(fungi)
    } catch (err) { console.error('发射到空气失败:', err) }
    finally { setIsUploading(false) }
  }, [text, user, selectedColor.id])

  // 加载活跃培养皿真菌
  const fetchActiveDishFungi = async () => {
    if (!activeDish) { updateHybridGroupsIfChanged([]); return }
    setIsLoadingFungi(true)
    try {
      const dishDetail = await getDish(activeDish.dish_id)
      const allFungi = dishDetail.fungi || []
      const hybridResults = allFungi.filter((f: Fungus) => f.parent1_id)
      const displayableFungi = allFungi.filter((f: Fungus) => !f.parent1_id)
      const groups = groupFungiByHybrid(displayableFungi, hybridResults)
      updateHybridGroupsIfChanged(groups)
    } catch (err) { console.error('加载真菌失败:', err) }
    finally { setIsLoadingFungi(false) }
  }

  // 活跃培养皿变化时刷新
  useEffect(() => { fetchActiveDishFungi() }, [activeDishIndex, dishes])

  // 自动杂交 + 孵化检测
  useEffect(() => {
    if (!activeDish) return
    const checkHybridAndIncubation = async () => {
      try {
        const dishDetail = await getDish(activeDish.dish_id)
        const fungi = dishDetail.fungi || []
        const incubatingFungi = fungi.filter((f: Fungus) => f.status === 'incubating')
        for (const fungus of incubatingFungi) {
          try { await checkHybridStatus(fungus.fungus_id) } catch (err) { console.error('检查孵化状态失败:', err) }
        }
        const updatedDishDetail = await getDish(activeDish.dish_id)
        const updatedFungi = updatedDishDetail.fungi || []
        const hybridResults = updatedFungi.filter((f: Fungus) => f.parent1_id)
        const displayableFungi = updatedFungi.filter((f: Fungus) => !f.parent1_id)
        const groups = groupFungiByHybrid(displayableFungi, hybridResults)
        updateHybridGroupsIfChanged(groups)

        const idleFungi = updatedFungi.filter((f: Fungus) => f.status === 'idle' && !f.is_parent)
        if (idleFungi.length >= 2) {
          const shuffled = [...idleFungi].sort(() => Math.random() - 0.5)
          const selected = shuffled.slice(0, 2)
          try { await triggerHybrid(selected[0].fungus_id, selected[1].fungus_id); await fetchActiveDishFungi() }
          catch (err) { console.error('自动杂交失败:', err) }
        }
      } catch (err) { console.error('检测杂交失败:', err) }
    }
    checkHybridAndIncubation()
    const interval = setInterval(checkHybridAndIncubation, 5000)
    return () => clearInterval(interval)
  }, [activeDish?.dish_id])

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) { navigate('/'); return }
    setUser(storedUser)
    fetchDishes(storedUser.user_id)
  }, [navigate])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchDishes = async (userId: string) => {
    try {
      const data = await getUserDishes(userId)
      setDishes(data)
      const savedActiveDishId = localStorage.getItem('activeDishId')
      if (savedActiveDishId) {
        const index = data.findIndex(d => d.dish_id === savedActiveDishId)
        if (index !== -1) setActiveDishIndex(index)
      }
    } catch { /* silent */ }
  }

  const handleLogout = () => { clearUser(); navigate('/') }

  const handlePrevDish = () => {
    setActiveDishIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : prev
      if (dishes[newIndex]) localStorage.setItem('activeDishId', dishes[newIndex].dish_id)
      return newIndex
    })
  }

  const handleNextDish = () => {
    setActiveDishIndex((prev) => {
      const newIndex = prev < dishes.length - 1 ? prev + 1 : prev
      if (dishes[newIndex]) localStorage.setItem('activeDishId', dishes[newIndex].dish_id)
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
      setActiveDishIndex(dishes.length)
    } catch (err) { console.error('创建培养皿失败:', err) }
  }

  // 放入活跃培养皿
  const handleAddToActiveDish = async () => {
    if (!text.trim() || !user || !activeDish) return
    if (hybridGroups.length >= 10) {
      setIsDishFullError(true)
      setTimeout(() => setIsDishFullError(false), 3000)
      return
    }
    setIsUploading(true)
    try {
      await uploadFungus({ user_id: user.user_id, content: text.trim(), dish_id: activeDish.dish_id, image_id: selectedColor.id, dna_prompt: dnaPrompt.trim() || undefined })
      setText('')
      setDnaPrompt('')
      await fetchActiveDishFungi()
      setIsDropdownOpen(false)
    } catch (err) { console.error('上传真菌失败:', err) }
    finally { setIsUploading(false) }
  }

  // 放入选中培养皿
  const handleAddToSelectedDish = async (dishIndex: number) => {
    if (!text.trim() || !user) return
    const targetDish = dishes[dishIndex]
    if (!targetDish) return
    try {
      const dishDetail = await getDish(targetDish.dish_id)
      const targetFungiCount = (dishDetail.fungi || []).filter((f: Fungus) => f.is_parent).length
      if (targetFungiCount >= 10) {
        setIsDishFullError(true)
        setTimeout(() => setIsDishFullError(false), 3000)
        return
      }
      setIsUploading(true)
      await uploadFungus({ user_id: user.user_id, content: text.trim(), dish_id: targetDish.dish_id, image_id: selectedColor.id, dna_prompt: dnaPrompt.trim() || undefined })
      setText('')
      setDnaPrompt('')
      await fetchActiveDishFungi()
      setIsDropdownOpen(false)
      setSelectedDishIndex(null)
    } catch (err) { console.error('上传真菌失败:', err) }
    finally { setIsUploading(false) }
  }

  // 滚轮滑动选择
  const handleDishScroll = () => {
    if (!dishListRef.current) return
    const container = dishListRef.current
    const scrollLeft = container.scrollLeft
    const itemWidth = 140
    const newIndex = Math.round(scrollLeft / itemWidth)
    if (newIndex >= 0 && newIndex < dishes.length) setSelectedDishIndex(newIndex)
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* 空气背景层 — Portal 到 body，fixed 全屏 */}
      <AirBackground airFungi={airFungi} />

      {/* 前景内容层 */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* 顶部培养皿切换 */}
        <header className="border-b-2 border-gray-900 bg-black/70 py-3">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handlePrevDish}
                className="btn-pixel-secondary text-[10px] px-2 py-1"
                disabled={activeDishIndex === 0}
              >
                &lt;
              </button>

              <div className="text-center">
                <span className="text-gray-700 text-[8px] tracking-widest">DISH</span>
                <h2 className="text-gray-400 text-xs font-pixel">
                  {activeDish ? activeDish.name : '--'}
                </h2>
              </div>

              <button
                onClick={handleNextDish}
                className="btn-pixel-secondary text-[10px] px-2 py-1"
                disabled={activeDishIndex >= dishes.length - 1}
              >
                &gt;
              </button>
            </div>

            {/* Canvas 培养皿区 */}
            {dishes.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                <p className="text-xs">NO DISH</p>
                <p className="text-[8px] mt-1 text-gray-500">CREATE ONE BELOW</p>
              </div>
            ) : (
              <PetriDishCanvas
                hybridGroups={hybridGroups}
                fallingFungusId={fallingFungusId}
                hasNewHybrid={hasNewHybrid}
                onSelectFungus={setSelectedFungus}
                onSelectHybridGroup={setSelectedHybridGroup}
              />
            )}
          </div>
        </header>

        {/* 主内容区 */}
        <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
          <div className="max-w-2xl mx-auto">
            {/* 真菌预览区 */}
            <div className="flex justify-center mb-5">
              <div className="relative" ref={previewRef}>
                <div
                  className="w-20 h-20 border-2 border-gray-800 flex items-center justify-center overflow-hidden bg-black"
                >
                  <img
                    src={IMAGE_SRC_MAP[selectedColor.id] || getImageSrc(selectedColor.id)}
                    alt={selectedColor.id}
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* 随机切换按钮 */}
                <button
                  onClick={handleRandomColor}
                  className="absolute -bottom-1 -right-1 px-1 py-0.5 bg-gray-700 text-white text-[8px] font-pixel border border-black hover:bg-gray-600 transition-colors"
                  title="随机切换样式"
                >
                  RND
                </button>
              </div>
            </div>

            {/* 文本输入框 */}
            <div className="mb-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ENTER TEXT..."
                maxLength={500}
                rows={4}
                className="input-pixel w-full resize-none"
              />
              <div className="flex justify-between mt-1 text-[8px] text-gray-600 font-pixel">
                <span>{text.length}/500</span>
                <span className={hybridGroups.length >= 10 ? 'text-red-400' : ''}>
                  {hybridGroups.length}/10
                </span>
              </div>
              {isDishFullError && (
                <div className="mt-1 text-red-400 text-[8px] font-pixel animate-pulse">
                  FULL - 10/10
                </div>
              )}
            </div>

            {/* DNA 提示词输入框 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <label className="text-gray-600 text-[8px] font-pixel tracking-widest">DNA</label>
              </div>
              <input
                type="text"
                value={dnaPrompt}
                onChange={(e) => setDnaPrompt(e.target.value)}
                placeholder="输入提示词，定义你的真菌个性和行为倾向"
                maxLength={100}
                className="input-pixel w-full text-[9px]"
              />
              <div className="flex justify-end mt-0.5 text-[8px] text-gray-600 font-pixel">
                <span>{dnaPrompt.length}/100</span>
              </div>
            </div>

            {/* 分隔线 */}
            <div className="border-t border-gray-950 my-6" />

            {/* 四按钮布局 */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* 发射按钮 */}
              <button
                onClick={handleLaunchToAir}
                disabled={!text.trim() || isUploading}
                className="btn-pixel-dark disabled:opacity-30 disabled:cursor-not-allowed"
              >
                LAUNCH
                {isUploading && <span className="ml-1 animate-pulse">...</span>}
              </button>

              {/* 放入培养皿按钮（带下拉） */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen)
                    if (!isDropdownOpen) {
                      setSelectedDishIndex(activeDishIndex)
                      setTimeout(() => {
                        if (dishListRef.current && activeDishIndex >= 0) {
                          dishListRef.current.scrollTo({ left: activeDishIndex * 140, behavior: 'smooth' })
                        }
                      }, 100)
                    }
                  }}
                  className="btn-pixel-primary"
                >
                  INSERT
                  <span className={`ml-1 inline-block transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>&#9662;</span>
                </button>

                {/* 下拉菜单 */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 panel-pixel z-20 shadow-[4px_4px_0px_0px_rgba(64,64,64,0.3)]">
                    <div className="p-2">
                      <button
                        onClick={handleAddToActiveDish}
                        disabled={!text.trim() || isUploading || !activeDish}
                        className="w-full px-2 py-1.5 text-left text-gray-400 bg-gray-950/40 border border-gray-800 flex items-center gap-2 hover:bg-gray-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[9px] font-pixel"
                      >
                        <img src="/petridish.png" alt="" className="w-4 h-4 object-contain" />
                        <span className="flex-1 truncate">{activeDish ? `> ${activeDish.name}` : '--'}</span>
                        {isUploading && <span className="animate-pulse">...</span>}
                      </button>
                    </div>

                    <div className="border-t border-gray-950" />

                    <div className="p-2">
                      <p className="text-gray-600 text-[8px] px-1 mb-1.5 font-pixel">LIBRARY</p>
                      {dishes.length === 0 ? (
                        <p className="text-gray-500 text-[8px] px-1 py-1 font-pixel">EMPTY</p>
                      ) : (
                        <>
                          <div className="relative">
                            <div
                              ref={dishListRef}
                              onScroll={handleDishScroll}
                              className="flex gap-2 overflow-x-scroll scroll-smooth pb-1 [&::-webkit-scrollbar]:hidden"
                              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                              {dishes.map((dish, index) => (
                                <div
                                  key={dish.dish_id}
                                  className={`flex-shrink-0 w-[110px] p-2 border-2 transition-colors cursor-pointer ${
                                    index === activeDishIndex
                                      ? 'border-gray-700 bg-gray-950/40'
                                      : 'border-gray-950 bg-black hover:border-gray-800'
                                  }`}
                                  onClick={() => {
                                    if (index !== activeDishIndex) handleAddToSelectedDish(index)
                                    setIsDropdownOpen(false)
                                  }}
                                >
                                  <div className="text-center">
                                    <img src="/petridish.png" alt="" className="w-6 h-6 object-contain mx-auto" />
                                    <p className={`text-[8px] truncate mt-1 font-pixel ${index === activeDishIndex ? 'text-gray-500' : 'text-gray-700'}`}>
                                      {dish.name}
                                    </p>
                                    {index === activeDishIndex ? (
                                      <span className="text-[7px] text-gray-600 font-pixel">ACTIVE</span>
                                    ) : (
                                      <span className="text-[7px] text-gray-500 font-pixel">TAP</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-[7px] text-gray-500 mt-1 text-center font-pixel">
                            SCROLL &middot; TAP TO INSERT
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 创建按钮 */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-pixel-dark"
              >
                + NEW
              </button>

              {/* 查看库按钮 */}
              <button
                onClick={() => navigate('/dishes')}
                className="btn-pixel-dark"
              >
                LIBRARY
              </button>
            </div>
          </div>
        </main>

        {/* 底部信息栏 */}
        <footer className="border-t-2 border-gray-950 bg-black/70 py-2">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-[8px] font-pixel">
            <span className="text-gray-600">
              {dishes.length} DISH{dishes.length !== 1 ? 'ES' : ''}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-gray-600">
                <span className="text-gray-600">{user?.name || '--'}</span>
              </span>
              <button onClick={handleLogout} className="text-gray-800 hover:text-gray-500 transition-colors font-pixel">
                EXIT
              </button>
            </div>
          </div>
        </footer>

        {/* 创建培养皿弹窗 */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="panel-pixel p-5 w-full max-w-sm shadow-[6px_6px_0px_0px_rgba(64,64,64,0.4)]">
              <h3 className="text-gray-500 text-xs font-pixel mb-4">+ NEW DISH</h3>
              <form onSubmit={handleCreateDish}>
                <div className="mb-4">
                  <input
                    type="text"
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    placeholder="NAME..."
                    maxLength={30}
                    className="input-pixel w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsCreateModalOpen(false); setNewDishName('') }}
                    className="btn-pixel-secondary flex-1"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={!newDishName.trim()}
                    className="btn-pixel-primary flex-1 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    CREATE
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 真菌详情弹窗 */}
        {selectedFungus && (
          <FungusDetailModal fungus={selectedFungus} onClose={() => setSelectedFungus(null)} />
        )}

        {/* 杂交组详情弹窗 */}
        {selectedHybridGroup && (
          <HybridGroupDetailModal group={selectedHybridGroup} onClose={() => setSelectedHybridGroup(null)} />
        )}
      </div>

      {/* 发射动画：从预览区飞出屏幕 */}
      {launchingFungus && (
        <img
          key={launchingFungus.key}
          src={IMAGE_SRC_MAP[launchingFungus.imageId] || getImageSrc(launchingFungus.imageId)}
          alt=""
          className="fixed pointer-events-none"
          style={{
            left: launchingFungus.startX - 40,
            top: launchingFungus.startY - 40,
            width: 80,
            height: 80,
            zIndex: 9999,
            objectFit: 'contain',
            imageRendering: 'pixelated',
            animation: `launch-fly 0.8s ease-out forwards`,
            '--fly-angle': `${launchingFungus.angle}deg`,
          } as React.CSSProperties}
          onAnimationEnd={() => setLaunchingFungus(null)}
        />
      )}
    </div>
  )
}

export default Main
