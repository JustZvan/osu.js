import { AudioController } from '../AudioController'

export function ParseRawHitobject(line: string) {
  const parts = line.split(',')
  const x = parseInt(parts[0])
  const y = parseInt(parts[1])
  const time = parseInt(parts[2])
  const type = parseInt(parts[3])
  const hitSound = parseInt(parts[4])
  let objectParams = parts.slice(5)

  let hitSample = '0:0:0:0:'
  if (objectParams.length > 0) {
    if (objectParams[objectParams.length - 1].includes(':')) {
      hitSample = objectParams.pop() || '0:0:0:0:'
    }
  }

  let objType = 'circle'
  if (type & 0b10) objType = 'slider'
  else if (type & 0b1000) objType = 'spinner'

  let params: any = {}
  if (objType === 'slider') {
    const curve = objectParams[0]
    const slides = parseInt(objectParams[1])
    const length = parseFloat(objectParams[2])
    const edgeSounds = objectParams[3]?.split('|').map(Number) || []
    const edgeSets =
      objectParams[4]?.split('|').map((s) => s.split(':').map(Number)) || []

    const curveParts = curve.split('|')
    const curveType = curveParts[0]
    const curvePoints = curveParts.slice(1)

    params = {
      curveType,
      curvePoints,
      slides,
      length,
      edgeSounds,
      edgeSets,
    }
  } else if (objType === 'spinner') {
    params = {
      endTime: parseInt(objectParams[0]),
    }
  }

  return new HitObject({
    x,
    y,
    time,
    type,
    hitSound,
    objType,
    params,
    hitSample,
  })
}

export class HitObject {
  x: number
  y: number
  time: number
  type: number
  hitSound: number
  objType: string
  params: any
  hitSample: string
  shouldRender: boolean = true

  constructor({ x, y, time, type, hitSound, objType, params, hitSample }: any) {
    this.x = x
    this.y = y
    this.time = time
    this.type = type
    this.hitSound = hitSound
    this.objType = objType
    this.params = params
    this.hitSample = hitSample
  }

  async hit() {
    // function to handle click
    if (this.objType == 'circle') {
      this.shouldRender = false
    }
  }
}
