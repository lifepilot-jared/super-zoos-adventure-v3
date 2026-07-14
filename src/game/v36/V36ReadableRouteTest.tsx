import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { DebugPanel } from "./DebugPanel";
import { EncounterDirector } from "./engine/encounterDirector";
import type { DebugCommand, EncounterEntity, Lane, PlayerAction, SchoolZone } from "./engine/types";
import { WorldClock } from "./engine/worldClock";
import "./v36ReadableRoute.css";

const HERO_IMAGE = "https://raw.githubusercontent.com/lifepilot-jared/super-zoos-adventure-v2/main/public/images/characters/animation/peter-normal-run-01.png";
const LANE_LEFT: Record<Lane, number> = { [-1]: 23, [0]: 50, [1]: 77 };

type Role = "gem" | "shield" | "boots" | "super" | "hazard" | "tunnel" | "hill";
type RouteEntity = EncounterEntity & { role: Role; label: string };

function make(id:string, kind:EncounterEntity["kind"], lane:Lane, z:number, group:string, role:Role, label:string):RouteEntity {
  return { id, kind, lane, z, collisionGroup:group, resolved:false, role, label };
}

function route(seed=0):RouteEntity[] {
  const p=`r${seed}`;
  return [
    make(`${p}-g1`,"pickup",0,-38,`${p}-g1`,`gem`,"COLLECT"),
    make(`${p}-g2`,"pickup",-1,-58,`${p}-g2`,`gem`,"COLLECT"),
    make(`${p}-g3`,"pickup",1,-78,`${p}-g3`,`gem`,"COLLECT"),
    make(`${p}-shield`,"pickup",0,-102,`${p}-shield`,`shield`,"SHIELD"),

    make(`${p}-h1l`,"hazard",-1,-138,`${p}-gate1`,`hazard`,"DANGER"),
    make(`${p}-h1r`,"hazard",1,-138,`${p}-gate1`,`hazard`,"DANGER"),
    make(`${p}-safe1`,"pickup",0,-138,`${p}-gate1`,`gem`,"SAFE LANE"),

    make(`${p}-boots`,"pickup",1,-178,`${p}-boots`,`boots`,"BIG JUMP"),

    make(`${p}-hillL`,"traversal",-1,-220,`${p}-hill`,`hill`,"HILL"),
    make(`${p}-hillC`,"traversal",0,-220,`${p}-hill`,`hill`,"HILL"),

    make(`${p}-tunnel`,"hazard",0,-265,`${p}-tunnel`,`tunnel`,"SLIDE"),

    make(`${p}-super`,"flight",0,-310,`${p}-super`,`super`,"SUPER FLY"),

    make(`${p}-h2c`,"hazard",0,-360,`${p}-gate2`,`hazard`,"DANGER"),
    make(`${p}-h2r`,"hazard",1,-360,`${p}-gate2`,`hazard`,"DANGER"),
    make(`${p}-safe2`,"pickup",-1,-360,`${p}-gate2`,`gem`,"SAFE LANE"),
  ];
}

export function V36ReadableRouteTest(){
  const clock=useMemo(()=>new WorldClock(),[]);
  const director=useMemo(()=>new EncounterDirector(),[]);
  const [started,setStarted]=useState(false),[paused,setPaused]=useState(false),[lane,setLane]=useState<Lane>(0),[action,setAction]=useState<PlayerAction>("run"),[entities,setEntities]=useState<RouteEntity[]>(()=>route()),[score,setScore]=useState(0),[hearts,setHearts]=useState(3),[shield,setShield]=useState(false),[bootsUntil,setBootsUntil]=useState(0),[flightUntil,setFlightUntil]=useState(0),[distance,setDistance]=useState(0),[feedback,setFeedback]=useState("Easy learning route"),[zone,setZone]=useState<SchoolZone>("entrance"),[speed,setSpeed]=useState(7.2);
  const laneRef=useRef<Lane>(0),actionRef=useRef<PlayerAction>("run"),shieldRef=useRef(false),bootsRef=useRef(0),flightRef=useRef(0),pausedRef=useRef(false),startedRef=useRef(false),seedRef=useRef(1),timer=useRef<number|null>(null),gesture=useRef<{x:number;y:number}|null>(null),startGraceUntil=useRef(0);

  useEffect(()=>{laneRef.current=lane},[lane]);
  useEffect(()=>{actionRef.current=action},[action]);
  useEffect(()=>{shieldRef.current=shield},[shield]);
  useEffect(()=>{bootsRef.current=bootsUntil},[bootsUntil]);
  useEffect(()=>{flightRef.current=flightUntil},[flightUntil]);
  useEffect(()=>{pausedRef.current=paused;clock.setPaused(paused,performance.now())},[paused,clock]);
  useEffect(()=>{startedRef.current=started},[started]);
  useEffect(()=>{clock.setSpeed(speed)},[clock,speed]);

  const reset=useCallback(()=>{
    const fresh=route();
    director.reset(fresh); clock.reset(performance.now(),7.2); startGraceUntil.current=performance.now()+5000;
    setEntities(fresh); setLane(0); laneRef.current=0; setAction("run"); actionRef.current="run"; setScore(0); setHearts(3); setShield(false); shieldRef.current=false; setBootsUntil(0); bootsRef.current=0; setFlightUntil(0); flightRef.current=0; setDistance(0); setFeedback("Pickups first. Hazards arrive later."); setPaused(false); setSpeed(7.2);
  },[clock,director]);

  const interact=useCallback((candidate:RouteEntity,now:number)=>{
    if(candidate.kind==="pickup"||candidate.kind==="flight"||candidate.kind==="traversal"){
      if(candidate.role==="gem"){setScore(v=>v+10);setFeedback(candidate.label==="SAFE LANE"?"Correct safe lane +10":"Gem collected +10")}
      if(candidate.role==="shield"){setShield(true);shieldRef.current=true;setScore(v=>v+25);setFeedback("Shield collected — one mistake protected")}
      if(candidate.role==="boots"){const until=now+12000;setBootsUntil(until);bootsRef.current=until;setScore(v=>v+25);setFeedback("Big Jump Boots — higher jumps")}
      if(candidate.role==="super"){const until=now+7000;setFlightUntil(until);flightRef.current=until;setScore(v=>v+50);setFeedback("SUPER FLIGHT — follow the sky rings")}
      if(candidate.role==="hill"){
        setAction("jump");actionRef.current="jump";setScore(v=>v+20);setFeedback("Over the hill +20");
        if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{setAction("run");actionRef.current="run"},bootsRef.current>now?1250:950);
      }
      director.resolve(candidate.id);return;
    }
    const avoided=candidate.role==="tunnel"?actionRef.current==="slide":actionRef.current==="jump";
    if(avoided){director.resolve(candidate.id);setScore(v=>v+8);setFeedback(candidate.role==="tunnel"?"Great slide +8":"Great dodge +8");return}
    if(now<startGraceUntil.current||!director.canDamage(candidate,now)){director.resolve(candidate.id);return}
    if(shieldRef.current){setShield(false);shieldRef.current=false;director.registerDamage(candidate,now);director.resolve(candidate.id);setFeedback("Shield blocked the hit");return}
    director.registerDamage(candidate,now);director.resolve(candidate.id);setHearts(v=>Math.max(0,v-1));setFeedback("One heart lost — protected for a moment")
  },[director]);

  useEffect(()=>{
    let raf=0;
    const tick=(now:number)=>{
      const frame=clock.step(now);
      if(startedRef.current&&!pausedRef.current){
        director.advance(frame);director.clearCollisionGroupAfterPass();
        const candidate=director.getCollisionCandidate(laneRef.current) as RouteEntity|null;
        if(candidate)interact(candidate,now);
        let current=director.getEntities() as readonly RouteEntity[];
        if(current.length<5){const extra=route(seedRef.current++).map(e=>({...e,z:e.z-390}));current=[...current,...extra];director.replace([...current])}
        setEntities([...current]);setDistance(frame.distance);
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)
  },[clock,director,interact]);

  useEffect(()=>{if(hearts===0){setPaused(true);setFeedback("Great try — restart when ready")}},[hearts]);

  const move=(d:-1|1)=>{if(!started||paused)return;setLane(v=>Math.max(-1,Math.min(1,v+d)) as Lane)};
  const act=(next:"jump"|"slide")=>{if(!started||paused||actionRef.current!=="run")return;setAction(next);actionRef.current=next;if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{setAction("run");actionRef.current="run"},next==="jump"?(bootsRef.current>performance.now()?1200:820):700)};
  const down=(e:PointerEvent<HTMLDivElement>)=>{gesture.current={x:e.clientX,y:e.clientY}};
  const up=(e:PointerEvent<HTMLDivElement>)=>{const s=gesture.current;gesture.current=null;if(!s)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>36&&Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1);else if(dy<-30)act("jump");else if(dy>30)act("slide")};

  const onDebug=(command:DebugCommand)=>{
    if(command.type==="speed"){setSpeed(command.value);return}
    if(command.type==="zone"){setZone(command.target);setFeedback(`Zone: ${command.target}`);return}
    if(command.type==="reset"){reset();return}
    if(command.type==="power"){const now=performance.now();if(command.target==="shield"){setShield(true);shieldRef.current=true}if(command.target==="boots"){setBootsUntil(now+12000);bootsRef.current=now+12000}if(command.target==="superFlight"){setFlightUntil(now+7000);flightRef.current=now+7000}setFeedback(`Debug power: ${command.target}`);return}
    setFeedback("This readability test uses the fixed authored route")
  };

  const now=performance.now(),boots=bootsUntil>now,flying=flightUntil>now;
  return <main className={`v36-readable zone-${zone} ${flying?"flying":""}`}>
    <header><div><small>V3.6 READABILITY TEST</small><h1>Easy School Adventure</h1></div><div className="stats"><b>{"♥".repeat(hearts)}{"♡".repeat(3-hearts)}</b><b>Score {score}</b><b>{Math.floor(distance)} m</b>{shield&&<b className="shield">Shield</b>}{boots&&<b className="boots">Big Jump</b>}{flying&&<b className="flight">Super Flight</b>}</div></header>
    <section className="stage" onPointerDown={down} onPointerUp={up}>
      <div className="sky"/><div className="school">AUSTRALIAN SCHOOL • {zone.toUpperCase()}</div><div className="road"><i/><i/></div>
      {entities.filter(e=>!e.resolved).map(e=>{const progress=Math.max(0,Math.min(1.15,(e.z+390)/396));const top=10+progress*74;const scale=.35+progress*.9;return <div key={e.id} className={`route-item role-${e.role} ${e.kind==="hazard"?"danger":"good"}`} style={{left:`${LANE_LEFT[e.lane]}%`,top:`${top}%`,transform:`translate(-50%,-50%) scale(${scale})`}}><span>{e.role==="gem"?"◆":e.role==="shield"?"●":e.role==="boots"?"👢":e.role==="super"?"★":e.role==="tunnel"?"▣":e.role==="hill"?"▰":"!"}</span><strong>{e.label}</strong></div>})}
      {flying&&[-1,0,1,0,-1,1].map((l,i)=><div className="air-ring" key={i} style={{left:`${LANE_LEFT[l as Lane]}%`,top:`${18+i*10}%`}}>○</div>)}
      <div className={`hero lane-${lane} action-${action} ${boots?"boots-on":""} ${flying?"hero-flying":""}`}><img src={HERO_IMAGE} alt="Peter"/><span>PETER</span></div>
      <div className="feedback">{feedback}</div>
      {!started&&<div className="overlay"><div><small>EASY LEARNING ROUTE</small><h2>Clear, slow and spaced out</h2><p>Green and blue objects are safe. Large red warning blocks are danger. The first hazards appear only after the pickup tutorial.</p><button onClick={()=>{reset();setStarted(true)}}>Start Easy Test</button></div></div>}
      {paused&&started&&<div className="overlay"><div><h2>{hearts===0?"Great try":"Paused"}</h2><button onClick={()=>setPaused(false)} disabled={hearts===0}>Resume</button><button onClick={()=>{reset();setStarted(true)}}>Restart</button></div></div>}
      <DebugPanel onCommand={onDebug}/>
    </section>
    <nav><button onClick={()=>move(-1)}>Left</button><button onClick={()=>move(1)}>Right</button><button onClick={()=>act("jump")}>Jump</button><button onClick={()=>act("slide")}>Slide</button><button onClick={()=>setPaused(v=>!v)}>Pause</button><button onClick={()=>{reset();setStarted(true)}}>Restart</button></nav>
  </main>
}
