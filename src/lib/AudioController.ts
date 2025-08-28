export class AudioController {
  context: AudioContext
  buffer: Uint8Array<ArrayBufferLike>

  constructor(mp3Buffer: Uint8Array<ArrayBufferLike>) {
    this.context = new AudioContext()
    this.buffer = mp3Buffer

    this.playMp3Buffer(mp3Buffer)
  }

  private async playMp3Buffer(buffer: Uint8Array<ArrayBufferLike>) {
    const audioBuffer = await this.context.decodeAudioData(
      buffer.buffer as ArrayBuffer,
    )
    const source = this.context.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.context.destination)
    source.start(0)
  }

  getTime() {
    return this.context.currentTime
  }
}
