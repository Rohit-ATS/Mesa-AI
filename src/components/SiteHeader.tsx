import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "top", label: "Home" },
  { id: "menu", label: "Our menu" },
  { id: "story", label: "Our story" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Brick-red monochrome seal: ring, a quartered flag mark with a cross gap, and a small star-free base rule. */
function LogoSeal() {
  return (
    <svg className="landing-logo-seal" viewBox="0 0 72 72" role="img" aria-hidden="true" focusable="false">
      <circle cx="36" cy="36" r="34" className="logo-ring" />
      <circle cx="36" cy="36" r="29.5" className="logo-ring-thin" />
      <rect x="21" y="23" width="14" height="11" className="logo-solid" />
      <rect x="37" y="23" width="14" height="11" className="logo-outline" />
      <rect x="21" y="36" width="14" height="11" className="logo-outline" />
      <rect x="37" y="36" width="14" height="11" className="logo-solid" />
      <path d="M26 54h20" className="logo-rule" />
    </svg>
  );
}

function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>("top");
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight * 0.35;
      let current: SectionId = "top";
      for (const section of SECTIONS) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= line && section.id !== "top") current = section.id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return active;
}

export function SiteHeader({ dishCount }: { dishCount: number }) {
  const active = useActiveSection();
  return (
    <header className="landing-header">
      <a href="#top" className="landing-brand" aria-label="La Bandera Kitchen, back to top">
        <LogoSeal />
        <span className="landing-wordmark" aria-hidden="true">
          <span className="landing-wordmark-main">La Bandera</span>
          <span className="landing-wordmark-sub">Kitchen</span>
        </span>
      </a>
      <nav aria-label="Main navigation" className="landing-nav">
        {SECTIONS.map(section => (
          <a key={section.id} href={`#${section.id}`} className="landing-nav-link" aria-current={active === section.id ? "true" : undefined}>
            {section.label}
          </a>
        ))}
      </nav>
      <a href="#inquiry" className="landing-nav-cta" aria-label={`Your inquiry, ${dishCount} ${dishCount === 1 ? "dish" : "dishes"} selected`}>
        YOUR INQUIRY <span className="landing-badge" aria-hidden="true">{dishCount}</span>
      </a>
    </header>
  );
}
