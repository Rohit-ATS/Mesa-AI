/** Menu items that have a photo in /public/menu, keyed by a slug of the Spanish dish name. */
export function dishSlug(nameEs: string) {
  return nameEs.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const PHOTO_SLUGS = new Set([
  "pollo-guisado", "pernil-asado", "res-guisada", "rabo-encendido",
  "berenjena-guisada", "chivo-guisado", "pescado-frito", "moro-de-guandules",
  "arroz-blanco", "habichuelas-guisadas", "maduros", "tostones",
  "ensalada-verde", "yuca-con-cebolla", "croquetas-de-jamon", "empanadas-de-pollo",
  "empanadas-de-res", "tres-leches", "flan", "majarete",
  "agua-de-coco", "jugo-de-chinola", "morir-sonando", "refrescos",
]);

export function dishPhoto(nameEs: string) {
  const slug = dishSlug(nameEs);
  return PHOTO_SLUGS.has(slug) ? `/menu/${slug}.jpg` : null;
}
