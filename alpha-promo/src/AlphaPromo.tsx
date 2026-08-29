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
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin"],
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const BLUE_PRIMARY = "#2563eb";
const BLUE_DARK = "#1e3a8a";
const ACCENT = "#60a5fa";
const WHITE = "#ffffff";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useSlideUp(from: number, duration = 25, distance = 40) {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const progress = spring({ frame: frame - from, fps, config: { damping: 80, stiffness: 200 }, durationInFrames: duration });
  return interpolate(progress, [0, 1], [distance, 0]);
}

function useScaleIn(from: number, duration = 20) {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const progress = spring({ frame: frame - from, fps, config: { damping: 60, stiffness: 300 }, durationInFrames: duration });
  return interpolate(progress, [0, 1], [0.7, 1]);
}

// ─── Shared background gradient ───────────────────────────────────────────────
const GradientBg: React.FC<{ from: string; to: string }> = ({ from, to }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    }}
  />
);

// Decorative circle blobs
const BlobDecor: React.FC<{ color?: string }> = ({ color = "rgba(255,255,255,0.06)" }) => (
  <>
    <div style={{ position: "absolute", top: -120, right: -120, width: 500, height: 500, borderRadius: "50%", background: color }} />
    <div style={{ position: "absolute", bottom: -80, left: -80, width: 360, height: 360, borderRadius: "50%", background: color }} />
    <div style={{ position: "absolute", top: "40%", left: "10%", width: 200, height: 200, borderRadius: "50%", background: color }} />
  </>
);

// ─── SCENE 1 — Intro ─────────────────────────────────────────────────────────
export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  useVideoConfig(); // needed for spring hooks

  const logoScale = useScaleIn(5, 30);
  const logoOpacity = interpolate(frame, [5, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const titleY = useSlideUp(25, 30);
  const titleOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const subtitleOpacity = interpolate(frame, [45, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleY = useSlideUp(45, 30);

  const taglineOpacity = interpolate(frame, [62, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pulsing glow on logo
  const glow = interpolate(Math.sin(frame / 15), [-1, 1], [0.3, 0.8]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBg from={BLUE_DARK} to={BLUE_PRIMARY} />
      <BlobDecor />

      {/* Center content */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>

        {/* Logo circle */}
        <div style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          marginBottom: 36,
          position: "relative",
        }}>
          <div style={{
            position: "absolute",
            inset: -16,
            borderRadius: "50%",
            background: `rgba(96,165,250,${glow})`,
            filter: "blur(20px)",
          }} />
          <div style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: WHITE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            position: "relative",
          }}>
            <Img
              src={staticFile("logo.png")}
              style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover" }}
            />
          </div>
        </div>

        {/* ALPHA TECH */}
        <div style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginBottom: 16,
        }}>
          <span style={{
            fontSize: 92,
            fontWeight: 900,
            color: WHITE,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>
            ALPHA TECH
          </span>
        </div>

        {/* Divider line */}
        <div style={{
          opacity: subtitleOpacity,
          width: interpolate(frame, [45, 75], [0, 600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          height: 3,
          background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
          borderRadius: 2,
          marginBottom: 20,
        }} />

        {/* Tagline */}
        <div style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          marginBottom: 12,
        }}>
          <span style={{
            fontSize: 34,
            fontWeight: 600,
            color: ACCENT,
            letterSpacing: "0.04em",
          }}>
            La Plateforme Scolaire Tout-en-Un
          </span>
        </div>

        <div style={{ opacity: taglineOpacity }}>
          <span style={{
            fontSize: 22,
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.02em",
          }}>
            Connectons Élèves • Enseignants • Parents • Direction
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Feature card component ───────────────────────────────────────────────────
const FeatureCard: React.FC<{
  icon: string;
  text: string;
  delay: number;
  accentColor: string;
}> = ({ icon, text, delay, accentColor }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [delay, delay + 22], [-60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{
      opacity,
      transform: `translateX(${x}px)`,
      display: "flex",
      alignItems: "center",
      gap: 18,
      background: "rgba(255,255,255,0.92)",
      borderRadius: 16,
      padding: "18px 28px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
      borderLeft: `5px solid ${accentColor}`,
      backdropFilter: "blur(8px)",
    }}>
      <span style={{ fontSize: 36 }}>{icon}</span>
      <span style={{ fontSize: 24, fontWeight: 600, color: "#1e293b" }}>{text}</span>
    </div>
  );
};

// ─── SCENE 2 — Professeurs ────────────────────────────────────────────────────
export const SceneTeachers: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = useSlideUp(5, 25, 30);

  const features = [
    { icon: "📚", text: "Publiez vos cours en quelques clics",    delay: 30 },
    { icon: "🤖", text: "IA EduBot corrige les exercices",         delay: 52 },
    { icon: "📊", text: "Suivi des notes & absences en temps réel",delay: 74 },
    { icon: "✏️", text: "Générateur de QCM automatique par IA",   delay: 96 },
  ];

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBg from="#0f172a" to="#1e3a8a" />
      <BlobDecor color="rgba(37,99,235,0.12)" />

      {/* Left panel: heading */}
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", padding: "80px 90px", gap: 80, alignItems: "center" }}>

        {/* Left column */}
        <div style={{ flex: "0 0 480px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Role badge */}
          <div style={{
            opacity: titleOpacity,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(96,165,250,0.2)",
            border: "1.5px solid rgba(96,165,250,0.4)",
            borderRadius: 40,
            padding: "10px 24px",
            width: "fit-content",
          }}>
            <span style={{ fontSize: 32 }}>👨‍🏫</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: ACCENT, letterSpacing: "0.06em", textTransform: "uppercase" }}>Professeurs</span>
          </div>

          {/* Title */}
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <span style={{ fontSize: 58, fontWeight: 900, color: WHITE, lineHeight: 1.1 }}>
              Enseignez{"\n"}
            </span>
            <span style={{ fontSize: 58, fontWeight: 900, color: ACCENT, lineHeight: 1.1 }}>
              sans limites.
            </span>
          </div>

          <div style={{ opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
              Alpha Tech donne à vos enseignants des outils puissants pour se concentrer sur ce qui compte vraiment.
            </span>
          </div>
        </div>

        {/* Right column: feature cards */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {features.map((f) => (
            <FeatureCard key={f.text} {...f} accentColor={BLUE_PRIMARY} />
          ))}
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE 3 — Direction ──────────────────────────────────────────────────────
export const SceneDirection: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = useSlideUp(5, 25, 30);

  const features = [
    { icon: "📈", text: "Tableau de bord complet en temps réel",  delay: 30 },
    { icon: "👥", text: "Gestion des élèves & des enseignants",    delay: 52 },
    { icon: "💰", text: "Suivi financier & scolarités",            delay: 74 },
    { icon: "📋", text: "Rapports & statistiques détaillés",       delay: 96 },
  ];

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBg from="#1e1b4b" to="#312e81" />
      <BlobDecor color="rgba(139,92,246,0.10)" />

      <AbsoluteFill style={{ display: "flex", flexDirection: "row", padding: "80px 90px", gap: 80, alignItems: "center" }}>

        {/* Right column first (flip layout) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {features.map((f) => (
            <FeatureCard key={f.text} {...f} accentColor="#7c3aed" />
          ))}
        </div>

        {/* Left column */}
        <div style={{ flex: "0 0 480px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{
            opacity: titleOpacity,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(167,139,250,0.2)",
            border: "1.5px solid rgba(167,139,250,0.4)",
            borderRadius: 40,
            padding: "10px 24px",
            width: "fit-content",
          }}>
            <span style={{ fontSize: 32 }}>🏫</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.06em", textTransform: "uppercase" }}>Direction</span>
          </div>

          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <span style={{ fontSize: 58, fontWeight: 900, color: WHITE, lineHeight: 1.1 }}>
              Pilotez votre{"\n"}
            </span>
            <span style={{ fontSize: 58, fontWeight: 900, color: "#a78bfa", lineHeight: 1.1 }}>
              établissement.
            </span>
          </div>

          <div style={{ opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
              Toutes vos données scolaires et financières centralisées dans un tableau de bord moderne.
            </span>
          </div>
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE 4 — Parents ────────────────────────────────────────────────────────
export const SceneParents: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = useSlideUp(5, 25, 30);

  const features = [
    { icon: "📱", text: "Suivi scolaire en temps réel sur mobile",  delay: 30 },
    { icon: "💳", text: "Paiement Mobile Money (MTN & Airtel)",      delay: 52 },
    { icon: "⭐", text: "Notes & absences instantanées",             delay: 74 },
    { icon: "💬", text: "Communication directe avec l'école",        delay: 96 },
  ];

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBg from="#064e3b" to="#065f46" />
      <BlobDecor color="rgba(16,185,129,0.10)" />

      <AbsoluteFill style={{ display: "flex", flexDirection: "row", padding: "80px 90px", gap: 80, alignItems: "center" }}>

        {/* Left column */}
        <div style={{ flex: "0 0 480px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{
            opacity: titleOpacity,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(52,211,153,0.2)",
            border: "1.5px solid rgba(52,211,153,0.4)",
            borderRadius: 40,
            padding: "10px 24px",
            width: "fit-content",
          }}>
            <span style={{ fontSize: 32 }}>👨‍👩‍👦</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#34d399", letterSpacing: "0.06em", textTransform: "uppercase" }}>Parents</span>
          </div>

          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <span style={{ fontSize: 58, fontWeight: 900, color: WHITE, lineHeight: 1.1 }}>
              Restez connecté{"\n"}
            </span>
            <span style={{ fontSize: 58, fontWeight: 900, color: "#34d399", lineHeight: 1.1 }}>
              à vos enfants.
            </span>
          </div>

          <div style={{ opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
              Suivez la scolarité de vos enfants et payez les frais directement depuis votre téléphone.
            </span>
          </div>
        </div>

        {/* Right column: feature cards */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
          {features.map((f) => (
            <FeatureCard key={f.text} {...f} accentColor="#10b981" />
          ))}
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE 5 — Outro ──────────────────────────────────────────────────────────
export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();

  const logoOpacity = interpolate(frame, [5, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoScale = useScaleIn(5, 30);

  const titleOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = useSlideUp(25, 30, 30);

  const subtitleOpacity = interpolate(frame, [45, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const ctaOpacity = interpolate(frame, [62, 82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaScale = interpolate(frame, [62, 82], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Stats that count up
  const stats = [
    { value: "500+", label: "Élèves connectés",   delay: 55 },
    { value: "3",    label: "Rôles couverts",      delay: 65 },
    { value: "24/7", label: "Accès disponible",    delay: 75 },
  ];

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBg from={BLUE_DARK} to="#1e40af" />
      <BlobDecor />

      {/* Stars/particles decoration */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 380;
        const cx = Math.cos(angle) * radius;
        const cy = Math.sin(angle) * radius;
        const particleOpacity = interpolate(frame, [20 + i * 5, 40 + i * 5], [0, 0.4], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div key={i} style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: ACCENT,
            opacity: particleOpacity,
          }} />
        );
      })}

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>

        {/* Logo */}
        <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, marginBottom: 28 }}>
          <div style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: WHITE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}>
            <Img
              src={staticFile("logo.png")}
              style={{ width: 104, height: 104, borderRadius: "50%", objectFit: "cover" }}
            />
          </div>
        </div>

        {/* ALPHA TECH */}
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, marginBottom: 10 }}>
          <span style={{ fontSize: 76, fontWeight: 900, color: WHITE, letterSpacing: "0.12em" }}>
            ALPHA TECH
          </span>
        </div>

        {/* Divider */}
        <div style={{
          opacity: subtitleOpacity,
          width: interpolate(frame, [45, 70], [0, 500], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          height: 3,
          background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
          borderRadius: 2,
          marginBottom: 16,
        }} />

        <div style={{ opacity: subtitleOpacity, marginBottom: 36 }}>
          <span style={{ fontSize: 26, color: ACCENT, fontWeight: 600 }}>
            L'école du futur, aujourd'hui.
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 60, marginBottom: 40 }}>
          {stats.map((s) => {
            const statOpacity = interpolate(frame, [s.delay, s.delay + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const statY = interpolate(frame, [s.delay, s.delay + 20], [20, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div key={s.label} style={{
                opacity: statOpacity,
                transform: `translateY(${statY}px)`,
                textAlign: "center",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 20,
                padding: "20px 36px",
                backdropFilter: "blur(8px)",
              }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: WHITE }}>{s.value}</div>
                <div style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* CTA button */}
        <div style={{
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
          background: `linear-gradient(90deg, ${ACCENT}, ${WHITE})`,
          borderRadius: 50,
          padding: "20px 64px",
          boxShadow: "0 8px 32px rgba(96,165,250,0.4)",
        }}>
          <span style={{
            fontSize: 28,
            fontWeight: 700,
            color: BLUE_DARK,
            letterSpacing: "0.02em",
          }}>
            🚀 Rejoignez Alpha Tech dès aujourd'hui
          </span>
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── MAIN COMPOSITION ─────────────────────────────────────────────────────────
const TRANSITION_FRAMES = 20;

export const AlphaPromo: React.FC = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {/* Scene 1 — Intro */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <SceneIntro />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 2 — Professeurs */}
        <TransitionSeries.Sequence durationInFrames={180}>
          <SceneTeachers />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 3 — Direction */}
        <TransitionSeries.Sequence durationInFrames={180}>
          <SceneDirection />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 4 — Parents */}
        <TransitionSeries.Sequence durationInFrames={180}>
          <SceneParents />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene 5 — Outro */}
        <TransitionSeries.Sequence durationInFrames={100}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
