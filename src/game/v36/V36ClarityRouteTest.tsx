import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { DebugPanel } from "./DebugPanel";
import { EncounterDirector } from "./engine/encounterDirector";
import type { DebugCommand, EncounterEntity, Lane, PlayerAction, SchoolZone } from "./engine/types";
import { WorldClock } from "./engine/worldClock";
import "./v36ClarityRoute.css";

const HERO_IMAGE = "https://raw.githubusercontent.com/lifepilot-jared/super-zoos-adventure-v2/main/public/images/characters/animation/peter-normal-run-01.png";
const LANE_LEFT: Record<Lane, number> = { [-1]: 23, [0]: 50, [1]: 77 };
const VISIBLE_FAR_Z = -100;
const VISIBLE_NEAR_Z = 10;

type Role = "gem" | "shield" | "boots" | "super" | "hazard" | "tunnel" | "hill";
type RouteEntity = EncounterEntity & { role: Role; label: string };

function make(id:string, kind:EncounterEntity["kind"], lane:Lane, z:number, group:string, role:Role, label:string):RouteEntity {
  return { id, kind, lane, z, collisionGroup:group, resolved:false, role, label };
}

function route(seed=0):RouteEntity[] {
  const p=`clear-${seed}`;
  return [
    make(`${p}-g1`,`pickup`,0,-45,`${p}-g1`,`gem`,`COLLECT`),
    make(`${p}-g2`,`pickup`,-1,-85,`${p}-g2`,`gem`,`COLLECT`),
    make(`${p}-shield`,`pickup`,1,-130,`${p}-shield`,`shield`,`SHIELD`),

    // First decision gate: hazards only, centre lane completely empty.
    make(`${p}-gate1-left`,`hazard`,-1,-190,`${p}-gate1`,`hazard`,`MOVE CENTRE`),
    make(`${p}-gate1-right`,`hazard`,1,-190,`${p}-gate1`,`hazard`,`MOVE CENTRE`),

    // Reward comes well after the player has cleared the gate.
    make(`${p}-reward1`,`pickup`,0,-240,`${p}-reward1`,`gem`,`REWARD`),
    make(`${p}-boots`,`pickup`,-1,-290,`${p}-boots`,`boots`,`BIG JUMP`),

    // Real route terrain: left and centre rise; right lane stays flat.
    make(`${p}-hill-left`,`traversal`,-1,-350,`${p}-hill`,`hill`,`HILL ROUTE`),
    make(`${p}-hill-centre`,`traversal`,0,-350,`${p}-hill`,`hill`,`HILL ROUTE`),

    make(`${p}-reward2`,`pickup`,1,-405,`${p}-reward2`,`gem`,`FLAT-LANE REWARD`),
    make(`${p}-tunnel`,`hazard`,0,-465,`${p}-tunnel`,`tunnel`,`SLIDE OR MOVE`),
    make(`${p}-super`,`flight`,1,-525,`${p}-super`,`super`,`SUPER FLY`),

    // Second clear decision gate: left lane completely empty.
    make(`${p}-gate2-centre`,`hazard`,0,-595,`${p}-gate2`,`hazard`,`MOVE LEFT`),
    make(`${p}-gate2-right`,`hazard`,1,-595,`${p}-gate2`,`hazard`,`MOVE LEFT`),
    make(`${p}-reward3`,`pickup`,-1,-650,`${p}-reward3`,`gem`,`REWARD`),
  ];
}

export function V36ClarityRouteTest(){
  const clock=useMemo(()=>new WorldClock(),[]);
  const director=useMemo(()=>new EncounterDirector(),[]);
  const [started,setStarted]=useState(false),[paused,setPaused]=useState(false),[lane,setLane]=useState<Lane>(0),[action,setAction]=useState<PlayerAction>("run"),[entities,setEntities]=useState<RouteEntity[]>(()=>route()),[score,setScore]=useState(0),[hearts,setHearts]=useState(3),[shield,setShield]=useState(false),[bootsUntil,setBootsUntil]=useState(0),[flightUntil,setFlightUntil]=useState(0),[distance,setDistance]=useState(0),[feedback,setFeedback]=useState("Clear route ready"),[zone,setZone]=useState<SchoolZone>("entrance"),[speed,setSpeed]=useState(5.8);
  const laneRef=useRef<Lane>(0),actionRef=useRef<PlayerAction>("run"),shieldRef=useRef(false),bootsRef=useRef(0),pausedRef=useRef(false),startedRef=useRef(false),seedRef=useRef(1),timer=useRef<number|null>(null),gesture=useRef<{x:number;y:number}|null>(null),startGraceUntil=useRef(0);

  useEffect(()=>{laneRef.current=lane},[lane]);
  useEffect(()=>{actionRef.current=action},[action]);
  useEffect(()=>{shieldRef.current=shield},[shield]);
  useEffect(()=>{bootsRef.current=bootsUntil},[bootsUntil]);
  useEffect(()=>{pausedRef.current=paused;clock.setPaused(paused,performance.now())},[paused,clock]);
  useEffect(()=>{startedRef.current=started},[started]);
  useEffect(()=>{clock.setSpeed(speed)},[clock,speed]);

  const reset=useCallback(()=>{
    const fresh=route();
    director.reset(fresh);clock.reset(performance.now(),5.8);startGraceUntil.current=performance.now()+7000;
    setEntities(fresh);setLane(0);laneRef.current=0;setAction("run");actionRef.current="run";setScore(0);setHearts(3);setShield(false);shieldRef.current=false;setBootsUntil(0);bootsRef.current=0;setFlightUntil(0);setDistance(0);setFeedback("Tutorial first. One decision at a time.");setPaused(false);setSpeed(5.8);
  },[clock,director]);

  const interact=useCallback((candidate:RouteEntity,now:number)=>{
    if(candidate.kind==="pickup"||candidate.kind==="flight"||candidate.kind==="traversal"){
      if(candidate.role==="gem"){setScore(v=>v+10);setFeedback("Collected safely +10")}
      if(candidate.role==="shield"){setShield(true);shieldRef.current=true;setScore(v=>v+25);setFeedback("Blue shield collected")}
      if(candidate.role==="boots"){const until=now+12000;setBootsUntil(until);bootsRef.current=until;setScore(v=>v+25);setFeedback("Big Jump Boots active")}
      if(candidate.role==="super"){setFlightUntil(now+7000);setScore(v=>v+50);setFeedback("SUPER FLIGHT active")}
      if(candidate.role==="hill"){
        setAction("jump");actionRef.current="jump";setScore(v=>v+20);setFeedback("Over the broad hill +20");
        if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{setAction("run");actionRef.current="run"},bootsRef.current>now?1300:1000);
      }
      director.resolve(candidate.id);return;
    }
    const avoided=candidate.role==="tunnel"?actionRef.current==="slide":actionRef.current==="jump";
    if(avoided){director.resolve(candidate.id);setScore(v=>v+8);setFeedback(candidate.role==="tunnel"?"Great slide +8":"Cleared safely +8");return}
    if(now<startGraceUntil.current||!director.canDamage(candidate,now)){director.resolve(candidate.id);return}
    if(shieldRef.current){setShield(false);shieldRef.current=false;director.registerDamage(candidate,now);director.resolve(candidate.id);setFeedback("Shield blocked the hit");return}
    director.registerDamage(candidate,now);director.resolve(candidate.id);setHearts(v=>Math.max(0,v-1));setFeedback("One heart lost — protected now")
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
        if(current.length<4){const extra=route(seedRef.current++).map(e=>({...e,z:e.z-700}));current=[...current,...extra];director.replace([...current])}
        setEntities([...current]);setDistance(frame.distance);
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)
  },[clock,director,interact]);

  useEffect(()=>{if(hearts===0){setPaused(true);setFeedback("Great try — restart when ready")}},[hearts]);

  const move=(d:-1|1)=>{if(!started||paused)return;setLane(v=>Math.max(-1,Math.min(1,v+d)) as Lane)};
  const act=(next:"jump"|"slide")=>{if(!started||paused||actionRef.current!=="run")return;setAction(next);actionRef.current=next;if(timer.current)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{setAction("run");actionRef.current="run"},next==="jump"?(bootsRef.current>performance.now()?1250:850):720)};
  const down=(e:PointerEvent<HTMLDivElement>)=>{gesture.current={x:e.clientX,y:e.clientY}};
  const up=(e:PointerEvent<HTMLDivElement>)=>{const s=gesture.current;gesture.current=null;if(!s)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>34&&Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1);else if(dy<-28)act("jump");else if(dy>28)act("slide")};

  const onDebug=(command:DebugCommand)=>{
    if(command.type==="speed"){setSpeed(command.value);return}
    if(command.type==="zone"){setZone(command.target);setFeedback(`Zone: ${command.target}`);return}
    if(command.type==="reset"){reset();return}
    if(command.type==="power"){const now=performance.now();if(command.target==="shield"){setShield(true);shieldRef.current=true}if(command.target==="boots"){setBootsUntil(now+12000);bootsRef.current=now+12000}if(command.target==="superFlight")setFlightUntil(now+7000);setFeedback(`Debug power: ${command.target}`);return}
    setFeedback("Authored clarity route active")
  };

  const now=performance.now(),boots=bootsUntil>now,flying=flightUntil>now;
  const visible=entities.filter(e=>!e.resolved&&e.z>=VISIBLE_FAR_Z&&e.z<=VISIBLE_NEAR_Z);

  return <main className={`v36-clarity zone-${zone} ${flying?"flying":""}`}>
    <header><div><small>V3.6 CLARITY TEST</small><h1>One Decision at a Time</h1></div><div className="stats"><b>{"♥".repeat(hearts)}{"♡".repeat(3-hearts)}</b><b>Score {score}</b><b>{Math.floor(distance)} m</b>{shield&&<b className="shield">Shield</b>}{boots&&<b className="boots">Big Jump</b>}{flying&&<b className="flight">Super Flight</b>}</div></header>
    <section className="stage" onPointerDown={down} onPointerUp={up}>
      <div className="sky"/><div className="school">AUSTRALIAN SCHOOL • {zone.toUpperCase()}</div><div className="road"><i/><i/></div>
      {visible.map(e=>{
        const progress=(e.z-VISIBLE_FAR_Z)/(VISIBLE_NEAR_Z-VISIBLE_FAR_Z);
        const top=12+progress*72;
        const scale=.38+progress*.78;
        const hill=e.role==="hill";
        return <div key={e.id} className={`route-item role-${e.role} ${e.kind==="hazard"?"danger":"good"} ${hill?"terrain":""}`} style={{left:`${LANE_LEFT[e.lane]}%`,top:`${top}%`,transform:`translate(-50%,-50%) scale(${scale})`}}><span>{e.role==="gem"?"◆":e.role==="shield"?"●":e.role==="boots"?"👢":e.role==="super"?"★":e.role==="tunnel"?"▣":e.role==="hill"?"▰":"!"}</span><strong>{e.label}</strong></div>
      })}
      {flying&&[-1,0,1,0,-1,1].map((l,i)=><div className="air-ring" key={i} style={{left:`${LANE_LEFT[l as Lane]}%`,top:`${18+i*10}%`}}>○</div>)}
      <div className={`hero lane-${lane} action-${action} ${boots?"boots-on":""} ${flying?"hero-flying":""}`}><img src={HERO_IMAGE} alt="Peter"/><span>PETER</span></div>
      <div className="feedback">{feedback}</div>
      {!started&&<div className="overlay"><div><small>ULTRA-CLEAR ROUTE</small><h2>Only the next encounter is shown</h2><p>Hazards never hide behind pickups. A hazard row always leaves one completely empty safe lane.</p><button onClick={()=>{reset();setStarted(true)}}>Start Clarity Test</button></div></div>}
      {paused&&started&&<div className="overlay"><div><h2>{hearts===0?"Great try":"Paused"}</h2><button onClick={()=>setPaused(false)} disabled={hearts===0}>Resume</button><button onClick={()=>{reset();setStarted(true)}}>Restart</button></div></div>}
      <DebugPanel onCommand={onDebug}/>
    </section>
    <nav><button onClick={()=>move(-1)}>Left</button><button onClick={()=>move(1)}>Right</button><button onClick={()=>act("jump")}>Jump</button><button onClick={()=>act("slide")}>Slide</button><button onClick={()=>setPaused(v=>!v)}>Pause</button><button onClick={()=>{reset();setStarted(true)}}>Restart</button></nav>
  </main>;
}
