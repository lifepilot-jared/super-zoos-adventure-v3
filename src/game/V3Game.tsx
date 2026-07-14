import { Text, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Vector3, type Group } from "three";
import "./v3Game.css";

type Lane = -1 | 0 | 1;
type HeroId = "peter" | "judy";
type Action = "run" | "jump" | "slide" | "grind";
type Kind = "gem" | "shield" | "magnet" | "boots" | "skateboard" | "cone" | "bag" | "hurdle" | "tunnel" | "swing" | "rail";
type Encounter = { id: number; kind: Kind; lane: Lane; z: number; hit: boolean };
type Burst = { id: number; x: number; y: number; text: string };

type HeroVisual = { name: string; tagline: string; frames: string[]; card: string };

const V2_RAW = "https://raw.githubusercontent.com/lifepilot-jared/super-zoos-adventure-v2/main/public/images/characters/animation/";
const HEROES: Record<HeroId, HeroVisual> = {
  peter: {
    name: "Peter",
    tagline: "Strong, brave and gentle",
    frames: [1, 2, 3, 4].map((n) => `${V2_RAW}peter-normal-run-0${n}.png`),
    card: `${V2_RAW}peter-normal-run-01.png`,
  },
  judy: {
    name: "Judy",
    tagline: "Fast, funny and fearless",
    frames: [1, 2, 3, 4].map((n) => `${V2_RAW}judy-normal-run-0${n}.png`),
    card: `${V2_RAW}judy-normal-run-01.png`,
  },
};

const LANE_X: Record<Lane, number> = { [-1]: -2.45, [0]: 0, [1]: 2.45 };
const KINDS: Kind[] = [
  "gem", "gem", "cone", "gem", "shield", "bag", "gem", "hurdle", "magnet", "gem",
  "tunnel", "boots", "gem", "swing", "skateboard", "gem", "rail", "gem", "cone", "gem",
];
const LANES: Lane[] = [0, -1, 1, -1, 0, 1, 0, -1, 1, 0, 1, -1, 0, 1, -1, 0, 0, 1, -1, 0];

function makeEncounters(seed = 0): Encounter[] {
  return Array.from({ length: 18 }, (_, i) => ({
    id: seed * 100 + i,
    kind: KINDS[(i + seed) % KINDS.length],
    lane: LANES[(i * 2 + seed) % LANES.length],
    z: -18 - i * 7.5,
    hit: false,
  }));
}

function CameraRig({ lane, action, boots }: { lane: Lane; action: Action; boots: boolean }) {
  const { camera } = useThree();
  const target = useRef(new Vector3());
  const look = useRef(new Vector3());
  useFrame((_, dt) => {
    const jumpLift = action === "jump" ? 0.45 : 0;
    target.current.set(-lane * 0.12, 4.8 + jumpLift, boots ? 12.8 : 12.2);
    camera.position.lerp(target.current, Math.min(1, dt * 7));
    look.current.set(lane * 0.05, 1.15 + jumpLift * 0.3, -13.5);
    camera.lookAt(look.current);
  });
  return null;
}

function HeroSprite({ hero, lane, action, skating, shield }: { hero: HeroId; lane: Lane; action: Action; skating: boolean; shield: boolean }) {
  const textures = useTexture(HEROES[hero].frames);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFrame((v) => (v + 1) % textures.length), 88);
    return () => window.clearInterval(id);
  }, [textures.length]);
  const y = action === "jump" ? 2.75 : action === "slide" ? 1.35 : action === "grind" ? 2.0 : 1.95;
  const scaleY = action === "slide" ? 1.35 : 2.3;
  return (
    <group position={[LANE_X[lane], y, 4.7]}>
      {shield && <mesh position={[0, 0.1, 0]}><sphereGeometry args={[1.35, 24, 18]} /><meshStandardMaterial color="#55d9ff" transparent opacity={0.28} emissive="#2fbfff" emissiveIntensity={0.8} /></mesh>}
      <sprite scale={[1.72, scaleY, 1]}><spriteMaterial map={textures[frame]} transparent depthWrite={false} /></sprite>
      <mesh position={[0, -1.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.55, 24]} /><meshBasicMaterial color="#173d2a" transparent opacity={0.22} /></mesh>
      {skating && <group position={[0, -1.0, 0]} rotation={[0, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.5, 0.12, 1.55]} /><meshStandardMaterial color="#31dfd0" emissive="#148fa6" emissiveIntensity={0.5} /></mesh>
        {[-0.52, 0.52].map((z) => <mesh key={z} position={[0, -0.16, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.42, 10]} /><meshStandardMaterial color="#24384a" /></mesh>)}
      </group>}
    </group>
  );
}

function MovingScenery({ x, z, kind, speed }: { x: number; z: number; kind: "tree" | "building" | "fence" | "hoop" | "play" | "shade"; speed: number }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.z += dt * speed;
    if (ref.current.position.z > 20) ref.current.position.z -= 145;
  });
  return <group ref={ref} position={[x, 0, z]}>
    {kind === "tree" && <><mesh position={[0,1.3,0]}><cylinderGeometry args={[.18,.32,2.6,10]}/><meshStandardMaterial color="#76513a"/></mesh><mesh position={[0,3,0]}><sphereGeometry args={[1.15,14,12]}/><meshStandardMaterial color="#3f8152"/></mesh><mesh position={[.75,2.7,0]}><sphereGeometry args={[.72,12,10]}/><meshStandardMaterial color="#5b9b66"/></mesh></>}
    {kind === "building" && <><mesh position={[0,1.55,0]}><boxGeometry args={[7.4,3.1,3]}/><meshStandardMaterial color="#d5a05e"/></mesh><mesh position={[0,3.25,0]} rotation={[0,0,Math.PI/4]}><boxGeometry args={[4.5,4.5,3.05]}/><meshStandardMaterial color="#a84d38"/></mesh></>}
    {kind === "fence" && <><mesh position={[0,.8,0]}><boxGeometry args={[6,.12,.12]}/><meshStandardMaterial color="#eee8d8"/></mesh>{[-2.5,-1.25,0,1.25,2.5].map(v=><mesh key={v} position={[v,.68,0]}><boxGeometry args={[.11,1.4,.11]}/><meshStandardMaterial color="#eee8d8"/></mesh>)}</>}
    {kind === "hoop" && <><mesh position={[0,1.8,0]}><cylinderGeometry args={[.08,.08,3.6,8]}/><meshStandardMaterial color="#657078"/></mesh><mesh position={[0,3.35,.25]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.5,.07,10,24]}/><meshStandardMaterial color="#eb5a2c"/></mesh></>}
    {kind === "play" && <><mesh position={[0,1.25,0]} rotation={[.45,0,0]}><boxGeometry args={[3.2,.18,3.8]}/><meshStandardMaterial color="#f0bd42"/></mesh><mesh position={[0,.5,1.45]}><boxGeometry args={[3.6,.2,.5]}/><meshStandardMaterial color="#3f85c9"/></mesh></>}
    {kind === "shade" && <><mesh position={[0,2.7,0]} rotation={[-.1,0,0]}><boxGeometry args={[5.4,.12,3.8]}/><meshStandardMaterial color="#f08a3f"/></mesh>{[-2.2,2.2].map(v=><mesh key={v} position={[v,1.3,0]}><cylinderGeometry args={[.08,.08,2.6,8]}/><meshStandardMaterial color="#59646d"/></mesh>)}</>}
  </group>;
}

function EncounterMesh({ item }: { item: Encounter }) {
  if (item.hit) return null;
  const x = LANE_X[item.lane];
  const good = ["gem", "shield", "magnet", "boots", "skateboard", "rail"].includes(item.kind);
  return <group position={[x, item.kind === "tunnel" || item.kind === "swing" ? 0 : good ? 1.25 : 0.55, item.z]}>
    {item.kind !== "rail" && <mesh rotation={[Math.PI/2,0,0]} position={[0,-.45,0]}><torusGeometry args={[.82,.07,10,36]}/><meshStandardMaterial color={good ? "#ffd93d" : "#ff3434"} emissive={good ? "#ffb300" : "#d81717"} emissiveIntensity={.75}/></mesh>}
    {item.kind === "gem" && <mesh rotation={[0.4,0.7,0]}><octahedronGeometry args={[.58,0]}/><meshStandardMaterial color="#ffe45f" emissive="#ff9d00" emissiveIntensity={.9}/></mesh>}
    {item.kind === "shield" && <><mesh><sphereGeometry args={[.62,20,16]}/><meshStandardMaterial color="#59d8ff" transparent opacity={.75} emissive="#2aaeff" emissiveIntensity={.85}/></mesh><Text position={[0,0,.65]} fontSize={.25} color="#fff">SHIELD</Text></>}
    {item.kind === "magnet" && <><mesh rotation={[0,0,Math.PI/2]}><torusGeometry args={[.52,.17,12,30,Math.PI*1.45]}/><meshStandardMaterial color="#ff4f6d" emissive="#c81e48" emissiveIntensity={.75}/></mesh><Text position={[0,.95,0]} fontSize={.25} color="#fff">MAGNET</Text></>}
    {item.kind === "boots" && <><mesh><boxGeometry args={[.9,.5,.55]}/><meshStandardMaterial color="#5cf08c" emissive="#26a95b" emissiveIntensity={.6}/></mesh><Text position={[0,.95,0]} fontSize={.25} color="#fff">BOOTS</Text></>}
    {item.kind === "skateboard" && <group rotation={[0,0,0]}><mesh rotation={[0,Math.PI/2,0]}><boxGeometry args={[.48,.14,1.55]}/><meshStandardMaterial color="#31dfd0" emissive="#158fa7" emissiveIntensity={.55}/></mesh>{[-.52,.52].map(z=><mesh key={z} position={[0,-.16,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.1,.1,.42,10]}/><meshStandardMaterial color="#24384a"/></mesh>)}</group>}
    {item.kind === "cone" && <mesh><coneGeometry args={[.58,1.2,16]}/><meshStandardMaterial color="#ff7a32"/></mesh>}
    {item.kind === "bag" && <group><mesh><boxGeometry args={[1.1,.9,.65]}/><meshStandardMaterial color="#7d4cb5"/></mesh><mesh position={[0,.55,0]}><torusGeometry args={[.33,.08,8,18,Math.PI]}/><meshStandardMaterial color="#4e2c75"/></mesh></group>}
    {item.kind === "hurdle" && <group><mesh position={[0,.6,0]}><boxGeometry args={[1.7,.14,.18]}/><meshStandardMaterial color="#f5f5ef"/></mesh>{[-.72,.72].map(v=><mesh key={v} position={[v,.25,0]}><boxGeometry args={[.12,.75,.12]}/><meshStandardMaterial color="#eb6a2f"/></mesh>)}</group>}
    {item.kind === "tunnel" && <group><mesh position={[-1.2,1.3,0]}><boxGeometry args={[.25,2.6,.5]}/><meshStandardMaterial color="#467aa5"/></mesh><mesh position={[1.2,1.3,0]}><boxGeometry args={[.25,2.6,.5]}/><meshStandardMaterial color="#467aa5"/></mesh><mesh position={[0,2.45,0]}><boxGeometry args={[2.65,.28,.5]}/><meshStandardMaterial color="#f0bd42"/></mesh><Text position={[0,3,0]} fontSize={.28} color="#fff">SLIDE</Text></group>}
    {item.kind === "swing" && <group><mesh position={[-1.15,1.6,0]}><boxGeometry args={[.18,3.2,.3]}/><meshStandardMaterial color="#4d78a5"/></mesh><mesh position={[1.15,1.6,0]}><boxGeometry args={[.18,3.2,.3]}/><meshStandardMaterial color="#4d78a5"/></mesh><mesh position={[0,3.1,0]}><boxGeometry args={[2.5,.18,.3]}/><meshStandardMaterial color="#f0bd42"/></mesh><mesh position={[0,1.35,0]}><boxGeometry args={[1.45,.22,.5]}/><meshStandardMaterial color="#d34f4f"/></mesh><Text position={[0,3.55,0]} fontSize={.28} color="#fff">SLIDE</Text></group>}
    {item.kind === "rail" && <group position={[0,.05,-5]}><mesh position={[0,.62,0]}><boxGeometry args={[.18,.18,14]}/><meshStandardMaterial color="#dce3e8" metalness={.85}/></mesh>{[-6,-3,0,3,6].map(z=><mesh key={z} position={[0,.3,z]}><boxGeometry args={[.12,.62,.12]}/><meshStandardMaterial color="#6f7b84"/></mesh>)}</group>}
  </group>;
}

function World({ hero, lane, action, skating, shield, encounters, speed }: { hero: HeroId; lane: Lane; action: Action; skating: boolean; shield: boolean; encounters: Encounter[]; speed: number }) {
  return <>
    <CameraRig lane={lane} action={action} boots={speed > 11} />
    <color attach="background" args={["#86d5ef"]} /><fog attach="fog" args={["#d7edf2", 28, 105]} />
    <ambientLight intensity={1.2}/><directionalLight position={[8,14,7]} intensity={2.35} castShadow/><hemisphereLight color="#e4f8ff" groundColor="#3e6846" intensity={.75}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,-44]}><planeGeometry args={[38,160]}/><meshStandardMaterial color="#3e774c"/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,-44]}><planeGeometry args={[14.5,160]}/><meshStandardMaterial color="#51636e" roughness={.98}/></mesh>
    {[-2.45,2.45].map(x=>Array.from({length:36},(_,i)=><mesh key={`${x}-${i}`} position={[x,.03,-i*4.4]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.1,1.5]}/><meshStandardMaterial color="#f5efe0"/></mesh>))}
    {Array.from({length:15},(_,i)=><MovingScenery key={`lt${i}`} x={-13-(i%2)*1.3} z={-i*9.4-5} kind="tree" speed={speed*.9}/>)}
    {Array.from({length:15},(_,i)=><MovingScenery key={`rt${i}`} x={13+(i%2)*1.3} z={-i*9.4-9} kind="tree" speed={speed*.9}/>)}
    <MovingScenery x={-15} z={-38} kind="building" speed={speed*.72}/><MovingScenery x={15} z={-82} kind="building" speed={speed*.72}/>
    <MovingScenery x={-13} z={-56} kind="fence" speed={speed}/><MovingScenery x={13} z={-42} kind="hoop" speed={speed*.88}/>
    <MovingScenery x={-13.5} z={-92} kind="shade" speed={speed*.8}/><MovingScenery x={13.5} z={-106} kind="play" speed={speed*.8}/>
    <HeroSprite hero={hero} lane={lane} action={action} skating={skating} shield={shield}/>
    {encounters.map(item=><EncounterMesh key={item.id} item={item}/>)}
  </>;
}

export function V3Game() {
  const [hero, setHero] = useState<HeroId>("peter");
  const [started, setStarted] = useState(false);
  const [lane, setLane] = useState<Lane>(0);
  const laneRef = useRef<Lane>(0);
  const [action, setAction] = useState<Action>("run");
  const actionRef = useRef<Action>("run");
  const [encounters, setEncounters] = useState<Encounter[]>(() => makeEncounters());
  const [seed, setSeed] = useState(1);
  const [score, setScore] = useState(0);
  const [gems, setGems] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [shield, setShield] = useState(false);
  const [magnetUntil, setMagnetUntil] = useState(0);
  const [bootsUntil, setBootsUntil] = useState(0);
  const [skating, setSkating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const gesture = useRef<{x:number;y:number}|null>(null);
  const feedbackTimer = useRef<number | null>(null);

  useEffect(()=>{laneRef.current=lane},[lane]);
  useEffect(()=>{actionRef.current=action},[action]);
  const now = performance.now();
  const boots = bootsUntil > now;
  const magnet = magnetUntil > now;
  const speed = boots ? 12.4 : skating ? 11.2 : 9.7;

  const say = useCallback((text:string)=>{
    setFeedback(text);
    if(feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current=window.setTimeout(()=>setFeedback(""),1000);
  },[]);
  const burst = useCallback((text:string,laneValue:Lane)=>{
    const id=Date.now()+Math.random();
    setBursts(v=>[...v,{id,x:50+laneValue*22,y:55,text}]);
    window.setTimeout(()=>setBursts(v=>v.filter(b=>b.id!==id)),700);
  },[]);

  const reset = useCallback(()=>{
    setLane(0);laneRef.current=0;setAction("run");actionRef.current="run";setEncounters(makeEncounters());setSeed(1);setScore(0);setGems(0);setHearts(3);setShield(false);setMagnetUntil(0);setBootsUntil(0);setSkating(false);setFeedback("");setBursts([]);setGameOver(false);
  },[]);

  useEffect(()=>{
    if(!started||gameOver)return;
    let raf=0;let prev=performance.now();
    const tick=(time:number)=>{
      const dt=Math.min(.04,(time-prev)/1000);prev=time;
      setEncounters(list=>{
        const moved=list.map(item=>({...item,z:item.z+dt*speed}));
        const handled=moved.map(item=>{
          if(item.hit)return item;
          const laneMatch=item.lane===laneRef.current;
          const near=item.z>=3.6&&item.z<=5.7;
          const magnetic=magnetUntil>time&&item.kind==="gem"&&Math.abs(item.z-4.7)<8;
          if(!near&&!magnetic)return item;
          if(!laneMatch&&!magnetic)return item;
          const current=actionRef.current;
          const good=["gem","shield","magnet","boots","skateboard","rail"].includes(item.kind);
          if(good){
            if(item.kind==="gem"){setGems(v=>v+1);setScore(v=>v+10);burst("+10",item.lane);}
            if(item.kind==="shield"){setShield(true);setScore(v=>v+25);say("Shield ready");burst("SHIELD",item.lane);}
            if(item.kind==="magnet"){setMagnetUntil(time+10000);setScore(v=>v+25);say("Gem magnet 10s");burst("MAGNET",item.lane);}
            if(item.kind==="boots"){setBootsUntil(time+10000);setScore(v=>v+25);say("Super boots 10s");burst("BOOST",item.lane);}
            if(item.kind==="skateboard"){setSkating(true);setScore(v=>v+30);say("Skateboard unlocked");burst("SKATE",item.lane);}
            if(item.kind==="rail"&&skating){setAction("grind");actionRef.current="grind";setScore(v=>v+50);say("Rail grind +50");burst("GRIND",item.lane);window.setTimeout(()=>{setAction("run");actionRef.current="run";},1100);}
            return{...item,hit:true};
          }
          const jumped=(item.kind==="cone"||item.kind==="bag"||item.kind==="hurdle")&&current==="jump";
          const slid=(item.kind==="tunnel"||item.kind==="swing")&&current==="slide";
          const smashed=skating&&(item.kind==="cone"||item.kind==="bag");
          if(jumped||slid||smashed){setScore(v=>v+8);burst("+8",item.lane);return{...item,hit:true};}
          if(shield){setShield(false);say("Shield saved you");burst("SHIELD",item.lane);return{...item,hit:true};}
          setHearts(h=>{const next=Math.max(0,h-1);if(next===0){setGameOver(true);setStarted(false);}return next;});say("Careful — heart lost");return{...item,hit:true};
        });
        const alive=handled.filter(i=>i.z<10);
        if(alive.length<8){const extra=makeEncounters(seed).map((i,index)=>({...i,z:-55-index*7.5}));setSeed(v=>v+1);return[...alive,...extra];}
        return alive;
      });
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
  },[started,gameOver,speed,seed,shield,skating,magnetUntil,burst,say]);

  const move=(d:-1|1)=>{if(!started)return;setLane(v=>Math.max(-1,Math.min(1,v+d)) as Lane)};
  const doAction=(next:"jump"|"slide")=>{if(!started||action!=="run")return;setAction(next);actionRef.current=next;window.setTimeout(()=>{setAction("run");actionRef.current="run";},next==="jump"?760:680)};
  const down=(e:PointerEvent<HTMLDivElement>)=>{if(started)gesture.current={x:e.clientX,y:e.clientY}};
  const up=(e:PointerEvent<HTMLDivElement>)=>{const s=gesture.current;gesture.current=null;if(!s)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>36&&Math.abs(dx)>Math.abs(dy)*.7)move(dx>0?1:-1);else if(dy<-30)doAction("jump");else if(dy>30)doAction("slide");};

  const powerLabel = shield ? "Shield" : magnet ? "Magnet" : boots ? "Super Boots" : skating ? "Skateboard" : "Run";
  return <main className="v3-game">
    <header className="v3-hud"><div><small>SUPER ZOOS ADVENTURE V3.0</small><h1>School Hero Run</h1></div><div className="v3-stats"><b>{[0,1,2].map(i=><i key={i} className={i<hearts?"on":""}>♥</i>)}</b><b>Gems {gems}</b><b>Score {score}</b><b>{powerLabel}</b></div></header>
    <section className="v3-stage" onPointerDown={down} onPointerUp={up} onPointerCancel={()=>gesture.current=null}>
      <Canvas shadows dpr={[1,1.5]} camera={{position:[0,4.8,12.2],fov:44}}><World hero={hero} lane={lane} action={action} skating={skating} shield={shield} encounters={encounters} speed={speed}/></Canvas>
      {feedback&&<div className="v3-feedback">{feedback}</div>}
      {bursts.map(b=><div key={b.id} className="v3-burst" style={{left:`${b.x}%`,top:`${b.y}%`}}>{b.text}</div>)}
      {!started&&!gameOver&&<div className="v3-menu"><div className="v3-panel"><small>CHOOSE YOUR HERO</small><h2>School Hero Run</h2><p>Swipe or use the buttons. Jump over low obstacles, slide under tunnels and swings, collect real power-ups, unlock the skateboard and grind rails.</p><div className="v3-cards">{(Object.keys(HEROES) as HeroId[]).map(id=><button key={id} className={hero===id?"selected":""} onClick={()=>setHero(id)}><img src={HEROES[id].card} alt={HEROES[id].name}/><strong>{HEROES[id].name}</strong><span>{HEROES[id].tagline}</span></button>)}</div><button className="v3-start" onClick={()=>{reset();setStarted(true)}}>Start Adventure</button></div></div>}
      {gameOver&&<div className="v3-menu"><div className="v3-panel"><small>GREAT TRY</small><h2>{HEROES[hero].name} is ready again</h2><p>Score {score} • Gems {gems}</p><button className="v3-start" onClick={()=>{reset();setStarted(true)}}>Try Again</button><button className="v3-secondary" onClick={()=>{reset();setStarted(false)}}>Choose Hero</button></div></div>}
      {started&&<div className="v3-guide"><span>GOLD / BLUE = COLLECT</span><span>RED = JUMP / SLIDE / DODGE</span></div>}
    </section>
    <nav className="v3-controls"><button onClick={()=>move(-1)} disabled={!started}>Left</button><button onClick={()=>move(1)} disabled={!started}>Right</button><button className="jump" onClick={()=>doAction("jump")} disabled={!started}>Jump</button><button className="slide" onClick={()=>doAction("slide")} disabled={!started}>Slide</button><button className="restart" onClick={()=>{reset();setStarted(true)}}>Restart</button></nav>
  </main>;
}
