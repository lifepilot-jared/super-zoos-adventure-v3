import { useState } from "react";
import type { DebugCommand, SchoolZone } from "./engine/types";

const zones: SchoolZone[] = ["entrance", "gumtree", "basketball", "playground", "bikeTrack", "oval", "science", "library"];

export function DebugPanel({ onCommand }: { onCommand: (command: DebugCommand) => void }) {
  const [open, setOpen] = useState(false);

  return <aside className={`v36-debug ${open ? "open" : ""}`} aria-label="Developer tools">
    <button className="v36-debug-toggle" onClick={() => setOpen(value => !value)} aria-expanded={open}>
      {open ? "Close Dev" : "Dev"}
    </button>
    {open && <div className="v36-debug-panel">
      <h2>V3.6 Developer Mode</h2>
      <section>
        <h3>Spawn</h3>
        <div className="v36-debug-grid">
          {(["gemPattern", "tunnel", "hill", "ramp", "skateboard", "rail", "trampoline"] as const).map(target =>
            <button key={target} onClick={() => onCommand({ type: "spawn", target })}>{target}</button>,
          )}
        </div>
      </section>
      <section>
        <h3>Power-ups</h3>
        <div className="v36-debug-grid">
          {(["shield", "magnet", "boots", "superFlight"] as const).map(target =>
            <button key={target} onClick={() => onCommand({ type: "power", target })}>{target}</button>,
          )}
        </div>
      </section>
      <section>
        <h3>School zone</h3>
        <select onChange={event => onCommand({ type: "zone", target: event.target.value as SchoolZone })} defaultValue="entrance">
          {zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
        </select>
      </section>
      <section>
        <h3>World speed</h3>
        <input type="range" min="0" max="16" step="0.5" defaultValue="9.5" onChange={event => onCommand({ type: "speed", value: Number(event.target.value) })} />
      </section>
      <button className="v36-debug-reset" onClick={() => onCommand({ type: "reset" })}>Reset engine</button>
    </div>}
  </aside>;
}
