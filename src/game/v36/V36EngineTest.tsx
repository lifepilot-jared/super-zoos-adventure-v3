import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { DebugPanel } from "./DebugPanel";
import { EncounterDirector } from "./engine/encounterDirector";
import type { DebugCommand, EncounterEntity, Lane, PlayerAction, SchoolZone } from "./engine/types";
import { WorldClock } from "./engine/worldClock";
import "./v36EngineTest.css";

const HERO_IMAGE = "https://raw.githubusercontent.com/lifepilot-jared/super-zoos-adventure-v2/main/public/images/characters/animation/peter-normal-run-01.png";
const LANE_PERCENT: Record<Lane, number> = { [-1]: 24, [0]: 50, [1]: 76 };

type ItemRole = "gem" | "shield" | "magnet" | "boots" | "super" | "hazard" | "tunnel" | "hill" | "ramp" | "skateboard" | "rail" | "trampoline";

type ViewEntity = EncounterEntity & { role: ItemRole };

function entity(id: string, kind: EncounterEntity["kind"], lane: Lane, z: number, group: string, role: ItemRole): ViewEntity {
  return { id, kind, lane, z, collisionGroup: group, resolved: false, role };
}

function openingSequence(seed = 0): ViewEntity[] {
  const prefix = `s${seed}`;
  return [
    entity(`${prefix}-gem-a`, "pickup", -1, -18, `${prefix}-g1`, "gem"),
    entity(`${prefix}-gem-b`, "pickup", 0, -23, `${prefix}-g2`, "gem"),
    entity(`${prefix}-hazard-a`, "hazard", -1, -31, `${prefix}-h1`, "hazard"),
    entity(`${prefix}-gem-c`, "pickup", 0, -31, `${prefix}-h1`, "gem"),
    entity(`${prefix}-hazard-b`, "hazard", 1, -31, `${prefix}-h1`, "hazard"),
    entity(`${prefix}-boots`, "pickup", 1, -43, `${prefix}-p1`, "boots"),
    entity(`${prefix}-hill`, "traversal", 0, -54, `${prefix}-t1`, "hill"),
    entity(`${prefix}-tunnel`, "hazard", 0, -72, `${prefix}-t2`, "tunnel"),
    entity(`${prefix}-shield`, "pickup", -1, -88, `${prefix}-p2`, "shield"),
    entity(`${prefix}-super`, "flight", 0, -104, `${prefix}-f1`, "super"),
  ];
}

function spawnFor(command: Extract<DebugCommand, { type: "spawn" }>, sequence: number): ViewEntity[] {
  const id = `debug-${sequence}`;
  switch (command.target) {
    case "gemPattern": return [-1, 0, 1].map((lane, index) => entity(`${id}-gem-${index}`, "pickup", lane as Lane, -18 - index * 4, `${id}-g${index}`, "gem"));
    case "tunnel": return [entity(`${id}-tunnel`, "hazard", 0, -24, `${id}-gate`, "tunnel")];
    case "hill": return [entity(`${id}-hill`, "traversal", 0, -24, `${id}-gate`, "hill")];
    case "ramp": return [entity(`${id}-ramp`, "traversal", 1, -24, `${id}-gate`, "ramp")];
    case "skateboard": return [entity(`${id}-skate`, "pickup", -1, -20, `${id}-gate`, "skateboard")];
    case "rail": return [entity(`${id}-rail`, "traversal", 0, -28, `${id}-gate`, "rail")];
    case "trampoline": return [entity(`${id}-trampoline`, "traversal", 0, -24, `${id}-gate`, "trampoline")];
  }
}

export function V36EngineTest() {
  const clock = useMemo(() => new WorldClock(), []);
  const director = useMemo(() => new EncounterDirector(), []);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lane, setLane] = useState<Lane>(0);
  const [action, setAction] = useState<PlayerAction>("run");
  const [entities, setEntities] = useState<ViewEntity[]>(() => openingSequence());
  const [zone, setZone] = useState<SchoolZone>("entrance");
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [shield, setShield] = useState(false);
  const [magnetUntil, setMagnetUntil] = useState(0);
  const [bootsUntil, setBootsUntil] = useState(0);
  const [flightUntil, setFlightUntil] = useState(0);
  const [skating, setSkating] = useState(false);
  const [feedback, setFeedback] = useState("V3.6 protected engine test");
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(9.5);
  const laneRef = useRef<Lane>(0);
  const actionRef = useRef<PlayerAction>("run");
  const sequenceRef = useRef(1);
  const actionTimer = useRef<number | null>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    const fresh = openingSequence();
    director.reset(fresh);
    clock.reset(performance.now(), 9.5);
    setEntities(fresh);
    setLane(0); laneRef.current = 0;
    setAction("run"); actionRef.current = "run";
    setPaused(false); setScore(0); setHearts(3); setShield(false); setMagnetUntil(0); setBootsUntil(0); setFlightUntil(0); setSkating(false); setDistance(0); setSpeed(9.5);
    setFeedback("Engine reset: deterministic opening sequence");
  }, [clock, director]);

  useEffect(() => { laneRef.current = lane; }, [lane]);
  useEffect(() => { actionRef.current = action; }, [action]);
  useEffect(() => { clock.setSpeed(speed); }, [clock, speed]);
  useEffect(() => { if (started) clock.setPaused(paused, performance.now()); }, [clock, paused, started]);

  const resolveInteraction = useCallback((candidate: ViewEntity, nowMs: number) => {
    const role = candidate.role;
    if (candidate.kind === "pickup" || candidate.kind === "flight" || candidate.kind === "traversal") {
      if (role === "gem") setScore(value => value + 10);
      if (role === "shield") { setShield(true); setFeedback("Blue shield collected: one hit protected"); }
      if (role === "magnet") { setMagnetUntil(nowMs + 10000); setFeedback("Magnet active for 10 seconds"); }
      if (role === "boots") { setBootsUntil(nowMs + 10000); setFeedback("Big Jump Boots active"); }
      if (role === "super") { setFlightUntil(nowMs + 7000); setFeedback("SUPER FLIGHT active for 7 seconds"); }
      if (role === "skateboard") { setSkating(true); setFeedback("Skateboard active"); }
      if (role === "hill" || role === "ramp" || role === "trampoline") {
        setAction("jump"); actionRef.current = "jump";
        if (actionTimer.current) window.clearTimeout(actionTimer.current);
        actionTimer.current = window.setTimeout(() => { setAction("run"); actionRef.current = "run"; }, bootsUntil > nowMs ? 1150 : 850);
      }
      if (role === "rail") {
        if (!(skating && actionRef.current === "jump")) return;
        setAction("grind"); actionRef.current = "grind"; setScore(value => value + 75); setFeedback("Rail grind +75");
        if (actionTimer.current) window.clearTimeout(actionTimer.current);
        actionTimer.current = window.setTimeout(() => { setAction("run"); actionRef.current = "run"; }, 1900);
      }
      director.resolve(candidate.id);
      return;
    }

    const avoided = role === "tunnel" ? actionRef.current === "slide" : actionRef.current === "jump" || (skating && role === "hazard");
    if (avoided) { director.resolve(candidate.id); setScore(value => value + 8); return; }
    if (!director.canDamage(candidate, nowMs)) { director.resolve(candidate.id); return; }
    if (shield) { setShield(false); director.registerDamage(candidate, nowMs); director.resolve(candidate.id); setFeedback("Shield blocked the hit"); return; }
    director.registerDamage(candidate, nowMs); director.resolve(candidate.id);
    setHearts(value => Math.max(0, value - 1));
    setFeedback("One heart lost — damage protection active");
  }, [bootsUntil, director, shield, skating]);

  useEffect(() => {
    if (!started) return;
    director.reset(entities);
    clock.reset(performance.now(), speed);
    let frameId = 0;
    const tick = (nowMs: number) => {
      const frame = clock.step(nowMs);
      director.advance(frame);
      director.clearCollisionGroupAfterPass();
      const candidate = director.getCollisionCandidate(laneRef.current) as ViewEntity | null;
      if (candidate) resolveInteraction(candidate, nowMs);
      let current = director.getEntities() as readonly ViewEntity[];
      if (current.length < 5) {
        const extra = openingSequence(sequenceRef.current++).map(item => ({ ...item, z: item.z - 90 }));
        current = [...current, ...extra];
        director.replace([...current]);
      }
      setEntities([...current]);
      setDistance(frame.distance);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [clock, director, resolveInteraction, started]);

  useEffect(() => { if (hearts === 0) { setPaused(true); setFeedback("Great try — restart when ready"); } }, [hearts]);

  const move = (direction: -1 | 1) => {
    if (!started || paused) return;
    setLane(value => Math.max(-1, Math.min(1, value + direction)) as Lane);
  };
  const act = (next: "jump" | "slide") => {
    if (!started || paused || actionRef.current !== "run") return;
    setAction(next); actionRef.current = next;
    if (actionTimer.current) window.clearTimeout(actionTimer.current);
    const duration = next === "jump" ? (bootsUntil > performance.now() ? 1100 : 780) : 680;
    actionTimer.current = window.setTimeout(() => { setAction("run"); actionRef.current = "run"; }, duration);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => { gesture.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current; gesture.current = null; if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < -30) act("jump"); else if (dy > 30) act("slide");
  };

  const onDebug = (command: DebugCommand) => {
    if (command.type === "speed") { setSpeed(command.value); return; }
    if (command.type === "zone") { setZone(command.target); setFeedback(`Zone switched to ${command.target}`); return; }
    if (command.type === "reset") { reset(); return; }
    if (command.type === "power") {
      const now = performance.now();
      if (command.target === "shield") setShield(true);
      if (command.target === "magnet") setMagnetUntil(now + 10000);
      if (command.target === "boots") setBootsUntil(now + 10000);
      if (command.target === "superFlight") setFlightUntil(now + 7000);
      setFeedback(`Debug power: ${command.target}`);
      return;
    }
    const additions = spawnFor(command, sequenceRef.current++);
    director.replace([...director.getEntities(), ...additions]);
    setEntities([...director.getEntities()] as ViewEntity[]);
    setFeedback(`Debug spawn: ${command.target}`);
  };

  const now = performance.now();
  const flying = flightUntil > now;
  const boots = bootsUntil > now;
  const magnet = magnetUntil > now;

  return <main className={`v36-test zone-${zone} ${flying ? "is-flying" : ""}`}>
    <header className="v36-header">
      <div><small>PROTECTED FEATURE BRANCH</small><h1>V3.6 Engine Test</h1></div>
      <div className="v36-stats"><b>{"♥".repeat(hearts)}{"♡".repeat(3-hearts)}</b><b>Score {score}</b><b>{Math.floor(distance)} m</b><b>{zone}</b>{shield&&<b className="shield">Shield</b>}{boots&&<b className="boots">Big Jump</b>}{magnet&&<b className="magnet">Magnet</b>}{flying&&<b className="flight">Super Flight</b>}</div>
    </header>
    <section className="v36-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <div className="v36-sky"/><div className="v36-school"><span>AUSTRALIAN SCHOOL • {zone.toUpperCase()}</span></div>
      <div className="v36-road"><i/><i/><i/></div>
      {entities.filter(item => !item.resolved).map(item => {
        const progress = Math.max(0, Math.min(1.2, (item.z + 110) / 116));
        const top = 13 + progress * 70;
        const scale = .42 + progress * .85;
        const good = item.kind !== "hazard";
        return <div key={item.id} className={`v36-item ${good ? "good" : "danger"} role-${item.role}`} style={{ left:`${LANE_PERCENT[item.lane]}%`, top:`${top}%`, transform:`translate(-50%,-50%) scale(${scale})` }}>
          <span className="v36-symbol">{item.role==="gem"?"◆":item.role==="shield"?"●":item.role==="boots"?"👢":item.role==="super"?"★":item.role==="tunnel"?"▣":item.role==="rail"?"═":item.role==="hill"||item.role==="ramp"?"▲":item.role==="skateboard"?"▰":item.role==="trampoline"?"⬒":"!"}</span>
          <strong>{good ? item.role.toUpperCase() : item.role === "tunnel" ? "SLIDE" : "JUMP / DODGE"}</strong>
        </div>;
      })}
      {flying && [-1,0,1,0,1,-1].map((ringLane,index)=><div key={index} className="v36-flight-ring" style={{left:`${LANE_PERCENT[ringLane as Lane]}%`,top:`${18+index*10}%`}}>○</div>)}
      <div className={`v36-hero lane-${lane} action-${action} ${boots?"boots":""} ${skating?"skating":""}`}>
        <img src={HERO_IMAGE} alt="Peter" onError={event => { event.currentTarget.style.display="none"; }} />
        <span className="v36-hero-fallback">PETER</span>
        {skating&&<i className="v36-board"/>}
      </div>
      <div className="v36-feedback">{feedback}</div>
      {!started&&<div className="v36-overlay"><div><small>ENGINE SPRINT</small><h2>Stable V3.6 Test Runner</h2><p>This branch test uses one world clock, one collision gate and deterministic school encounters. The live game is unchanged.</p><button onClick={()=>{reset();setStarted(true)}}>Start Engine Test</button></div></div>}
      {paused&&started&&<div className="v36-overlay"><div><small>PAUSED</small><h2>World time is frozen</h2><button onClick={()=>setPaused(false)}>Resume</button><button onClick={reset}>Restart</button></div></div>}
      <DebugPanel onCommand={onDebug}/>
    </section>
    <nav className="v36-controls"><button onClick={()=>move(-1)}>Left</button><button onClick={()=>move(1)}>Right</button><button onClick={()=>act("jump")}>Jump</button><button onClick={()=>act("slide")}>Slide</button><button onClick={()=>setPaused(value=>!value)}>{paused?"Resume":"Pause"}</button><button onClick={reset}>Restart</button></nav>
  </main>;
}
