export class AudioController {
  context: AudioContext
  buffer: Uint8Array<ArrayBufferLike>
  audioLeadIn: number
  startTime: number
  gainNode: GainNode

  static _active: AudioController | null = null

  constructor(mp3Buffer: Uint8Array<ArrayBufferLike>, audioLeadIn: number = 0) {
    this.context = new AudioContext()
    this.buffer = mp3Buffer
    this.audioLeadIn = audioLeadIn
    this.startTime = this.context.currentTime
    this.gainNode = this.context.createGain()
    this.gainNode.connect(this.context.destination)

    this.playMp3Buffer(mp3Buffer)
  }

  private async playMp3Buffer(buffer: Uint8Array<ArrayBufferLike>) {
    const audioBuffer = await this.context.decodeAudioData(
      buffer.buffer as ArrayBuffer,
    )
    const source = this.context.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.gainNode)
    source.start(this.context.currentTime + this.audioLeadIn / 1000)
  }

  async getTime() {
    const elapsed = this.context.currentTime - this.startTime
    return Math.max(0, elapsed - this.audioLeadIn / 1000)
  }

  destroy() {
    if (AudioController._active === this) {
      AudioController._active = null
    }
  }
}
