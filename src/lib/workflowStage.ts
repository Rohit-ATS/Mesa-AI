// Three-step workflow stage for an inquiry: owner approves quote → customer accepts → owner releases to kitchen.
export type VersionRow = { version: number; status: string; accepted_at?: string | null };
export type Stage = "needs_approval" | "quote_sent" | "ready_to_release" | "released" | "declined";

export function latestVersion(versions: VersionRow[] | null | undefined) {
  return [...(versions || [])].sort((a, b) => b.version - a.version)[0] ?? null;
}

export function workflowStage(status: string, versions: VersionRow[] | null | undefined): Stage {
  if (status === "declined") return "declined";
  if (status === "approved") return "released";
  const latest = latestVersion(versions);
  if (latest?.status === "accepted") return "ready_to_release";
  if (latest?.status === "sent") return "quote_sent";
  return "needs_approval";
}

/** True when the customer accepted a quote version (including orders already released). */
export function customerAccepted(versions: VersionRow[] | null | undefined) {
  return (versions || []).some(v => v.status === "accepted");
}

export const stageLabel: Record<Stage, string> = {
  needs_approval: "Needs quote approval", quote_sent: "Quote sent", ready_to_release: "Ready to release", released: "Released", declined: "Declined",
};

export function stageDetail(status: string, versions: VersionRow[] | null | undefined) {
  const latest = latestVersion(versions);
  const stage = workflowStage(status, versions);
  if (stage === "quote_sent") return `Quote v${latest!.version} sent`;
  if (stage === "ready_to_release") return `Customer accepted v${latest!.version}`;
  if (stage === "released") { const accepted = [...(versions || [])].filter(v => v.status === "accepted").sort((a, b) => b.version - a.version)[0]; return accepted ? `Released · accepted v${accepted.version}` : "Released · before three-step process"; }
  return stageLabel[stage];
}
