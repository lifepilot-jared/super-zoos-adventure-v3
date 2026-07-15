import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { DebugPanel } from "./DebugPanel";
import { EncounterDirector } from "./engine/encounterDirector";
import type { DebugCommand, EncounterEntity, Lane, PlayerAction, SchoolZone } from "./engine/types";
import { WorldClock } from "./engine/worldClock";
import "./v36ClarityRoute.css";

const ASSET_ROOT = "https://raw.githubusercontent.com/lifepilot-jared/super-zoos-adventure-v2/main/public/images/characters/animation";
const RUN_FRAMES = [1, 2, 3, 4].map(frame => `${ASSET_ROOT}/peter-normal-run-0${frame}.png`);
const SUPER_FRAME = `${ASSET_ROOT}/peter-super-run-01.png`;
const LANE_LEFT: Record<Lane, number> = { [-1]: 23, [0]: 50, [1]: 77 };
const VISIBLE_FAR_Z = -82;
const VISIBLE_NEAR_Z = 10;

type Role = "gem" | "shield" | "boots" | "super" | "hazard" | "tunnel" | "hill";
type RouteEntity = EncounterEntity & { role: Role; label: string };

function make(id:string, kind:EncounterEntity["kind"], lane:Lane, z:number, group:string, role:Role, label:string):RouteEntity {
  return { id, kind, lane, z, collisionGroup:group, resolved:false, role, label };
}

function route(seed=0):RouteEntity[] {
  const p=`clear-${seed}`;
  return [
    make(`${p}-g1`,`pickup`,0,-50,`${p}-g1`,`gem`,`COLLECT`),
    make(`${p}-g2`,`pickup`,-1,-105,`${p}-g2`,`gem`,`COLLECT`),
    make(`${p}-shield`,`pickup`,1,-165,`${p}-shield`,`shield`,`SHIELD`),

    make(`${p}-gate1-left`,`hazard`,-1,-245,`${p}-gate1`,`hazard`,`DANGER`),
    make(`${p}-gate1-right`,`hazard`,1,-245,`${p}-gate1`,`hazard`,`DANGER`),

    make(`${p}-reward1`,`pickup`,0,-315,`${p}-reward1`,`gem`,`REWARD`),
    make(`${p}-boots`,`pickup`,-1,-385,`${p}-boots`,`boots`,`BIG JUMP`),

    make(`${p}-hill-left`,`traversal`,-1,-470,`${p}-hill`,`hill`,`HILL`),
    make(`${p}-hill-centre`,`traversal`,0,-470,`${p}-hill`,`hill`,`HILL`),

    make(`${p}-reward2`,`pickup`,1,-545,`${p}-reward2`,`gem`,`FLAT REWARD`),
    make(`${p}-tunnel`,`hazard`,0,-625,`${p}-tunnel`,`tunnel`,`SLIDE OR MOVE`),
    make(`${p}-super`,`flight`,1,-705,`${p}-super`,`super`,`SUPER FLY`),

    make(`${p}-gate2-centre`,`hazard`,0,-795,`${p}-gate2`,`hazard`,`DANGER`),
    make(`${p}-gate2-right`,`hazard`,1,-795,`${p}-gate2`,`hazard`,`DANGER`),
    make(`${p}-reward3`,`pickup`,-1,-870,`${p}-reward3`,`gem`,`REWARD`),
  ];
}

export function V36ClarityRouteTest(){
  const clock=useMemo(()=>new WorldClock(),[]);
  const director=useMemo(()=>new EncounterDirector(),[]);
  const [started,setStarted]=useState(false),[paused,setPaused]=useState(false),[lane,setLane]=useState<Lane>(0),[action,setAction]=useState<PlayerAction>("run"),[entities,setEntities]=useState<RouteEntity[]>(()=>route()),[score,setScore]=useState(0),[hearts,setHearts]=useState(3),[shield,setShield]=useState(false),[bootsUntil,setBootsUntil]=useState(0),[flightUntil,setFlightUntil]=useState(0),[distance,setDistance]=useState(0),[feedback,setFeedback]=useState("Clear route ready"),[zone,setZone]=useState<SchoolZone>("entrance"),[speed,setSpeed]=useState(5.2),[frameIndex,setFrameIndex]=useState(0);
  const laneRef=useRef<Lane>(0),actionRef=useRef<PlayerAction>("run"),shieldRef=useRef(false),bootsRef=useRef(0),pausedRef=useRef(false),startedRef=useRef(false),seedRef=useRef(1),timer=useRef<number|null>(null),gesture=useRef<{x:number;y:number}|null>(null),startGraceUntil=useRef(0);

  useEffect(()=>{laneRef.current=lane},[lane]);
  useEffect(()=>{actionRef.current=action},[action]);
  useEffect(()=>{shieldRef.current=shield},[shield]);
  useEffect(()=>{bootsRef.current=bootsUntil},[bootsUntil]);
  useEffect(()=>{pausedRef.current=paused;clock.setPaused(paused,performance.now())},[paused,clock]);
  useEffect(()=>{startedRef.current=started},[started]);
  useEffect(()=>{clock.setSpeed(speed)},[clock,speed]);
  useEffect(()=>{
    if(!started||paused||action!=="run")return;
    const id=window.setInterval(()=>setFrameIndex(value=>(value+1)%RUN_FRAMES.length),115);
    return()=>window.clearInterval(id);
  },[started,paused,action]);

  const reset=useCallback(()=>{
    const fresh=route();
    director.reset(fresh);clock.reset(performance.now(),5.2);startGraceUntil.current=performance.now()+9000;
    setEntities(fresh);setLane(0);laneRef.current=0;setAction("run");actionRef.current="run";setScore(0);setHearts(3);setShield(false);shieldRef.current=false;setBootsUntil(0);bootsRef.current=0;setFlightUntil(0);setDistance(0);setFeedback("One item or one challenge at a time.");setPaused(false);setSpeed(5.2);setFrameIndex(0);
  },[clock,director]);

  const resolveGroup=useCallback((group:string)=>{
    director.getEntities().filter(entity=>entity.collisionGroup===group).forEach(entity=>director.resolve(entity.id));
  },[director]);

  const interact=useCallback((candidate:RouteEntity,now:number)=>{
    if(candidate.kind==="pickup"||candidate.kind==="flight"||candidate.kind==="traversal"){
      if(candidate.role==="gem"){setScore(v=>v+10);setFeedback("Collected safely +10")}
      if(candidate.role==="shield"){setShield(true);shieldRef.current=true;setScore(v=>v+25);setFeedback("Blue shield collected")}
      if(candidate.role==="boots"){const until=now+12000;setBootsUntil(until);bootsRef.current=until;setScore(v=>v+25);setFeedback("Big Jump Boots active")}
      if(candidate.role==="super"){setFlightUntil(now+7000);setScore(v=>v+50);setFeedback("SUPER FLIGHT active")}
      if(candidate.role==="hill"){
        setAction("jump");actionRef.current="jump";setScore(v=>v+20);setFeedback("Over the broad hill +20");
        if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{setAction("run");actionRef.current="run"},bootsRef.current>now?1350:1050);
      }
      resolveGroup(candidate.collisionGroup);return;
    }
    const avoided=candidate.role==="tunnel"?actionRef.current==="slide":actionRef.current==="jump";
    if(avoided){resolveGroup(candidate.collisionGroup);setScore(v=>v+8);setFeedback(candidate.role==="tunnel"?"Great slide +8":"Cleared safely +8");return}
    if(now<startGraceUntil.current||!director.canDamage(candidate,now)){resolveGroup(candidate.collisionGroup);return}
    if(shieldRef.current){setShield(false);shieldRef.current=false;director.registerDamage(candidate,now);resolveGroup(candidate.collisionGroup);setFeedback("Shield blocked the hit");return}
    director.registerDamage(candidate,now);resolveGroup(candidate.collisionGroup);setHearts(v=>Math.max(0,v-1));setFeedback("One heart lost — protected now")
  },[director,resolveGroup]);

  useEffect(()=>{
    let raf=0;
    const tick=(now:number)=>{
      const frame=clock.step(now);
      if(startedRef.current&&!pausedRef.current){
        director.advance(frame);director.clearCollisionGroupAfterPass();
        const candidate=director.getCollisionCandidate(laneRef.current) as RouteEntity|null;
        if(candidate)interact(candidate,now);
        let current=director.getEntities() as readonly RouteEntity[];
        if(current.length<4){const extra=route(seedRef.current++).map(e=>({...e,z:e.z-930}));current=[...current,...extra];director.replace([...current])}
        setEntities([...current]);setDistance(frame.distance);
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)
  },[clock,director,interact]);

  useEffect(()=>{if(hearts===0){setPaused(true);setFeedback("Great try — restart when ready")}},[hearts]);

  const move=(d:-1|1)=>{if(!started||paused)return;setLane(v=>Math.max(-1,Math.min(1,v+d)) as Lane)};
  const act=(next:"jump"|"slide")=>{if(!started||paused||actionRef.current!=="run")return;setAction(next);actionRef.current=next;if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{setAction("run");actionRef.current="run"},next==="jump"?(bootsRef.current>performance.now()?1300:900):740)};
  const down=(e:PointerEvent<HTMLDivElement>)=>{gesture.current={x:e.clientX,y:e.clientY}};
  const up=(e:PointerEvent<HTMLDivElement>)=>{const s=gesture.current;gesture.current=null;if(!s)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>34&&Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1);else if(dy<-28)act("jump");else if(dy>28)act("slide")};

  const onDebug=(command:DebugCommand)=>{
    if(command.type==="speed"){setSpeed(command.value);return}
    if(command.type==="zone"){setZone(command.target);setFeedback(`Zone: ${command.target}`);return}
    if(command.type==="reset"){reset();return}
    if(command.type==="power"){const now=performance.now();if(command.target==="shield"){setShield(true);shieldRef.current=true}if(command.target==="boots"){setBootsUntil(now+12000);bootsRef.current=now+12000}if(command.target==="superFlight")setFlightUntil(now+7000);setFeedback(`Debug power: ${command.target}`);return}
    setFeedback("Authored safety-corridor route active")
  };

  const now=performance.now(),boots=bootsUntil>now,flying=flightUntil>now;
  const unresolved=entities.filter(entity=>!entity.resolved&&entity.z<=VISIBLE_NEAR_Z);
  const nearestGroup=unresolved.reduce<RouteEntity|null>((nearest,entity)=>!nearest||entity.z>nearest.z?entity:nearest,null)?.collisionGroup;
  const visible=entities.filter(entity=>!entity.resolved&&entity.collisionGroup===nearestGroup&&entity.z>=VISIBLE_FAR_Z&&entity.z<=VISIBLE_NEAR_Z);
  const heroSrc=flying?SUPER_FRAME:RUN_FRAMES[action==="run"?frameIndex:0];

  return <main className={`v36-clarity zone-${zone} ${flying?"flying":""}`}>
    <header><div><small>V3.6 SAFETY CORRIDOR</small><h1>One Encounter Only</h1></div><div className="stats"><b>{"♥".repeat(hearts)}{"♡".repeat(3-hearts)}</b><b>Score {score}</b><b>{Math.floor(distance)} m</b>{shield&&<b className="shield">Shield</b>}{boots&&<b className="boots">Big Jump</b>}{flying&&<b className="flight">Super Flight</b>}</div></header>
    <section className="stage" onPointerDown={down} onPointerUp={up}>
      <div className="sky"/><div className="school">AUSTRALIAN SCHOOL • {zone.toUpperCase()}</div><div className="road"><i/><i/></div>
      {visible.map(entity=>{
        const progress=(entity.z-VISIBLE_FAR_Z)/(VISIBLE_NEAR_Z-VISIBLE_FAR_Z);
        const top=13+progress*70;
        const scale=.4+progress*.74;
        const hill=entity.role==="hill";
        return <div key={entity.id} className={`route-item role-${entity.role} ${entity.kind==="hazard"?"danger":"good"} ${hill?"terrain":""}`} style={{left:`${LANE_LEFT[entity.lane]}%`,top:`${top}%`,transform:`translate(-50%,-50%) scale(${scale})`}}><span>{entity.role==="gem"?"◆":entity.role==="shield"?"●":entity.role==="boots"?"👢":entity.role==="super"?"★":entity.role==="tunnel"?"▣":entity.role==="hill"?"▰":"!"}</span><strong>{entity.label}</strong></div>
      })}
      {flying&&[-1,0,1,0,-1,1].map((ringLane,index)=><div className="air-ring" key={index} style={{left:`${LANE_LEFT[ringLane as Lane]}%`,top:`${18+index*10}%`}}>○</div>)}
      <div className={`hero lane-${lane} action-${action} ${boots?"boots-on":""} ${flying?"hero-flying":""}`}><img src={heroSrc} alt="Peter running" onError={event=>{event.currentTarget.src=RUN_FRAMES[0]}}/><span>PETER</span></div>
      <div className="feedback">{feedback}</div>
      {!started&&<div className="overlay"><div><small>SAFETY-CORRIDOR TEST</small><h2>Only one encounter can appear</h2><p>A pickup can never share the screen with a later obstacle. Hazard gates always leave one completely empty lane.</p><button onClick={()=>{reset();setStarted(true)}}>Start Safe Test</button></div></div>}
      {paused&&started&&<div className="overlay"><div><h2>{hearts===0?"Great try":"Paused"}</h2><button onClick={()=>setPaused(false)} disabled={hearts===0}>Resume</button><button onClick={()=>{reset();setStarted(true)}}>Restart</button></div></div>}
      <DebugPanel onCommand={onDebug}/>
    </section>
    <nav><button onClick={()=>move(-1)}>Left</button><button onClick={()=>move(1)}>Right</button><button onClick={()=>act("jump")}>Jump</button><button onClick={()=>act("slide")}>Slide</button><button onClick={()=>setPaused(v=>!v)}>Pause</button><button onClick={()=>{reset();setStarted(true)}}>Restart</button></nav>
  </main>;
}
