import { useCallback, useState, type MouseEvent } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CateringMenu } from "@/components/CateringMenu";
import { LandingHero } from "@/components/LandingHero";
import { SiteHeader } from "@/components/SiteHeader";
import { InquiryDialog } from "@/components/inquiry/InquiryDialog";
import "@/landing.css";
import "@/reference-theme.css";
import "@/inquiry.css";

export default function Index() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [guests, setGuests] = useState<number | null>(null);
  const setQuantity = useCallback((name: string, portions: number) => setQuantities(current => ({ ...current, [name]: portions })), []);
  const toggleDish = (name: string) => {
    setChosen(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);
    setQuantities(current => { const next = { ...current }; delete next[name]; return next; });
  };
  function handleInquiryLink(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element;
    if (target.closest('a[href="#inquiry"]')) { event.preventDefault(); setInquiryOpen(true); }
  }
  return <div className="landing-page min-h-screen" onClick={handleInquiryLink}>
    <div className="landing-topline">GOOD FOOD. GOOD PEOPLE. <span>/</span> MADE IN OAKLAND</div><SiteHeader dishCount={chosen.length} /><main id="top"><LandingHero/><div className="landing-marquee" aria-hidden="true"><span>DOMINICAN FOOD</span><b className="landing-marquee-dot"/><span>OAKLAND ROOTS</span><b className="landing-marquee-dot"/><span>MADE FOR SHARING</span><b className="landing-marquee-dot"/><span>DOMINICAN FOOD</span><b className="landing-marquee-dot"/><span>OAKLAND ROOTS</span></div><CateringMenu chosen={chosen} onToggle={toggleDish} quantities={quantities} guests={guests} onQuantity={setQuantity} /><section id="story" className="landing-story"><div className="landing-story-image"><img src="/mesa-table.jpg" alt="Illustrative Dominican-inspired catering spread" crossOrigin="anonymous" loading="lazy" width="1200" height="900"/></div><div><div className="landing-section-label">FROM OAKLAND, WITH CORAZÓN</div><h2>More than a meal.<br/>A reason to gather.</h2><p>La Bandera Kitchen brings authentic Dominican flavors to celebrations across the Bay Area. From corporate lunches to community gatherings, we believe the best moments begin around a shared table.</p><a href="#inquiry">PLAN YOUR GATHERING <ArrowUpRight size={14} className="inline-block align-middle" aria-hidden="true"/></a></div></section><InquiryDialog open={inquiryOpen} onOpenChange={setInquiryOpen} chosen={chosen} onToggleDish={toggleDish} quantities={quantities} onQuantity={setQuantity} onGuests={setGuests} />
    </main><footer className="landing-footer"><div className="landing-footer-top"><div><span className="landing-footer-label">LET'S GATHER</span><h2>Good food is<br/><em>better together.</em></h2></div><a href="#menu" className="landing-button">Back to the menu <ArrowRight size={18}/></a></div><div className="landing-footer-bottom"><span>LA BANDERA KITCHEN</span><span>DOMINICAN CATERING · OAKLAND & THE BAY AREA</span><a href="#inquiry">PLAN A GATHERING ↑</a><a href="/staff-login">ADMIN LOGIN</a><a href="/staff-login">STAFF SIGN IN</a></div></footer>
  </div>;
}
