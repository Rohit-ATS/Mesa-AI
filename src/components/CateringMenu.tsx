import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MenuItem = { id: string; name_es: string; name_en: string; category: string; dietary_tags: string[]; portion_size_oz: number | null; serving_description: string | null };
type Service = { id: string; name: string; description: string; service_style: string };
type Package = { id: string; name: string; description: string; is_default: boolean };
const categories = [{ key: "entree", label: "Entrées" }, { key: "side", label: "Sides" }, { key: "appetizer", label: "Appetizers" }, { key: "dessert", label: "Desserts" }, { key: "beverage", label: "Beverages" }];

export function CateringMenu({ chosen, onToggle }: { chosen: string[]; onToggle: (name: string) => void }) {
  const [items, setItems] = useState<MenuItem[]>([]); const [services, setServices] = useState<Service[]>([]); const [featured, setFeatured] = useState<Package | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [category, setCategory] = useState("entree");
  useEffect(() => {
    let active = true;
    async function load() {
      const [menuResult, serviceResult, packageResult] = await Promise.all([
        supabase.from("menu_item").select("id,name_es,name_en,category,dietary_tags,portion_size_oz,serving_description").eq("active", true).order("name_es"),
        supabase.from("service_package").select("id,name,description,service_style"),
        supabase.from("menu_package").select("id,name,description,is_default").eq("is_default", true).maybeSingle(),
      ]);
      if (!active) return;
      if (menuResult.error || serviceResult.error || packageResult.error) setError("The menu could not be loaded. Please try again later.");
      else { setItems(menuResult.data || []); setServices(serviceResult.data || []); setFeatured(packageResult.data); }
      setLoading(false);
    }
    void load(); return () => { active = false; };
  }, []);
  const visible = items.filter(item => item.category === category);
  return <section id="menu" className="landing-menu"><div className="landing-menu-inner"><div className="landing-menu-heading"><div><div className="landing-section-label"><span/> THE GOOD STUFF</div><h2>Come hungry.<br/><em>Leave happy.</em></h2></div><p>A little taste of home, made for the big moments and all the people you love.</p></div>
    {loading ? <p className="landing-menu-state">Loading menu…</p> : error ? <p role="alert" className="landing-menu-state">{error}</p> : <>
      {featured && <div className="landing-featured"><div><span>THE ONE THAT STARTED IT ALL</span><h3>{featured.name}</h3><p>{featured.description}</p></div><div className="landing-featured-side"><span>OUR NAMESAKE PLATE</span><strong>01</strong><a href="#inquiry">Plan your event <ArrowUpRight size={16}/></a></div></div>}
      <div className="landing-menu-top"><div><span>EXPLORE THE MENU</span><h3>Pick your favorites.</h3></div><p>Choose a dish to add it to your request. You can change your mind anytime.</p></div>
      <nav className="landing-category-nav" aria-label="Menu categories">{categories.map(item => <button key={item.key} aria-pressed={category === item.key} onClick={() => setCategory(item.key)} className={category === item.key ? "active" : ""}>{item.label}<span>{String(items.filter(dish => dish.category === item.key).length).padStart(2,"0")}</span></button>)}</nav>
      <div key={category} className="landing-dish-list landing-list-enter" aria-live="polite">{visible.map((item,index) => <button key={item.id} onClick={() => onToggle(item.name_es)} aria-pressed={chosen.includes(item.name_es)} className="landing-dish"><span className="landing-dish-number">{String(index + 1).padStart(2,"0")}</span><span className="landing-dish-main"><strong>{item.name_es}</strong><small>{item.name_en}</small></span><span className="landing-dish-detail">{item.serving_description || (item.portion_size_oz ? `${item.portion_size_oz} oz serving` : "")}{item.dietary_tags.length > 0 && <small>{item.dietary_tags.map(tag => tag.replaceAll("_", " ")).join(" · ")}</small>}</span><span className={`landing-dish-action ${chosen.includes(item.name_es) ? "selected" : ""}`}>{chosen.includes(item.name_es) ? <Check size={18}/> : <Plus size={18}/>}<span className="sr-only">{chosen.includes(item.name_es) ? "Remove from request" : "Add to request"}</span></span></button>)}{visible.length === 0 && <p className="landing-menu-state">No dishes in this category right now.</p>}</div>
      <div className="landing-selection"><span>{chosen.length ? `${chosen.length} ${chosen.length === 1 ? "dish" : "dishes"} added to your request` : "Make it yours, one dish at a time."}</span><a href="#inquiry">Continue to your request <ArrowUpRight size={16}/></a></div>
      <div className="landing-service"><div><div className="landing-section-label"><span/> HOWEVER YOU GATHER</div><h3>We’ll bring<br/><em>the sabor.</em></h3></div><div>{["dropoff", "setup", "full_service"].map((style,index) => { const service = services.find(s => s.service_style === style); return service && <div className="landing-service-row" key={service.id}><span>0{index + 1}</span><div><strong>{service.name}</strong><p>{service.description}</p></div></div>; })}</div></div>
    </>}
  </div></section>;
}
