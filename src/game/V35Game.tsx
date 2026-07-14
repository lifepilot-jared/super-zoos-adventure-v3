import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Group, Vector3 } from "three";
import "./v35Game.css";

type Lane = -1 | 0 | 1;
type HeroId = "peter" | "judy";
type Phase = "ground" | "launch" | "flight" | "landing";
type Action = "run" | "jump" | "slide" | "grind";
type Kind = "gem" | "shield" | "magnet" | "boots" | "super" | "skate" | "cone" | "bag" | "hurdle" | "bin" | "books" | "puddle" | "ball" | "tunnel" | "branch" | "swing" | "hill" | "ramp" | "rail";
type Item = { id: number; kind: Kind; lane: Lane; z: number; resolved: boolean };
type Ring = { id: number; lane: Lane; z: number; resolved: boolean };

type Pattern = { gap: number; rows: Array<{ z: number; items: Array<[Kind, Lane]> }> };
const LX: Record<Lane, number> = { [-1]: -2.7, [0]: 0, [1]: 2.7 };
const PICKUPS = new Set<Kind>(["gem", "shield", "magnet", "boots", "super", "skate", "hill", "ramp", "rail"]);
const JUMP = new Set<Kind>(["cone", "bag", "hurdle", "bin", "books", "puddle", "ball"]);
const SLIDE = new Set<Kind>(["tunnel", "branch", "swing"]);
const PATTERNS: Pattern[] = [
  { gap: 15, rows: [{ z: 0, items: [["gem", -1], ["gem", 0], ["gem", 1]] }, { z: -4, items: [["gem", 0]] }] },
  { gap: 17, rows: [{ z: 0, items: [["cone", -1], ["gem", 0], ["bag", 1]] }] },
  { gap: 16, rows: [{ z: 0, items: [["shield", 0]] }, { z: -5, items: [["gem", -1], ["gem", 1]] }] },
  { gap: 18, rows: [{ z: 0, items: [["hurdle", 0]] }, { z: -5, items: [["gem", 0]] }] },
  { gap: 18, rows: [{ z: 0, items: [["magnet", -1]] }, { z: -4, items: [["gem", 0]] }, { z: -8, items: [["gem", 1]] }] },
  { gap: 22, rows: [{ z: 0, items: [["tunnel", 0]] }, { z: -9, items: [["gem", 0]] }] },
  { gap: 20, rows: [{ z: 0, items: [["boots", 1]] }, { z: -7, items: [["hill", 0]] }] },
  { gap: 25, rows: [{ z: 0, items: [["skate", -1]] }, { z: -12, items: [["rail", 0]] }] },
  { gap: 18, rows: [{ z: 0, items: [["swing", 1], ["gem", 0], ["bin", -1]] }] },
  { gap: 19, rows: [{ z: 0, items: [["books", -1], ["gem", 0], ["puddle", 1]] }] },
  { gap: 19, rows: [{ z: 0, items: [["branch", -1], ["ball", 0], ["gem", 1]] }] },
  { gap: 22, rows: [{ z: 0, items: [["ramp", 1]] }, { z: -6, items: [["gem", 1]] }] },
  { gap: 24, rows: [{ z: 0, items: [["super", 0]] }] },
];

function buildItems(seed = 0): Item[] {
  const items: Item[] = [];
  let cursor = -22;
  for (let i = 0; i < 12; i++) {
    const pattern = PATTERNS[(seed + i) % PATTERNS.length];
    pattern.rows.forEach((row, rowIndex) => row.items.forEach(([kind, lane], itemIndex) => {
      items.push({ id: seed * 100000 + i * 1000 + rowIndex * 20 + itemIndex, kind, lane, z: cursor + row.z, resolved: false });
    }));
    cursor -= pattern.gap;
  }
  return items;
}

const ringPattern: Lane[] = [-1,0,1,0,-1,0,1,1,0,-1,0,1,-1,0,1,0,-1,1,0,1,-1,0,1,0];
const buildRings = (): Ring[] => ringPattern.map((lane, id) => ({ id, lane, z: -7 - id * 3.4, resolved: false }));

function CameraRig({ lane, phase, action }: { lane: Lane; phase: Phase; action: Action }) {
  const { camera } = useThree();
  const pos = useRef(new Vector3());
  const look = useRef(new Vector3());
  useFrame((_, dt) => {
    const air = phase !== "ground";
    const jumpLift = action === "jump" ? 0.55 : 0;
    pos.current.set(-lane * 0.08, air ? 6.3 : 5.15 + jumpLift, air ? 13.7 : 13);
    camera.position.lerp(pos.current, Math.min(1, dt * 7));
    look.current.set(0, air ? 3.15 : 1.55, -16);
    camera.lookAt(look.current);
  });
  return null;
}

function Peter({ superMode }: { superMode: boolean }) {
  return <group>
    <mesh position={[0, .35, 0]}><sphereGeometry args={[.78, 24, 18]} /><meshStandardMaterial color={superMode ? "#2765d8" : "#9ba5ab"} /></mesh>
    <mesh position={[0, 1.2, 0]}><sphereGeometry args={[.7, 24, 18]} /><meshStandardMaterial color="#aab2b7" /></mesh>
    {[-.7,.7].map(x => <mesh key={x} position={[x,1.2,0]}><sphereGeometry args={[.43,18,14]} /><meshStandardMaterial color="#ed9eb6" /></mesh>)}
    <mesh position={[0,.75,.5]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.14,.2,.8,12]} /><meshStandardMaterial color="#aab2b7" /></mesh>
    {[-.3,.3].map(x => <mesh key={x} position={[x,-.45,0]}><capsuleGeometry args={[.18,.58,6,10]} /><meshStandardMaterial color={superMode ? "#1e4eac" : "#3f6fa8"} /></mesh>)}
    {superMode && <mesh position={[0,.35,-.4]} rotation={[.15,0,0]}><coneGeometry args={[.82,1.6,4]} /><meshStandardMaterial color="#ee3657" /></mesh>}
  </group>;
}

function Judy({ superMode }: { superMode: boolean }) {
  return <group>
    <mesh position={[0,.3,0]}><sphereGeometry args={[.72,24,18]} /><meshStandardMaterial color={superMode ? "#ef4ea0" : "#ef9fc9"} /></mesh>
    <mesh position={[0,1.1,0]}><sphereGeometry args={[.64,24,18]} /><meshStandardMaterial color="#f2afd2" /></mesh>
    {[-.3,.3].map(x => <mesh key={x} position={[x,2,0]}><capsuleGeometry args={[.16,.78,6,10]} /><meshStandardMaterial color="#f2afd2" /></mesh>)}
    {[-.27,.27].map(x => <mesh key={x} position={[x,-.45,0]}><capsuleGeometry args={[.16,.58,6,10]} /><meshStandardMaterial color={superMode ? "#d22f84" : "#bf70a1"} /></mesh>)}
    {superMode && <mesh position={[0,.3,-.38]} rotation={[.15,0,0]}><coneGeometry args={[.78,1.5,4]} /><meshStandardMaterial color="#ffd24d" /></mesh>}
  </group>;
}

function Hero({ hero, lane, phase, action, boots, shield, magnet, skating, flash }: { hero: HeroId; lane: Lane; phase: Phase; action: Action; boots: boolean; shield: boolean; magnet: boolean; skating: boolean; flash: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = action === "run" ? Math.abs(Math.sin(t * (boots ? 14 : 10))) * .08 : 0;
    ref.current.rotation.z = phase === "flight" ? Math.sin(t * 2) * .08 : 0;
  });
  const y = phase === "flight" ? 4.5 : phase === "launch" ? 3.4 : phase === "landing" ? 2.8 : action === "jump" ? (boots ? 4.8 : 3.65) : action === "slide" ? 1.2 : action === "grind" ? 2.3 : 2.15;
  return <group position={[LX[lane], y, 5]} visible={!flash}>
    <group ref={ref} scale={[1.05,1.05,1.05]}>{hero === "peter" ? <Peter superMode={phase !== "ground"} /> : <Judy superMode={phase !== "ground"} />}</group>
    {shield && <mesh position={[0,.65,0]}><sphereGeometry args={[1.58,24,18]} /><meshStandardMaterial color="#4fd9ff" transparent opacity={.22} emissive="#20a9ff" emissiveIntensity={1} /></mesh>}
    {magnet && <mesh position={[0,.65,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[1.65,.07,10,44,Math.PI*1.65]} /><meshStandardMaterial color="#ff4d7b" emissive="#ff174c" emissiveIntensity={1.2} /></mesh>}
    {boots && phase === "ground" && [-.32,.32].map(x => <mesh key={x} position={[x,-.84,.05]}><boxGeometry args={[.42,.26,.62]} /><meshStandardMaterial color="#61f58a" emissive="#22c95b" emissiveIntensity={1.4} /></mesh>)}
    {skating && phase === "ground" && <mesh position={[0,-.98,0]}><boxGeometry args={[.58,.14,2]} /><meshStandardMaterial color="#31dfd0" emissive="#138ea7" emissiveIntensity={.7} /></mesh>}
  </group>;
}

function PickupShape({ kind }: { kind: Kind }) {
  if (kind === "gem") return <mesh><octahedronGeometry args={[.7,0]} /><meshStandardMaterial color="#ffe65c" emissive="#ff9d00" emissiveIntensity={1.2} /></mesh>;
  if (kind === "shield") return <mesh><sphereGeometry args={[.72,20,16]} /><meshStandardMaterial color="#56d9ff" transparent opacity={.85} emissive="#23aaff" emissiveIntensity={1.1} /></mesh>;
  if (kind === "magnet") return <mesh rotation={[0,0,Math.PI/2]}><torusGeometry args={[.58,.2,12,32,Math.PI*1.5]} /><meshStandardMaterial color="#ff4f70" emissive="#c81e48" emissiveIntensity={1} /></mesh>;
  if (kind === "boots") return <group>{[-.28,.28].map(x => <mesh key={x} position={[x,0,0]}><boxGeometry args={[.44,.54,.66]} /><meshStandardMaterial color="#5cf08c" emissive="#26a95b" emissiveIntensity={1.1} /></mesh>)}</group>;
  if (kind === "super") return <mesh><dodecahedronGeometry args={[.84,0]} /><meshStandardMaterial color="#ffd83b" emissive="#ff6f00" emissiveIntensity={1.6} /></mesh>;
  if (kind === "skate") return <mesh><boxGeometry args={[.58,.15,2]} /><meshStandardMaterial color="#31dfd0" emissive="#158fa7" emissiveIntensity={.8} /></mesh>;
  return null;
}

function HazardShape({ kind }: { kind: Kind }) {
  if (kind === "tunnel") return <group><mesh position={[-1.45,1.55,0]}><boxGeometry args={[.34,3.1,8]} /><meshStandardMaterial color="#426f9b" /></mesh><mesh position={[1.45,1.55,0]}><boxGeometry args={[.34,3.1,8]} /><meshStandardMaterial color="#426f9b" /></mesh><mesh position={[0,2.95,0]}><boxGeometry args={[3.25,.34,8]} /><meshStandardMaterial color="#ffb52c" /></mesh></group>;
  if (kind === "branch") return <mesh position={[0,1.55,0]} rotation={[0,0,.08]}><cylinderGeometry args={[.22,.32,3,10]} /><meshStandardMaterial color="#7b5133" /></mesh>;
  if (kind === "swing") return <group><mesh position={[-1.15,1.7,0]}><boxGeometry args={[.18,3.4,.4]} /><meshStandardMaterial color="#3c6b9c" /></mesh><mesh position={[1.15,1.7,0]}><boxGeometry args={[.18,3.4,.4]} /><meshStandardMaterial color="#3c6b9c" /></mesh><mesh position={[0,1.35,0]}><boxGeometry args={[2.3,.25,.6]} /><meshStandardMaterial color="#d34848" /></mesh></group>;
  if (kind === "ball") return <mesh><sphereGeometry args={[.66,20,16]} /><meshStandardMaterial color="#ef8734" /></mesh>;
  return <mesh><boxGeometry args={[1.35,.98,.82]} /><meshStandardMaterial color={kind === "puddle" ? "#267ac2" : kind === "bin" ? "#356d4d" : "#d85b38"} /></mesh>;
}

function ItemView({ item }: { item: Item }) {
  if (item.resolved) return null;
  const pickup = PICKUPS.has(item.kind);
  const slide = SLIDE.has(item.kind);
  const label = item.kind === "gem" ? "COLLECT" : item.kind === "shield" ? "SHIELD" : item.kind === "magnet" ? "MAGNET" : item.kind === "boots" ? "BIG JUMP" : item.kind === "super" ? "SUPER FLY" : item.kind === "skate" ? "SKATE" : item.kind === "rail" ? "JUMP ON" : item.kind === "hill" || item.kind === "ramp" ? "RIDE UP" : slide ? "SLIDE" : item.kind === "ball" ? "DODGE" : "JUMP";
  return <group position={[LX[item.lane], slide ? 0 : pickup ? 1.3 : .62, item.z]}>
    {item.kind !== "rail" && <mesh rotation={[Math.PI/2,0,0]} position={[0,-.48,0]}><torusGeometry args={[1,.14,12,40]} /><meshStandardMaterial color={pickup ? "#35e680" : "#ff3030"} emissive={pickup ? "#0fbf5c" : "#bd0000"} emissiveIntensity={1.25} /></mesh>}
    <Text position={[0,pickup ? 1.25 : 1.72,0]} fontSize={.31} color="#fff" outlineWidth={.055} outlineColor={pickup ? "#075d2f" : "#7a0000"}>{label}</Text>
    {PICKUPS.has(item.kind) && !["rail","hill","ramp"].includes(item.kind) && <PickupShape kind={item.kind} />}
    {item.kind === "rail" && <group position={[0,.05,-8]}><mesh position={[0,.68,0]}><boxGeometry args={[.2,.2,28]} /><meshStandardMaterial color="#e2e8ec" metalness={.9} /></mesh>{[-13,-9,-5,-1,3,7,11,13].map(z => <mesh key={z} position={[0,.32,z]}><boxGeometry args={[.13,.68,.13]} /><meshStandardMaterial color="#697781" /></mesh>)}</group>}
    {(item.kind === "hill" || item.kind === "ramp") && <mesh rotation={[-.28,0,0]}><boxGeometry args={[2.5,.75,item.kind === "hill" ? 7 : 5]} /><meshStandardMaterial color={item.kind === "hill" ? "#6f965b" : "#c38c53"} /></mesh>}
    {!pickup && <HazardShape kind={item.kind} />}
  </group>;
}

function Scenery({ x, z, type, speed }: { x: number; z: number; type: "tree" | "building" | "hoop" | "play" | "shade" | "goals" | "canteen"; speed: number }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => { if (!ref.current) return; ref.current.position.z += dt * speed; if (ref.current.position.z > 25) ref.current.position.z -= 190; });
  return <group ref={ref} position={[x,0,z]}>
    {type === "tree" && <><mesh position={[0,1.4,0]}><cylinderGeometry args={[.2,.36,2.8,10]} /><meshStandardMaterial color="#76513a" /></mesh><mesh position={[0,3.2,0]}><sphereGeometry args={[1.25,14,12]} /><meshStandardMaterial color="#3f8152" /></mesh></>}
    {type === "building" && <mesh position={[0,1.7,0]}><boxGeometry args={[8.5,3.4,3.4]} /><meshStandardMaterial color="#d5a05e" /></mesh>}
    {type === "canteen" && <mesh position={[0,1.45,0]}><boxGeometry args={[9,2.9,3.5]} /><meshStandardMaterial color="#dfb268" /></mesh>}
    {type === "hoop" && <><mesh position={[0,1.9,0]}><cylinderGeometry args={[.08,.08,3.8,8]} /><meshStandardMaterial color="#657078" /></mesh><mesh position={[0,3.5,.25]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.52,.07,10,24]} /><meshStandardMaterial color="#eb5a2c" /></mesh></>}
    {type === "play" && <mesh position={[0,1.15,0]} rotation={[.45,0,0]}><boxGeometry args={[3.6,.22,4.2]} /><meshStandardMaterial color="#f0bd42" /></mesh>}
    {type === "shade" && <mesh position={[0,2.8,0]}><boxGeometry args={[5.8,.14,4]} /><meshStandardMaterial color="#f08a3f" /></mesh>}
    {type === "goals" && <mesh position={[0,1.4,0]}><boxGeometry args={[4.5,.14,.14]} /><meshStandardMaterial color="#f5f5ef" /></mesh>}
  </group>;
}

function World(props: { hero: HeroId; lane: Lane; phase: Phase; action: Action; boots: boolean; shield: boolean; magnet: boolean; skating: boolean; flash: boolean; items: Item[]; rings: Ring[]; speed: number }) {
  return <>
    <CameraRig lane={props.lane} phase={props.phase} action={props.action} />
    <color attach="background" args={[props.phase === "flight" ? "#58c8ff" : "#8bd8ef"]} />
    <fog attach="fog" args={[props.phase === "flight" ? "#d3f3ff" : "#d7edf2", 30, 125]} />
    <ambientLight intensity={1.25} /><directionalLight position={[8,14,7]} intensity={2.4} />
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,-50]}><planeGeometry args={[44,190]} /><meshStandardMaterial color="#3e774c" /></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,-50]}><planeGeometry args={[16.5,190]} /><meshStandardMaterial color="#536671" /></mesh>
    {Array.from({ length: 16 }, (_, i) => <Scenery key={`l${i}`} x={-13.5-(i%2)} z={-i*11-5} type="tree" speed={props.speed*.9} />)}
    {Array.from({ length: 16 }, (_, i) => <Scenery key={`r${i}`} x={13.5+(i%2)} z={-i*11-9} type="tree" speed={props.speed*.9} />)}
    <Scenery x={-15} z={-35} type="building" speed={props.speed*.7} /><Scenery x={15} z={-70} type="canteen" speed={props.speed*.72} />
    <Scenery x={13} z={-42} type="hoop" speed={props.speed*.85} /><Scenery x={-14} z={-98} type="shade" speed={props.speed*.78} />
    <Scenery x={14} z={-112} type="play" speed={props.speed*.8} /><Scenery x={-14} z={-145} type="goals" speed={props.speed*.8} />
    <Hero hero={props.hero} lane={props.lane} phase={props.phase} action={props.action} boots={props.boots} shield={props.shield} magnet={props.magnet} skating={props.skating} flash={props.flash} />
    {props.phase === "ground" && props.items.map(item => <ItemView key={item.id} item={item} />)}
    {props.phase === "flight" && props.rings.filter(r => !r.resolved).map(r => <group key={r.id} position={[LX[r.lane],4.3,r.z]}><mesh><torusGeometry args={[.68,.18,12,30]} /><meshStandardMaterial color="#ffdc38" emissive="#ff9700" emissiveIntensity={1.3} /></mesh></group>)}
  </>;
}

export function V35Game() {
  const [hero,setHero] = useState<HeroId>("peter");
  const [started,setStarted] = useState(false);
  const [paused,setPaused] = useState(false);
  const [lane,setLane] = useState<Lane>(0);
  const [phase,setPhase] = useState<Phase>("ground");
  const [action,setAction] = useState<Action>("run");
  const [items,setItems] = useState<Item[]>(() => buildItems());
  const [rings,setRings] = useState<Ring[]>(buildRings);
  const [seed,setSeed] = useState(1);
  const [score,setScore] = useState(0);
  const [gems,setGems] = useState(0);
  const [hearts,setHearts] = useState(3);
  const [shield,setShield] = useState(false);
  const [magnetUntil,setMagnetUntil] = useState(0);
  const [bootsUntil,setBootsUntil] = useState(0);
  const [skating,setSkating] = useState(false);
  const [feedback,setFeedback] = useState("");
  const [gameOver,setGameOver] = useState(false);
  const [clock,setClock] = useState(performance.now());
  const [phaseUntil,setPhaseUntil] = useState(0);
  const [damageUntil,setDamageUntil] = useState(0);
  const laneRef = useRef<Lane>(0);
  const actionRef = useRef<Action>("run");
  const timer = useRef<number | null>(null);
  const gesture = useRef<{x:number;y:number}|null>(null);

  useEffect(() => { laneRef.current = lane; }, [lane]);
  useEffect(() => { actionRef.current = action; }, [action]);
  useEffect(() => { if (!started || paused || gameOver) return; const id = window.setInterval(() => setClock(performance.now()), 100); return () => clearInterval(id); }, [started,paused,gameOver]);

  const boots = bootsUntil > clock;
  const magnet = magnetUntil > clock;
  const flash = damageUntil > clock && Math.floor(clock / 110) % 2 === 0;
  const speed = phase === "flight" ? 13.5 : boots ? 12.5 : skating ? 11.2 : 9.6;
  const tell = useCallback((text: string) => { setFeedback(text); window.setTimeout(() => setFeedback(""), 1200); }, []);

  const reset = useCallback(() => {
    setLane(0); laneRef.current = 0; setPhase("ground"); setAction("run"); actionRef.current = "run";
    setItems(buildItems()); setRings(buildRings()); setSeed(1); setScore(0); setGems(0); setHearts(3);
    setShield(false); setMagnetUntil(0); setBootsUntil(0); setSkating(false); setFeedback("");
    setGameOver(false); setPaused(false); setPhaseUntil(0); setDamageUntil(0); setClock(performance.now());
  }, []);

  useEffect(() => {
    if (!started || paused || gameOver) return;
    let raf = 0;
    let previous = performance.now();
    const tick = (time: number) => {
      const dt = Math.min(.04, (time - previous) / 1000); previous = time;
      if (phase === "launch" && time >= phaseUntil) { setPhase("flight"); setPhaseUntil(time + 7000); setRings(buildRings()); tell("SUPER FLIGHT — follow the golden rings!"); }
      else if (phase === "flight" && time >= phaseUntil) { setPhase("landing"); setPhaseUntil(time + 900); tell("Safe landing"); }
      else if (phase === "landing" && time >= phaseUntil) { setPhase("ground"); setItems(buildItems(seed)); setSeed(v => v + 1); }

      if (phase === "flight") {
        setRings(list => list.map(r => ({ ...r, z: r.z + dt * speed })).map(r => {
          if (r.resolved) return r;
          if (r.z > 3.7 && r.z < 6.3 && r.lane === laneRef.current) { setGems(v => v + 1); setScore(v => v + 15); return { ...r, resolved: true }; }
          return r;
        }));
      }

      if (phase === "ground") {
        setItems(list => {
          const moved = list.map(item => ({ ...item, z: item.z + dt * speed }));
          const candidate = moved.filter(item => !item.resolved && item.z > 3.85 && item.z < 6.05 && item.lane === laneRef.current).sort((a,b) => b.z - a.z)[0];
          if (!candidate) {
            const alive = moved.filter(i => i.z < 13);
            if (alive.length < 10) return [...alive, ...buildItems(seed).map(i => ({ ...i, z: i.z - 100 }))];
            return alive;
          }
          const result = moved.map(item => {
            if (item.id !== candidate.id) return item;
            const kind = item.kind;
            if (PICKUPS.has(kind)) {
              if (kind === "rail") {
                if (skating && actionRef.current === "jump") { setAction("grind"); actionRef.current = "grind"; setScore(v => v + 75); tell("Perfect rail grind +75"); if (timer.current) clearTimeout(timer.current); timer.current = window.setTimeout(() => { setAction("run"); actionRef.current = "run"; }, 1900); return { ...item, resolved: true }; }
                return item;
              }
              if (kind === "gem") { setGems(v => v + 1); setScore(v => v + 10); }
              if (kind === "shield") { setShield(true); setScore(v => v + 25); tell("Blue shield: one hit blocked"); }
              if (kind === "magnet") { setMagnetUntil(time + 12000); setScore(v => v + 25); tell("Pink magnet: nearby gems fly to you"); }
              if (kind === "boots") { setBootsUntil(time + 12000); setScore(v => v + 25); tell("Green boots: much higher jumps"); }
              if (kind === "skate") { setSkating(true); setScore(v => v + 30); tell("Skateboard unlocked: smash small obstacles and grind rails"); }
              if (kind === "super") { setPhase("launch"); setPhaseUntil(time + 700); setScore(v => v + 50); tell("SUPER HERO TRANSFORMATION!"); }
              if (kind === "hill" || kind === "ramp") { setAction("jump"); actionRef.current = "jump"; setScore(v => v + 20); if (timer.current) clearTimeout(timer.current); timer.current = window.setTimeout(() => { setAction("run"); actionRef.current = "run"; }, boots ? 1200 : 900); }
              return { ...item, resolved: true };
            }
            const avoided = (JUMP.has(kind) && actionRef.current === "jump") || (SLIDE.has(kind) && actionRef.current === "slide") || (skating && ["cone","bag","books"].includes(kind));
            if (avoided) { setScore(v => v + 8); return { ...item, resolved: true }; }
            if (time < damageUntil) return { ...item, resolved: true };
            if (shield) { setShield(false); setDamageUntil(time + 1500); tell("Shield saved you"); return { ...item, resolved: true }; }
            setDamageUntil(time + 1800);
            setHearts(h => { const next = Math.max(0, h - 1); if (next === 0) { setGameOver(true); setStarted(false); } return next; });
            tell("One heart lost — protected for a moment");
            return { ...item, resolved: true };
          });
          const alive = result.filter(i => i.z < 13);
          if (alive.length < 10) { setSeed(v => v + 1); return [...alive, ...buildItems(seed).map(i => ({ ...i, z: i.z - 100 }))]; }
          return alive;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started,paused,gameOver,phase,phaseUntil,speed,seed,shield,skating,damageUntil,boots,tell]);

  useEffect(() => {
    if (!started || paused || phase !== "ground" || !magnet) return;
    setItems(list => list.map(item => {
      if (item.resolved || item.kind !== "gem") return item;
      if (Math.abs(item.z - 5) < 10) { setGems(v => v + 1); setScore(v => v + 10); return { ...item, resolved: true }; }
      return item;
    }));
  }, [clock,started,paused,phase,magnet]);

  const move = (direction: -1 | 1) => { if (started && !paused) setLane(value => Math.max(-1, Math.min(1, value + direction)) as Lane); };
  const act = (next: "jump" | "slide") => {
    if (!started || paused || phase !== "ground" || action !== "run") return;
    setAction(next); actionRef.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setAction("run"); actionRef.current = "run"; }, next === "jump" ? (boots ? 1200 : 820) : 720);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => { if (started && !paused) gesture.current = { x: event.clientX, y: event.clientY }; };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current; gesture.current = null; if (!start) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * .7) move(dx > 0 ? 1 : -1);
    else if (dy < -30) act("jump"); else if (dy > 30) act("slide");
  };
  const remaining = (until: number) => Math.max(0, Math.ceil((until - clock) / 1000));

  return <main className={`v35 phase-${phase}`}>
    <header><div><small>SUPER ZOOS ADVENTURE V3.5</small><h1>School Hero Adventure</h1></div><div className="stats"><b>{[0,1,2].map(i => <i key={i} className={i < hearts ? "on" : ""}>♥</i>)}</b><b>Gems {gems}</b><b>Score {score}</b>{boots && <b className="boots">Big Jump {remaining(bootsUntil)}s</b>}{magnet && <b className="magnet">Magnet {remaining(magnetUntil)}s</b>}{shield && <b className="shield">Shield</b>}{phase !== "ground" && <b className="fly">Super Flight</b>}<button onClick={() => setPaused(v => !v)} disabled={!started}>{paused ? "Resume" : "Pause"}</button></div></header>
    <section className="stage" onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { gesture.current = null; }}>
      <Canvas shadows dpr={[1,1.5]} camera={{ position: [0,5.15,13], fov: 43 }}><World hero={hero} lane={lane} phase={phase} action={action} boots={boots} shield={shield} magnet={magnet} skating={skating} flash={flash} items={items} rings={rings} speed={speed} /></Canvas>
      {feedback && <div className="feedback">{feedback}</div>}
      {started && !paused && phase === "ground" && <div className="legend"><span className="good">GREEN RING = COLLECT</span><span className="bad">RED RING = AVOID</span></div>}
      {paused && <div className="overlay"><div><small>GAME PAUSED</small><h2>Take a breather</h2><button onClick={() => setPaused(false)}>Resume Adventure</button><button onClick={() => { reset(); setStarted(true); }}>Restart</button></div></div>}
      {!started && !gameOver && <div className="overlay"><div><small>CHOOSE YOUR HERO</small><h2>V3.5 Clear Adventure</h2><p>Green rings are always good. Red rings are always danger. Only one damaging object can hit at a time, with protection after every hit.</p><div className="cards"><button className={hero === "peter" ? "selected" : ""} onClick={() => setHero("peter")}><strong>Peter</strong><span>Strength and Super Flight</span></button><button className={hero === "judy" ? "selected" : ""} onClick={() => setHero("judy")}><strong>Judy</strong><span>Speed and Super Flight</span></button></div><button onClick={() => { reset(); setStarted(true); }}>Start Adventure</button></div></div>}
      {gameOver && <div className="overlay"><div><small>GREAT TRY</small><h2>Ready for another rescue?</h2><p>Score {score} • Gems {gems}</p><button onClick={() => { reset(); setStarted(true); }}>Try Again</button><button onClick={() => { reset(); setStarted(false); }}>Choose Hero</button></div></div>}
    </section>
    <nav><button onClick={() => move(-1)} disabled={!started || paused}>Left</button><button onClick={() => move(1)} disabled={!started || paused}>Right</button><button className="jump" onClick={() => act("jump")} disabled={!started || paused}>Jump</button><button className="slide" onClick={() => act("slide")} disabled={!started || paused}>Slide</button><button onClick={() => setPaused(v => !v)} disabled={!started}>{paused ? "Resume" : "Pause"}</button><button onClick={() => { reset(); setStarted(true); }}>Restart</button></nav>
  </main>;
}
