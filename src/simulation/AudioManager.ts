export class AudioManager {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isStarted = false;

  public init() {
    if (this.isStarted) return;
    
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.gainNode = this.context.createGain();
    this.filter = this.context.createBiquadFilter();
    
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(40, this.context.currentTime); // Low bass drone
    
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(200, this.context.currentTime);
    this.filter.Q.setValueAtTime(1, this.context.currentTime);

    this.oscillator.connect(this.filter);
    this.filter.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);

    this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.1, this.context.currentTime + 2); // Fade in

    this.oscillator.start();
    this.isStarted = true;

    // Add subtle LFO for movement
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1, this.context.currentTime);
    lfoGain.gain.setValueAtTime(50, this.context.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.filter.frequency);
    lfo.start();
  }

  public setIntensity(val: number) {
    if (!this.context || !this.oscillator) return;
    // val is 0 to 1
    const freq = 40 + (val * 20);
    this.oscillator.frequency.setTargetAtTime(freq, this.context.currentTime, 0.5);
  }
}
