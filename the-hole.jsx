import { useState, useEffect, useRef, useCallback } from "react";

const TOTAL_LEVELS = 10;
const BASE_TIME = 3.0;
const TIME_DECAY = 0.18;
const LINE_LENGTH_BASE = 120;

function lerp(a, b, t) { return a + (b - a) * t; }
function dist(x1, y1, x2, y2) { return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2); }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }

/* ─── Black Hole (canvas) ─── */
function BlackHole({ size, radius }) {
  const canvasRef = useRef(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let t = 0;
    let running = true;
    const center = size / 2;

    const draw = () => {
      if (!running) return;
      t += 0.012;
      ctx.clearRect(0, 0, size, size);

      const layers = 6;
      for (let l = layers; l >= 0; l--) {
        const layerR = radius * (1 + l * 0.15);
        const alpha = l === 0 ? 1 : 0.06 + l * 0.035;
        ctx.beginPath();
        const pts = 100;
        for (let i = 0; i <= pts; i++) {
          const angle = (i / pts) * Math.PI * 2;
          const wobble1 = Math.sin(angle * 3 + t * 1.2 + l) * (4 + l * 2);
          const wobble2 = Math.sin(angle * 5 - t * 0.8 + l * 2) * (3 + l * 1.2);
          const wobble3 = Math.cos(angle * 7 + t * 1.5) * (2 + l * 0.7);
          const pulse = Math.sin(t * 1.5 + l * 0.5) * 3;
          const r = layerR + wobble1 + wobble2 + wobble3 + pulse;
          const rotatedAngle = angle + t * 0.12 + l * 0.04;
          const x = center + Math.cos(rotatedAngle) * r;
          const y = center + Math.sin(rotatedAngle) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        if (l === 0) {
          const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
          grad.addColorStop(0, "#000000");
          grad.addColorStop(0.5, "#050010");
          grad.addColorStop(0.75, "#12002a");
          grad.addColorStop(1, "#2d004a");
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = `rgba(${20 + l * 12}, ${0}, ${40 + l * 18}, ${alpha})`;
        }
        ctx.fill();
      }

      // accretion ring
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(t * 0.25);
      for (let i = 0; i < 80; i++) {
        const a = (i / 80) * Math.PI * 2;
        const ringR = radius * 1.1 + Math.sin(a * 4 + t * 2) * 4;
        const x = Math.cos(a) * ringR;
        const y = Math.sin(a) * ringR * 0.3;
        const bright = 0.15 + Math.sin(a * 3 + t * 4) * 0.12;
        ctx.beginPath();
        ctx.arc(x, y, 1.8 + Math.sin(a + t) * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${130 + i}, ${40 + i * 0.5}, ${200}, ${bright})`;
        ctx.fill();
      }
      ctx.restore();

      // outer glow
      const glowGrad = ctx.createRadialGradient(center, center, radius * 0.7, center, center, radius * 2);
      glowGrad.addColorStop(0, "rgba(80, 0, 140, 0)");
      glowGrad.addColorStop(0.4, "rgba(80, 0, 140, 0.05)");
      glowGrad.addColorStop(1, "rgba(80, 0, 140, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, size, size);

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [radius, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

/* ─── Background blobs ─── */
function BackgroundBlobs() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {[
        { x: 20, y: 25, r: 220, color: "rgba(120,40,200,0.25)", dur: 12 },
        { x: 75, y: 55, r: 180, color: "rgba(200,50,80,0.2)", dur: 16 },
        { x: 45, y: 80, r: 200, color: "rgba(30,100,220,0.2)", dur: 20 },
      ].map((b, i) => (
        <div key={i} style={{
          position: "absolute", left: `${b.x}%`, top: `${b.y}%`,
          width: b.r * 2, height: b.r * 2, borderRadius: "50%",
          background: b.color, filter: "blur(80px)",
          transform: "translate(-50%,-50%)",
          animation: `blobFloat${i} ${b.dur}s ease-in-out infinite alternate`,
        }} />
      ))}
      <style>{`
        @keyframes blobFloat0{0%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-45%,-55%) scale(1.15)}}
        @keyframes blobFloat1{0%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-55%,-45%) scale(1.1)}}
        @keyframes blobFloat2{0%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-48%,-52%) scale(1.2)}}
      `}</style>
    </div>
  );
}

/* ─── MAIN GAME ─── */
export default function TheHole() {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 400, h: 700 });
  const [gameState, setGameState] = useState("menu");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [dotAngle, setDotAngle] = useState(0);
  const [lineTarget, setLineTarget] = useState(null);
  const [lineProgress, setLineProgress] = useState(0);
  const [dragPath, setDragPath] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [showLine, setShowLine] = useState(false);
  const [holeRadius, setHoleRadius] = useState(35);
  const [feedback, setFeedback] = useState("");
  const [dotPulse, setDotPulse] = useState(0);
  const [shakeLevel, setShakeLevel] = useState(0);

  const timerRef = useRef(null);
  const lineAnimRef = useRef(null);
  const levelStartTime = useRef(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current)
        setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    let frame, t = 0;
    const tick = () => { t += 0.06; setDotPulse(Math.sin(t) * 0.5 + 0.5); frame = requestAnimationFrame(tick); };
    if (gameState === "playing" && !showLine) tick();
    return () => cancelAnimationFrame(frame);
  }, [gameState, showLine]);

  // ── EVERYTHING shares the same center ──
  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const circleR = Math.min(dims.w, dims.h) * 0.12;
  const holeCanvasSize = Math.ceil(holeRadius * 6);
  const maxTime = Math.max(0.6, BASE_TIME - (level - 1) * TIME_DECAY);
  const lineLen = LINE_LENGTH_BASE + level * 8;

  const startLevel = useCallback(() => {
    const angle = Math.random() * Math.PI * 2;
    setDotAngle(angle);
    setLineTarget({ angle: angle + rand(-0.6, 0.6), length: lineLen });
    setLineProgress(0);
    setDragPath([]);
    setShowLine(false);
    setIsDragging(false);
    setTimeLeft(maxTime);
    setFeedback("");
    setShakeLevel(0);
    setGameState("playing");
  }, [lineLen, maxTime]);

  const startGame = () => { setLevel(1); setScore(0); setHoleRadius(35); startLevel(); };

  useEffect(() => {
    if (gameState !== "playing" || !showLine) return;
    const start = Date.now();
    const totalMs = timeLeft * 1000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, totalMs - (Date.now() - start));
      setTimeLeft(remaining / 1000);
      if (remaining <= 500) setShakeLevel(2);
      else if (remaining <= 1000) setShakeLevel(1);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setFeedback("TIME'S UP");
        setGameState(level >= TOTAL_LEVELS ? "gameover" : "fail");
      }
    }, 30);
    return () => clearInterval(timerRef.current);
  }, [gameState, showLine, timeLeft, level]);

  const dotX = cx + Math.cos(dotAngle) * circleR;
  const dotY = cy + Math.sin(dotAngle) * circleR;
  let lineEndX = dotX, lineEndY = dotY;
  if (lineTarget) {
    lineEndX = dotX + Math.cos(lineTarget.angle) * lineTarget.length;
    lineEndY = dotY + Math.sin(lineTarget.angle) * lineTarget.length;
  }

  const handlePointerDown = (e) => {
    if (gameState !== "playing") return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    if (!showLine && dist(px, py, dotX, dotY) < 35) {
      setShowLine(true);
      setIsDragging(true);
      setDragPath([{ x: px, y: py }]);
      levelStartTime.current = Date.now();
      let prog = 0;
      const anim = () => {
        prog += 0.06;
        if (prog >= 1) { setLineProgress(1); return; }
        setLineProgress(prog);
        lineAnimRef.current = requestAnimationFrame(anim);
      };
      anim();
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging || gameState !== "playing") return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    setDragPath((prev) => [...prev, { x: px, y: py }]);
  };

  const handlePointerUp = () => {
    if (!isDragging || gameState !== "playing") return;
    setIsDragging(false);
    clearInterval(timerRef.current);
    cancelAnimationFrame(lineAnimRef.current);

    if (dragPath.length < 3) { setFeedback("DRAG FURTHER!"); setGameState("fail"); return; }

    const totalLineLen = dist(dotX, dotY, lineEndX, lineEndY);
    const lineDirX = (lineEndX - dotX) / totalLineLen;
    const lineDirY = (lineEndY - dotY) / totalLineLen;
    let totalDist = 0, maxProjection = 0;
    dragPath.forEach((p) => {
      const dx = p.x - dotX, dy = p.y - dotY;
      const proj = dx * lineDirX + dy * lineDirY;
      const pc = clamp(proj, 0, totalLineLen);
      totalDist += dist(p.x, p.y, dotX + lineDirX * pc, dotY + lineDirY * pc);
      maxProjection = Math.max(maxProjection, proj);
    });

    const avgDist = totalDist / dragPath.length;
    const coverage = clamp(maxProjection / totalLineLen, 0, 1);
    const accuracy = Math.max(0, 1 - avgDist / 60);
    const elapsed = (Date.now() - levelStartTime.current) / 1000;
    const speedBonus = Math.max(0, 1 - elapsed / (maxTime * 1.2));
    const passed = coverage > 0.5 && accuracy > 0.3;

    if (passed) {
      const levelScore = Math.round((accuracy * 500 + speedBonus * 300 + coverage * 200) * (level * 0.5 + 0.5));
      setScore((prev) => prev + levelScore);
      setFeedback(`+${levelScore}`);
      setHoleRadius((prev) => prev + 10 + level * 3);
      if (level >= TOTAL_LEVELS) setGameState("win");
      else { setGameState("success"); setTimeout(() => setLevel((p) => p + 1), 100); }
    } else {
      setFeedback(coverage <= 0.5 ? "TRACE FURTHER" : "TOO SLOPPY");
      setGameState("fail");
    }
  };

  const retryLevel = () => startLevel();

  useEffect(() => {
    if (gameState === "success") { const t = setTimeout(() => startLevel(), 800); return () => clearTimeout(t); }
  }, [gameState, level, startLevel]);

  const timerWidth = showLine ? (timeLeft / maxTime) * 100 : 100;
  const timerColor = timeLeft < 0.8 ? "#ff2040" : timeLeft < 1.5 ? "#ffaa00" : "#a855f7";

  return (
    <div
      ref={containerRef}
      onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp}
      onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
      style={{
        position: "fixed", inset: 0, background: "#08060e",
        overflow: "hidden", cursor: isDragging ? "grabbing" : "default",
        userSelect: "none", WebkitUserSelect: "none", touchAction: "none",
      }}
    >
      <BackgroundBlobs />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Space Mono',monospace}
        @keyframes pulseRed{0%,100%{box-shadow:0 0 8px 2px rgba(255,40,60,0.6);transform:translate(-50%,-50%) scale(1)}50%{box-shadow:0 0 20px 8px rgba(255,40,60,0.9);transform:translate(-50%,-50%) scale(1.3)}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scoreFloat{0%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-60px) scale(1.4)}}
        @keyframes shake1{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}
        @keyframes shake2{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
      `}</style>

      {/* ═══════════════════════════════════════════
          LAYER 1 (z:1) — BLACK HOLE behind everything
          ═══════════════════════════════════════════ */}
      <div style={{
        position: "absolute",
        left: cx - holeCanvasSize / 2,
        top: cy - holeCanvasSize / 2,
        width: holeCanvasSize,
        height: holeCanvasSize,
        zIndex: 1, pointerEvents: "none",
      }}>
        <BlackHole size={holeCanvasSize} radius={holeRadius} />
      </div>

      {/* ═══════════════════════════════════════════
          LAYER 2 (z:10) — GAME INTERFACE on top
          ═══════════════════════════════════════════ */}
      <svg
        style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}
        width={dims.w} height={dims.h}
      >
        <circle cx={cx} cy={cy} r={circleR} fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={circleR} fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth={circleR * 0.4} strokeDasharray="2 8" />

        {showLine && lineTarget && (
          <line x1={dotX} y1={dotY}
            x2={lerp(dotX, lineEndX, lineProgress)} y2={lerp(dotY, lineEndY, lineProgress)}
            stroke="rgba(168,85,247,0.8)" strokeWidth={3} strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 6px rgba(168,85,247,0.5))" }} />
        )}
        {showLine && lineTarget && lineProgress >= 1 && (
          <circle cx={lineEndX} cy={lineEndY} r={5} fill="rgba(168,85,247,0.6)"
            style={{ filter: "drop-shadow(0 0 8px rgba(168,85,247,0.8))" }} />
        )}

        {dragPath.length > 1 && (
          <polyline points={dragPath.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.3))" }} />
        )}
      </svg>

      {/* Red pulsing dot (z:15) */}
      {gameState === "playing" && !showLine && (
        <div style={{
          position: "absolute", left: dotX, top: dotY,
          width: 18 + dotPulse * 6, height: 18 + dotPulse * 6,
          borderRadius: "50%", background: "radial-gradient(circle, #ff3050, #cc1030)",
          transform: "translate(-50%,-50%)", zIndex: 15,
          animation: "pulseRed 1s ease-in-out infinite",
          cursor: "pointer", pointerEvents: "auto",
        }} />
      )}

      {/* ═══ HUD (z:20) ═══ */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "3vh 5vw", display: "flex", justifyContent: "space-between",
        alignItems: "center", zIndex: 20,
        animation: shakeLevel === 2 ? "shake2 0.15s infinite" : shakeLevel === 1 ? "shake1 0.2s infinite" : "none",
      }}>
        <div style={{ color: "#a855f7", fontSize: "clamp(11px,2.5vw,16px)", letterSpacing: 2, opacity: 0.8 }}>
          LVL <span style={{ color: "#fff", fontWeight: 700 }}>{level}</span>
          <span style={{ color: "#555", margin: "0 6px" }}>/</span><span style={{ color: "#555" }}>{TOTAL_LEVELS}</span>
        </div>
        <div style={{ color: "#fff", fontSize: "clamp(14px,3.5vw,22px)", fontWeight: 700, letterSpacing: 3 }}>{score}</div>
      </div>

      {gameState === "playing" && (
        <div style={{
          position: "absolute", top: "7vh", left: "5vw", right: "5vw", height: 3,
          background: "rgba(255,255,255,0.06)", borderRadius: 2, zIndex: 20, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${timerWidth}%`, background: timerColor,
            borderRadius: 2, transition: "width 0.05s linear, background 0.3s",
            boxShadow: `0 0 10px ${timerColor}`,
          }} />
        </div>
      )}

      {/* Feedback */}
      {feedback && (gameState === "success" || gameState === "fail" || gameState === "win" || gameState === "gameover") && (
        <div key={feedback + level} style={{
          position: "absolute", left: "50%", top: cy - circleR - 50,
          transform: "translateX(-50%)",
          color: (gameState === "success" || gameState === "win") ? "#a855f7" : "#ff3050",
          fontSize: "clamp(18px,5vw,32px)", fontWeight: 700, letterSpacing: 3, zIndex: 30,
          animation: "scoreFloat 1.2s ease-out forwards", pointerEvents: "none",
          textShadow: (gameState === "success" || gameState === "win")
            ? "0 0 20px rgba(168,85,247,0.8)" : "0 0 20px rgba(255,48,80,0.8)",
        }}>{feedback}</div>
      )}

      {/* ═══ Overlays (z:50) ═══ */}
      {(gameState === "menu" || gameState === "fail" || gameState === "gameover" || gameState === "win") && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", zIndex: 50,
          background: gameState === "menu" ? "rgba(8,6,14,0.85)" : "rgba(8,6,14,0.7)",
          animation: "fadeInUp 0.5s ease-out",
        }}>
          {gameState === "menu" && (<>
            <div style={{ fontSize: "clamp(36px,10vw,72px)", fontWeight: 700, color: "#fff", letterSpacing: 8, marginBottom: 8, textShadow: "0 0 40px rgba(168,85,247,0.5)" }}>THE HOLE</div>
            <div style={{ fontSize: "clamp(10px,2.5vw,14px)", color: "rgba(168,85,247,0.5)", letterSpacing: 6, marginBottom: "6vh", textTransform: "uppercase" }}>feed the void</div>
            <button onClick={startGame} style={{ background: "none", border: "1px solid rgba(168,85,247,0.4)", color: "#a855f7", padding: "12px 40px", fontSize: "clamp(12px,3vw,16px)", letterSpacing: 4, cursor: "pointer", borderRadius: 0, transition: "all 0.3s", textTransform: "uppercase", fontFamily: "'Space Mono',monospace" }}
              onMouseEnter={(e) => { e.target.style.background = "rgba(168,85,247,0.15)"; e.target.style.borderColor = "rgba(168,85,247,0.8)"; }}
              onMouseLeave={(e) => { e.target.style.background = "none"; e.target.style.borderColor = "rgba(168,85,247,0.4)"; }}>Begin</button>
            <div style={{ marginTop: "4vh", color: "rgba(255,255,255,0.2)", fontSize: "clamp(9px,2vw,11px)", textAlign: "center", lineHeight: 1.8, letterSpacing: 1, maxWidth: "80%" }}>tap the red dot · trace the line · grow the hole</div>
          </>)}
          {gameState === "win" && (<>
            <div style={{ fontSize: "clamp(24px,7vw,48px)", fontWeight: 700, color: "#a855f7", letterSpacing: 6, marginBottom: 16, textShadow: "0 0 30px rgba(168,85,247,0.6)" }}>VOID COMPLETE</div>
            <div style={{ fontSize: "clamp(28px,8vw,56px)", fontWeight: 700, color: "#fff", marginBottom: 8 }}>{score}</div>
            <div style={{ fontSize: "clamp(10px,2.5vw,13px)", color: "rgba(255,255,255,0.3)", letterSpacing: 4, marginBottom: "5vh" }}>FINAL SCORE</div>
            <button onClick={startGame} style={{ background: "none", border: "1px solid rgba(168,85,247,0.4)", color: "#a855f7", padding: "12px 40px", fontSize: "clamp(12px,3vw,16px)", letterSpacing: 4, cursor: "pointer", borderRadius: 0, textTransform: "uppercase", fontFamily: "'Space Mono',monospace" }}>Play Again</button>
          </>)}
          {gameState === "gameover" && (<>
            <div style={{ fontSize: "clamp(20px,6vw,40px)", fontWeight: 700, color: "#ff3050", letterSpacing: 4, marginBottom: 16 }}>CONSUMED</div>
            <div style={{ fontSize: "clamp(22px,6vw,44px)", fontWeight: 700, color: "#fff", marginBottom: 8 }}>{score}</div>
            <div style={{ fontSize: "clamp(10px,2.5vw,13px)", color: "rgba(255,255,255,0.3)", letterSpacing: 4, marginBottom: "5vh" }}>LEVEL {level} · FINAL SCORE</div>
            <button onClick={startGame} style={{ background: "none", border: "1px solid rgba(255,48,80,0.4)", color: "#ff3050", padding: "12px 40px", fontSize: "clamp(12px,3vw,16px)", letterSpacing: 4, cursor: "pointer", borderRadius: 0, textTransform: "uppercase", fontFamily: "'Space Mono',monospace" }}>Retry</button>
          </>)}
          {gameState === "fail" && (<>
            <div style={{ fontSize: "clamp(16px,4vw,28px)", fontWeight: 700, color: "#ff3050", letterSpacing: 3, marginBottom: 20 }}>{feedback || "MISSED"}</div>
            <button onClick={retryLevel} style={{ background: "none", border: "1px solid rgba(255,48,80,0.4)", color: "#ff3050", padding: "10px 30px", fontSize: "clamp(11px,2.5vw,14px)", letterSpacing: 3, cursor: "pointer", borderRadius: 0, textTransform: "uppercase", fontFamily: "'Space Mono',monospace" }}>Retry</button>
          </>)}
        </div>
      )}
    </div>
  );
}
