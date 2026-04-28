import { DarkAppHeader } from "@/components/DarkAppHeader";
import { MirageExploreClient } from "@/components/mirage/MirageExploreClient";
import { VideosLoadProbe } from "@/components/mirage/VideosLoadProbe";

export default function Home() {
  return (
    <div className="mirage-explore-page min-h-screen pt-[132px] text-[#e8e0f0] sm:pt-[104px]">
      {/* Fundo fixo: equivalente a .explore-bg do HTML antigo */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(147, 112, 219, 0.25), transparent),
            radial-gradient(ellipse 60% 80% at 100% 50%, rgba(138, 43, 226, 0.15), transparent),
            linear-gradient(180deg, #0f0614 0%, #1a0a24 30%, #120818 100%)`,
        }}
        aria-hidden
      />
      <DarkAppHeader />
      <VideosLoadProbe />
      <MirageExploreClient />
    </div>
  );
}
