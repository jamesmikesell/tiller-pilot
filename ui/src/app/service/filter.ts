
export class LowPassFilter implements Filter {
  private cutoffFrequency: number;
  private prevOutput: number;
  private previousTime: number;

  constructor(cutoffFrequency: number) {
    this.cutoffFrequency = cutoffFrequency;
  }

  process(input: number): number {
    const now = performance.now();
    if (this.prevOutput == null) {
      this.prevOutput = input;
      this.previousTime = now;
      return input;
    }

    const RC = 1 / (2 * Math.PI * this.cutoffFrequency);
    const dt = (now - this.previousTime) / 1000;
    const alpha = dt / (RC + dt);

    const output = alpha * input + (1 - alpha) * this.prevOutput;
    this.prevOutput = output;
    this.previousTime = now;

    return output;
  }
}



export class ChainedFilter implements Filter {

  filters: LowPassFilter[] = []

  constructor(cutoffFrequency: number, nests: number) {
    for (let i = 0; i < nests; i++) {
      this.filters.push(new LowPassFilter(cutoffFrequency));
    }
  }

  process(input: number): number {
    let filteredResult: number;
    for (let i = 0; i < this.filters.length; i++) {
      const filter = this.filters[i];
      if (i === 0)
        filteredResult = filter.process(input);
      else
        filteredResult = filter.process(filteredResult);
    }

    return filteredResult;
  }
}


export class NotAFilter implements Filter {
  process(input: number): number {
    return input;
  }
}


export interface Filter {
  process(input: number): number;
}