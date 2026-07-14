import type { DamageGate, EncounterEntity, Lane, WorldFrame } from "./types";

const COLLISION_MIN_Z = 3.8;
const COLLISION_MAX_Z = 6.1;
const DAMAGE_COOLDOWN_MS = 1600;

export class EncounterDirector {
  private entities: EncounterEntity[] = [];
  private gate: DamageGate = { protectedUntilMs: 0, lastCollisionGroup: null };

  reset(entities: EncounterEntity[] = []): void {
    this.entities = entities.map(entity => ({ ...entity, resolved: false }));
    this.gate = { protectedUntilMs: 0, lastCollisionGroup: null };
  }

  replace(entities: EncounterEntity[]): void {
    this.entities = entities;
  }

  getEntities(): readonly EncounterEntity[] {
    return this.entities;
  }

  advance(frame: WorldFrame): void {
    if (frame.paused || frame.deltaSeconds === 0) return;
    this.entities = this.entities
      .map(entity => entity.resolved ? entity : { ...entity, z: entity.z + frame.deltaSeconds * frame.speed })
      .filter(entity => entity.z < 14);
  }

  getCollisionCandidate(playerLane: Lane): EncounterEntity | null {
    return this.entities
      .filter(entity => !entity.resolved && entity.lane === playerLane && entity.z >= COLLISION_MIN_Z && entity.z <= COLLISION_MAX_Z)
      .sort((a, b) => b.z - a.z)[0] ?? null;
  }

  resolve(id: string): void {
    this.entities = this.entities.map(entity => entity.id === id ? { ...entity, resolved: true } : entity);
  }

  canDamage(entity: EncounterEntity, nowMs: number): boolean {
    if (nowMs < this.gate.protectedUntilMs) return false;
    if (this.gate.lastCollisionGroup === entity.collisionGroup) return false;
    return true;
  }

  registerDamage(entity: EncounterEntity, nowMs: number): void {
    this.gate = {
      protectedUntilMs: nowMs + DAMAGE_COOLDOWN_MS,
      lastCollisionGroup: entity.collisionGroup,
    };
  }

  clearCollisionGroupAfterPass(): void {
    const activeGroupStillNear = this.entities.some(entity =>
      !entity.resolved && entity.collisionGroup === this.gate.lastCollisionGroup && entity.z < 10,
    );
    if (!activeGroupStillNear) this.gate.lastCollisionGroup = null;
  }
}
