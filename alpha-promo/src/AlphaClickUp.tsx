/**
 * Alpha Tech — Publicité Style ClickUp (v2)
 * Grille 2×2 pour les téléphones, mise en page précise, style épuré
 */
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "900"],
  subsets: ["latin"],
});

// ─── Tokens ──────────────────────────────────────────────────────────────────
const BLUE    = "#2563eb";
const BLUE_LT = "#eff6ff";
const BLUE_MD = "#dbeafe";
const DARK    = "#0f172a";
const GRAY    = "#64748b";
const WHITE   = "#ffffff";
const SUCCESS = "#16a34a";
const WARNING = "#d97706";
const DANGER  = "#dc2626";
const PURPLE  = "#7c3aed";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sp(
  frame: number,
  from: number,
  fps: number,
  cfg = { damping: 80, stiffness: 200 },
  dur = 28,
) {
  return spring({ frame: frame - from, fps, config: cfg, durationInFrames: dur });
}

function fade2(frame: number, a: number, b: number) {
  return interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ─── Shared backgrounds ───────────────────────────────────────────────────────
const LightBg: React.FC<{ tint?: string }> = ({ tint = "#f0f6ff" }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 120% 80% at 55% 35%, ${tint} 0%, #ffffff 65%)`,
    }}
  />
);

const Dots: React.FC = () => (
  <AbsoluteFill style={{ overflow: "hidden", opacity: 0.04 }}>
    {[...Array(20)].map((_, col) =>
      [...Array(12)].map((_, row) => (
        <div
          key={`${col}-${row}`}
          style={{
            position: "absolute",
            left: col * 96 + 48,
            top: row * 90 + 45,
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: DARK,
          }}
        />
      )),
    )}
  </AbsoluteFill>
);

// ─── Badge / chip ─────────────────────────────────────────────────────────────
const Chip: React.FC<{
  label: string;
  emoji?: string;
  color?: string;
  light?: boolean;
}> = ({ label, emoji, color = BLUE, light = false }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: light ? color + "18" : color,
      borderRadius: 99,
      padding: light ? "8px 20px" : "9px 24px",
      border: light ? `1.5px solid ${color}40` : "none",
    }}
  >
    {emoji && <span style={{ fontSize: 15 }}>{emoji}</span>}
    <span
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: light ? color : WHITE,
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </span>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// ─── PHONE SCREENS ───────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

const SBar: React.FC = () => (
  <div
    style={{
      background: WHITE,
      padding: "10px 20px 6px",
      display: "flex",
      justifyContent: "space-between",
      fontSize: 11,
      fontWeight: 600,
      color: DARK,
    }}
  >
    <span>9:41</span>
    <span>▲ 🔋</span>
  </div>
);

// Login — 4 profils
const LoginScreen: React.FC = () => (
  <div style={{ background: "#f8fafc", height: "100%", display: "flex", flexDirection: "column" }}>
    <SBar />
    <div style={{ background: BLUE, padding: "28px 20px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: WHITE,
          margin: "0 auto 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 900, color: BLUE }}>α</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>Alpha Tech</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
        Qui êtes-vous ?
      </div>
    </div>
    <div
      style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}
    >
      {[
        { role: "Espace Direction", emoji: "🏫", color: PURPLE, bg: "#f5f3ff" },
        { role: "Espace Prof",      emoji: "👨‍🏫", color: BLUE,   bg: BLUE_LT  },
        { role: "Espace Parent",    emoji: "👨‍👩‍👦", color: SUCCESS, bg: "#f0fdf4" },
        { role: "Espace Élève",     emoji: "🎓", color: "#0891b2", bg: "#ecfeff" },
      ].map(({ role, emoji, color, bg }) => (
        <div
          key={role}
          style={{
            background: WHITE,
            borderRadius: 13,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            borderLeft: `4px solid ${color}`,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{role}</div>
            <div style={{ fontSize: 11, color: GRAY }}>Se connecter →</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Direction
const DirectionScreen: React.FC = () => (
  <div style={{ background: "#f5f5f5", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <SBar />
    <div style={{ background: PURPLE, padding: "14px 16px 26px" }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>Espace Direction</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: WHITE }}>Dir. Diallo 🏫</div>
    </div>
    <div style={{ display: "flex", gap: 8, padding: "0 12px", marginTop: -12 }}>
      {[["312", "Élèves"], ["18", "Profs"], ["94", "Cours"]].map(([v, l]) => (
        <div key={l} style={{ flex: 1, background: WHITE, borderRadius: 11, padding: "9px 10px", boxShadow: "0 2px 8px rgba(0,0,0,0.09)" }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: DARK }}>{v}</div>
          <div style={{ fontSize: 10, color: GRAY }}>{l}</div>
        </div>
      ))}
    </div>
    <div style={{ padding: "10px 12px 0" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 7 }}>📊 Résultats récents</div>
      {[
        { n: "Marie Dubois", s: "15.2/20", st: "Excellent", c: SUCCESS },
        { n: "Kwamé Asante", s: "8.4/20",  st: "Attention", c: DANGER  },
        { n: "Fatou Sow",    s: "13.6/20", st: "Bien",      c: BLUE    },
      ].map(({ n, s, st, c }) => (
        <div key={n} style={{ background: WHITE, borderRadius: 10, padding: "9px 11px", display: "flex", alignItems: "center", gap: 9, marginBottom: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: BLUE_MD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: DARK }}>{n}</div>
            <div style={{ fontSize: 10, color: GRAY }}>{s}</div>
          </div>
          <span style={{ background: c + "18", color: c, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{st}</span>
        </div>
      ))}
    </div>
  </div>
);

// Professeur
const TeacherScreen: React.FC = () => (
  <div style={{ background: "#f5f5f5", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <SBar />
    <div style={{ background: "#1e1b4b", padding: "14px 16px 26px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>Bonjour,</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: WHITE }}>M. Leblanc 👨‍🏫</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12 }}>✨</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>IA</span>
        </div>
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, padding: "0 12px", marginTop: -12 }}>
      {[["3", "Classes"], ["2", "Publiés"], ["3", "À corriger"]].map(([v, l]) => (
        <div key={l} style={{ flex: 1, background: WHITE, borderRadius: 11, padding: "9px 10px", boxShadow: "0 2px 8px rgba(0,0,0,0.09)" }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: DARK }}>{v}</div>
          <div style={{ fontSize: 10, color: GRAY }}>{l}</div>
        </div>
      ))}
    </div>
    <div style={{ padding: "10px 12px 0" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 7 }}>📝 À corriger</div>
      {[
        { s: "Kwamé Asante",  e: "Fractions #3",       t: "1h" },
        { s: "Amina Diallo",  e: "Rédaction météo",    t: "2h" },
        { s: "Lucas Martin",  e: "Algèbre #7",          t: "4h" },
      ].map(({ s, e, t }) => (
        <div key={s} style={{ background: WHITE, borderRadius: 10, padding: "9px 11px", display: "flex", alignItems: "center", gap: 9, marginBottom: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: BLUE_LT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: DARK }}>{s}</div>
            <div style={{ fontSize: 10, color: GRAY }}>{e}</div>
          </div>
          <div style={{ background: BLUE, borderRadius: 6, padding: "4px 9px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: WHITE }}>Corriger</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Parent
const ParentScreen: React.FC = () => (
  <div style={{ background: "#f5f5f5", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <SBar />
    <div style={{ background: "#064e3b", padding: "14px 16px 22px" }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>Espace Parent</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: WHITE }}>Parent Sow 👨‍👩‍👦</div>
    </div>
    <div style={{ padding: "0 12px", marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ background: WHITE, borderRadius: 12, padding: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#064e3b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>Fatou Sow</div>
          <div style={{ fontSize: 11, color: GRAY }}>Classe : 3ème B</div>
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "5px 9px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: SUCCESS }}>14.2/20</div>
        </div>
      </div>
      <div style={{ background: "#fef2f2", borderRadius: 12, padding: 12, border: "1px solid #fecaca", display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 26 }}>💳</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: DANGER }}>Paiement en attente</div>
          <div style={{ fontSize: 10, color: "#dc2626" }}>Mensualité — 50 000 FCFA</div>
        </div>
        <div style={{ background: DANGER, borderRadius: 6, padding: "5px 10px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: WHITE }}>PAYER</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["2 jours", "Absences", WARNING], ["14.2", "Moyenne", SUCCESS] as const].map(
          ([v, l, c]) => (
            <div key={l} style={{ flex: 1, background: WHITE, borderRadius: 10, padding: 11, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderTop: `3px solid ${c}` }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: DARK }}>{v}</div>
              <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>{l}</div>
            </div>
          ),
        )}
      </div>
    </div>
  </div>
);

// Élève
const StudentScreen: React.FC = () => (
  <div style={{ background: "#f5f5f5", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <SBar />
    <div style={{ background: BLUE, padding: "14px 16px 30px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>Bonjour,</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: WHITE }}>Kwamé 🎓</div>
      </div>
      <span style={{ fontSize: 20 }}>🔔</span>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "0 11px", marginTop: -14 }}>
      {[
        { i: "⭐", l: "Moyenne",  v: "13.4", c: "#fef9c3" },
        { i: "📚", l: "Cours",    v: "6",    c: BLUE_LT  },
        { i: "⏰", l: "Absences", v: "2",    c: "#fef2f2" },
        { i: "📝", l: "Exercices",v: "3",    c: "#f0fdf4" },
      ].map(({ i, l, v, c }) => (
        <div key={l} style={{ flex: "1 1 44%", background: WHITE, borderRadius: 10, padding: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.09)" }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: c, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 5, fontSize: 13 }}>{i}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{v}</div>
          <div style={{ fontSize: 9, color: GRAY }}>{l}</div>
        </div>
      ))}
    </div>
    <div style={{ padding: "9px 11px 0" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 6 }}>Mes cours</div>
      {[
        { e: "📐", t: "Introduction aux Dérivées", s: "Maths",   p: 73 },
        { e: "🔬", t: "Réactions chimiques",       s: "Physique", p: 45 },
      ].map(({ e, t, s, p }) => (
        <div key={t} style={{ background: WHITE, borderRadius: 10, padding: 9, display: "flex", alignItems: "center", gap: 9, marginBottom: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{e}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: GRAY }}>{s}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: DARK, marginBottom: 3 }}>{t}</div>
            <div style={{ height: 3, background: "#f3f4f6", borderRadius: 99 }}>
              <div style={{ width: `${p}%`, height: "100%", background: BLUE, borderRadius: 99 }} />
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: BLUE }}>{p}%</div>
        </div>
      ))}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// ─── PHONE FRAME — layout matches visual size exactly ────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
//
// Strategy: outer <div> has the SCALED dimensions so flex/grid see the correct
// size. The inner <div> is transform:scale(S) from top-left, which visually
// shrinks the content to fit the outer box.
//
const PS = 0.62; // phone scale factor
const PW_INNER = 320;
const PH_CONTENT = 580;
const PH_BAR = 30;
const PH_INNER = PH_CONTENT + PH_BAR; // 610

const PW = Math.round(PW_INNER * PS); // 198
const PH = Math.round(PH_INNER * PS); // 378

const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: PW,
      height: PH,
      borderRadius: Math.round(42 * PS),
      overflow: "hidden",
      position: "relative",
      background: "#1c1c1e",
      boxShadow: [
        `0 0 0 ${Math.round(8 * PS)}px #111`,
        `0 0 0 ${Math.round(11 * PS)}px #2d2d2d`,
        `0 ${Math.round(22 * PS)}px ${Math.round(60 * PS)}px rgba(0,0,0,0.5)`,
      ].join(", "),
      flexShrink: 0,
    }}
  >
    {/* Scaled inner */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        transform: `scale(${PS})`,
        transformOrigin: "top left",
        width: PW_INNER,
        height: PH_INNER,
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 118,
          height: 28,
          background: "#111",
          borderRadius: "0 0 18px 18px",
          zIndex: 10,
        }}
      />
      {/* Screen */}
      <div style={{ height: PH_CONTENT, overflow: "hidden" }}>{children}</div>
      {/* Home bar */}
      <div style={{ background: WHITE, paddingBottom: 8 }}>
        <div style={{ width: 100, height: 4, background: "#d1d5db", borderRadius: 2, margin: "8px auto" }} />
      </div>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// ─── SCÈNE 1 — CHAOS ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
const CHAOS = [
  { e: "📧", l: "Email",      x: 140,  y: 170, r: -14 },
  { e: "📊", l: "Excel",      x: 1680, y: 185, r:  11 },
  { e: "📅", l: "Agenda",     x: 260,  y: 760, r:  -8 },
  { e: "💬", l: "WhatsApp",   x: 1690, y: 770, r:  17 },
  { e: "📁", l: "Drive",      x: 110,  y: 470, r:  19 },
  { e: "📋", l: "Formulaire", x: 1770, y: 465, r: -11 },
  { e: "📱", l: "SMS",        x: 560,  y: 110, r:   8 },
  { e: "🖨️", l: "Impression", x: 1290, y: 120, r: -19 },
  { e: "📞", l: "Téléphone",  x: 470,  y: 875, r:  -5 },
  { e: "📝", l: "Notes",      x: 1410, y: 860, r:  13 },
  { e: "🗓️", l: "Calendrier", x: 930,  y: 75,  r:  10 },
  { e: "📌", l: "Rappels",    x: 895,  y: 955, r: -17 },
];

export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardOp = fade2(frame, 38, 58);
  const cardY  = interpolate(frame, [38, 58], [28, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily, background: WHITE }}>
      <LightBg tint="#fff7ed" />
      <Dots />

      {/* Scattered icons */}
      {CHAOS.map((ic, i) => {
        const scatterP = sp(frame, i * 3, fps, { damping: 55, stiffness: 110 }, 32);
        const floatY   = Math.sin((frame + i * 28) * 0.042) * 9;
        const op       = fade2(frame, i * 3, i * 3 + 20);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: ic.x,
              top: ic.y + floatY,
              opacity: op,
              transform: `rotate(${ic.r}deg) scale(${interpolate(scatterP, [0, 1], [0.2, 1])})`,
            }}
          >
            <div
              style={{
                background: WHITE,
                borderRadius: 18,
                padding: "13px 18px",
                boxShadow: "0 8px 28px rgba(0,0,0,0.11)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                border: "1px solid rgba(0,0,0,0.055)",
              }}
            >
              <span style={{ fontSize: 38 }}>{ic.e}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: GRAY, whiteSpace: "nowrap" }}>
                {ic.l}
              </span>
            </div>
          </div>
        );
      })}

      {/* Center card */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            opacity: cardOp,
            transform: `translateY(${cardY}px)`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(24px)",
              borderRadius: 26,
              padding: "38px 68px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.13)",
              border: "1.5px solid rgba(0,0,0,0.055)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: WARNING,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              😵 LE PROBLÈME
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: DARK,
                lineHeight: 1.12,
                maxWidth: 760,
              }}
            >
              La gestion scolaire<br />
              <span style={{ color: DANGER }}>est devenue complexe.</span>
            </div>
            <div style={{ fontSize: 21, color: GRAY, marginTop: 16, fontWeight: 500 }}>
              Trop d'outils. Trop d'apps. Trop de temps perdu.
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ─── SCÈNE 2 — SOLUTION MOBILE  (grille 2×2)  ────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
//
//  Phase 1 (0–78f)  : Un grand téléphone centré (écran login)
//  Phase 2 (78–230f): Grille 2 × 2 — chaque téléphone avec label AU-DESSUS
//
// Layout de la grille (en px dans le canvas 1920×1080) :
//   ┌──────────────┐   ┌──────────────┐
//   │  Direction   │   │  Professeur  │
//   └──────────────┘   └──────────────┘
//   ┌──────────────┐   ┌──────────────┐
//   │   Parent     │   │    Élève     │
//   └──────────────┘   └──────────────┘
//
const COL_GAP  = 110; // espace horizontal entre les 2 colonnes
const ROW_GAP  = 46;  // espace vertical entre les 2 rangées
const LABEL_H  = 40;  // hauteur de la pastille label
const LABEL_MB = 10;  // marge entre label et téléphone
const TITLE_END = 148; // y de fin du titre (top 52 + ~66px headline + ~30 tag)

const GRID_W  = 2 * PW + COL_GAP;               // 506
const GRID_X0 = Math.round((1920 - GRID_W) / 2); // 707

const R1_LABEL = TITLE_END + 8;                              // y labels rangée 1
const R1_PHONE = R1_LABEL + LABEL_H + LABEL_MB;             // y phones rangée 1
const R2_LABEL = R1_PHONE + PH + ROW_GAP;                   // y labels rangée 2
const R2_PHONE = R2_LABEL + LABEL_H + LABEL_MB;             // y phones rangée 2
// Vérif : R2_PHONE + PH = R2_PHONE + 378 doit être ≤ 1080

const PROFILES = [
  { screen: <DirectionScreen />, label: "Direction",  emoji: "🏫",   color: PURPLE,    col: 0, row: 0, delay: 80  },
  { screen: <TeacherScreen />,   label: "Professeur", emoji: "👨‍🏫",  color: BLUE,      col: 1, row: 0, delay: 96  },
  { screen: <ParentScreen />,    label: "Parent",     emoji: "👨‍👩‍👦", color: SUCCESS,   col: 0, row: 1, delay: 112 },
  { screen: <StudentScreen />,   label: "Élève",      emoji: "🎓",   color: "#0891b2", col: 1, row: 1, delay: 128 },
];

export const SceneMobile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phase2 = frame >= 78;

  // Phase 1
  const p1App  = sp(frame, 16, fps, { damping: 65, stiffness: 155 }, 35);
  const p1Op   = fade2(frame, 16, 42);
  const p1Float = Math.sin(frame * 0.042) * 9;

  // Titre
  const tOp = fade2(frame, 5, 26);
  const tY  = interpolate(frame, [5, 26], [22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily, background: WHITE }}>
      <LightBg tint="#eff6ff" />
      <Dots />

      {/* ── Titre ── */}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: tOp,
          transform: `translateY(${tY}px)`,
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: BLUE,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 10,
          }}
        >
          ✅ LA SOLUTION
        </div>
        <div style={{ fontSize: 60, fontWeight: 900, color: DARK, lineHeight: 1.08 }}>
          {phase2 ? (
            <>
              4 profils.{" "}
              <span style={{ color: BLUE }}>Une seule app.</span>
            </>
          ) : (
            <>
              Tout dans{" "}
              <span style={{ color: BLUE }}>une seule app.</span>
            </>
          )}
        </div>
      </div>

      {/* ── Phase 1 : grand téléphone centré ── */}
      {!phase2 && (
        <AbsoluteFill
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            style={{
              marginTop: 110,
              opacity: p1Op,
              transform: `translateY(${
                interpolate(p1App, [0, 1], [90, 0]) + p1Float
              }px) scale(${interpolate(p1App, [0, 1], [0.72, 1])})`,
            }}
          >
            {/* Grand mockup phase 1 (non réduit) */}
            <div
              style={{
                width: 320,
                borderRadius: 44,
                background: "#1c1c1e",
                boxShadow:
                  "0 0 0 10px #111, 0 0 0 13px #2d2d2d, 0 32px 80px rgba(0,0,0,0.5)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 118,
                  height: 28,
                  background: "#111",
                  borderRadius: "0 0 18px 18px",
                  zIndex: 10,
                }}
              />
              <div style={{ height: 580, overflow: "hidden" }}>
                <LoginScreen />
              </div>
              <div style={{ background: WHITE, paddingBottom: 8 }}>
                <div
                  style={{
                    width: 100,
                    height: 4,
                    background: "#d1d5db",
                    borderRadius: 2,
                    margin: "8px auto",
                  }}
                />
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ── Phase 2 : grille 2×2 ── */}
      {phase2 &&
        PROFILES.map(({ screen, label, emoji, color, col, row, delay }) => {
          const appear = sp(frame, delay, fps, { damping: 72, stiffness: 145 }, 32);
          const op     = fade2(frame, delay, delay + 18);
          const enterY = interpolate(appear, [0, 1], [55, 0]);
          const floatY = Math.sin((frame + delay * 1.5) * 0.036) * 5;

          const x      = GRID_X0 + col * (PW + COL_GAP);
          const labelY = row === 0 ? R1_LABEL : R2_LABEL;
          const phoneY = row === 0 ? R1_PHONE : R2_PHONE;

          return (
            <React.Fragment key={label}>
              {/* Label au-dessus */}
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: labelY,
                  width: PW,
                  display: "flex",
                  justifyContent: "center",
                  opacity: op,
                  transform: `translateY(${enterY}px)`,
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    background: color,
                    borderRadius: 99,
                    padding: "7px 18px",
                    boxShadow: `0 5px 18px ${color}55`,
                  }}
                >
                  <span style={{ fontSize: 15 }}>{emoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>
                    {label}
                  </span>
                </div>
              </div>

              {/* Téléphone */}
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: phoneY + floatY,
                  opacity: op,
                  transform: `translateY(${enterY}px)`,
                  zIndex: 5,
                }}
              >
                <PhoneFrame>{screen}</PhoneFrame>
              </div>
            </React.Fragment>
          );
        })}
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ─── DASHBOARD WEB MOCKUPS ───────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

const KpiCard: React.FC<{
  icon: string;
  title: string;
  value: string;
  sub: string;
  trend?: string;
}> = ({ icon, title, value, sub, trend }) => (
  <div
    style={{
      background: WHITE,
      borderRadius: 14,
      padding: "16px 18px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
      flex: 1,
      minWidth: 0,
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: BLUE_LT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        {icon}
      </div>
      {trend && (
        <span style={{ fontSize: 11, color: SUCCESS, fontWeight: 700 }}>{trend}</span>
      )}
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, color: DARK, marginBottom: 3 }}>{value}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: DARK, marginBottom: 1 }}>{title}</div>
    <div style={{ fontSize: 11, color: GRAY }}>{sub}</div>
  </div>
);

const DirectionDashboard: React.FC = () => (
  <div style={{ background: "#f8fafc", height: "100%", display: "flex", flexDirection: "column", padding: "20px 24px", gap: 14, overflow: "hidden" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: DARK }}>Bonjour, Directeur Diallo 👋</div>
        <div style={{ fontSize: 12, color: GRAY }}>Mardi 19 mai 2026</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ background: WHITE, borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: DARK, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          📤 Exporter
        </div>
        <div style={{ background: BLUE, borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: WHITE, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
          + Nouvel élève
        </div>
      </div>
    </div>
    <div style={{ display: "flex", gap: 12 }}>
      <KpiCard icon="🎓" title="Élèves inscrits"  value="312"  sub="287 présents aujourd'hui" trend="↑ 3.2%" />
      <KpiCard icon="👨‍🏫" title="Professeurs"      value="18"   sub="16 actifs aujourd'hui" />
      <KpiCard icon="📚" title="Cours publiés"    value="94"   sub="73 complétés" trend="↑ 12%" />
      <KpiCard icon="📊" title="Moyenne générale" value="13.7" sub="sur 20 points" />
    </div>
    <div style={{ background: WHITE, borderRadius: 14, padding: "14px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", flex: 1, overflow: "hidden" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 12 }}>Élèves récents</div>
      <div style={{ display: "flex", padding: "0 0 7px", borderBottom: "1px solid #f1f5f9" }}>
        {["Élève", "Classe", "Moyenne", "Statut"].map((h, i) => (
          <div key={h} style={{ flex: i === 0 ? 2 : 1, fontSize: 11, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</div>
        ))}
      </div>
      {[
        { name: "Marie Dubois", cls: "6ème A", score: 15.2, status: "Excellent", c: SUCCESS },
        { name: "Kwamé Asante", cls: "5ème B", score: 8.4,  status: "Attention", c: DANGER  },
        { name: "Fatou Sow",    cls: "4ème C", score: 13.6, status: "Bien",      c: BLUE    },
        { name: "Lucas Martin", cls: "3ème A", score: 11.8, status: "Passable",  c: WARNING  },
        { name: "Amina Diallo", cls: "6ème B", score: 9.2,  status: "Attention", c: DANGER  },
      ].map(({ name, cls, score, status, c }) => (
        <div key={name} style={{ display: "flex", padding: "9px 0", borderBottom: "1px solid #f8fafc", alignItems: "center" }}>
          <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: BLUE_MD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>👤</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{name}</span>
          </div>
          <div style={{ flex: 1, fontSize: 12, color: GRAY }}>{cls}</div>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: DARK }}>{score}/20</div>
          <div style={{ flex: 1 }}>
            <span style={{ background: c + "18", color: c, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{status}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TeacherDashboard: React.FC = () => (
  <div style={{ background: "#f8fafc", height: "100%", display: "flex", flexDirection: "column", padding: "20px 24px", gap: 14, overflow: "hidden" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: DARK }}>Bonjour, M. Leblanc 👨‍🏫</div>
        <div style={{ fontSize: 12, color: GRAY }}>Mardi 19 mai 2026</div>
      </div>
      <div style={{ background: BLUE, borderRadius: 10, padding: "9px 18px", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
        <span style={{ fontSize: 15 }}>✨</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Générer avec IA</span>
      </div>
    </div>
    <div style={{ display: "flex", gap: 12 }}>
      <KpiCard icon="👥" title="Mes classes"   value="3" sub="84 élèves au total" />
      <KpiCard icon="📖" title="Cours publiés" value="2" sub="1 brouillon" />
      <KpiCard icon="✅" title="À corriger"    value="3" sub="Exercices en attente" />
    </div>
    <div style={{ background: WHITE, borderRadius: 14, padding: "14px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", flex: 1, overflow: "hidden" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 12 }}>📝 Exercices en attente de correction</div>
      {[
        { s: "Kwamé Asante", e: "Exercice Fractions #3",  c: "6ème A", t: "Il y a 1h" },
        { s: "Amina Diallo", e: "Rédaction — La météo",   c: "5ème B", t: "Il y a 2h" },
        { s: "Lucas Martin", e: "Problème algèbre #7",    c: "4ème A", t: "Il y a 4h" },
      ].map(({ s, e, c, t }) => (
        <div key={s} style={{ display: "flex", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f8fafc", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: BLUE_LT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{s}</div>
            <div style={{ fontSize: 11, color: GRAY }}>{e} · {c}</div>
          </div>
          <div style={{ fontSize: 11, color: GRAY }}>{t}</div>
          <div style={{ background: BLUE, borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: WHITE }}>Corriger</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Laptop mockup ─────────────────────────────────────────────────────────
const LaptopMockup: React.FC<{ children: React.ReactNode; scale?: number }> = ({
  children,
  scale = 1,
}) => (
  <div style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
    <div
      style={{
        width: 880,
        background: "#1a1a1a",
        borderRadius: "16px 16px 0 0",
        padding: 11,
        boxShadow: "0 -4px 30px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#444", margin: "0 auto 7px" }} />
      <div style={{ borderRadius: 9, overflow: "hidden", height: 510, background: WHITE }}>
        {/* Browser chrome */}
        <div
          style={{
            background: "#f1f5f9",
            padding: "7px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", gap: 5 }}>
            {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              background: WHITE,
              borderRadius: 6,
              padding: "4px 11px",
              fontSize: 11,
              color: GRAY,
              border: "1px solid #e2e8f0",
            }}
          >
            🔒 alpha-tech.app/dashboard
          </div>
        </div>
        {/* Content */}
        <div style={{ display: "flex", height: "calc(100% - 32px)" }}>
          {/* Sidebar */}
          <div
            style={{
              width: 175,
              background: "#0f172a",
              padding: "14px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 8px", marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: WHITE }}>α</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>Alpha Tech</span>
            </div>
            {[
              { icon: "📊", label: "Dashboard",   active: true  },
              { icon: "🎓", label: "Élèves",       active: false },
              { icon: "👨‍🏫", label: "Professeurs",  active: false },
              { icon: "📚", label: "Cours",        active: false },
              { icon: "💰", label: "Finances",     active: false },
              { icon: "📈", label: "Rapports",     active: false },
            ].map(({ icon, label, active }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 9px",
                  borderRadius: 7,
                  background: active ? BLUE : "transparent",
                }}
              >
                <span style={{ fontSize: 13 }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? WHITE : "#94a3b8" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
        </div>
      </div>
    </div>
    <div style={{ width: 880, height: 11, background: "#2a2a2a", borderRadius: "0 0 4px 4px" }} />
    <div style={{ width: 1060, height: 7, background: "#1a1a1a", borderRadius: "0 0 8px 8px", margin: "0 auto" }} />
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// ─── SCÈNE 3 — VERSION WEB ───────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export const ScenePC: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lapApp  = sp(frame, 12, fps, { damping: 72, stiffness: 155 }, 38);
  const lapOp   = fade2(frame, 12, 44);
  const lapFloat = Math.sin(frame * 0.026) * 5;

  const tOp = fade2(frame, 5, 24);
  const tY  = interpolate(frame, [5, 24], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const showTeacher = frame > 95;
  const switchOp   = fade2(frame, 88, 105);

  return (
    <AbsoluteFill style={{ fontFamily, background: WHITE }}>
      <LightBg tint="#f0f6ff" />
      <Dots />

      {/* Titre */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: tOp,
          transform: `translateY(${tY}px)`,
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          💻 VERSION BUREAU
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: DARK, lineHeight: 1.1 }}>
          {showTeacher ? (
            <>Interface <span style={{ color: BLUE }}>Professeur</span></>
          ) : (
            <>Dashboard <span style={{ color: PURPLE }}>Direction</span></>
          )}
        </div>
      </div>

      {/* Laptop */}
      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 155 }}
      >
        <div
          style={{
            opacity: lapOp,
            transform: `translateY(${
              interpolate(lapApp, [0, 1], [100, 0]) + lapFloat
            }px) scale(${interpolate(lapApp, [0, 1], [0.82, 1])})`,
          }}
        >
          <LaptopMockup scale={0.96}>
            {showTeacher ? <TeacherDashboard /> : <DirectionDashboard />}
          </LaptopMockup>
        </div>
      </AbsoluteFill>

      {/* Toggle pills */}
      <div
        style={{
          position: "absolute",
          bottom: 52,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 18,
          opacity: interpolate(frame, [44, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {[
          { label: "🏫 Direction",  color: PURPLE, active: !showTeacher },
          { label: "👨‍🏫 Professeur", color: BLUE,   active: showTeacher  },
        ].map(({ label, color, active }) => (
          <div
            key={label}
            style={{
              padding: "10px 26px",
              borderRadius: 99,
              background: active ? color : WHITE,
              border: `2px solid ${color}`,
              boxShadow: active ? `0 6px 20px ${color}44` : "0 2px 8px rgba(0,0,0,0.07)",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: active ? WHITE : color }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ─── SCÈNE 4 — FONCTIONNALITÉS ────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
const FEATURES = [
  { icon: "⭐", title: "Notes en temps réel",      desc: "Moyennes & bulletins consultables à tout moment.",    color: "#fef9c3", accent: "#ca8a04", x:  90, y: 210 },
  { icon: "💬", title: "Communication directe",     desc: "Parents & Profs connectés en un seul clic.",          color: BLUE_MD,  accent: BLUE,      x: 530, y: 130 },
  { icon: "📅", title: "Emplois du temps",          desc: "Planning hebdomadaire toujours synchronisé.",         color: "#f3e8ff", accent: PURPLE,    x: 980, y: 210 },
  { icon: "🤖", title: "IA EduBot",                 desc: "Correction auto & génération de QCM par l'IA.",      color: "#ecfdf5", accent: SUCCESS,   x: 1430, y:130 },
  { icon: "💳", title: "Paiement Mobile Money",     desc: "MTN MoMo & Airtel Money directement dans l'app.",    color: "#fef2f2", accent: DANGER,    x: 270, y: 650 },
  { icon: "📊", title: "Statistiques avancées",     desc: "Rapports & analytics pour la direction.",             color: "#fff7ed", accent: "#ea580c", x: 750, y: 720 },
  { icon: "📱", title: "100% Mobile",               desc: "Android & iOS — même expérience partout.",           color: "#f0fdf4", accent: SUCCESS,   x: 1245, y:640 },
];

export const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tOp = fade2(frame, 0, 20);

  return (
    <AbsoluteFill style={{ fontFamily, background: WHITE }}>
      <LightBg tint="#f8fafc" />
      <Dots />

      <div style={{ position: "absolute", top: 52, left: 0, right: 0, textAlign: "center", opacity: tOp, pointerEvents: "none" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          🚀 TOUT CE QU'IL VOUS FAUT
        </div>
        <div style={{ fontSize: 58, fontWeight: 900, color: DARK }}>
          Tout ce dont vous avez <span style={{ color: BLUE }}>besoin.</span>
        </div>
      </div>

      {FEATURES.map((card, i) => {
        const appear  = sp(frame, 10 + i * 11, fps, { damping: 68, stiffness: 175 }, 28);
        const floatY  = Math.sin((frame + i * 38) * 0.039) * 9;
        const floatR  = Math.sin((frame + i * 58) * 0.024) * 1.6;

        return (
          <div
            key={card.title}
            style={{
              position: "absolute",
              left: card.x,
              top: card.y + floatY,
              opacity: interpolate(appear, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(appear, [0, 1], [42, 0])}px) rotate(${floatR}deg) scale(${interpolate(appear, [0, 1], [0.65, 1])})`,
            }}
          >
            <div
              style={{
                width: 290,
                background: WHITE,
                borderRadius: 20,
                padding: "18px 22px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.09)",
                border: `1.5px solid ${card.accent}22`,
                borderTop: `4px solid ${card.accent}`,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  background: card.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  marginBottom: 11,
                }}
              >
                {card.icon}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 5 }}>
                {card.title}
              </div>
              <div style={{ fontSize: 12, color: GRAY, lineHeight: 1.55 }}>{card.desc}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ─── SCÈNE 5 — CALL TO ACTION ─────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoApp  = sp(frame, 5, fps, { damping: 62, stiffness: 210 }, 28);
  const titleOp  = fade2(frame, 30, 52);
  const titleY   = interpolate(frame, [30, 52], [28, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp    = fade2(frame, 50, 70);
  const btnOp    = fade2(frame, 66, 86);
  const btnScale = 1 + Math.sin(frame * 0.13) * 0.028;
  const logoFloat = Math.sin(frame * 0.042) * 6;

  return (
    <AbsoluteFill style={{ fontFamily, background: WHITE }}>
      <LightBg tint="#eff6ff" />
      <Dots />

      {/* Rings décoratifs */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 180 + i * 200,
            height: 180 + i * 200,
            borderRadius: "50%",
            border: `1.5px solid ${BLUE}`,
            opacity: fade2(frame, 5 + i * 7, 22 + i * 7) * 0.07,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: interpolate(logoApp, [0, 1], [0, 1]),
            transform: `scale(${interpolate(logoApp, [0, 1], [0.55, 1])}) translateY(${logoFloat}px)`,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: WHITE,
              boxShadow: "0 8px 40px rgba(37,99,235,0.22)",
              border: `3px solid ${BLUE_MD}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile("logo.png")}
              style={{ width: 86, height: 86, borderRadius: "50%", objectFit: "cover" }}
            />
          </div>
        </div>

        {/* Nom */}
        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 74, fontWeight: 900, color: DARK, lineHeight: 1.05 }}>
            <span style={{ color: BLUE }}>Alpha Tech</span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ opacity: subOp, textAlign: "center", marginBottom: 42 }}>
          <div style={{ fontSize: 27, fontWeight: 600, color: GRAY, maxWidth: 780, lineHeight: 1.42 }}>
            Tout votre établissement dans{" "}
            <span style={{ color: BLUE, fontWeight: 700 }}>une seule main.</span>
          </div>
        </div>

        {/* CTA */}
        <div style={{ opacity: btnOp, transform: `scale(${btnScale})` }}>
          <div
            style={{
              background: `linear-gradient(135deg, ${BLUE} 0%, #1d4ed8 100%)`,
              borderRadius: 99,
              padding: "22px 72px",
              boxShadow: `0 14px 44px rgba(37,99,235,0.42)`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}>🚀</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: WHITE }}>Essayer gratuitement</span>
          </div>
        </div>

        {/* Social proof */}
        <div
          style={{
            opacity: fade2(frame, 80, 100),
            marginTop: 30,
            display: "flex",
            gap: 44,
          }}
        >
          {[
            { val: "500+", label: "Élèves connectés" },
            { val: "4",    label: "Profils utilisateurs" },
            { val: "24/7", label: "Disponible" },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: DARK }}>{val}</div>
              <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ─── COMPOSITION PRINCIPALE ──────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
const T = 18;

export const AlphaClickUp: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={90}>
        <SceneProblem />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />

      <TransitionSeries.Sequence durationInFrames={230}>
        <SceneMobile />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />

      <TransitionSeries.Sequence durationInFrames={200}>
        <ScenePC />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />

      <TransitionSeries.Sequence durationInFrames={160}>
        <SceneFeatures />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: T })}
      />

      <TransitionSeries.Sequence durationInFrames={110}>
        <SceneCTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
