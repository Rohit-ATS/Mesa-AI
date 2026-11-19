import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ReactNode } from "react";

export function ChartCard({ title, note, children, className = "" }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <article className={`rounded-xl border border-border bg-card p-5 sm:p-6 ${className}`}>
      <h3 className="font-display text-xl text-secondary">{title}</h3>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      <div className="mt-4">{children}</div>
    </article>
  );
}

const trendConfig = { requests: { label: "Requests", color: "hsl(var(--secondary))" }, approved: { label: "Approved", color: "hsl(var(--primary))" } } satisfies ChartConfig;
export function RequestsChart({ data }: { data: { label: string; requests: number; approved: number }[] }) {
  return (
    <ChartContainer config={trendConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: -20, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="requests" fill="var(--color-requests)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="approved" fill="var(--color-approved)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

const guestConfig = { avgGuests: { label: "Avg guests / request", color: "hsl(var(--primary))" } } satisfies ChartConfig;
export function AvgGuestsChart({ data }: { data: { label: string; avgGuests: number | null }[] }) {
  return (
    <ChartContainer config={guestConfig} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ left: -20, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey="avgGuests" type="monotone" stroke="var(--color-avgGuests)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ChartContainer>
  );
}

const breakdownConfig = { value: { label: "Count", color: "hsl(var(--secondary))" } } satisfies ChartConfig;
export function BreakdownChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length || data.every(d => d.value === 0)) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  return (
    <ChartContainer config={breakdownConfig} className="aspect-auto w-full" style={{ height: Math.max(140, data.length * 38) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} fontSize={12} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
