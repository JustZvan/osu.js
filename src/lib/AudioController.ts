export class AudioController {
  context: AudioContext
  buffer: Uint8Array<ArrayBufferLike>
  audioLeadIn: number
  startTime: number

  constructor(mp3Buffer: Uint8Array<ArrayBufferLike>, audioLeadIn: number = 0) {
    this.context = new AudioContext()
    this.buffer = mp3Buffer
    this.audioLeadIn = audioLeadIn
    this.startTime = this.context.currentTime

    this.playMp3Buffer(mp3Buffer)
  }

  private async playMp3Buffer(buffer: Uint8Array<ArrayBufferLike>) {
    const audioBuffer = await this.context.decodeAudioData(
      buffer.buffer as ArrayBuffer,
    )
    const source = this.context.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.context.destination)
    source.start(this.context.currentTime + this.audioLeadIn / 1000)
  }

  async getTime() {
    const elapsed = this.context.currentTime - this.startTime
    return Math.max(0, elapsed - this.audioLeadIn / 1000)
  }
}
