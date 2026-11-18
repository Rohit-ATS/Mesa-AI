import { useCallback, useEffect, useRef, useState } from "react";
import { HttpAgent } from "@enter-pro/agent-client";
import { ThreadClient, ThreadManager, toThreadTurnsFromAgUiHistory, type ThreadTurn } from "@enter-pro/thread-client";
import { SUPABASE_URL } from "@/integrations/supabase/client";

const base = `${SUPABASE_URL}/functions/v1/mesa-intake-agent-3759b04e315c`;
export const sessionKey = "mesa-intake-session";
const threadKey = "mesa-intake-thread";

export function getSession() {
  let session = sessionStorage.getItem(sessionKey);
  if (!session) {
    session = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem(sessionKey, session);
  }
  return session;
}

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getSession()}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "The assistant is unavailable. Please try again.");
  }
  return response.json();
}

function messageOf(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function useIntakeAgent() {
  const [turns, setTurns] = useState<readonly ThreadTurn[]>([]);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const manager = useRef<ThreadManager | null>(null);
  const clientRef = useRef<ThreadClient | null>(null);
  const setupRef = useRef<Promise<ThreadClient> | null>(null);

  useEffect(() => {
    const instance = new ThreadManager();
    manager.current = instance;
    return () => {
      manager.current = null;
      clientRef.current = null;
      setupRef.current = null;
      void instance.dispose();
    };
  }, []);

  const setup = useCallback(async () => {
    if (clientRef.current) return clientRef.current;
    if (setupRef.current) return setupRef.current;
    const threads = manager.current;
    if (!threads) throw new Error("The assistant is not ready yet. Please try again.");
    const pending = (async () => {
      let id = sessionStorage.getItem(threadKey);
      let thread;
      if (id) thread = await request(`/threads/${encodeURIComponent(id)}`);
      else {
        thread = await request("/threads", { method: "POST", body: "{}" });
        id = thread.thread_id;
        if (!id) throw new Error("Could not create a conversation.");
        sessionStorage.setItem(threadKey, id);
      }
      const threadId = id!;
      const agent = new HttpAgent({
        threadId,
        url: () => `${base}/run`,
        token: getSession,
        abortUrl: () => (agent.activeTurnId == null ? "" : `${base}/threads/${encodeURIComponent(threadId)}/turns/${agent.activeTurnId}/cancel`),
        resumeUrl: () => `${base}/threads/${encodeURIComponent(threadId)}/turns/${agent.activeTurnId}/events`,
      });
      const client = new ThreadClient({
        threadId,
        agent,
        historyMessageLoader: {
          async load(_id, start, end) {
            const result = await request(`/threads/${encodeURIComponent(threadId)}/turns?start_turn=${start}&end_turn=${end}`);
            return toThreadTurnsFromAgUiHistory(result);
          },
          async loadSince() { return []; },
        },
        historyMessagePagination: { turnSize: 20, endTurn: thread.latest_history_turn_id || 0 },
      });
      client.subscribe(() => { setTurns([...client.turns]); setRunning(client.isAgentRunning); });
      threads.register(threadId, client);
      await threads.resume(threadId);
      clientRef.current = client;
      setTurns([...client.turns]);
      if (thread.running) void agent.resumeTurn(thread.running).catch(() => setError("Could not resume the previous response."));
      return client;
    })();
    setupRef.current = pending;
    try { return await pending; } finally { setupRef.current = null; }
  }, []);

  const prepare = useCallback(() => {
    void setup().catch(err => setError(messageOf(err, "Unable to connect to the assistant.")));
  }, [setup]);

  const send = useCallback(async (message: string) => {
    if (!message || busy || running) return false;
    setBusy(true);
    setError("");
    try {
      const client = await setup();
      const payload = { content: message, sentAt: Date.now() };
      await client.sendMessage(payload);
      return true;
    } catch (err) {
      setError(messageOf(err, "Unable to reach the assistant."));
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, running, setup]);

  const stop = useCallback(() => { clientRef.current?.abort(); }, []);

  return { turns, running, busy, error, prepare, ensureReady: setup, send, stop };
}

export type IntakeAgentState = ReturnType<typeof useIntakeAgent>;
