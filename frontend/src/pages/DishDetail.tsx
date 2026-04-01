import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStoredUser, clearUser } from '../api/user'
import { getDish, type DishWithFungi, type Fungus } from '../api/dish'
import type { User } from '../api/user'

function DishDetail() {
  const { dishId } = useParams<{ dishId: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [dish, setDish] = useState<DishWithFungi | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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
        const data = await getDish(Number(dishId))
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
                  {dish.fungi.map((fungus: Fungus) => (
                    <div
                      key={fungus.fungus_id}
                      className={`relative aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:scale-105 ${
                        fungus.status === 'idle'
                          ? 'border-emerald-400/50 bg-emerald-400/10'
                          : fungus.status === 'incubating'
                          ? 'border-amber-400/50 bg-amber-400/10 opacity-60'
                          : 'border-slate-600 bg-slate-700/30'
                      }`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl">
                          {fungus.status === 'incubating' ? '⏳' : '🍄'}
                        </span>
                      </div>
                      {fungus.status === 'incubating' && (
                        <div className="absolute bottom-1 left-1 right-1 text-center">
                          <span className="text-xs text-amber-400">孵化中</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DishDetail
