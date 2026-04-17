import { type MotionValue, motion, useSpring, useTransform } from 'motion/react'
import type React from 'react'
import { useEffect } from 'react'

type PlaceValue = number | '.'

function Number({ mv, number, height }: { mv: MotionValue<number>; number: number; height: number }) {
  const y = useTransform(mv, latest => {
    const placeValue = latest % 10
    const offset = (10 + number - placeValue) % 10
    let memo = offset * height
    if (offset > 5) {
      memo -= 10 * height
    }
    return memo
  })

  return (
    <motion.span
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        y,
      }}
    >
      {number}
    </motion.span>
  )
}

function normalizeNearInteger(num: number): number {
  const nearest = Math.round(num)
  const tolerance = 1e-9 * Math.max(1, Math.abs(num))
  return Math.abs(num - nearest) < tolerance ? nearest : num
}

function getValueRoundedToPlace(value: number, place: number): number {
  return Math.floor(normalizeNearInteger(value / place))
}

function Digit({ place, value, height, digitStyle }: {
  place: PlaceValue
  value: number
  height: number
  digitStyle?: React.CSSProperties
}) {
  if (place === '.') {
    return (
      <span
        className="relative inline-flex items-center justify-center"
        style={{ height, width: 'fit-content', ...digitStyle }}
      >
        .
      </span>
    )
  }

  const valueRoundedToPlace = getValueRoundedToPlace(value, place)
  const animatedValue = useSpring(valueRoundedToPlace)

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace)
  }, [animatedValue, valueRoundedToPlace])

  return (
    <span
      className="relative inline-flex overflow-hidden"
      style={{
        height,
        position: 'relative',
        width: '1ch',
        fontVariantNumeric: 'tabular-nums',
        ...digitStyle,
      }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </span>
  )
}

interface AnimatedCounterProps {
  value: number
  fontSize?: number
  padding?: number
  places?: PlaceValue[]
  gap?: number
  className?: string
}

export function AnimatedCounter({
  value,
  fontSize = 24,
  padding = 0,
  places,
  gap = 0,
  className,
}: AnimatedCounterProps) {
  const height = fontSize + padding

  const computedPlaces = places ?? [...value.toString()].map((ch, i, a) => {
    if (ch === '.') return '.' as const
    const dotIndex = a.indexOf('.')
    const isInteger = dotIndex === -1
    const exponent = isInteger ? a.length - i - 1 : i < dotIndex ? dotIndex - i - 1 : -(i - dotIndex)
    return 10 ** exponent
  })

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        gap,
        overflow: 'hidden',
        lineHeight: 1,
        fontSize,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {computedPlaces.map(place => (
        <Digit key={place} place={place} value={value} height={height} />
      ))}
    </span>
  )
}
