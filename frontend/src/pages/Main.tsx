import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser, clearUser, type User } from '../api/user'
import { getUserDishes, createDish, type Dish } from '../api/dish'

// 真菌颜色选项
const FUNGUS_COLORS = [
  { id: 'blue', emoji: '🟦', bg: 'bg-blue-500', border: 'border-blue-400' },
  { id: 'yellow', emoji: '🟨', bg: 'bg-yellow-500', border: 'border-yellow-400' },
  { id: 'green', emoji: '🟩', bg: 'bg-green-500', border: 'border-green-400' },
  { id: 'purple', emoji: '🟪', bg: 'bg-purple-500', border: 'border-purple-400' },
  { id: 'white', emoji: '⬜', bg: 'bg-slate-200', border: 'border-slate-100' },
  { id: 'red', emoji: '🟥', bg: 'bg-red-500', border: 'border-red-400' },
]

// 模拟真菌数据
interface MockFungus {
  id: number
  color: typeof FUNGUS_COLORS[0]
  status: 'idle' | 'incubating' | 'hybrid'
  isHybridGroup?: boolean
}

function Main() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [activeDishIndex, setActiveDishIndex] = useState(0)
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState(FUNGUS_COLORS[0])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newDishName, setNewDishName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 模拟真菌数据（10个位置）
  const [mockFungi] = useState<MockFungus[]>([
    { id: 1, color: FUNGUS_COLORS[0], status: 'idle' },
    { id: 2, color: FUNGUS_COLORS[1], status: 'idle' },
    { id: 3, color: FUNGUS_COLORS[5], status: 'idle' },
    { id: 4, color: FUNGUS_COLORS[0], status: 'incubating' },
    { id: 5, color: FUNGUS_COLORS[1], status: 'hybrid', isHybridGroup: true },
    { id: 6, color: FUNGUS_COLORS[5], status: 'hybrid', isHybridGroup: true },
  ])

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
    } catch {
      // 静默处理错误
    }
  }

  const handleLogout = () => {
    clearUser()
    navigate('/')
  }

  const handlePrevDish = () => {
    setActiveDishIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }

  const handleNextDish = () => {
    setActiveDishIndex((prev) => (prev < dishes.length - 1 ? prev + 1 : prev))
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

  const activeDish = dishes[activeDishIndex]

  // 渲染单个真菌
  const renderFungus = (fungus: MockFungus, index: number) => {
    const baseClasses = 'w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all duration-300'

    if (fungus.status === 'incubating') {
      return (
        <div
          key={fungus.id}
          className={`${baseClasses} ${fungus.color.bg} opacity-50 animate-pulse cursor-not-allowed`}
        >
          {fungus.color.emoji}
        </div>
      )
    }

    if (fungus.status === 'hybrid' && fungus.isHybridGroup) {
      // 杂交组：品字形重合效果
      const positions = [
        { top: '0%', left: '0%', zIndex: 3 },
        { top: '20%', left: '30%', zIndex: 2 },
        { top: '40%', left: '15%', zIndex: 1 },
      ]
      const pos = positions[index % 3]
      return (
        <div key={fungus.id} className="relative w-12 h-12">
          <div
            className={`absolute w-10 h-10 rounded-lg ${fungus.color.bg} opacity-70 flex items-center justify-center text-lg`}
            style={{ top: pos.top, left: pos.left, zIndex: pos.zIndex }}
          >
            {fungus.color.emoji}
          </div>
        </div>
      )
    }

    return (
      <div
        key={fungus.id}
        className={`${baseClasses} ${fungus.color.bg} hover:ring-2 hover:ring-white hover:scale-110 cursor-pointer`}
      >
        {fungus.color.emoji}
      </div>
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
          <div className="bg-slate-800/30 rounded-2xl p-4 min-h-[100px]">
            {dishes.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>还没有培养皿</p>
                <p className="text-sm mt-1">点击下方"➕ 创建"按钮开始</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
                {Array.from({ length: 10 }).map((_, index) => {
                  const fungus = mockFungi[index]
                  if (!fungus) {
                    return (
                      <div
                        key={index}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-dashed border-slate-600/50 flex items-center justify-center"
                      >
                        <span className="text-slate-600 text-xs">{index + 1}</span>
                      </div>
                    )
                  }
                  return renderFungus(fungus, index)
                })}
              </div>
            )}
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
              <span>CP2.4 将实现真实真菌创建</span>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-slate-700/50 my-8"></div>

          {/* 四按钮布局 */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {/* 发射按钮 */}
            <button
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!text.trim() || dishes.length === 0}
            >
              <span>🚀</span>
              <span>发射</span>
            </button>

            {/* 放入培养皿按钮（带下拉） */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
                <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20">
                  {/* 活跃培养皿选项 */}
                  <div className="p-2">
                    <button
                      className="w-full px-3 py-2 text-left text-white bg-emerald-600/20 border border-emerald-500/30 rounded-lg flex items-center gap-2 hover:bg-emerald-600/30 transition-colors"
                    >
                      <span>🧫</span>
                      <span className="flex-1 truncate">{activeDish ? `放入${activeDish.name}` : '放入活跃培养皿'}</span>
                    </button>
                  </div>

                  {/* 分隔线 */}
                  <div className="border-t border-slate-700"></div>

                  {/* 培养皿库列表 */}
                  <div className="p-2 max-h-40 overflow-y-auto">
                    <p className="text-slate-500 text-xs px-2 mb-2">培养皿库</p>
                    {dishes.length === 0 ? (
                      <p className="text-slate-500 text-sm px-2 py-2">暂无培养皿</p>
                    ) : (
                      dishes.map((dish, index) => (
                        <button
                          key={dish.dish_id}
                          className={`w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-700/50 rounded-lg flex items-center gap-2 transition-colors ${
                            index === activeDishIndex ? 'bg-slate-700/30' : ''
                          }`}
                        >
                          <span>🧫</span>
                          <span className="flex-1 truncate">{dish.name}</span>
                          {index === activeDishIndex && (
                            <span className="text-xs text-emerald-400">活跃</span>
                          )}
                        </button>
                      ))
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
    </div>
  )
}

export default Main
