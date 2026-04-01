import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser, clearUser } from '../api/user'
import { getUserDishes, createDish, type Dish } from '../api/dish'
import type { User } from '../api/user'

function DishList() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newDishName, setNewDishName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      navigate('/')
      return
    }
    setUser(storedUser)
    fetchDishes(storedUser.user_id)
  }, [navigate])

  const fetchDishes = async (userId: number) => {
    try {
      const data = await getUserDishes(userId)
      setDishes(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || '加载培养皿失败')
    } finally {
      setIsLoading(false)
    }
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
      const newDish = await createDish(user.user_id, newDishName.trim())
      setDishes([...dishes, newDish])
      handleCloseModal()
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建培养皿失败')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDishClick = (dishId: number) => {
    navigate(`/dishes/${dishId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 顶部导航 */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧫</span>
            <h1 className="text-xl font-semibold text-white">Petri Dish</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">欢迎, {user?.name}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">我的培养皿</h2>
            <p className="text-slate-400 text-sm mt-1">
              共 {dishes.length} 个培养皿
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl transition-all flex items-center gap-2"
          >
            <span>+</span>
            <span>新建培养皿</span>
          </button>
        </div>

        {/* 空状态 */}
        {dishes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full border-4 border-dashed border-slate-600 flex items-center justify-center">
              <span className="text-5xl opacity-50">🧫</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">还没有培养皿</h3>
            <p className="text-slate-400 mb-6">创建你的第一个培养皿，开始培育真菌</p>
            <button
              onClick={handleOpenModal}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all"
            >
              创建培养皿
            </button>
          </div>
        ) : (
          /* 培养皿网格 */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dishes.map((dish) => (
              <div
                key={dish.dish_id}
                onClick={() => handleDishClick(dish.dish_id)}
                className="group bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 cursor-pointer transition-all hover:border-emerald-400/50 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full border-2 border-emerald-400/30 flex items-center justify-center bg-slate-700/50 group-hover:border-emerald-400/50 transition-colors">
                    <span className="text-2xl">🧫</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {dish.name}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {new Date(dish.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    {dish.fungus_count || 0} 个真菌
                  </span>
                  <span className="text-emerald-400 group-hover:translate-x-1 transition-transform">
                    进入 →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 创建培养皿弹窗 */}
      {isModalOpen && (
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
              {error && (
                <div className="mb-4 text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newDishName.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
                >
                  {isCreating ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DishList
