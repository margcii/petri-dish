import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStoredUser, clearUser } from '../api/user'
import { getDish, type DishWithFungi, type Fungus } from '../api/dish'
import type { User } from '../api/user'

// 真菌颜色映射（与 Main.tsx 保持一致）
const FUNGUS_COLORS = [
  { id: 'blue', emoji: '🟦', bg: 'bg-blue-500', border: 'border-blue-400' },
  { id: 'yellow', emoji: '🟨', bg: 'bg-yellow-500', border: 'border-yellow-400' },
  { id: 'green', emoji: '🟩', bg: 'bg-green-500', border: 'border-green-400' },
  { id: 'purple', emoji: '🟪', bg: 'bg-purple-500', border: 'border-purple-400' },
  { id: 'white', emoji: '⬜', bg: 'bg-slate-200', border: 'border-slate-100' },
  { id: 'red', emoji: '🟥', bg: 'bg-red-500', border: 'border-red-400' },
]

const getFungusColor = (imageId: string) => {
  // 直接匹配颜色 id
  const matchedColor = FUNGUS_COLORS.find(c => c.id === imageId)
  if (matchedColor) return matchedColor

  // 如果无法匹配，使用旧逻辑作为后备
  const firstChar = imageId.charAt(0).toLowerCase()
  const colorIndex = firstChar.charCodeAt(0) % FUNGUS_COLORS.length
  return FUNGUS_COLORS[colorIndex]
}

function DishDetail() {
  const { dishId } = useParams<{ dishId: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [dish, setDish] = useState<DishWithFungi | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedFungus, setSelectedFungus] = useState<Fungus | null>(null)

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      navigate('/')
      return
    }
    setUser(storedUser)
  }, [navigate])

  useEffect(() => {
    if (!dishId || !user) return

    const fetchDish = async () => {
      try {
        const data = await getDish(dishId)
        setDish(data)
      } catch (err: any) {
        setError(err.response?.data?.detail || '加载培养皿失败')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDish()
  }, [dishId, user])

  const handleLogout = () => {
    clearUser()
    navigate('/')
  }

  const handleBack = () => {
    navigate('/dishes')
  }

  const handleFungusClick = (fungus: Fungus) => {
    if (fungus.status !== 'incubating') {
      setSelectedFungus(fungus)
    }
  }

  const closeModal = () => {
    setSelectedFungus(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    )
  }

  if (error || !dish) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error || '培养皿不存在'}</div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>
    )
  }

  const idleFungi = dish.fungi?.filter((f: Fungus) => f.status === 'idle') || []
  const incubatingFungi = dish.fungi?.filter((f: Fungus) => f.status === 'incubating') || []

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 顶部导航 */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-slate-400 hover:text-white transition-colors mr-2"
            >
              ← 返回
            </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧信息面板 */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full border-2 border-emerald-400/30 flex items-center justify-center bg-slate-700/50">
                  <span className="text-3xl">🧫</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{dish.name}</h2>
                  <p className="text-slate-400 text-sm">
                    创建于 {new Date(dish.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                  <span className="text-slate-400">活跃真菌</span>
                  <span className="text-emerald-400 font-semibold">{idleFungi.length}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                  <span className="text-slate-400">孵化中</span>
                  <span className="text-amber-400 font-semibold">{incubatingFungi.length}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-400">总数</span>
                  <span className="text-white font-semibold">{dish.fungi?.length || 0}</span>
                </div>
              </div>

              <button
                className="w-full mt-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all"
              >
                上传真菌
              </button>
            </div>
          </div>

          {/* 右侧真菌展示区 */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-6 min-h-[500px]">
              <h3 className="text-lg font-semibold text-white mb-4">真菌群落</h3>

              {(!dish.fungi || dish.fungi.length === 0) ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full border-4 border-dashed border-slate-600 flex items-center justify-center">
                    <span className="text-4xl opacity-30">🌱</span>
                  </div>
                  <p className="text-slate-400 mb-2">这个培养皿还是空的</p>
                  <p className="text-slate-500 text-sm">上传你的第一个真菌来开始实验</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {dish.fungi.map((fungus: Fungus) => {
                    const color = getFungusColor(fungus.image_id)
                    return (
                      <div
                        key={fungus.fungus_id}
                        onClick={() => handleFungusClick(fungus)}
                        className={`relative aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:scale-105 group ${
                          fungus.status === 'idle'
                            ? `${color.border} ${color.bg}/20 hover:ring-2 hover:ring-white`
                            : fungus.status === 'incubating'
                            ? 'border-amber-400/50 bg-amber-400/10 opacity-60 cursor-not-allowed'
                            : 'border-slate-600 bg-slate-700/30'
                        }`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl">
                            {fungus.status === 'incubating' ? '⏳' : color.emoji}
                          </span>
                        </div>
                        {/* Tooltip - 悬停显示缩略文本 */}
                        {fungus.status !== 'incubating' && (
                          <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                            <p className="text-xs text-white text-center line-clamp-3">
                              {fungus.content.slice(0, 60)}{fungus.content.length > 60 ? '...' : ''}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              ID: {fungus.fungus_id.slice(0, 8)}...
                            </p>
                          </div>
                        )}
                        {fungus.status === 'incubating' && (
                          <div className="absolute bottom-1 left-1 right-1 text-center">
                            <span className="text-xs text-amber-400">孵化中</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 真菌详情弹窗 */}
      {selectedFungus && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl ${getFungusColor(selectedFungus.image_id).bg} flex items-center justify-center`}>
                  <span className="text-3xl">{getFungusColor(selectedFungus.image_id).emoji}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">真菌详情</h3>
                  <p className="text-slate-400 text-sm">
                    状态: <span className={selectedFungus.status === 'idle' ? 'text-emerald-400' : 'text-amber-400'}>
                      {selectedFungus.status === 'idle' ? '活跃' : selectedFungus.status}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
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
                <p className="text-white whitespace-pre-wrap">{selectedFungus.content}</p>
              </div>

              {/* 信息列表 */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">真菌 ID</span>
                  <span className="text-slate-300 font-mono">{selectedFungus.fungus_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">图片 ID</span>
                  <span className="text-slate-300 font-mono">{selectedFungus.image_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">创建者 ID</span>
                  <span className="text-slate-300 font-mono">{selectedFungus.user_id.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">创建时间</span>
                  <span className="text-slate-300">{new Date(selectedFungus.created_at).toLocaleString()}</span>
                </div>
                {selectedFungus.parent1_id && (
                  <div className="flex justify-between py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">父真菌 1</span>
                    <span className="text-slate-300 font-mono">{selectedFungus.parent1_id.slice(0, 16)}...</span>
                  </div>
                )}
                {selectedFungus.parent2_id && (
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">父真菌 2</span>
                    <span className="text-slate-300 font-mono">{selectedFungus.parent2_id.slice(0, 16)}...</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={closeModal}
              className="w-full mt-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DishDetail
