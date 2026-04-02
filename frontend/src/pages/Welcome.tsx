import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser, getStoredUser, storeUser } from '../api/user'

function Welcome() {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 检查是否已有用户登录
  useEffect(() => {
    const existingUser = getStoredUser()
    if (existingUser) {
      navigate('/main')
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请输入名称')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const user = await registerUser(name.trim())
      storeUser(user)
      navigate('/main')
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建用户失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* 背景装饰 - 真菌菌落效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* 培养皿图标 */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-emerald-400/30 flex items-center justify-center bg-slate-800/50 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-500/20 flex items-center justify-center">
                <span className="text-4xl">🧫</span>
              </div>
            </div>
            {/* 菌丝装饰 */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-400/40 rounded-full blur-sm" />
            <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-teal-400/40 rounded-full blur-sm" />
          </div>
        </div>

        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Petri Dish
          </h1>
          <p className="text-slate-400 text-lg">
            在数字世界中培育你的真菌群落
          </p>
        </div>

        {/* 输入表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的名字"
              maxLength={20}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-slate-800/80 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all text-center text-lg backdrop-blur-sm"
            />
          </div>

          {error && (
            <div className="text-center text-red-400 text-sm bg-red-500/10 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                创建中...
              </span>
            ) : (
              '进入实验室'
            )}
          </button>
        </form>

        {/* 底部提示 */}
        <p className="text-center text-slate-500 text-sm mt-8">
          输入名称创建你的数字身份
        </p>
      </div>
    </div>
  )
}

export default Welcome
