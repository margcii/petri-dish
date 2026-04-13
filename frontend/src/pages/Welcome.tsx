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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* 背景装饰 - 像素风格淡化 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gray-800/10" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gray-700/10" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gray-800/5" />
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* 培养皿图标 */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 border-2 border-gray-700 flex items-center justify-center bg-black">
              <img
                src="/petridish.png"
                alt="Petri Dish"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
        </div>

        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight font-pixel">
            Petri Dish
          </h1>
          <p className="text-gray-500 text-lg font-pixel">
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
              className="w-full px-6 py-4 bg-black border-2 border-gray-800 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors text-center text-lg font-pixel"
            />
          </div>

          {error && (
            <div className="text-center text-red-400 text-sm bg-red-500/10 py-2 border-2 border-red-500/30">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="w-full py-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-semibold border-2 border-gray-600 hover:border-gray-500 disabled:border-gray-800 transition-colors"
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
        <p className="text-center text-gray-600 text-sm mt-8 font-pixel">
          输入名称创建你的数字身份
        </p>
      </div>
    </div>
  )
}

export default Welcome