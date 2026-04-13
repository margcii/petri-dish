import type { HybridGroup } from './PetriDishCanvas'
import type { Fungus } from '../api/dish'
import { getImageSrc } from '../utils/fungusImage'
import { useState } from 'react'
import FungusDetailModal from './FungusDetailModal'

export default function HybridGroupDetailModal({
  group,
  onClose,
}: {
  group: HybridGroup
  onClose: () => void
}) {
  const { parents, isIncubating } = group
  const [selectedChild, setSelectedChild] = useState<Fungus | null>(null)

  // 如果点击了子真菌，显示其详情
  if (selectedChild) {
    return <FungusDetailModal fungus={selectedChild} onClose={() => setSelectedChild(null)} />
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="panel-pixel p-5 w-full max-w-sm shadow-[6px_6px_0px_0px_rgba(64,64,64,0.4)] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 + 状态 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-gray-400 text-xs font-pixel">
              {parents.length}x HYBRID
            </h3>
            <span className={`text-[8px] font-pixel ${isIncubating ? 'text-amber-400' : 'text-gray-600'}`}>
              {isIncubating ? 'INCUBATING' : 'COMPLETE'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-800 hover:text-gray-500 transition-colors font-pixel text-xs"
          >
            X
          </button>
        </div>

        {/* 上方：杂交结果文本 */}
        {group.hybridResult && (
          <div className="border-2 border-gray-700/30 bg-gray-950/30 p-3 mb-4">
            <p className="text-gray-600 text-[8px] mb-1.5 font-pixel">HYBRID RESULT</p>
            <p className="text-gray-300 text-[10px] font-pixel leading-relaxed whitespace-pre-wrap">
              {group.hybridResult.content}
            </p>
          </div>
        )}

        {/* 下方：子真菌 PNG 图标，点击可查看详情 */}
        <div className="border-2 border-gray-950 bg-black/50 p-3 mb-4">
          <p className="text-gray-600 text-[8px] mb-2 font-pixel">PARENTS</p>
          <div className="flex flex-wrap gap-2">
            {parents.map((fungus) => (
              <button
                key={fungus.fungus_id}
                onClick={() => setSelectedChild(fungus)}
                className="w-12 h-12 border-2 border-gray-900 bg-black overflow-hidden flex items-center justify-center
                  hover:border-gray-600 transition-colors cursor-pointer"
                title={fungus.content.slice(0, 30)}
              >
                <img
                  src={getImageSrc(fungus.image_id)}
                  alt=""
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-pixel-secondary w-full"
        >
          CLOSE
        </button>
      </div>
    </div>
  )
}