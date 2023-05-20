
export interface Controller {

  command(level: number): void;

  stop(): void;
  
}