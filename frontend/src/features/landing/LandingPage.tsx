import { CoachCues } from "./CoachCues";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { LandingFooter } from "./LandingFooter";
import { MarketingNav } from "./MarketingNav";
import { Modules } from "./Modules";
import { Stats } from "./Stats";
import { Ticker } from "./Ticker";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingNav />
      <main>
        <Hero />
        <Ticker />
        <Modules />
        <HowItWorks />
        <Stats />
        <CoachCues />
        <LandingFooter />
      </main>
    </div>
  );
}
