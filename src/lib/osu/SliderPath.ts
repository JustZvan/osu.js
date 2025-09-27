import type { HitObject } from 'osu-classes'
import { isSlider, getStartPosition } from './adapter'

export interface Point {
  x: number
  y: number
}

export interface SliderPath {
  points: Point[]
  length: number
}

function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

function lerp(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  }
}

function calculateBezierPath(
  controlPoints: Point[],
  steps: number = 100,
): Point[] {
  if (controlPoints.length < 2) return controlPoints

  const points: Point[] = []

  for (let t = 0; t <= 1; t += 1 / steps) {
    let tempPoints = [...controlPoints]

    // De Casteljau's algorithm for Bézier curves
    while (tempPoints.length > 1) {
      const newPoints: Point[] = []
      for (let i = 0; i < tempPoints.length - 1; i++) {
        newPoints.push(lerp(tempPoints[i], tempPoints[i + 1], t))
      }
      tempPoints = newPoints
    }

    points.push(tempPoints[0])
  }

  return points
}

function calculateLinearPath(
  controlPoints: Point[],
  steps: number = 100,
): Point[] {
  if (controlPoints.length < 2) return controlPoints

  const points: Point[] = []

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const start = controlPoints[i]
    const end = controlPoints[i + 1]

    const segmentSteps = Math.max(
      1,
      Math.floor((steps * distance(start, end)) / 200),
    )

    for (let j = 0; j < segmentSteps; j++) {
      const t = j / segmentSteps
      points.push(lerp(start, end, t))
    }
  }

  // Add the final point
  points.push(controlPoints[controlPoints.length - 1])

  return points
}

function calculatePerfectCirclePath(
  controlPoints: Point[],
  steps: number = 100,
): Point[] {
  if (controlPoints.length !== 3)
    return calculateLinearPath(controlPoints, steps)

  const [p1, p2, p3] = controlPoints

  // Calculate circle from three points
  const d =
    2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y))

  if (Math.abs(d) < 0.001) {
    // Points are collinear, use linear interpolation
    return calculateLinearPath(controlPoints, steps)
  }

  const ux =
    ((p1.x * p1.x + p1.y * p1.y) * (p2.y - p3.y) +
      (p2.x * p2.x + p2.y * p2.y) * (p3.y - p1.y) +
      (p3.x * p3.x + p3.y * p3.y) * (p1.y - p2.y)) /
    d
  const uy =
    ((p1.x * p1.x + p1.y * p1.y) * (p3.x - p2.x) +
      (p2.x * p2.x + p2.y * p2.y) * (p1.x - p3.x) +
      (p3.x * p3.x + p3.y * p3.y) * (p2.x - p1.x)) /
    d

  const center = { x: ux, y: uy }
  const radius = distance(center, p1)

  // Calculate angles
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x)
  const endAngle = Math.atan2(p3.y - center.y, p3.x - center.x)

  let deltaAngle = endAngle - startAngle

  // Determine the direction of the arc
  const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)
  if (cross > 0 && deltaAngle < 0) {
    deltaAngle += 2 * Math.PI
  } else if (cross < 0 && deltaAngle > 0) {
    deltaAngle -= 2 * Math.PI
  }

  const points: Point[] = []

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = startAngle + deltaAngle * t
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    })
  }

  return points
}

function calculateCatmullPath(
  controlPoints: Point[],
  steps: number = 100,
): Point[] {
  if (controlPoints.length < 2) return controlPoints
  if (controlPoints.length === 2)
    return calculateLinearPath(controlPoints, steps)

  const points: Point[] = []

  // Add extra points at the beginning and end for Catmull-Rom
  const extendedPoints = [
    controlPoints[0], // Duplicate first point
    ...controlPoints,
    controlPoints[controlPoints.length - 1], // Duplicate last point
  ]

  for (let i = 1; i < extendedPoints.length - 2; i++) {
    const p0 = extendedPoints[i - 1]
    const p1 = extendedPoints[i]
    const p2 = extendedPoints[i + 1]
    const p3 = extendedPoints[i + 2]

    const segmentSteps = Math.floor(steps / (extendedPoints.length - 3))

    for (let j = 0; j < segmentSteps; j++) {
      const t = j / segmentSteps
      const t2 = t * t
      const t3 = t2 * t

      // Catmull-Rom spline formula
      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)

      points.push({ x, y })
    }
  }

  // Ensure we end at the last control point
  if (points.length > 0) {
    points.push(controlPoints[controlPoints.length - 1])
  }

  return points
}

export function calculateSliderPath(hitObject: HitObject): SliderPath {
  if (!isSlider(hitObject)) {
    throw new Error('Hit object is not a slider')
  }

  const sliderAny = hitObject as any
  const path = sliderAny.path
  const startPoint = getStartPosition(hitObject)

  if (!path || !path.controlPoints || path.controlPoints.length === 0) {
    // Fallback to simple straight line
    return {
      points: [startPoint, { x: startPoint.x + 100, y: startPoint.y }],
      length: 100,
    }
  }

  // Convert control points to absolute coordinates
  const controlPoints: Point[] = [startPoint]

  for (let i = 1; i < path.controlPoints.length; i++) {
    const cp = path.controlPoints[i]
    if (cp?.position) {
      controlPoints.push({
        x: startPoint.x + cp.position.x,
        y: startPoint.y + cp.position.y,
      })
    }
  }

  if (controlPoints.length < 2) {
    // Fallback to simple straight line
    return {
      points: [startPoint, { x: startPoint.x + 100, y: startPoint.y }],
      length: 100,
    }
  }

  const curveType = path.curveType || 'B'
  let pathPoints: Point[] = []

  const steps = Math.max(
    50,
    Math.min(
      200,
      Math.floor(
        distance(controlPoints[0], controlPoints[controlPoints.length - 1]) / 5,
      ),
    ),
  )

  switch (curveType.toString().charAt(0).toUpperCase()) {
    case 'B': // Bézier
      pathPoints = calculateBezierPath(controlPoints, steps)
      break
    case 'L': // Linear
      pathPoints = calculateLinearPath(controlPoints, steps)
      break
    case 'P': // Perfect Circle
      pathPoints = calculatePerfectCirclePath(controlPoints, steps)
      break
    case 'C': // Catmull-Rom
      pathPoints = calculateCatmullPath(controlPoints, steps)
      break
    default:
      pathPoints = calculateBezierPath(controlPoints, steps)
      break
  }

  let totalLength = 0
  for (let i = 1; i < pathPoints.length; i++) {
    totalLength += distance(pathPoints[i - 1], pathPoints[i])
  }

  return {
    points: pathPoints,
    length: totalLength,
  }
}
