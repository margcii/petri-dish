import { useState } from 'react'
import './App.css'
import client from './api/client'

function App() {
  const [message, setMessage] = useState('Petri Dish - 初始化完成')

  const testBackend = async () => {
    setMessage('测试后端连接...')
    try {
      const res = await client.get('/')
      setMessage(`✅ 后端连接成功: ${JSON.stringify(res.data)}`)
    } catch (err: any) {
      if (err.response?.status === 502) {
        setMessage('⚠️ 代理配置正确，但后端未启动。请在另一个终端运行：cd backend && python -m uvicorn api:app --port 8000')
      } else {
        setMessage(`❌ 连接失败: ${err.message}`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-4xl font-bold text-dish-400 mb-4">🧫 Petri Dish</h1>
      <p className="text-lg text-gray-300 mb-8">{message}</p>

      <div className="bg-slate-800 rounded-lg p-6 max-w-md">
        <h2 className="text-xl text-fungus-400 mb-4">检查点状态</h2>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>项目基础 (Vite + React + TS + Tailwind)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>API集成层 (axios封装)</span>
          </li>
          <li className="flex items-center gap-2 text-gray-500">
            <span>○</span>
            <span>用户与培养皿流程 (待开发)</span>
          </li>
          <li className="flex items-center gap-2 text-gray-500">
            <span>○</span>
            <span>真菌渲染与交互 (待开发)</span>
          </li>
          <li className="flex items-center gap-2 text-gray-500">
            <span>○</span>
            <span>空气传播与轮询 (待开发)</span>
          </li>
        </ul>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={testBackend}
          className="px-4 py-2 bg-dish-600 hover:bg-dish-500 rounded-lg transition-colors"
        >
          测试后端
        </button>
        <button
          onClick={() => setMessage('CP1完成，等待审查')}
          className="px-4 py-2 bg-fungus-600 hover:bg-fungus-500 rounded-lg transition-colors"
        >
          完成检查
        </button>
      </div>
    </div>
  )
}

export default App
