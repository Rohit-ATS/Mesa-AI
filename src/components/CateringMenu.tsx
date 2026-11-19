import { useEffect, useState } from "react";
import { ArrowUpRight, Check, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dishPhoto } from "./menuPhotos";
import { DishQuantityList, type DishQuantities } from "./inquiry/DishQuantities";

type MenuItem = { id: string; name_es: string; name_en: string; category: string; dietary_tags: string[]; portion_size_oz: number | null; serving_description: string | null };
type Service = { id: string; name: string; description: string; service_style: string };
type Package = { id: string; name: string; description: string; is_default: boolean };
const categories = [{ key: "entree", label: "Entrées" }, { key: "side", label: "Sides" }, { key: "appetizer", label: "Appetizers" }, { key: "dessert", label: "Desserts" }, { key: "beverage", label: "Beverages" }];

export function CateringMenu({ chosen, onToggle, quantities, guests, onQuantity }: { chosen: string[]; onToggle: (name: string) => void; quantities: DishQuantities; guests: number | null; onQuantity: (name: string, portions: number) => void }) {
  const [items, setItems] = useState<MenuItem[]>([]); const [services, setServices] = useState<Service[]>([]); const [featured, setFeatured] = useState<Package | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [category, setCategory] = useState("entree");
  useEffect(() => {
    let active = true;
    async function load() {
      const [menuResult, serviceResult, packageResult] = await Promise.all([
        supabase.from("menu_item").select("id,name_es,name_en,category,dietary_tags,portion_size_oz,serving_description").eq("active", true).order("display_order").order("name_es"),
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
  return <section id="menu" className="landing-menu"><div className="landing-menu-inner"><div className="landing-menu-heading"><div><div className="landing-section-label">A LITTLE TASTE OF HOME</div><h2>Made for the table.</h2></div><a href="#inquiry" className="landing-menu-view">PLAN YOUR GATHERING <ArrowUpRight size={14} className="inline-block align-middle" aria-hidden="true"/></a></div>
    {loading ? <p className="landing-menu-state">Loading menu…</p> : error ? <p role="alert" className="landing-menu-state">{error}</p> : <>
      <div className="landing-menu-top"><div><h3>Pick your favorites.</h3></div><p>Choose a dish to add it to your request. You can change your mind anytime.</p></div>
      {featured && <div className="landing-callout" role="note"><UtensilsCrossed size={22} aria-hidden="true"/><p><strong>{featured.name}</strong> — {featured.description}</p></div>}
      <nav className="landing-category-nav" aria-label="Menu categories">{categories.map(item => <button key={item.key} aria-pressed={category === item.key} onClick={() => setCategory(item.key)} className={category === item.key ? "active" : ""}>{item.label}<span>{String(items.filter(dish => dish.category === item.key).length).padStart(2,"0")}</span></button>)}</nav>
      <div key={category} className="landing-dish-list landing-list-enter" aria-live="polite">{visible.map((item,index) => { const selected = chosen.includes(item.name_es); const photo = dishPhoto(item.name_es); return <button key={item.id} type="button" onClick={() => onToggle(item.name_es)} aria-pressed={selected} className="landing-dish">{selected && <span className="landing-dish-check" aria-hidden="true"><Check size={16} strokeWidth={3}/></span>}{photo && <img className="landing-dish-photo" src={photo} alt={`${item.name_en} (${item.name_es})`} width="600" height="450" loading="lazy" decoding="async"/>}<span className="landing-dish-number">{String(index + 1).padStart(2,"0")}</span><span className="landing-dish-main"><strong>{item.name_es}</strong><small>{item.name_en}</small></span><span className="landing-dish-detail">{item.serving_description || (item.portion_size_oz ? `${item.portion_size_oz} oz serving` : "")}{item.dietary_tags.length > 0 && <span className="landing-tag-list">{item.dietary_tags.map(tag => <span key={tag} className="landing-tag">{tag.replaceAll("_", " ")}</span>)}</span>}</span></button>; })}{visible.length === 0 && <p className="landing-menu-state">No dishes in this category right now.</p>}</div>
      <div className="landing-selection"><span>{chosen.length ? `${chosen.length} ${chosen.length === 1 ? "dish" : "dishes"} added to your request` : "Make it yours, one dish at a time."}</span><a href="#inquiry">Continue to your request <ArrowUpRight size={16}/></a></div>
      {chosen.length > 0 && <div className="landing-qty" aria-label="Portions per dish"><DishQuantityList chosen={chosen} quantities={quantities} guests={guests} disabled={false} onChange={onQuantity} onRemove={onToggle} /></div>}
      <div className="landing-service"><div><div className="landing-section-label"><span/> HOWEVER YOU GATHER</div><h3>We’ll bring<br/><em>the sabor.</em></h3><a href="#inquiry" className="landing-button landing-service-cta">Plan your gathering <ArrowUpRight size={16}/></a></div><div>{["dropoff", "setup", "full_service"].map((style,index) => { const service = services.find(s => s.service_style === style); return service && <div className="landing-service-row" key={service.id}><span>0{index + 1}</span><div><strong>{service.name}</strong><p>{service.description}</p></div></div>; })}</div></div>
    </>}
  </div></section>;
}
