export class AudioController {
  context: AudioContext
  buffer: Uint8Array<ArrayBufferLike>
  audioLeadIn: number
  startTime: number
  gainNode: GainNode

  hitSound: AudioBuffer | null = null
  hitSoundLoaded: boolean = false

  static _active: AudioController | null = null

  constructor(mp3Buffer: Uint8Array<ArrayBufferLike>, audioLeadIn: number = 0) {
    this.context = new AudioContext()
    this.buffer = mp3Buffer
    this.audioLeadIn = audioLeadIn
    this.startTime = this.context.currentTime
    this.gainNode = this.context.createGain()
    this.gainNode.connect(this.context.destination)
    this.gainNode.gain.value = 0.2

    AudioController._active = this

    // Load hit sound asynchronously but don't block constructor
    this.loadHitSound().catch((error) => {
      console.warn('Failed to load hit sound:', error)
    })

    this.playMp3Buffer(mp3Buffer)
  }

  private async loadHitSound() {
    try {
      const soundEffectData = await this.loadSoundEffect(
        '/skin/soft-hitnormal.wav',
      )
      this.hitSound = await this.context.decodeAudioData(
        soundEffectData.buffer as ArrayBuffer,
      )
      this.hitSoundLoaded = true
      console.log('Hit sound loaded successfully')
    } catch (error) {
      console.error('Failed to load hit sound:', error)
      this.hitSoundLoaded = false
    }
  }

  private async loadSoundEffect(
    url: string,
  ): Promise<Uint8Array<ArrayBufferLike>> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(
          `Failed to fetch sound effect: ${response.status} ${response.statusText}`,
        )
      }
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } catch (error) {
      console.error(`Error loading sound effect from ${url}:`, error)
      throw error
    }
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

  async playHitSound() {
    if (!this.hitSound) {
      console.warn('Hit sound not loaded yet or failed to load')
      return
    }

    try {
      const hitSoundGainNode = this.context.createGain()
      hitSoundGainNode.gain.setValueAtTime(1, this.context.currentTime)
      hitSoundGainNode.connect(this.gainNode)

      const source = this.context.createBufferSource()
      source.buffer = this.hitSound
      source.connect(hitSoundGainNode)
      source.start()
      console.log('Hit sound played')
    } catch (error) {
      console.error('Error playing hit sound:', error)
    }
  }

  destroy() {
    if (AudioController._active === this) {
      AudioController._active = null
    }
  }
}
