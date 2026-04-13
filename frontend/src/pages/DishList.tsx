import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser, clearUser } from '../api/user'
import { getUserDishes, createDish, getDish, type Dish, type Fungus } from '../api/dish'
import type { User } from '../api/user'
import { groupFungiByHybrid, type HybridGroup } from '../utils/fungusHelpers'
import { getImageSrc } from '../utils/fungusImage'
import PetriDishCanvas from '../components/PetriDishCanvas'
import FungusDetailModal from '../components/FungusDetailModal'
import HybridGroupDetailModal from '../components/HybridGroupDetailModal'

function DishList() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newDishName, setNewDishName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [snapshots, setSnapshots] = useState<Record<string, string[]>>({})

  // 大培养皿模态状态
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null)
  const [expandedHybridGroups, setExpandedHybridGroups] = useState<HybridGroup[]>([])
  const [selectedFungus, setSelectedFungus] = useState<Fungus | null>(null)
  const [selectedHybridGroup, setSelectedHybridGroup] = useState<HybridGroup | null>(null)
  const [isLoadingExpanded, setIsLoadingExpanded] = useState(false)
  const [activeToast, setActiveToast] = useState<string | null>(null)

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      navigate('/')
      return
    }
    setUser(storedUser)
    fetchDishes(storedUser.user_id)
  }, [navigate])

  const fetchDishes = async (userId: string) => {
    try {
      const data = await getUserDishes(userId)
      setDishes(data)
      // 异步加载每个 dish 的真菌快照
      loadSnapshots(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'LOAD ERROR')
    } finally {
      setIsLoading(false)
    }
  }

  // 批量加载快照：每个 dish 取前4个真菌的 image_id
  const loadSnapshots = async (dishes: Dish[]) => {
    const results: Record<string, string[]> = {}
    await Promise.all(
      dishes.map(async (dish) => {
        try {
          const detail = await getDish(dish.dish_id)
          const allFungi = detail.fungi || []
          // 取非杂交亲本的真菌，最多4个
          const displayable = allFungi.filter((f: Fungus) => !f.parent1_id)
          const images = displayable.slice(0, 4).map((f: Fungus) => getImageSrc(f.image_id))
          results[dish.dish_id] = images
        } catch {
          results[dish.dish_id] = []
        }
      })
    )
    setSnapshots(results)
  }

  const handleLogout = () => {
    clearUser()
    navigate('/')
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
    setNewDishName('')
    setError('')
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setNewDishName('')
    setError('')
  }

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDishName.trim() || !user) return

    setIsCreating(true)
    setError('')

    try {
      await createDish(user.user_id, newDishName.trim())
      const updatedDishes = await getUserDishes(user.user_id)
      setDishes(updatedDishes)
      loadSnapshots(updatedDishes)
      handleCloseModal()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'CREATE ERROR')
    } finally {
      setIsCreating(false)
    }
  }

  // 点击培养皿 → 展开大视图
  const handleDishClick = async (dishId: string) => {
    setExpandedDishId(dishId)
    setIsLoadingExpanded(true)
    try {
      const dishDetail = await getDish(dishId)
      const allFungi = dishDetail.fungi || []
      const hybridResults = allFungi.filter((f: Fungus) => f.parent1_id)
      const displayableFungi = allFungi.filter((f: Fungus) => !f.parent1_id)
      const groups = groupFungiByHybrid(displayableFungi, hybridResults)
      setExpandedHybridGroups(groups)
    } catch (err) {
      console.error('加载培养皿失败:', err)
    } finally {
      setIsLoadingExpanded(false)
    }
  }

  const closeExpandedView = () => {
    setExpandedDishId(null)
    setExpandedHybridGroups([])
    setSelectedFungus(null)
    setSelectedHybridGroup(null)
  }

  const setAsActiveDish = (e: React.MouseEvent, dishId: string) => {
    e.stopPropagation()
    localStorage.setItem('activeDishId', dishId)
    setActiveToast('SET ACTIVE')
    setTimeout(() => setActiveToast(null), 1500)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-600 text-[10px] font-pixel">LOADING...</div>
      </div>
    )
  }

  const expandedDish = dishes.find(d => d.dish_id === expandedDishId)

  return (
    <div className="min-h-screen bg-black">
      {/* 顶部导航 */}
      <header className="border-b-2 border-gray-900 bg-black/90">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/main')}
              className="btn-pixel-secondary text-[9px] px-2 py-1"
            >
              &lt; BACK
            </button>
            <img src="/petridish.png" alt="" className="w-5 h-5 object-contain" />
            <span className="text-gray-500 text-[10px] font-pixel">LIBRARY</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-[8px] font-pixel">{user?.name}</span>
            <button onClick={handleLogout} className="text-gray-800 hover:text-gray-500 transition-colors text-[8px] font-pixel">
              EXIT
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-gray-500 text-xs font-pixel">MY DISHES</h2>
            <p className="text-gray-600 text-[8px] font-pixel mt-1">
              {dishes.length} TOTAL
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="btn-pixel-primary"
          >
            + NEW
          </button>
        </div>

        {/* Toast */}
        {activeToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-700 text-white text-[9px] font-pixel px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {activeToast}
          </div>
        )}

        {/* 空状态 */}
        {dishes.length === 0 ? (
          <div className="text-center py-16">
            <img src="/petridish.png" alt="" className="w-16 h-16 object-contain mx-auto mb-4 opacity-30" />
            <p className="text-gray-600 text-[10px] font-pixel">NO DISHES</p>
            <p className="text-gray-500 text-[8px] font-pixel mt-1">CREATE ONE TO START</p>
            <button
              onClick={handleOpenModal}
              className="btn-pixel-primary mt-4"
            >
              + NEW
            </button>
          </div>
        ) : (
          /* 培养皿网格 */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {dishes.map((dish) => {
              const dishImages = snapshots[dish.dish_id] || []
              return (
                <div
                  key={dish.dish_id}
                  onClick={() => handleDishClick(dish.dish_id)}
                  className="group border-2 border-gray-950 bg-black cursor-pointer transition-all hover:border-gray-800 relative"
                >
                  {/* 培养皿快照 — 培养皿背景 + 真菌图标叠加 */}
                  <div className="aspect-square bg-gray-950/10 flex items-center justify-center p-4 overflow-hidden relative">
                    <img
                      src="/petridish.png"
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain opacity-30"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    {dishImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-1 w-full h-full place-items-center relative z-10">
                        {dishImages.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                            style={{ imageRendering: 'pixelated', maxWidth: '28px', maxHeight: '28px' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 名称 */}
                  <div className="px-2 py-1.5 border-t-2 border-gray-950">
                    <p className="text-gray-500 text-[8px] font-pixel truncate">
                      {dish.name}
                    </p>
                    <p className="text-gray-600 text-[7px] font-pixel">
                      {dish.fungus_count || 0}/10
                    </p>
                  </div>
                  {/* 悬浮 SET ACTIVE 按钮 */}
                  <button
                    onClick={(e) => setAsActiveDish(e, dish.dish_id)}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2
                      hidden group-hover:block border-2 border-black bg-gray-700 text-white
                      text-[7px] px-2 py-0.5 font-pixel
                      shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                      hover:bg-gray-600 transition-colors"
                  >
                    SET ACTIVE
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 创建培养皿弹窗 */}
      {isModalOpen && (
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
              {error && (
                <div className="mb-4 text-red-400 text-[8px] font-pixel border border-red-400/30 bg-red-400/5 py-1.5 px-2">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-pixel-secondary flex-1"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newDishName.trim()}
                  className="btn-pixel-primary flex-1 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isCreating ? '...' : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 大培养皿展开模态 */}
      {expandedDishId && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          {/* 模态顶部 */}
          <div className="border-b-2 border-gray-900 bg-black px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/petridish.png" alt="" className="w-4 h-4 object-contain" />
              <span className="text-gray-500 text-[10px] font-pixel">
                {expandedDish?.name || 'DISH'}
              </span>
            </div>
            <button
              onClick={closeExpandedView}
              className="btn-pixel-secondary text-[8px] px-2 py-0.5"
            >
              X CLOSE
            </button>
          </div>

          {/* Canvas 区域 */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
            {isLoadingExpanded ? (
              <div className="text-gray-600 text-[10px] font-pixel">LOADING...</div>
            ) : (
              <div className="w-full max-w-4xl">
                <PetriDishCanvas
                  hybridGroups={expandedHybridGroups}
                  fallingFungusId={null}
                  hasNewHybrid={false}
                  onSelectFungus={setSelectedFungus}
                  onSelectHybridGroup={setSelectedHybridGroup}
                />
              </div>
            )}
          </div>

          {/* 底部信息 */}
          <div className="border-t-2 border-gray-950 bg-black px-4 py-1.5 text-center">
            <span className="text-gray-600 text-[7px] font-pixel">
              CLICK TO INSPECT
            </span>
          </div>

          {/* 真菌详情弹窗 */}
          {selectedFungus && (
            <FungusDetailModal fungus={selectedFungus} onClose={() => setSelectedFungus(null)} />
          )}

          {/* 杂交组详情弹窗 */}
          {selectedHybridGroup && (
            <HybridGroupDetailModal group={selectedHybridGroup} onClose={() => setSelectedHybridGroup(null)} />
          )}
        </div>
      )}
    </div>
  )
}

export default DishList