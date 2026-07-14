import type { WorldFrame } from "./types";

export class WorldClock {
  private previousMs = 0;
  private distance = 0;
  private paused = true;
  private speed = 9.6;

  reset(nowMs: number, speed = 9.6): void {
    this.previousMs = nowMs;
    this.distance = 0;
    this.speed = speed;
    this.paused = false;
  }

  setPaused(paused: boolean, nowMs: number): void {
    this.paused = paused;
    this.previousMs = nowMs;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0, Math.min(20, speed));
  }

  step(nowMs: number): WorldFrame {
    if (this.previousMs === 0) this.previousMs = nowMs;
    const rawDelta = Math.max(0, Math.min(40, nowMs - this.previousMs));
    this.previousMs = nowMs;
    const deltaSeconds = this.paused ? 0 : rawDelta / 1000;
    this.distance += deltaSeconds * this.speed;

    return {
      nowMs,
      deltaSeconds,
      distance: this.distance,
      speed: this.speed,
      paused: this.paused,
    };
  }
}
