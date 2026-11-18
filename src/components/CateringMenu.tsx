import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MenuItem = { id: string; name_es: string; name_en: string; category: string; dietary_tags: string[]; portion_size_oz: number | null; serving_description: string | null };
type Service = { id: string; name: string; description: string; service_style: string };
type Package = { id: string; name: string; description: string; is_default: boolean };
const categories = [{ key: "entree", label: "Entrées" }, { key: "side", label: "Sides" }, { key: "appetizer", label: "Appetizers" }, { key: "dessert", label: "Desserts" }, { key: "beverage", label: "Beverages" }];
export function CateringMenu({ chosen, onToggle }: { chosen: string[]; onToggle: (name: string) => void }) {
  const [items, setItems] = useState<MenuItem[]>([]); const [services, setServices] = useState<Service[]>([]); const [featured, setFeatured] = useState<Package | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
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
  return <section id="menu" className="border-t border-border bg-accent/50"><div className="mx-auto max-w-7xl px-6 py-16 lg:px-10"><div className="flex flex-wrap items-end justify-between gap-5"><div><div className="eyebrow"><span className="h-px w-8 bg-primary" /> A TASTE OF HOME</div><h2 className="mt-4 font-display text-4xl text-secondary sm:text-5xl">Made to be <em className="font-normal text-primary">shared.</em></h2><p className="mt-3 text-muted-foreground">Explore the dishes and service styles for your gathering.</p></div><span className="flex items-center gap-2 text-sm font-semibold text-primary">Explore the flavors <ArrowDown size={16}/></span></div>
  {loading ? <p className="mt-8 text-muted-foreground">Loading menu…</p> : error ? <p role="alert" className="mt-8 text-primary">{error}</p> : <>{featured && <div className="mt-10 rounded-xl bg-secondary p-7 text-primary-foreground"><div className="text-xs font-bold uppercase tracking-[.2em] text-primary-foreground/70">Our default recommendation</div><h3 className="mt-3 font-display text-3xl">{featured.name}</h3><p className="mt-2 text-sm text-primary-foreground/80">{featured.description} Choose your entrée and add the sides below.</p></div>}
  {categories.map(category => { const categoryItems = items.filter(item => item.category === category.key); return <div key={category.key} className="mt-10"><h3 className="font-display text-3xl text-secondary">{category.label}</h3><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{categoryItems.map(item => <button key={item.id} onClick={() => onToggle(item.name_es)} className="rounded-xl border border-border bg-card p-6 text-left transition hover:-translate-y-1 hover:shadow-soft"><div className="text-xs font-bold uppercase tracking-[.16em] text-primary">{category.label}</div><div className="mt-5 font-display text-2xl text-secondary">{item.name_es}</div><div className="mt-1 text-sm text-muted-foreground">{item.name_en}</div><div className="mt-3 text-xs text-muted-foreground">{item.serving_description || (item.portion_size_oz ? `${item.portion_size_oz} oz per serving` : "")}{item.dietary_tags.length > 0 && ` · ${item.dietary_tags.map(tag => tag.replaceAll("_", " ")).join(", ")}`}</div><div className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">{chosen.includes(item.name_es) ? <><Check size={15}/> Added to request</> : <>Add to request <ArrowRight size={15}/></>}</div></button>)}</div></div>; })}
  <div className="mt-14"><h3 className="font-display text-3xl text-secondary">Service, your way.</h3><div className="mt-4 grid gap-4 md:grid-cols-3">{["dropoff", "setup", "full_service"].map(style => { const service = services.find(s => s.service_style === style); return service && <div key={service.id} className="rounded-xl border border-border bg-card p-6"><h4 className="font-display text-xl text-secondary">{service.name}</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">{service.description}</p></div>; })}</div></div></>}
  </div></section>;
}
