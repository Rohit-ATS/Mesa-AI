import { ArrowUpRight, Asterisk } from "lucide-react";

export function LandingHero() {
  return <section className="landing-hero" aria-labelledby="landing-heading">
    <div className="landing-hero-heading">
      <div className="landing-hero-aside landing-hero-aside-left"><em>Authentic flavors.</em><span>FROM THE DOMINICAN TABLE</span></div>
      <div className="landing-hero-title"><p>DOMINICAN CATERING · OAKLAND, CALIFORNIA</p><h1 id="landing-heading">LA BANDERA<br/>KITCHEN</h1></div>
      <div className="landing-hero-aside landing-hero-aside-right"><Asterisk aria-hidden="true"/><em>Good food.<br/>Good people.</em></div>
    </div>
    <div className="landing-hero-visual">
      <img className="landing-hero-image" src="/mesa-table.jpg" crossOrigin="anonymous" alt="Illustrative Dominican-inspired spread of chicken, rice, beans and plantains" width="1200" height="900" fetchPriority="high" />
      <div className="landing-image-overlay"><strong>Made for sharing.<br/>Worth gathering for.</strong><span>ILLUSTRATIVE IMAGE</span></div>
      <div className="landing-photo-stamp"><Asterisk size={21} aria-hidden="true"/><span>COOKED WITH<br/>CORAZÓN</span></div>
    </div>
    <div className="landing-hero-bottom"><p><Asterisk size={19}/> AUTHENTIC DOMINICAN FOOD. A WHOLE LOT OF HEART.</p><a href="#menu">EXPLORE OUR MENU <ArrowUpRight size={16}/></a></div>
  </section>;
}
