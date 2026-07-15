export type Lane = -1 | 0 | 1;
export type GamePhase = "menu" | "ground" | "launch" | "flight" | "landing" | "paused" | "gameOver";
export type PlayerAction = "run" | "jump" | "slide" | "grind";
export type SchoolZone = "entrance" | "gumtree" | "basketball" | "playground" | "bikeTrack" | "oval" | "science" | "library";
export type EncounterKind = "pickup" | "hazard" | "traversal" | "flight";

export type WorldFrame = {
  nowMs: number;
  deltaSeconds: number;
  distance: number;
  speed: number;
  paused: boolean;
};

export type EncounterEntity = {
  id: string;
  kind: EncounterKind;
  lane: Lane;
  z: number;
  resolved: boolean;
  collisionGroup: string;
};

export type DamageGate = {
  protectedUntilMs: number;
  lastCollisionGroup: string | null;
};

export type DebugCommand =
  | { type: "spawn"; target: "gemPattern" | "tunnel" | "hill" | "ramp" | "skateboard" | "rail" | "trampoline" }
  | { type: "power"; target: "shield" | "magnet" | "boots" | "superFlight" }
  | { type: "zone"; target: SchoolZone }
  | { type: "speed"; value: number }
  | { type: "reset" };
