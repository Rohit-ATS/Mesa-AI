import { useState, type MouseEvent } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";
import { CateringMenu } from "@/components/CateringMenu";
import { LandingHero } from "@/components/LandingHero";
import { IntakeAgent } from "@/components/IntakeAgent";
import { InquirySummary } from "@/components/InquirySummary";
import "@/landing.css";
import "@/reference-theme.css";

export default function Index() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  function handleInquiryLink(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element;
    if (target.closest('a[href="#inquiry"]')) { event.preventDefault(); setInquiryOpen(true); }
  }
  return <div className="landing-page min-h-screen" onClick={handleInquiryLink}>
    <div className="landing-topline">GOOD FOOD. GOOD PEOPLE. <span>/</span> MADE IN OAKLAND</div><header className="landing-header"><a href="/inquire" className="landing-brand"><span className="landing-brand-seal"><span>LA BANDERA</span><span className="flag-mark" aria-hidden="true"><i/><i/><i/><i/></span><small>KITCHEN</small></span></a><nav aria-label="Main navigation" className="landing-nav"><a href="#top">Home</a><a href="#menu">Our menu</a><a href="#story">Our story</a></nav><a href="#inquiry" className="landing-nav-cta" aria-label={`Your inquiry, ${chosen.length} ${chosen.length === 1 ? "dish" : "dishes"} selected`}>YOUR INQUIRY <span className="landing-badge" aria-hidden="true">{chosen.length}</span></a></header><main id="top"><LandingHero/><div className="landing-marquee" aria-hidden="true"><span>DOMINICAN FOOD</span><b className="landing-marquee-dot"/><span>OAKLAND ROOTS</span><b className="landing-marquee-dot"/><span>MADE FOR SHARING</span><b className="landing-marquee-dot"/><span>DOMINICAN FOOD</span><b className="landing-marquee-dot"/><span>OAKLAND ROOTS</span></div><CateringMenu chosen={chosen} onToggle={name => setChosen(chosen.includes(name) ? chosen.filter(item => item !== name) : [...chosen, name])} /><section id="story" className="landing-story"><div className="landing-story-image"><img src="/mesa-table.jpg" alt="Illustrative Dominican-inspired catering spread" crossOrigin="anonymous" loading="lazy" width="1200" height="900"/></div><div><div className="landing-section-label">FROM OAKLAND, WITH CORAZÓN</div><h2>More than a meal.<br/>A reason to gather.</h2><p>La Bandera Kitchen brings authentic Dominican flavors to celebrations across the Bay Area. From corporate lunches to community gatherings, we believe the best moments begin around a shared table.</p><a href="#inquiry">PLAN YOUR GATHERING ↗</a></div></section><Dialog open={inquiryOpen} onOpenChange={setInquiryOpen}><DialogContent className="intake-dialog max-h-[90vh] max-w-6xl overflow-y-auto"><DialogTitle className="sr-only">Inquiry preview</DialogTitle><DialogDescription className="sr-only">Chat with Sazón Catering and confirm your demo request.</DialogDescription><section className="mx-auto max-w-7xl px-6 pb-16 pt-12 lg:px-10"><div className="landing-inquiry-heading"><div><div className="eyebrow">LET’S MAKE IT A GATHERING</div><h2>Pull up a <em>chair.</em></h2></div><p>Tell us a little about what you’re planning. We’ll start with the details.</p></div>
    <div className="mt-14 grid gap-5 lg:grid-cols-[1.35fr_.65fr]" id="inquiry"><IntakeAgent/>
    <InquirySummary chosen={chosen}/></div></section></DialogContent></Dialog>
    </main><footer className="landing-footer"><div className="landing-footer-top"><div><span className="landing-footer-label">LET'S GATHER</span><h2>Good food is<br/><em>better together.</em></h2></div><a href="#menu" className="landing-button">Back to the menu <ArrowRight size={18}/></a></div><div className="landing-footer-bottom"><span>LA BANDERA KITCHEN</span><span>DOMINICAN CATERING · OAKLAND & THE BAY AREA</span><a href="#inquiry">PLAN A GATHERING ↑</a><a href="/context">ADMIN LOGIN</a></div></footer>
  </div>;
}
