
export class LowPassFilter {
  private cutoffFrequency: number;
  private prevOutput: number;
  private previousTime: number;
  // private sampleRate: number;

  constructor(cutoffFrequency: number) {
    this.cutoffFrequency = cutoffFrequency;
    // this.sampleRate = sampleRate;
  }

  public process(input: number): number {
    if (this.prevOutput == null) {
      this.prevOutput = input;
      this.previousTime = Date.now();
      return input;
    }

    const RC = 1 / (2 * Math.PI * this.cutoffFrequency);
    // const dt = 1 / this.sampleRate;
    const dt = (Date.now() - this.previousTime) / 1000;
    const alpha = dt / (RC + dt);

    const output = alpha * input + (1 - alpha) * this.prevOutput;
    this.prevOutput = output;
    this.previousTime = Date.now();

    return output;
  }
}
