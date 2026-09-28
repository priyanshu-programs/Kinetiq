import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { LandingFooter } from "./LandingFooter";
import { MarketingNav } from "./MarketingNav";
import { Modules } from "./Modules";
import { Stats } from "./Stats";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <MarketingNav />
      <main>
        <Hero />
        <Modules />
        <HowItWorks />
        <Stats />
        <LandingFooter />
      </main>
    </div>
  );
}
