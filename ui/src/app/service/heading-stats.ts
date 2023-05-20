
export class HeadingStats {

  static circularMean(degrees: number[]): number {
    const radians = degrees.map((degree) => degree * (Math.PI / 180));

    // Calculate the sum of sin and cos values
    const sinSum = radians.reduce((sum, rad) => sum + Math.sin(rad), 0);
    const cosSum = radians.reduce((sum, rad) => sum + Math.cos(rad), 0);

    // Calculate the circular mean using arctan2
    const meanRad = Math.atan2(sinSum, cosSum);

    const meanDegrees = (meanRad * 180 / Math.PI) % 360;
    return meanDegrees;
  }

}