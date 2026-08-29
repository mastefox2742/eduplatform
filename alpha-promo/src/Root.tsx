import "./index.css";
import { Composition } from "remotion";
import { AlphaPromo } from "./AlphaPromo";
import { AlphaClickUp } from "./AlphaClickUp";

// AlphaPromo total duration:
// Intro(90) + Teachers(180) + Direction(180) + Parents(180) + Outro(100)
// - 4 transitions × 20 frames = 80
// = 650 frames ≈ 21.7s @ 30fps

// AlphaClickUp total duration:
// Problem(90) + Mobile(230) + PC(200) + Features(160) + CTA(110)
// - 4 transitions × 18 frames = 72
// = 718 frames ≈ 23.9s @ 30fps
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AlphaPromo"
        component={AlphaPromo}
        durationInFrames={650}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="AlphaClickUp"
        component={AlphaClickUp}
        durationInFrames={718}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
