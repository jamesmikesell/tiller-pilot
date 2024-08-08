
export class UnitConverter {

  static mpsToKts(mps: number): number {
    return mps * 1.94384;
  }


  static ktToMps(kts: number): number {
    return kts / 1.94384;
  }

}
