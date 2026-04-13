import { useMemo } from 'react'

interface AirFungus {
  fungus_id: string
  image_id: string
  content: string
}

interface AirBackgroundProps {
  airFungi: AirFungus[]
}

// image_id → 素材文件映射
const IMAGE_SRC_MAP: Record<string, string> = {
  layer4: '/layer4.png', layer5: '/layer5.png', layer6: '/layer6.png', layer7: '/layer7.png',
  layer8: '/layer8.png', layer9: '/layer9.png', layer10: '/layer10.png', layer11: '/layer11.png',
  // 旧 ID 兼容
  blue: '/layer4.png', yellow: '/layer5.png', green: '/layer6.png',
  purple: '/layer7.png', white: '/layer8.png', red: '/layer9.png',
}

interface FungusStyle {
  top: string
  left: string
  size: number
  duration: number
  delay: number
  opacity: number
  src: string
  title: string
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export default function AirBackground({ airFungi }: AirBackgroundProps) {
  const displayedFungi = airFungi.slice(0, 30)

  const styles = useMemo<FungusStyle[]>(() => {
    return displayedFungi.map((fungus) => ({
      top: `${randomBetween(2, 95)}%`,
      left: `${randomBetween(2, 95)}%`,
      size: randomBetween(20, 48),
      duration: randomBetween(8, 20),
      delay: randomBetween(0, 10),
      opacity: randomBetween(0.15, 0.3),
      src: IMAGE_SRC_MAP[fungus.image_id] || '/layer4.png',
      title: fungus.content.slice(0, 50),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedFungi.map((f) => f.fungus_id).join(',')])

  if (displayedFungi.length === 0) return null

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {styles.map((style, i) => (
        <img
          key={displayedFungi[i].fungus_id}
          src={style.src}
          alt=""
          title={style.title}
          className="absolute"
          style={{
            top: style.top,
            left: style.left,
            width: style.size,
            height: style.size,
            opacity: style.opacity,
            boxShadow: '0 0 6px rgba(64,64,64,0.25)',
            animation: `drift ${style.duration}s ease-in-out ${style.delay}s infinite`,
            objectFit: 'contain',
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  )
}
