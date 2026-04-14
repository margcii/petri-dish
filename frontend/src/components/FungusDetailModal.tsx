import type { Fungus } from '../api/dish'
import { getImageSrc } from '../utils/fungusImage'
import { useState, useEffect } from 'react'
import { getUserName } from '../api/user'

export default function FungusDetailModal({
  fungus,
  onClose,
}: {
  fungus: Fungus
  onClose: () => void
}) {
  const [creatorName, setCreatorName] = useState(fungus.user_id.slice(0, 8))

  useEffect(() => {
    getUserName(fungus.user_id).then(setCreatorName)
  }, [fungus.user_id])

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="panel-pixel p-5 w-full max-w-sm shadow-[6px_6px_0px_0px_rgba(64,64,64,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 真菌图片 + 关闭 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 border-2 border-gray-800 flex items-center justify-center overflow-hidden bg-black"
            >
              <img
                src={getImageSrc(fungus.image_id)}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-gray-800 text-[8px] font-pixel">
              {fungus.status === 'idle' ? 'IDLE' : fungus.status === 'incubating' ? 'INCUBATING' : fungus.status.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-800 hover:text-gray-500 transition-colors font-pixel text-xs"
          >
            X
          </button>
        </div>

        {/* 文本内容 */}
        <div className="border-2 border-gray-950 bg-black p-3 mb-4">
          <p className="text-gray-300 text-[10px] font-pixel whitespace-pre-wrap leading-relaxed">
            {fungus.content}
          </p>
          {fungus.dna_prompt && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-gray-600 text-[8px] font-pixel tracking-widest">DNA</span>
              <span className="text-gray-500 text-[9px] font-pixel">{fungus.dna_prompt}</span>
            </div>
          )}
        </div>

        {/* 创建者ID */}
        <div className="flex justify-between items-center text-[8px] font-pixel">
          <span className="text-gray-600">CREATOR</span>
          <span className="text-gray-600">{creatorName}</span>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="btn-pixel-secondary w-full mt-4"
        >
          CLOSE
        </button>
      </div>
    </div>
  )
}
