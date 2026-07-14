import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Group, Vector3 } from "three";
import "./v34Game.css";

type Lane = -1 | 0 | 1;
type HeroId = "peter" | "judy";
type Phase = "ground" | "launch" | "flight" | "landing";
type Action = "run" | "jump" | "slide" | "grind";
type Kind = "gem" | "shield" | "magnet" | "boots" | "super" | "skateboard" | "cone" | "bag" | "hurdle" | "bench" | "ball" | "tunnel" | "swing" | "branch" | "rail" | "hill" | "ramp" | "bin" | "books" | "puddle";
type Item = { id:number; kind:Kind; lane:Lane; z:number; hit:boolean };
type Ring = { id:number; lane:Lane; z:number; hit:boolean };
type Burst = { id:number; lane:Lane; text:string; tone:"good"|"bad"|"power" };

const LX: Record<Lane, number> = {[-1]:-2.7,[0]:0,[1]:2.7};
const GOOD = new Set<Kind>(["gem","shield","magnet","boots","super","skateboard","rail","hill","ramp"]);
const LOW = new Set<Kind>(["cone","bag","hurdle","bench","ball","bin","books","puddle"]);
const OVER = new Set<Kind>(["tunnel","swing","branch"]);

const PATTERNS: Array<Array<[Kind,Lane,number]>> = [
  [["gem",-1,0],["gem",0,-2.6],["gem",1,-5.2],["gem",0,-7.8]],
  [["cone",-1,0],["gem",0,0],["bag",1,0]],
  [["shield",0,0],["gem",-1,-3],["gem",1,-6]],
  [["hurdle",0,0],["gem",0,-3.2],["gem",0,-6.4]],
  [["magnet",-1,0],["gem",0,-2.5],["gem",1,-5],["gem",-1,-7.5]],
  [["tunnel",0,0],["gem",0,-6]],
  [["boots",1,0],["hill",0,-6],["gem",0,-10]],
  [["skateboard",-1,0],["rail",0,-10]],
  [["swing",1,0],["gem",0,0],["bench",-1,0]],
  [["super",0,0]],
  [["bin",-1,0],["books",0,0],["puddle",1,0]],
  [["ramp",1,0],["gem",1,-5],["gem",1,-8]],
  [["branch",-1,0],["ball",0,0],["gem",1,0]],
];

function buildItems(seed=0): Item[] {
  const out: Item[] = [];
  let cursor = -20;
  for (let p=0;p<10;p++) {
    const pattern = PATTERNS[(p+seed)%PATTERNS.length];
    pattern.forEach(([kind,lane,offset],i)=>out.push({id:seed*10000+p*100+i,kind,lane,z:cursor+offset,hit:false}));
    cursor -= pattern.some(v=>v[0]==="tunnel"||v[0]==="rail") ? 18 : 12;
  }
  return out;
}
const ringLanes: Lane[]=[-1,0,1,0,-1,1,0,1,-1,0,1,0,-1,1,0,-1,0,1,1,0,-1,0,1,0];
const buildRings=():Ring[]=>ringLanes.map((lane,id)=>({id,lane,z:-7-id*3.2,hit:false}));

function CameraRig({lane,phase,action}:{lane:Lane;phase:Phase;action:Action}){
  const {camera}=useThree(); const p=useRef(new Vector3()), look=useRef(new Vector3());
  useFrame((_,dt)=>{const air=phase!=="ground"; const lift=action==="jump"?.5:0; p.current.set(-lane*.08,air?6.25:5+lift,air?13.5:12.8); camera.position.lerp(p.current,Math.min(1,dt*7)); look.current.set(0,air?3.1:1.45,-15); camera.lookAt(look.current);});
  return null;
}

function PeterModel({superMode}:{superMode:boolean}){
  return <group>
    <mesh position={[0,.3,0]}><sphereGeometry args={[.78,24,18]}/><meshStandardMaterial color={superMode?"#2e67d7":"#9ca5ab"}/></mesh>
    <mesh position={[0,1.12,0]}><sphereGeometry args={[.7,24,18]}/><meshStandardMaterial color="#a8b0b5"/></mesh>
    <mesh position={[-.68,1.16,0]} rotation={[0,0,.25]}><sphereGeometry args={[.43,18,14]}/><meshStandardMaterial color="#ef9fb5"/></mesh>
    <mesh position={[.68,1.16,0]} rotation={[0,0,-.25]}><sphereGeometry args={[.43,18,14]}/><meshStandardMaterial color="#ef9fb5"/></mesh>
    <mesh position={[0,.72,.5]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.14,.2,.78,12]}/><meshStandardMaterial color="#a8b0b5"/></mesh>
    <mesh position={[-.3,-.42,0]}><capsuleGeometry args={[.18,.58,6,10]}/><meshStandardMaterial color={superMode?"#1f4fae":"#3f6fa8"}/></mesh>
    <mesh position={[.3,-.42,0]}><capsuleGeometry args={[.18,.58,6,10]}/><meshStandardMaterial color={superMode?"#1f4fae":"#3f6fa8"}/></mesh>
    {superMode&&<mesh position={[0,.35,-.35]} rotation={[.15,0,0]}><coneGeometry args={[.8,1.5,4]}/><meshStandardMaterial color="#ee3657"/></mesh>}
  </group>
}
function JudyModel({superMode}:{superMode:boolean}){
  return <group>
    <mesh position={[0,.25,0]}><sphereGeometry args={[.7,24,18]}/><meshStandardMaterial color={superMode?"#ef4ea0":"#ef9fc9"}/></mesh>
    <mesh position={[0,1.05,0]}><sphereGeometry args={[.62,24,18]}/><meshStandardMaterial color="#f2afd2"/></mesh>
    {[-.28,.28].map(x=><mesh key={x} position={[x,1.95,0]}><capsuleGeometry args={[.16,.75,6,10]}/><meshStandardMaterial color="#f2afd2"/></mesh>)}
    <mesh position={[-.26,-.42,0]}><capsuleGeometry args={[.16,.58,6,10]}/><meshStandardMaterial color={superMode?"#d22f84":"#bf70a1"}/></mesh>
    <mesh position={[.26,-.42,0]}><capsuleGeometry args={[.16,.58,6,10]}/><meshStandardMaterial color={superMode?"#d22f84":"#bf70a1"}/></mesh>
    {superMode&&<mesh position={[0,.25,-.32]} rotation={[.15,0,0]}><coneGeometry args={[.75,1.4,4]}/><meshStandardMaterial color="#ffd24d"/></mesh>}
  </group>
}
function Hero({hero,lane,phase,action,boots,shield,magnet,skating,invulnerable}:{hero:HeroId;lane:Lane;phase:Phase;action:Action;boots:boolean;shield:boolean;magnet:boolean;skating:boolean;invulnerable:boolean}){
  const ref=useRef<Group>(null); const superMode=phase!=="ground";
  useFrame(({clock})=>{if(!ref.current)return; const t=clock.elapsedTime; ref.current.rotation.z=phase==="flight"?Math.sin(t*2)*.08:0; ref.current.position.y=action==="run"?Math.abs(Math.sin(t*(boots?13:10)))*.07:0;});
  const y=phase==="flight"?4.35:phase==="launch"?3.3:phase==="landing"?2.7:action==="jump"?(boots?4.45:3.45):action==="slide"?1.2:action==="grind"?2.25:2.1;
  return <group position={[LX[lane],y,4.95]} visible={!invulnerable || Math.floor(performance.now()/100)%2===0}><group ref={ref} scale={[1.05,1.05,1.05]}>{hero==="peter"?<PeterModel superMode={superMode}/>:<JudyModel superMode={superMode}/>}</group>
    {shield&&<mesh position={[0,.6,0]}><sphereGeometry args={[1.55,24,18]}/><meshStandardMaterial color="#4fd9ff" transparent opacity={.22} emissive="#20a9ff" emissiveIntensity={1}/></mesh>}
    {magnet&&<mesh position={[0,.6,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[1.6,.06,10,44,Math.PI*1.65]}/><meshStandardMaterial color="#ff4d7b" emissive="#ff174c" emissiveIntensity={1.2}/></mesh>}
    {boots&&phase==="ground"&&<><mesh position={[-.32,-.82,.05]}><boxGeometry args={[.4,.24,.58]}/><meshStandardMaterial color="#62f58b" emissive="#22c95b" emissiveIntensity={1.3}/></mesh><mesh position={[.32,-.82,.05]}><boxGeometry args={[.4,.24,.58]}/><meshStandardMaterial color="#62f58b" emissive="#22c95b" emissiveIntensity={1.3}/></mesh></>}
    {skating&&phase==="ground"&&<group position={[0,-.95,0]}><mesh><boxGeometry args={[.55,.13,1.9]}/><meshStandardMaterial color="#31dfd0" emissive="#138ea7" emissiveIntensity={.6}/></mesh></group>}
  </group>
}

function ItemView({item}:{item:Item}){if(item.hit)return null; const good=GOOD.has(item.kind), over=OVER.has(item.kind), x=LX[item.lane]; const label = item.kind==="gem"?"COLLECT":item.kind==="shield"?"SHIELD":item.kind==="magnet"?"MAGNET":item.kind==="boots"?"BIG JUMP":item.kind==="super"?"SUPER FLY":item.kind==="skateboard"?"SKATE":item.kind==="rail"?"JUMP ON":over?"SLIDE":item.kind==="hill"||item.kind==="ramp"?"JUMP":"DODGE / JUMP";
  return <group position={[x,over?0:good?1.3:.6,item.z]}>
    {item.kind!=="rail"&&<mesh rotation={[Math.PI/2,0,0]} position={[0,-.48,0]}><torusGeometry args={[.95,.11,12,40]}/><meshStandardMaterial color={good?"#ffd629":"#ff3030"} emissive={good?"#ff9b00":"#bd0000"} emissiveIntensity={1.1}/></mesh>}
    <Text position={[0,good?1.18:1.65,0]} fontSize={.28} color="#fff" outlineWidth={.05} outlineColor={good?"#6b4a00":"#7a0000"}>{label}</Text>
    {item.kind==="gem"&&<mesh><octahedronGeometry args={[.68,0]}/><meshStandardMaterial color="#ffe95b" emissive="#ff9d00" emissiveIntensity={1.1}/></mesh>}
    {item.kind==="shield"&&<mesh><sphereGeometry args={[.72,20,16]}/><meshStandardMaterial color="#59d8ff" transparent opacity={.8} emissive="#2aaeff" emissiveIntensity={1}/></mesh>}
    {item.kind==="magnet"&&<mesh rotation={[0,0,Math.PI/2]}><torusGeometry args={[.58,.2,12,32,Math.PI*1.5]}/><meshStandardMaterial color="#ff4f6d" emissive="#c81e48" emissiveIntensity={1}/></mesh>}
    {item.kind==="boots"&&<group>{[-.28,.28].map(x=><mesh key={x} position={[x,0,0]}><boxGeometry args={[.42,.5,.62]}/><meshStandardMaterial color="#5cf08c" emissive="#26a95b" emissiveIntensity={1}/></mesh>)}</group>}
    {item.kind==="super"&&<mesh><dodecahedronGeometry args={[.82,0]}/><meshStandardMaterial color="#ffd83b" emissive="#ff6f00" emissiveIntensity={1.5}/></mesh>}
    {item.kind==="skateboard"&&<mesh><boxGeometry args={[.55,.15,1.9]}/><meshStandardMaterial color="#31dfd0" emissive="#158fa7" emissiveIntensity={.75}/></mesh>}
    {item.kind==="rail"&&<group position={[0,.05,-8]}><mesh position={[0,.68,0]}><boxGeometry args={[.2,.2,28]}/><meshStandardMaterial color="#e2e8ec" metalness={.9}/></mesh>{[-13,-9,-5,-1,3,7,11,13].map(z=><mesh key={z} position={[0,.32,z]}><boxGeometry args={[.13,.68,.13]}/><meshStandardMaterial color="#697781"/></mesh>)}</group>}
    {(item.kind==="hill"||item.kind==="ramp")&&<mesh rotation={[-.28,0,0]}><boxGeometry args={[2.5,.7,item.kind==="hill"?7:5]}/><meshStandardMaterial color={item.kind==="hill"?"#6f965b":"#c38c53"}/></mesh>}
    {item.kind==="tunnel"&&<group><mesh position={[-1.45,1.55,0]}><boxGeometry args={[.32,3.1,7.5]}/><meshStandardMaterial color="#416f9b"/></mesh><mesh position={[1.45,1.55,0]}><boxGeometry args={[.32,3.1,7.5]}/><meshStandardMaterial color="#416f9b"/></mesh><mesh position={[0,2.95,0]}><boxGeometry args={[3.2,.32,7.5]}/><meshStandardMaterial color="#f0bd42"/></mesh></group>}
    {item.kind==="swing"&&<mesh position={[0,1.35,0]}><boxGeometry args={[2.7,.25,.6]}/><meshStandardMaterial color="#d34f4f"/></mesh>}
    {item.kind==="branch"&&<mesh position={[0,1.55,0]} rotation={[0,0,.08]}><cylinderGeometry args={[.2,.3,2.9,10]}/><meshStandardMaterial color="#795033"/></mesh>}
    {LOW.has(item.kind)&&<mesh><boxGeometry args={[1.3,.95,.75]}/><meshStandardMaterial color={item.kind==="puddle"?"#267ac2":item.kind==="bin"?"#356d4d":"#d65a38"}/></mesh>}
  </group>;
}
function Scenery({x,z,kind,speed}:{x:number;z:number;kind:"tree"|"building"|"fence"|"hoop"|"play"|"shade"|"goals"|"canteen";speed:number}){const ref=useRef<Group>(null);useFrame((_,dt)=>{if(!ref.current)return;ref.current.position.z+=dt*speed;if(ref.current.position.z>24)ref.current.position.z-=185});return <group ref={ref} position={[x,0,z]}>{kind==="tree"&&<><mesh position={[0,1.3,0]}><cylinderGeometry args={[.2,.34,2.7,10]}/><meshStandardMaterial color="#76513a"/></mesh><mesh position={[0,3,0]}><sphereGeometry args={[1.2,14,12]}/><meshStandardMaterial color="#3f8152"/></mesh></>}{kind==="building"&&<mesh position={[0,1.6,0]}><boxGeometry args={[8,3.2,3.2]}/><meshStandardMaterial color="#d5a05e"/></mesh>}{kind==="canteen"&&<mesh position={[0,1.4,0]}><boxGeometry args={[8.6,2.8,3.4]}/><meshStandardMaterial color="#dfb268"/></mesh>}{kind==="fence"&&<mesh position={[0,.8,0]}><boxGeometry args={[6,.12,.12]}/><meshStandardMaterial color="#eee8d8"/></mesh>}{kind==="hoop"&&<><mesh position={[0,1.8,0]}><cylinderGeometry args={[.08,.08,3.6,8]}/><meshStandardMaterial color="#657078"/></mesh><mesh position={[0,3.35,.25]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.5,.07,10,24]}/><meshStandardMaterial color="#eb5a2c"/></mesh></>}{kind==="play"&&<mesh position={[0,1.1,0]} rotation={[.45,0,0]}><boxGeometry args={[3.4,.2,4]}/><meshStandardMaterial color="#f0bd42"/></mesh>}{kind==="shade"&&<mesh position={[0,2.7,0]}><boxGeometry args={[5.5,.12,3.9]}/><meshStandardMaterial color="#f08a3f"/></mesh>}{kind==="goals"&&<mesh position={[0,1.3,0]}><boxGeometry args={[4.2,.12,.12]}/><meshStandardMaterial color="#f5f5ef"/></mesh>}</group>}
function World(props:{hero:HeroId;lane:Lane;phase:Phase;action:Action;boots:boolean;shield:boolean;magnet:boolean;skating:boolean;invulnerable:boolean;items:Item[];rings:Ring[];speed:number}){return <><CameraRig lane={props.lane} phase={props.phase} action={props.action}/><color attach="background" args={[props.phase==="flight"?"#58c8ff":"#8bd8ef"]}/><fog attach="fog" args={[props.phase==="flight"?"#d3f3ff":"#d7edf2",30,120]}/><ambientLight intensity={1.25}/><directionalLight position={[8,14,7]} intensity={2.4}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,-48]}><planeGeometry args={[42,180]}/><meshStandardMaterial color="#3e774c"/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,0,-48]}><planeGeometry args={[16.2,180]}/><meshStandardMaterial color="#536671"/></mesh>{Array.from({length:16},(_,i)=><Scenery key={`l${i}`} x={-13.5-(i%2)} z={-i*10-5} kind="tree" speed={props.speed*.9}/>)}{Array.from({length:16},(_,i)=><Scenery key={`r${i}`} x={13.5+(i%2)} z={-i*10-9} kind="tree" speed={props.speed*.9}/>)}<Scenery x={-15} z={-36} kind="building" speed={props.speed*.7}/><Scenery x={15} z={-70} kind="canteen" speed={props.speed*.72}/><Scenery x={-13} z={-58} kind="fence" speed={props.speed}/><Scenery x={13} z={-42} kind="hoop" speed={props.speed*.85}/><Scenery x={-14} z={-98} kind="shade" speed={props.speed*.78}/><Scenery x={14} z={-112} kind="play" speed={props.speed*.8}/><Scenery x={-14} z={-138} kind="goals" speed={props.speed*.8}/><Hero hero={props.hero} lane={props.lane} phase={props.phase} action={props.action} boots={props.boots} shield={props.shield} magnet={props.magnet} skating={props.skating} invulnerable={props.invulnerable}/>{props.phase==="ground"&&props.items.map(i=><ItemView key={i.id} item={i}/>)}{props.phase==="flight"&&props.rings.filter(r=>!r.hit).map(r=><group key={r.id} position={[LX[r.lane],4.2,r.z]}><mesh><torusGeometry args={[.62,.17,12,30]}/><meshStandardMaterial color="#ffdc38" emissive="#ff9700" emissiveIntensity={1.2}/></mesh></group>)}</>}

export function V34Game(){
  const [hero,setHero]=useState<HeroId>("peter"),[started,setStarted]=useState(false),[paused,setPaused]=useState(false),[lane,setLane]=useState<Lane>(0),[phase,setPhase]=useState<Phase>("ground"),[action,setAction]=useState<Action>("run"),[items,setItems]=useState<Item[]>(()=>buildItems()),[rings,setRings]=useState<Ring[]>(buildRings),[seed,setSeed]=useState(1),[score,setScore]=useState(0),[gems,setGems]=useState(0),[hearts,setHearts]=useState(3),[shield,setShield]=useState(false),[magnetUntil,setMagnetUntil]=useState(0),[bootsUntil,setBootsUntil]=useState(0),[skating,setSkating]=useState(false),[feedback,setFeedback]=useState(""),[bursts,setBursts]=useState<Burst[]>([]),[gameOver,setGameOver]=useState(false),[clock,setClock]=useState(performance.now()),[phaseUntil,setPhaseUntil]=useState(0),[invulnerableUntil,setInvulnerableUntil]=useState(0);
  const laneRef=useRef<Lane>(0),actionRef=useRef<Action>("run"),gesture=useRef<{x:number;y:number}|null>(null),timer=useRef<number|null>(null);
  useEffect(()=>{laneRef.current=lane},[lane]); useEffect(()=>{actionRef.current=action},[action]);
  useEffect(()=>{if(!started||paused||gameOver)return;const id=setInterval(()=>setClock(performance.now()),100);return()=>clearInterval(id)},[started,paused,gameOver]);
  const boots=bootsUntil>clock,magnet=magnetUntil>clock,invulnerable=invulnerableUntil>clock; const speed=phase==="flight"?13.5:boots?12.8:skating?11.3:9.8;
  const say=useCallback((s:string)=>{setFeedback(s);window.setTimeout(()=>setFeedback(""),1100)},[]);
  const burst=useCallback((text:string,l:Lane,tone:Burst["tone"]="good")=>{const id=Date.now()+Math.random();setBursts(v=>[...v,{id,lane:l,text,tone}]);window.setTimeout(()=>setBursts(v=>v.filter(b=>b.id!==id)),750)},[]);
  const reset=useCallback(()=>{setLane(0);laneRef.current=0;setPhase("ground");setAction("run");actionRef.current="run";setItems(buildItems());setRings(buildRings());setSeed(1);setScore(0);setGems(0);setHearts(3);setShield(false);setMagnetUntil(0);setBootsUntil(0);setSkating(false);setFeedback("");setBursts([]);setGameOver(false);setPaused(false);setPhaseUntil(0);setInvulnerableUntil(0);setClock(performance.now())},[]);
  useEffect(()=>{if(!started||paused||gameOver)return;let raf=0,prev=performance.now();const tick=(time:number)=>{const dt=Math.min(.04,(time-prev)/1000);prev=time;
    if(phase==="launch"&&time>=phaseUntil){setPhase("flight");setPhaseUntil(time+7000);setRings(buildRings());say("SUPER FLIGHT — collect the rings!")}
    else if(phase==="flight"&&time>=phaseUntil){setPhase("landing");setPhaseUntil(time+900);say("Safe landing")}
    else if(phase==="landing"&&time>=phaseUntil){setPhase("ground");setItems(buildItems(seed));setSeed(v=>v+1)}
    if(phase==="flight") setRings(list=>list.map(r=>({...r,z:r.z+dt*speed})).map(r=>{if(r.hit)return r;const near=r.z>3.8&&r.z<6.2;if(near&&r.lane===laneRef.current){setGems(v=>v+1);setScore(v=>v+15);burst("RING +15",r.lane,"power");return{...r,hit:true}}return r}));
    if(phase==="ground") setItems(list=>{const moved=list.map(i=>({...i,z:i.z+dt*speed}));const handled=moved.map(i=>{if(i.hit)return i;const near=i.z>3.8&&i.z<6.1;const magnetic=magnetUntil>time&&i.kind==="gem"&&Math.abs(i.z-4.9)<10; if((!near&&!magnetic)||(!magnetic&&i.lane!==laneRef.current))return i;
      if(GOOD.has(i.kind)){
        if(i.kind==="rail"){if(skating&&actionRef.current==="jump"){setAction("grind");actionRef.current="grind";setScore(v=>v+75);burst("GRIND +75",i.lane,"power");if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{setAction("run");actionRef.current="run"},1900);return{...i,hit:true}}return i}
        if(i.kind==="gem"){setGems(v=>v+1);setScore(v=>v+10);burst("+10",i.lane)}
        if(i.kind==="shield"){setShield(true);setScore(v=>v+25);say("Shield protects one hit");burst("SHIELD",i.lane,"power")}
        if(i.kind==="magnet"){setMagnetUntil(time+12000);setScore(v=>v+25);say("Magnet pulls gems for 12 seconds");burst("MAGNET",i.lane,"power")}
        if(i.kind==="boots"){setBootsUntil(time+12000);setScore(v=>v+25);say("Big Jump Boots active");burst("BIG JUMP",i.lane,"power")}
        if(i.kind==="skateboard"){setSkating(true);setScore(v=>v+30);say("Skateboard active — smash small obstacles and grind rails");burst("SKATE",i.lane,"power")}
        if(i.kind==="super"){setPhase("launch");setPhaseUntil(time+750);setScore(v=>v+50);say("SUPER HERO TRANSFORMATION!");burst("SUPER FLY",i.lane,"power")}
        if(i.kind==="hill"||i.kind==="ramp"){setAction("jump");actionRef.current="jump";setScore(v=>v+20);burst("AIR +20",i.lane,"power");if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{setAction("run");actionRef.current="run"},boots?1100:850)}
        return{...i,hit:true};
      }
      const avoided=(LOW.has(i.kind)&&actionRef.current==="jump")||(OVER.has(i.kind)&&actionRef.current==="slide")||(skating&&(i.kind==="cone"||i.kind==="bag"||i.kind==="books"));
      if(avoided){setScore(v=>v+8);burst(skating?"SMASH":"+8",i.lane,"good");return{...i,hit:true}}
      if(invulnerableUntil>time)return{...i,hit:true};
      if(shield){setShield(false);setInvulnerableUntil(time+900);say("Shield saved you");burst("BLOCKED",i.lane,"power");return{...i,hit:true}}
      setInvulnerableUntil(time+1250);setHearts(h=>{const n=Math.max(0,h-1);if(n===0){setGameOver(true);setStarted(false)}return n});say("Careful — one heart lost");burst("OUCH",i.lane,"bad");return{...i,hit:true};
    });const alive=handled.filter(i=>i.z<12);if(alive.length<8){const extra=buildItems(seed).map((i,index)=>({...i,z:i.z-80-index*.3}));setSeed(v=>v+1);return[...alive,...extra]}return alive});
    raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[started,paused,gameOver,phase,phaseUntil,speed,seed,shield,skating,magnetUntil,invulnerableUntil,boots,burst,say]);
  const move=(d:-1|1)=>{if(started&&!paused)setLane(v=>Math.max(-1,Math.min(1,v+d)) as Lane)};
  const doAction=(next:"jump"|"slide")=>{if(!started||paused||phase!=="ground"||action!=="run")return;setAction(next);actionRef.current=next;if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{setAction("run");actionRef.current="run"},next==="jump"?(boots?1050:800):700)};
  const down=(e:PointerEvent<HTMLDivElement>)=>{if(started&&!paused)gesture.current={x:e.clientX,y:e.clientY}};const up=(e:PointerEvent<HTMLDivElement>)=>{const s=gesture.current;gesture.current=null;if(!s)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>36&&Math.abs(dx)>Math.abs(dy)*.7)move(dx>0?1:-1);else if(dy<-30)doAction("jump");else if(dy>30)doAction("slide")};
  const remaining=(until:number)=>Math.max(0,Math.ceil((until-clock)/1000));
  return <main className={`v34 phase-${phase}`}><header><div><small>SUPER ZOOS ADVENTURE V3.4</small><h1>School Hero Adventure</h1></div><div className="stats"><b>{[0,1,2].map(i=><i key={i} className={i<hearts?"on":""}>♥</i>)}</b><b>Gems {gems}</b><b>Score {score}</b>{boots&&<b className="power boots">Big Jump {remaining(bootsUntil)}s</b>}{magnet&&<b className="power magnet">Magnet {remaining(magnetUntil)}s</b>}{shield&&<b className="power shield">Shield</b>}{phase!=="ground"&&<b className="power fly">Super Flight</b>}<button onClick={()=>setPaused(v=>!v)} disabled={!started}>{paused?"Resume":"Pause"}</button></div></header><section className="stage" onPointerDown={down} onPointerUp={up}><Canvas shadows dpr={[1,1.5]} camera={{position:[0,5,12.8],fov:44}}><World hero={hero} lane={lane} phase={phase} action={action} boots={boots} shield={shield} magnet={magnet} skating={skating} invulnerable={invulnerable} items={items} rings={rings} speed={speed}/></Canvas>{feedback&&<div className="feedback">{feedback}</div>}{bursts.map(b=><div key={b.id} className={`burst ${b.tone}`} style={{left:`${50+b.lane*22}%`}}>{b.text}</div>)}{paused&&<div className="overlay"><div><small>GAME PAUSED</small><h2>Take a breather</h2><button onClick={()=>setPaused(false)}>Resume Adventure</button><button onClick={()=>{reset();setStarted(true)}}>Restart</button></div></div>}{!started&&!gameOver&&<div className="overlay"><div><small>CHOOSE YOUR HERO</small><h2>V3.4 School Hero Adventure</h2><p>Gold, blue and green rings are good. Red rings are danger. Jump low obstacles, slide under high obstacles, collect Super Fly and follow the sky rings.</p><div className="cards"><button className={hero==="peter"?"selected":""} onClick={()=>setHero("peter")}><span className="hero-icon peter">🐘</span><strong>Peter</strong></button><button className={hero==="judy"?"selected":""} onClick={()=>setHero("judy")}><span className="hero-icon judy">🐰</span><strong>Judy</strong></button></div><button className="start" onClick={()=>{reset();setStarted(true)}}>Start Adventure</button></div></div>}{gameOver&&<div className="overlay"><div><small>GREAT TRY</small><h2>Ready again?</h2><p>Score {score} • Gems {gems}</p><button onClick={()=>{reset();setStarted(true)}}>Try Again</button></div></div>}{started&&!paused&&<div className="legend"><span className="good">GOLD / BLUE / GREEN = COLLECT</span><span className="bad">RED = AVOID, JUMP OR SLIDE</span></div>}</section><nav><button onClick={()=>move(-1)} disabled={!started||paused}>Left</button><button onClick={()=>move(1)} disabled={!started||paused}>Right</button><button className="jump" onClick={()=>doAction("jump")} disabled={!started||paused}>Jump</button><button className="slide" onClick={()=>doAction("slide")} disabled={!started||paused}>Slide</button><button onClick={()=>setPaused(v=>!v)} disabled={!started}>{paused?"Resume":"Pause"}</button><button onClick={()=>{reset();setStarted(true)}}>Restart</button></nav></main>;
}
