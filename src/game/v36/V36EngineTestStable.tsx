import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { DebugPanel } from "./DebugPanel";
import { EncounterDirector } from "./engine/encounterDirector";
import type { DebugCommand, EncounterEntity, Lane, PlayerAction, SchoolZone } from "./engine/types";
import { WorldClock } from "./engine/worldClock";
import "./v36EngineTest.css";

const HERO_IMAGE = "https://raw.githubusercontent.com/lifepilot-jared/super-zoos-adventure-v2/main/public/images/characters/animation/peter-normal-run-01.png";
const LANE_PERCENT: Record<Lane, number> = { [-1]: 24, [0]: 50, [1]: 76 };

type Role = "gem" | "shield" | "magnet" | "boots" | "super" | "hazard" | "tunnel" | "hill" | "ramp" | "skateboard" | "rail" | "trampoline";
type ViewEntity = EncounterEntity & { role: Role };

const makeEntity = (id: string, kind: EncounterEntity["kind"], lane: Lane, z: number, group: string, role: Role): ViewEntity => ({
  id, kind, lane, z, collisionGroup: group, resolved: false, role,
});

function spacedSequence(seed = 0, offset = 0): ViewEntity[] {
  const p = `stable-${seed}`;
  return [
    makeEntity(`${p}-gem-1`, "pickup", 0, offset - 22, `${p}-g1`, "gem"),
    makeEntity(`${p}-gem-2`, "pickup", -1, offset - 30, `${p}-g2`, "gem"),
    makeEntity(`${p}-gem-3`, "pickup", 1, offset - 38, `${p}-g3`, "gem"),

    // First decision row. Centre lane is deliberately clear.
    makeEntity(`${p}-hazard-left`, "hazard", -1, offset - 58, `${p}-h1`, "hazard"),
    makeEntity(`${p}-hazard-right`, "hazard", 1, offset - 58, `${p}-h1`, "hazard"),

    // Pickups always receive a protected clear zone before and after them.
    makeEntity(`${p}-boots`, "pickup", 1, offset - 82, `${p}-p1`, "boots"),
    makeEntity(`${p}-hill`, "traversal", 0, offset - 104, `${p}-t1`, "hill"),
    makeEntity(`${p}-shield`, "pickup", -1, offset - 128, `${p}-p2`, "shield"),
    makeEntity(`${p}-tunnel`, "hazard", 0, offset - 154, `${p}-t2`, "tunnel"),
    makeEntity(`${p}-super`, "flight", 0, offset - 182, `${p}-f1`, "super"),
  ];
}

function debugSpawn(command: Extract<DebugCommand, { type: "spawn" }>, sequence: number): ViewEntity[] {
  const id = `debug-stable-${sequence}`;
  const z = -34;
  switch (command.target) {
    case "gemPattern": return [-1, 0, 1].map((lane, i) => makeEntity(`${id}-g${i}`, "pickup", lane as Lane, z - i * 7, `${id}-g${i}`, "gem"));
    case "tunnel": return [makeEntity(`${id}-tunnel`, "hazard", 0, z, `${id}-gate`, "tunnel")];
    case "hill": return [makeEntity(`${id}-hill`, "traversal", 0, z, `${id}-gate`, "hill")];
    case "ramp": return [makeEntity(`${id}-ramp`, "traversal", 1, z, `${id}-gate`, "ramp")];
    case "skateboard": return [makeEntity(`${id}-skate`, "pickup", -1, z, `${id}-gate`, "skateboard")];
    case "rail": return [makeEntity(`${id}-rail`, "traversal", 0, z, `${id}-gate`, "rail")];
    case "trampoline": return [makeEntity(`${id}-trampoline`, "traversal", 0, z, `${id}-gate`, "trampoline")];
  }
}

export function V36EngineTestStable() {
  const clock = useMemo(() => new WorldClock(), []);
  const director = useMemo(() => new EncounterDirector(), []);

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lane, setLane] = useState<Lane>(0);
  const [action, setAction] = useState<PlayerAction>("run");
  const [entities, setEntities] = useState<ViewEntity[]>(() => spacedSequence());
  const [zone, setZone] = useState<SchoolZone>("entrance");
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [shield, setShield] = useState(false);
  const [magnetUntil, setMagnetUntil] = useState(0);
  const [bootsUntil, setBootsUntil] = useState(0);
  const [flightUntil, setFlightUntil] = useState(0);
  const [skating, setSkating] = useState(false);
  const [feedback, setFeedback] = useState("Stable V3.6 spacing test");
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(9.2);

  const laneRef = useRef<Lane>(0);
  const actionRef = useRef<PlayerAction>("run");
  const shieldRef = useRef(false);
  const skatingRef = useRef(false);
  const bootsUntilRef = useRef(0);
  const magnetUntilRef = useRef(0);
  const flightUntilRef = useRef(0);
  const pausedRef = useRef(false);
  const sequenceRef = useRef(1);
  const timerRef = useRef<number | null>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { laneRef.current = lane; }, [lane]);
  useEffect(() => { actionRef.current = action; }, [action]);
  useEffect(() => { shieldRef.current = shield; }, [shield]);
  useEffect(() => { skatingRef.current = skating; }, [skating]);
  useEffect(() => { bootsUntilRef.current = bootsUntil; }, [bootsUntil]);
  useEffect(() => { magnetUntilRef.current = magnetUntil; }, [magnetUntil]);
  useEffect(() => { flightUntilRef.current = flightUntil; }, [flightUntil]);
  useEffect(() => { pausedRef.current = paused; clock.setPaused(paused, performance.now()); }, [clock, paused]);
  useEffect(() => { clock.setSpeed(speed); }, [clock, speed]);

  const reset = useCallback(() => {
    const fresh = spacedSequence();
    director.reset(fresh);
    clock.reset(performance.now(), 9.2);
    setEntities(fresh);
    setLane(0); laneRef.current = 0;
    setAction("run"); actionRef.current = "run";
    setPaused(false); pausedRef.current = false;
    setScore(0); setHearts(3);
    setShield(false); shieldRef.current = false;
    setSkating(false); skatingRef.current = false;
    setBootsUntil(0); bootsUntilRef.current = 0;
    setMagnetUntil(0); magnetUntilRef.current = 0;
    setFlightUntil(0); flightUntilRef.current = 0;
    setDistance(0); setSpeed(9.2);
    setFeedback("Reset complete — clear protected spacing restored");
  }, [clock, director]);

  const start = () => { reset(); setStarted(true); };

  useEffect(() => {
    if (!started) return;
    let frameId = 0;

    const tick = (nowMs: number) => {
      const frame = clock.step(nowMs);
      director.advance(frame);
      director.clearCollisionGroupAfterPass();

      const candidate = director.getCollisionCandidate(laneRef.current) as ViewEntity | null;
      if (candidate) {
        const role = candidate.role;
        const isPickup = candidate.kind === "pickup" || candidate.kind === "flight" || candidate.kind === "traversal";

        if (isPickup) {
          if (role === "rail" && !(skatingRef.current && actionRef.current === "jump")) {
            // Leave the rail unresolved so the player can deliberately jump onto it.
          } else {
            if (role === "gem") setScore(v => v + 10);
            if (role === "shield") { setShield(true); shieldRef.current = true; setFeedback("Shield collected"); }
            if (role === "magnet") { const until = nowMs + 10000; setMagnetUntil(until); magnetUntilRef.current = until; setFeedback("Magnet active"); }
            if (role === "boots") { const until = nowMs + 10000; setBootsUntil(until); bootsUntilRef.current = until; setFeedback("Big Jump Boots active"); }
            if (role === "super") { const until = nowMs + 7000; setFlightUntil(until); flightUntilRef.current = until; setFeedback("Super Flight active"); }
            if (role === "skateboard") { setSkating(true); skatingRef.current = true; setFeedback("Skateboard active"); }
            if (["hill", "ramp", "trampoline"].includes(role)) {
              setAction("jump"); actionRef.current = "jump";
              if (timerRef.current) window.clearTimeout(timerRef.current);
              timerRef.current = window.setTimeout(() => { setAction("run"); actionRef.current = "run"; }, bootsUntilRef.current > nowMs ? 1150 : 850);
            }
            if (role === "rail") {
              setAction("grind"); actionRef.current = "grind"; setScore(v => v + 75); setFeedback("Rail grind +75");
              if (timerRef.current) window.clearTimeout(timerRef.current);
              timerRef.current = window.setTimeout(() => { setAction("run"); actionRef.current = "run"; }, 1900);
            }
            director.resolve(candidate.id);
          }
        } else {
          const avoided = role === "tunnel" ? actionRef.current === "slide" : actionRef.current === "jump" || skatingRef.current;
          if (avoided) { director.resolve(candidate.id); setScore(v => v + 8); }
          else if (!director.canDamage(candidate, nowMs)) director.resolve(candidate.id);
          else if (shieldRef.current) {
            setShield(false); shieldRef.current = false;
            director.registerDamage(candidate, nowMs); director.resolve(candidate.id); setFeedback("Shield blocked the hit");
          } else {
            director.registerDamage(candidate, nowMs); director.resolve(candidate.id);
            setHearts(v => Math.max(0, v - 1)); setFeedback("One heart lost — protected briefly");
          }
        }
      }

      let current = director.getEntities() as readonly ViewEntity[];
      if (current.length < 4) {
        const next = spacedSequence(sequenceRef.current++, -205);
        current = [...current, ...next];
        director.replace([...current]);
      }
      setEntities([...current]);
      setDistance(frame.distance);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [clock, director, started]);

  useEffect(() => { if (hearts === 0) { setPaused(true); setFeedback("Great try — restart when ready"); } }, [hearts]);

  const move = (d: -1 | 1) => { if (started && !pausedRef.current) setLane(v => Math.max(-1, Math.min(1, v + d)) as Lane); };
  const act = (next: "jump" | "slide") => {
    if (!started || pausedRef.current || actionRef.current !== "run") return;
    setAction(next); actionRef.current = next;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const duration = next === "jump" ? (bootsUntilRef.current > performance.now() ? 1100 : 780) : 680;
    timerRef.current = window.setTimeout(() => { setAction("run"); actionRef.current = "run"; }, duration);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => { gesture.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const startPoint = gesture.current; gesture.current = null; if (!startPoint) return;
    const dx = event.clientX - startPoint.x, dy = event.clientY - startPoint.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < -30) act("jump"); else if (dy > 30) act("slide");
  };

  const onDebug = (command: DebugCommand) => {
    if (command.type === "speed") { setSpeed(command.value); return; }
    if (command.type === "zone") { setZone(command.target); setFeedback(`Zone: ${command.target}`); return; }
    if (command.type === "reset") { reset(); return; }
    if (command.type === "power") {
      const now = performance.now();
      if (command.target === "shield") { setShield(true); shieldRef.current = true; }
      if (command.target === "magnet") { setMagnetUntil(now + 10000); magnetUntilRef.current = now + 10000; }
      if (command.target === "boots") { setBootsUntil(now + 10000); bootsUntilRef.current = now + 10000; }
      if (command.target === "superFlight") { setFlightUntil(now + 7000); flightUntilRef.current = now + 7000; }
      setFeedback(`Debug power: ${command.target}`); return;
    }
    const additions = debugSpawn(command, sequenceRef.current++);
    director.replace([...director.getEntities(), ...additions]);
    setEntities([...director.getEntities()] as ViewEntity[]);
    setFeedback(`Debug spawn: ${command.target}`);
  };

  const now = performance.now();
  const flying = flightUntil > now;
  const boots = bootsUntil > now;
  const magnet = magnetUntil > now;

  return <main className={`v36-test zone-${zone} ${flying ? "is-flying" : ""}`}>
    <header className="v36-header"><div><small>PROTECTED FEATURE BRANCH</small><h1>V3.6 Stable Engine Test</h1></div><div className="v36-stats"><b>{"♥".repeat(hearts)}{"♡".repeat(3-hearts)}</b><b>Score {score}</b><b>{Math.floor(distance)} m</b><b>{zone}</b>{shield&&<b className="shield">Shield</b>}{boots&&<b className="boots">Big Jump</b>}{magnet&&<b className="magnet">Magnet</b>}{flying&&<b className="flight">Super Flight</b>}</div></header>
    <section className="v36-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <div className="v36-sky"/><div className="v36-school"><span>AUSTRALIAN SCHOOL • {zone.toUpperCase()}</span></div><div className="v36-road"><i/><i/><i/></div>
      {entities.filter(item => !item.resolved).map(item => {
        const progress = Math.max(0, Math.min(1.2, (item.z + 205) / 211));
        const top = 10 + progress * 74;
        const scale = .34 + progress * .92;
        const good = item.kind !== "hazard";
        return <div key={item.id} className={`v36-item ${good ? "good" : "danger"} role-${item.role}`} style={{ left:`${LANE_PERCENT[item.lane]}%`, top:`${top}%`, transform:`translate(-50%,-50%) scale(${scale})` }}><span className="v36-symbol">{item.role==="gem"?"◆":item.role==="shield"?"●":item.role==="boots"?"👢":item.role==="super"?"★":item.role==="tunnel"?"▣":item.role==="rail"?"═":item.role==="hill"||item.role==="ramp"?"▲":item.role==="skateboard"?"▰":item.role==="trampoline"?"⬒":"!"}</span><strong>{good ? item.role.toUpperCase() : item.role === "tunnel" ? "SLIDE" : "AVOID"}</strong></div>;
      })}
      {flying && [-1,0,1,0,1,-1].map((ringLane,index)=><div key={index} className="v36-flight-ring" style={{left:`${LANE_PERCENT[ringLane as Lane]}%`,top:`${18+index*10}%`}}>○</div>)}
      <div className={`v36-hero lane-${lane} action-${action} ${boots?"boots":""} ${skating?"skating":""}`}><img src={HERO_IMAGE} alt="Peter"/><span className="v36-hero-fallback">PETER</span>{skating&&<i className="v36-board"/>}</div>
      <div className="v36-feedback">{feedback}</div>
      {!started&&<div className="v36-overlay"><div><small>ENGINE SPRINT</small><h2>Stable Spacing Test</h2><p>Pickups have clear space around them. Hazards use separate decision rows. The world loop no longer restarts when a power-up changes.</p><button onClick={start}>Start Stable Test</button></div></div>}
      {paused&&started&&<div className="v36-overlay"><div><small>PAUSED</small><h2>World time is frozen</h2><button onClick={()=>setPaused(false)}>Resume</button><button onClick={reset}>Restart</button></div></div>}
      <DebugPanel onCommand={onDebug}/>
    </section>
    <nav className="v36-controls"><button onClick={()=>move(-1)}>Left</button><button onClick={()=>move(1)}>Right</button><button onClick={()=>act("jump")}>Jump</button><button onClick={()=>act("slide")}>Slide</button><button onClick={()=>setPaused(v=>!v)}>{paused?"Resume":"Pause"}</button><button onClick={reset}>Restart</button></nav>
  </main>;
}
