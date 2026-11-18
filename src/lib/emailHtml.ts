// Builds inline-styled HTML for test emails (email clients ignore Tailwind classes).
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export type EmailSection = { heading: string; lines: string[] };

export function buildEmailHtml(label: string, title: string, sections: EmailSection[], banner?: string) {
  return `<div style="font-family:Georgia,serif;max-width:640px;margin:auto;color:#1f2933">
${banner ? `<div style="background:#b3202a;color:#fff;padding:14px 18px;font-weight:bold;text-transform:uppercase">${esc(banner)}</div>` : ""}
<div style="background:#1d2b4f;color:#fdf6e9;padding:20px"><div style="font-size:11px;letter-spacing:2px">${esc(label)}</div><h1 style="margin:8px 0 0;font-size:22px">${esc(title)}</h1></div>
<div style="padding:20px;background:#fdf6e9">${sections.map(s => `<h2 style="color:#b3202a;font-size:17px;margin:18px 0 8px">${esc(s.heading)}</h2>${s.lines.map(l => `<p style="margin:0 0 6px;line-height:1.5">${esc(l)}</p>`).join("")}`).join("")}
<p style="font-size:11px;color:#6b7280;margin-top:20px">Test message · Demo data only.</p></div></div>`;
}
