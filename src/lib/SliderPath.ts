import { HitObject } from './osu/objects'

export interface Point {
  x: number
  y: number
}

export interface SliderPath {
  points: Point[]
  length: number
}

export function calculateSliderPath(slider: HitObject): SliderPath {
  if (slider.objType !== 'slider') {
    throw new Error('Hit object is not a slider')
  }

  const { curveType, curvePoints, length } = slider.params
  const startPoint: Point = { x: slider.x, y: slider.y }

  if (curveType === 'B' || curveType === 'P') {
    console.log(`Processing ${curveType} slider:`, {
      curveType,
      curvePoints,
      length,
      startPoint,
    })
  }

  const controlPoints: Point[] = [startPoint]

  if (curvePoints && curvePoints.length > 0) {
    for (const pointStr of curvePoints) {
      if (pointStr && pointStr.includes(':')) {
        const [xStr, yStr] = pointStr.split(':')
        const x = parseInt(xStr)
        const y = parseInt(yStr)

        if (!isNaN(x) && !isNaN(y)) {
          controlPoints.push({ x, y })
        }
      }
    }
  }

  if (controlPoints.length < 2) {
    controlPoints.push({ x: startPoint.x + 100, y: startPoint.y })
  }

  let pathPoints: Point[] = []

  switch (curveType) {
    case 'L':
      pathPoints = calculateLinearPath(controlPoints, length)
      break
    case 'P':
      pathPoints = calculatePerfectCirclePath(controlPoints, length)
      break
    case 'B':
      pathPoints = calculateBezierPath(controlPoints, length)
      break
    case 'C':
      pathPoints = calculateCatmullRomPath(controlPoints, length)
      break
    default:
      pathPoints = calculateLinearPath(controlPoints, length)
      break
  }

  if (curveType === 'B' || curveType === 'P') {
    console.log(
      `Generated ${pathPoints.length} path points for ${curveType} slider`,
    )
  }

  return {
    points: pathPoints,
    length: length,
  }
}

function calculateLinearPath(
  controlPoints: Point[],
  targetLength: number,
): Point[] {
  if (controlPoints.length < 2) return controlPoints

  const points: Point[] = []
  const segments: { start: Point; end: Point; length: number }[] = []
  let totalLength = 0

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const start = controlPoints[i]
    const end = controlPoints[i + 1]
    const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
    segments.push({ start, end, length })
    totalLength += length
  }

  if (totalLength === 0) return controlPoints

  const numPoints = Math.max(20, Math.floor(targetLength / 3))
  const stepSize = targetLength / (numPoints - 1)

  for (let i = 0; i < numPoints; i++) {
    const targetDistance = i * stepSize
    let remainingDistance = targetDistance
    let found = false

    for (const segment of segments) {
      if (remainingDistance <= segment.length) {
        const ratio =
          segment.length > 0 ? remainingDistance / segment.length : 0
        const point = {
          x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
          y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
        }
        points.push(point)
        found = true
        break
      }
      remainingDistance -= segment.length
    }

    if (!found && segments.length > 0) {
      const lastSegment = segments[segments.length - 1]
      const direction = {
        x: lastSegment.end.x - lastSegment.start.x,
        y: lastSegment.end.y - lastSegment.start.y,
      }
      const directionLength = Math.sqrt(direction.x ** 2 + direction.y ** 2)

      if (directionLength > 0) {
        const normalizedDirection = {
          x: direction.x / directionLength,
          y: direction.y / directionLength,
        }
        const extraDistance = remainingDistance
        points.push({
          x: lastSegment.end.x + normalizedDirection.x * extraDistance,
          y: lastSegment.end.y + normalizedDirection.y * extraDistance,
        })
      } else {
        points.push(lastSegment.end)
      }
    }
  }

  return points
}

function calculatePerfectCirclePath(
  controlPoints: Point[],
  targetLength: number,
): Point[] {
  if (controlPoints.length < 3) {
    return calculateLinearPath(controlPoints, targetLength)
  }

  const [p1, p2, p3] = controlPoints
  const center = getCircumcenter(p1, p2, p3)

  if (!center) {
    return calculateLinearPath(controlPoints, targetLength)
  }

  const radius = Math.sqrt((p1.x - center.x) ** 2 + (p1.y - center.y) ** 2)

  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x)
  const midAngle = Math.atan2(p2.y - center.y, p2.x - center.x)
  const endAngle = Math.atan2(p3.y - center.y, p3.x - center.x)

  let totalAngle = calculateArcAngle(startAngle, midAngle, endAngle)

  if (Math.abs(totalAngle * radius) > targetLength) {
    totalAngle = (targetLength / radius) * Math.sign(totalAngle)
  }

  const arcLength = Math.abs(totalAngle * radius)
  const numPoints = Math.max(20, Math.floor(arcLength / 3))
  const points: Point[] = []

  for (let i = 0; i < numPoints; i++) {
    const ratio = i / Math.max(1, numPoints - 1)
    const angle = startAngle + totalAngle * ratio
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    })
  }

  return scalePathToLength(points, targetLength)
}

function calculateCatmullRomPath(
  controlPoints: Point[],
  targetLength: number,
): Point[] {
  if (controlPoints.length < 2) return controlPoints
  if (controlPoints.length < 4) {
    return calculateLinearPath(controlPoints, targetLength)
  }

  const points: Point[] = []
  const numSegments = controlPoints.length - 3
  const pointsPerSegment = Math.max(
    10,
    Math.floor(targetLength / (numSegments * 3)),
  )

  for (let segment = 0; segment < numSegments; segment++) {
    const p0 = controlPoints[segment]
    const p1 = controlPoints[segment + 1]
    const p2 = controlPoints[segment + 2]
    const p3 = controlPoints[segment + 3]

    for (let i = 0; i < pointsPerSegment; i++) {
      const t = i / pointsPerSegment
      const point = evaluateCatmullRom(p0, p1, p2, p3, t)

      if (segment === 0 || i > 0) {
        points.push(point)
      }
    }
  }

  if (points.length > 0) {
    points[points.length - 1] = controlPoints[controlPoints.length - 1]
  }

  return scalePathToLength(points, targetLength)
}

function evaluateCatmullRom(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point {
  const t2 = t * t
  const t3 = t2 * t

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

  return { x, y }
}

function calculateArcAngle(
  startAngle: number,
  midAngle: number,
  endAngle: number,
): number {
  const normalizeAngle = (angle: number) => {
    while (angle < 0) angle += 2 * Math.PI
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI
    return angle
  }

  const start = normalizeAngle(startAngle)
  const mid = normalizeAngle(midAngle)
  const end = normalizeAngle(endAngle)

  const startToMid = normalizeAngle(mid - start)
  const midToEnd = normalizeAngle(end - mid)
  const startToEnd = normalizeAngle(end - start)

  if (startToMid <= Math.PI && midToEnd <= Math.PI && startToEnd <= Math.PI) {
    return startToMid + midToEnd <= Math.PI
      ? startToEnd
      : startToEnd - 2 * Math.PI
  } else if (startToMid > Math.PI && midToEnd > Math.PI) {
    return startToEnd > Math.PI ? startToEnd - 2 * Math.PI : startToEnd
  } else {
    const clockwise = startToMid <= Math.PI
    if (clockwise) {
      return startToMid + midToEnd > Math.PI
        ? -(2 * Math.PI - (startToMid + midToEnd))
        : startToMid + midToEnd
    } else {
      return startToMid + midToEnd - 2 * Math.PI
    }
  }
}

function calculateBezierPath(
  controlPoints: Point[],
  targetLength: number,
): Point[] {
  if (controlPoints.length < 2) return controlPoints

  const segments = splitBezierSegments(controlPoints)

  if (segments.length === 1) {
    return generateBezierPoints(segments[0], targetLength)
  } else {
    const allPoints: Point[] = []
    const segmentLength = targetLength / segments.length

    for (let i = 0; i < segments.length; i++) {
      const segmentPoints = generateBezierPoints(segments[i], segmentLength)

      if (i === 0) {
        allPoints.push(...segmentPoints)
      } else {
        allPoints.push(...segmentPoints.slice(1))
      }
    }

    return scalePathToLength(allPoints, targetLength)
  }
}

function splitBezierSegments(controlPoints: Point[]): Point[][] {
  const segments: Point[][] = []
  let currentSegment: Point[] = [controlPoints[0]]

  for (let i = 1; i < controlPoints.length; i++) {
    currentSegment.push(controlPoints[i])

    if (
      i < controlPoints.length - 1 &&
      controlPoints[i].x === controlPoints[i + 1].x &&
      controlPoints[i].y === controlPoints[i + 1].y
    ) {
      segments.push([...currentSegment])
      currentSegment = [controlPoints[i]]
      i++
    }
  }

  if (currentSegment.length > 1) {
    segments.push(currentSegment)
  }

  return segments.length > 0 ? segments : [controlPoints]
}

function generateBezierPoints(
  controlPoints: Point[],
  targetLength: number,
): Point[] {
  if (controlPoints.length < 2) return controlPoints

  const numPoints = Math.max(50, Math.floor(targetLength / 2))
  const points: Point[] = []

  for (let i = 0; i < numPoints; i++) {
    const t = i / Math.max(1, numPoints - 1)
    const point = evaluateBezier(controlPoints, t)
    points.push(point)
  }

  return points
}

function scalePathToLength(points: Point[], targetLength: number): Point[] {
  if (points.length < 2) return points

  let totalLength = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    totalLength += Math.sqrt(dx * dx + dy * dy)
  }

  if (totalLength === 0) return points

  const scaledPoints: Point[] = [points[0]]
  const numOutputPoints = Math.max(20, Math.floor(targetLength / 3))
  const stepSize = targetLength / (numOutputPoints - 1)

  let currentDistance = 0
  let targetDistance = stepSize

  for (
    let i = 1;
    i < points.length && scaledPoints.length < numOutputPoints;
    i++
  ) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const segmentLength = Math.sqrt(dx * dx + dy * dy)

    while (
      targetDistance <= currentDistance + segmentLength &&
      scaledPoints.length < numOutputPoints
    ) {
      const ratio = (targetDistance - currentDistance) / segmentLength
      const newPoint = {
        x: points[i - 1].x + dx * ratio,
        y: points[i - 1].y + dy * ratio,
      }
      scaledPoints.push(newPoint)
      targetDistance += stepSize
    }

    currentDistance += segmentLength
  }

  if (
    scaledPoints.length > 0 &&
    scaledPoints[scaledPoints.length - 1] !== points[points.length - 1]
  ) {
    scaledPoints[scaledPoints.length - 1] = points[points.length - 1]
  }

  return scaledPoints
}

function evaluateBezier(controlPoints: Point[], t: number): Point {
  if (controlPoints.length === 1) return controlPoints[0]

  const newPoints: Point[] = []
  for (let i = 0; i < controlPoints.length - 1; i++) {
    const p1 = controlPoints[i]
    const p2 = controlPoints[i + 1]
    newPoints.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    })
  }

  return evaluateBezier(newPoints, t)
}

function getCircumcenter(p1: Point, p2: Point, p3: Point): Point | null {
  const ax = p1.x,
    ay = p1.y
  const bx = p2.x,
    by = p2.y
  const cx = p3.x,
    cy = p3.y

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))

  if (Math.abs(d) < 1e-6) return null

  const ux =
    ((ax * ax + ay * ay) * (by - cy) +
      (bx * bx + by * by) * (cy - ay) +
      (cx * cx + cy * cy) * (ay - by)) /
    d
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) +
      (bx * bx + by * by) * (ax - cx) +
      (cx * cx + cy * cy) * (bx - ax)) /
    d

  return { x: ux, y: uy }
}
