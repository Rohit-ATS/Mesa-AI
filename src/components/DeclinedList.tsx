import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";

export type DeclinedInquiry = { id: string; event_date: string | null; guest_count: number | null; service_style: string | null; customer: { id: string; name: string } | null; mesa_inquiry_decision: { decided_at: string } | null };

export function DeclinedList({ items, onSelectCustomer }: { items: DeclinedInquiry[]; onSelectCustomer: (customerId: string) => void }) {
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-6 sm:px-8"><div className="eyebrow">DECLINED</div><h2 className="mt-3 flex items-center gap-2 font-display text-2xl text-secondary"><XCircle size={20} className="text-destructive" /> Declined inquiries</h2></div>
      {items.length === 0 ? <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-8">No declined inquiries.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead className="bg-accent text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-4">Customer</th><th className="px-4 py-4">Event date</th><th className="px-4 py-4">Guests</th><th className="px-4 py-4">Service style</th><th className="px-4 py-4">Declined on</th><th className="px-4 py-4" /></tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.id} className="border-t border-border text-sm">
                <td className="px-6 py-4">{item.customer ? <button onClick={() => onSelectCustomer(item.customer!.id)} className="font-semibold text-secondary hover:text-primary">{item.customer.name}</button> : "Unknown"}</td>
                <td className="px-4 py-4">{item.event_date || "Not set"}</td>
                <td className="px-4 py-4">{item.guest_count ?? "—"}</td>
                <td className="px-4 py-4 capitalize">{item.service_style?.replaceAll("_", " ") || "Not set"}</td>
                <td className="px-4 py-4">{item.mesa_inquiry_decision ? new Date(item.mesa_inquiry_decision.decided_at).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—"}</td>
                <td className="px-4 py-4"><Link to={`/owner?inquiry=${item.id}`} className="font-semibold text-primary">View</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
