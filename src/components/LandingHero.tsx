import { ArrowDownRight, ArrowUpRight, Asterisk } from "lucide-react";

export function LandingHero() {
  return <section className="landing-hero" aria-labelledby="landing-heading">
    <div className="landing-hero-copy">
      <div className="landing-kicker"><span className="landing-kicker-line"/> OAKLAND, CALIFORNIA <span className="landing-kicker-dot">•</span> DOMINICAN CATERING</div>
      <h1 id="landing-heading">A little<br/><em>island.</em><br/>A lot of <span>heart.</span></h1>
      <p>Real Dominican flavor, made to bring people together. From the first bite to the last story at the table.</p>
      <div className="landing-hero-actions"><a className="landing-hero-cta" href="#menu">Explore the menu <ArrowUpRight size={19}/></a><a className="landing-text-link" href="#inquiry">Plan a gathering <ArrowDownRight size={17}/></a></div>
      <div className="landing-hero-note"><Asterisk className="landing-star" aria-hidden="true"/><span>FROM OUR KITCHEN<br/><strong>TO YOUR TABLE.</strong></span></div>
    </div>
    <div className="landing-hero-visual" aria-label="Illustrative food imagery">
      <img className="landing-hero-image" src="https://cdn.enter.pro/resources/uid_100732027/mesa-dominican-table_c439c4df.png" crossOrigin="anonymous" alt="Illustrative Dominican-inspired spread with chicken, rice, beans and plantains" width="1200" height="900" fetchPriority="high" />
      <div className="landing-photo-stamp"><span>LA BANDERA</span><strong>Made to<br/>be shared.</strong><span>OAKLAND · CA</span></div>
      <div className="landing-visual-caption"><span>ILLUSTRATIVE IMAGE</span><span>THE HEART OF THE TABLE</span></div>
    </div>
  </section>;
}
