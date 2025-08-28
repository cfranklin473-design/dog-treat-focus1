// Dog Treat Focus – Minimal React MVP
// -----------------------------------
// A tiny Flora-like focus app where each completed session earns "treats" (🦴).
// Treats accumulate into a cash pledge to a dog shelter you choose.

import React, { useEffect, useMemo, useRef, useState } from "react";

const pad2 = (n) => String(n).padStart(2, "0");
const fmt = (s) => `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

export default function DogTreatFocusApp() {
  const [duration, setDuration] = useState(() => load("dtf_duration", 25 * 60));
  const [strictMode, setStrictMode] = useState(() => load("dtf_strict", true));
  const [treatsPerSuccess, setTreatsPerSuccess] = useState(() => load("dtf_treatsPerSuccess", 5));
  const [pledgeRateCents, setPledgeRateCents] = useState(() => load("dtf_pledgeRateCents", 2));
  const [shelter, setShelter] = useState(() => load("dtf_shelter", { name: "Local Dog Shelter", url: "https://" }));

  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | running | done | failed
  const [message, setMessage] = useState("");

  const [treats, setTreats] = useState(() => load("dtf_treats", 0));
  const [donatedCents, setDonatedCents] = useState(() => load("dtf_donatedCents", 0));
  const [history, setHistory] = useState(() => load("dtf_history", []));

  const tickRef = useRef(null);

  useEffect(() => save("dtf_duration", duration), [duration]);
  useEffect(() => save("dtf_strict", strictMode), [strictMode]);
  useEffect(() => save("dtf_treatsPerSuccess", treatsPerSuccess), [treatsPerSuccess]);
  useEffect(() => save("dtf_pledgeRateCents", pledgeRateCents), [pledgeRateCents]);
  useEffect(() => save("dtf_shelter", shelter), [shelter]);
  useEffect(() => save("dtf_treats", treats), [treats]);
  useEffect(() => save("dtf_donatedCents", donatedCents), [donatedCents]);
  useEffect(() => save("dtf_history", history), [history]);

  useEffect(() => { if (status === "idle") setRemaining(duration); }, [duration, status]);

  useEffect(() => {
    const onVis = () => { if (document.hidden && running && strictMode) fail("Left tab — tree died."); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [running, strictMode]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(tickRef.current); complete(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running]);

  const pledgedCents = treats * pledgeRateCents;
  const outstandingCents = Math.max(0, pledgedCents - donatedCents);

  function start() { setStatus("running"); setRunning(true); setMessage(""); }
  function reset() { setRunning(false); setStatus("idle"); setMessage(""); setRemaining(duration); }
  function complete() {
    setRunning(false); setStatus("done");
    setTreats((t) => t + treatsPerSuccess);
    setHistory((h) => [{ at: new Date().toISOString(), duration, success: true, earnedTreats: treatsPerSuccess }, ...h]);
    setMessage(`Nice! +${treatsPerSuccess} 🦴 earned`);
  }
  function fail(note="") {
    setRunning(false); setStatus("failed");
    setHistory((h) => [{ at: new Date().toISOString(), duration: duration-remaining, success: false }, ...h]);
    setMessage(note || "Failed");
  }
  function donateNow() {
    if (!shelter?.url || shelter.url==="https://") { alert("Add shelter URL in Settings."); return; }
    if (outstandingCents <= 0) { alert("No outstanding pledge."); return; }
    window.open(shelter.url, "_blank");
    if (confirm(`Mark $${(outstandingCents/100).toFixed(2)} as donated?`)) {
      setDonatedCents((c) => c + outstandingCents);
      setMessage(`Marked $${(outstandingCents/100).toFixed(2)} donated 🐶❤️`);
    }
  }

  const progress = 1 - remaining/duration;

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1>🐶 Dog Treat Focus</h1>
      <p>Stay focused → earn treats → donate to a shelter.</p>

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <div style={{ fontSize: 48 }}>{fmt(remaining)}</div>
        <div style={{ marginTop: 10 }}>
          {running ? <button onClick={() => fail("Stopped early")}>Give Up</button> :
            <button onClick={status==="idle" ? start : reset}>{status==="idle" ? "Start Focus" : "Reset"}</button>}
        </div>
        <div style={{ marginTop: 10, fontSize: 24 }}>
          {status==="done" ? "🌳 Success!" : status==="failed" ? "💀 Failed" : progress>0.5 ? "🌱 Growing…" : "⏳"}
        </div>
        <div>{message}</div>
      </div>

      <h2>Rewards</h2>
      <p>Total treats: {treats} 🦴</p>
      <p>Pledged: ${ (pledgedCents/100).toFixed(2) }</p>
      <p>Donated: ${ (donatedCents/100).toFixed(2) }</p>
      <p>Outstanding: ${ (outstandingCents/100).toFixed(2) }</p>
      <button onClick={donateNow}>Donate Now</button>

      <h2 style={{ marginTop:20 }}>History</h2>
      <ul>
        {history.map((h,i) => (
          <li key={i}>{new Date(h.at).toLocaleString()} – {h.success?`+${h.earnedTreats} 🦴`:"Failed"}</li>
        ))}
      </ul>
    </div>
  );
}
