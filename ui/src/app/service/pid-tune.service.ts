import { Subject, Subscription, combineAll, firstValueFrom, takeUntil, timer } from 'rxjs';
import { Controller } from './controller';

export class PidTuneService {

  private loopSubscription: Subscription;
  private historyProcess: Point[] = []
  private mostRecent2CyclePeaks: Point[] = []
  private lastCommand = 0;
  private cyclesCompleted = 0;
  private isSteppingUp = false;


  constructor() { }

  
  async tune(controller: Controller, sensor: Sensor, config: TuneConfig): Promise<PidTuningSuggestedValues> {
    let end = new Subject<PidTuningSuggestedValues>();

    this.loopSubscription = timer(0, config.intervalMs)
      .pipe(takeUntil(end))
      .subscribe(async () => {
        let now = performance.now();
        let sensorValue = sensor.getValue();


        if (this.isSteppingUp && sensorValue > config.setPoint + config.noiseBand)
          this.isSteppingUp = false;
        else if (!this.isSteppingUp && sensorValue < config.setPoint - config.noiseBand)
          this.isSteppingUp = true;

        let command = config.step;
        if (!this.isSteppingUp)
          command = -config.step


        if (command !== this.lastCommand) {
          this.cyclesCompleted++
          let extrema = this.findLocalExtrema(this.historyProcess);
          console.log(extrema);
          if (extrema.length > 0)
            this.mostRecent2CyclePeaks.push(extrema[0]);
          this.historyProcess.length = 0;

          if (this.mostRecent2CyclePeaks.length >= 4) {
            let mostRecentPeak1Delta = Math.abs(this.mostRecent2CyclePeaks[0].value - this.mostRecent2CyclePeaks[2].value);
            let mostRecentPeak2Delta = Math.abs(this.mostRecent2CyclePeaks[1].value - this.mostRecent2CyclePeaks[3].value);

            let max = Math.max(...this.mostRecent2CyclePeaks.map(single => single.value));
            let min = Math.min(...this.mostRecent2CyclePeaks.map(single => single.value));

            let amplitude = max - min;
            let peak1Variance = mostRecentPeak1Delta / amplitude;
            let peak2Variance = mostRecentPeak2Delta / amplitude;
            if (peak1Variance <= config.allowedAmplitudeVariance && peak2Variance <= config.allowedAmplitudeVariance) {
              this.loopSubscription.unsubscribe();
              controller.stop();

              let extremaProcess = this.findLocalExtrema(this.mostRecent2CyclePeaks);
              let suggestedPidValues = this.calculatePidConfigs(extremaProcess, config.step * 2);

              end.next(suggestedPidValues);
            }

            this.mostRecent2CyclePeaks.splice(0, this.mostRecent2CyclePeaks.length - 3)
          }
        }
        this.lastCommand = command;

        this.historyProcess.push(new Point(new Date(performance.timeOrigin + now), sensorValue));

        if (this.cyclesCompleted > config.maxCycleCount) {
          this.loopSubscription.unsubscribe();
          controller.stop();
          end.next(undefined);
          console.log("PID Tuning timed out without finding consistent results");
        }

        controller.command(command);
      });

    return await firstValueFrom(end);
  }

  cancel(): void {
    if (this.loopSubscription && !this.loopSubscription.closed)
      this.loopSubscription.unsubscribe();
  }


  findLocalExtrema(points: Point[]): Point[] {
    const extrema: Point[] = [];

    let duplicateValueStartIndex: number = undefined;
    // Check for local minima/maxima at each point
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const current = points[i];
      const next = points[i + 1];

      if (duplicateValueStartIndex !== undefined) {
        let duplicateStartPoint = points[duplicateValueStartIndex];
        let valBeforeDuplicates = points[duplicateValueStartIndex - 1];
        let midPoint = points[Math.round((i + duplicateValueStartIndex) / 2)]
        if (current.value < valBeforeDuplicates.value && current.value < next.value) {
          // Local minimum found
          extrema.push(midPoint);
          duplicateValueStartIndex = undefined;
        } else if (current.value > valBeforeDuplicates.value && current.value > next.value) {
          // Local maximum found
          extrema.push(midPoint);
          duplicateValueStartIndex = undefined;
        } else if (duplicateStartPoint.value !== current.value) {
          //This means we had a series of duplicate values and then continued on without hitting an extrema
          duplicateValueStartIndex = undefined;
        }
      }

      if (current.value < prev.value && current.value < next.value) {
        // Local minimum found
        extrema.push(current);
      } else if (current.value > prev.value && current.value > next.value) {
        // Local maximum found
        extrema.push(current);
      } else if (current.value === next.value && current.value !== prev.value && duplicateValueStartIndex === undefined) {
        duplicateValueStartIndex = i;
      }
    }

    return extrema;
  }


  private calculateKuAndTu(processExtrema: Point[], amplitudeControl: number, lookBackSamples: number): RelayTuningResults {
    // Ku = 4b/(PI())a
    // b = amplitude of the control output change 
    // a = amplitude of the process variable oscillation

    // Skipping the first 2 values as they likely have a lot of error
    let processExtremaShort = [...processExtrema].slice(processExtrema.length - lookBackSamples);
    let processTime = processExtremaShort[processExtremaShort.length - 1].time.getTime() - processExtremaShort[0].time.getTime();
    let periodAverage = (processTime / (processExtremaShort.length - 1)) * 2 / 1000;


    let amplitudeProcess = this.getAverageAmplitude(processExtremaShort);
    console.log("period ", periodAverage)
    console.log("process amp ", amplitudeProcess)
    console.log("process control ", amplitudeControl)

    let kU = (4 * amplitudeControl) / (Math.PI * amplitudeProcess);

    return new RelayTuningResults(periodAverage, kU);
  }


  private calculatePidConfigs(processExtrema: Point[], controlAmplitude: number, lookBackSamples = 5): PidTuningSuggestedValues {
    let tuningResults = this.calculateKuAndTu(processExtrema, controlAmplitude, lookBackSamples);

    let config = new PidTuningSuggestedValues();
    config.pid = this.createConfig(tuningResults, 0.6, 1.2, 0.075);
    config.noOvershoot = this.createConfig(tuningResults, 0.2, 0.4, 2 / 30);
    config.pessen = this.createConfig(tuningResults, 0.7, 1.74, 0.105);
    config.someOvershoot = this.createConfig(tuningResults, 1 / 3, 2 / 3, 1 / 9);

    return config;
  }


  private createConfig(tuningResults: RelayTuningResults, kPv: number, kIv: number, kDv: number): PidConfig {
    let config = new PidConfig();
    config.kP = kPv * tuningResults.Ku;
    config.kI = kIv * tuningResults.Ku / tuningResults.Tu;
    config.kD = kDv * tuningResults.Ku * tuningResults.Tu;

    return config;
  }


  private getAverageAmplitude(extrema: Point[]): number {
    let lastValue = extrema[0].value;
    let combinedTotal = 0;
    for (let i = 1; i < extrema.length; i++) {
      const singlePoint = extrema[i];
      const diff = singlePoint.value - lastValue;
      console.log(diff, combinedTotal)
      combinedTotal += Math.abs(diff);
      lastValue = singlePoint.value
    }

    return combinedTotal / (extrema.length - 1);
  }

}


export interface Sensor {
  getValue(): number;
}


export class Point {
  time: Date;
  value: number;

  constructor(time: Date, value: number) {
    this.time = time;
    this.value = value;
  }
}

export class PidConfig {
  kP: number;
  kI: number;
  kD: number;
}

export class RelayTuningResults {
  constructor(
    public Tu: number,
    public Ku: number,
  ) { }
}


export class PidTuningSuggestedValues {
  pid: PidConfig;
  noOvershoot: PidConfig;
  pessen: PidConfig;
  someOvershoot: PidConfig;
}


export class TuneConfig {
  setPoint = 0;
  step = 1;
  intervalMs = 100;
  maxCycleCount = 5;
  noiseBand = 0;
  allowedAmplitudeVariance = 0.10;
}
