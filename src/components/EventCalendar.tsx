import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { prepClass, prepLabel, todayLA, type PrepState } from "@/lib/prepStatus";

export type CalendarEvent = { id: string; date: string; time: string | null; guests: number | null; title: string; prep: PrepState };

type Props = { events: CalendarEvent[]; onSelect: (id: string) => void; title?: string };

export function EventCalendar({ events, onSelect, title = "Event calendar" }: Props) {
  const today = todayLA();
  const [month, setMonth] = useState(() => startOfMonth(new Date(`${today}T12:00:00`)));
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) map.set(e.date, [...(map.get(e.date) || []), e].sort((a, b) => (a.time || "").localeCompare(b.time || "")));
    return map;
  }, [events]);
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const upcoming = events.filter(e => e.date >= today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 5);

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-secondary"><CalendarDays size={22} className="text-primary" /> {title}</h2>
        <div className="flex items-center gap-2">
          <button aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))} className="rounded-lg border border-border p-2 hover:bg-accent"><ChevronLeft size={18} /></button>
          <span className="min-w-[9rem] text-center font-semibold text-secondary">{format(month, "MMMM yyyy")}</span>
          <button aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))} className="rounded-lg border border-border p-2 hover:bg-accent"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {(["not_started", "in_progress", "prepared"] as PrepState[]).map(s => <span key={s} className={`rounded-full px-2.5 py-1 font-semibold ${prepClass[s]}`}>{prepLabel[s]}</span>)}
        <span className="text-muted-foreground">Approved events only</span>
      </div>
      <div className="mt-5 hidden grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="bg-accent p-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{d}</div>)}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd"); const list = byDay.get(key) || [];
          return (
            <div key={key} className={`min-h-[6.5rem] p-1.5 ${isSameMonth(day, month) ? "bg-card" : "bg-background opacity-60"}`}>
              <div className={`mb-1 text-right text-xs font-semibold ${key === today ? "text-primary" : "text-muted-foreground"}`}>{key === today ? <span className="rounded-full bg-primary px-1.5 py-0.5 text-primary-foreground">{format(day, "d")}</span> : format(day, "d")}</div>
              <div className="space-y-1">
                {list.map(e => (
                  <button key={e.id} onClick={() => onSelect(e.id)} title={`${e.title} · ${prepLabel[e.prep]}`} className={`block w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-semibold ${prepClass[e.prep]} hover:opacity-90`}>
                    {e.time?.slice(0, 5)} {e.guests ?? "?"}g · {e.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 sm:hidden">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">This month</p>
        <ul className="mt-2 space-y-2">
          {events.filter(e => isSameMonth(new Date(`${e.date}T12:00:00`), month)).sort((a, b) => a.date.localeCompare(b.date)).map(e => (
            <li key={e.id}><button onClick={() => onSelect(e.id)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left text-sm"><span><strong className="text-secondary">{format(new Date(`${e.date}T12:00:00`), "EEE MMM d")}</strong> · {e.time?.slice(0, 5)} · {e.guests ?? "?"} guests</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${prepClass[e.prep]}`}>{prepLabel[e.prep]}</span></button></li>
          ))}
        </ul>
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Next up</p>
        {upcoming.length ? <ul className="mt-3 space-y-2">{upcoming.map(e => (
          <li key={e.id}><button onClick={() => onSelect(e.id)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg p-2 text-left text-sm hover:bg-accent"><span><strong className="text-secondary">{format(new Date(`${e.date}T12:00:00`), "EEE, MMM d")}</strong> · {e.time?.slice(0, 5) || "Time TBC"} · {e.guests ?? "?"} guests · {e.title}</span><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${prepClass[e.prep]}`}>{prepLabel[e.prep]}</span></button></li>
        ))}</ul> : <p className="mt-2 text-sm text-muted-foreground">No upcoming approved events.</p>}
      </div>
    </section>
  );
}
