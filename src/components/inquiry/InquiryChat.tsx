import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StepControl } from "./StepControl";
import { STEPS, displayValue, isCaptured } from "./types";
import type { InquiryDraft } from "./useInquiryDraft";
import type { IntakeAgentState } from "./useIntakeAgent";

const PRICE_PATTERN = /\p{Sc}|\b(?:USD|dollars?)\b/iu;

function SazonMessages({ agent }: { agent: IntakeAgentState }) {
  return (
    <>
      {agent.turns.flatMap(turn => turn.messages).map(item => {
        if (item.kind === "custom") {
          if (item.event.name === "agent.turn.error") return <p key={item.id} role="alert" className="iq-error">The assistant encountered an error. Please try again.</p>;
          if (item.event.name === "agent.turn.cancelled") return <p key={item.id} className="iq-muted">Response cancelled.</p>;
          return null;
        }
        const message = item.message;
        if (message.role === "user" && typeof message.content === "string") return <div key={item.id} className="iq-bubble iq-user">{message.content}</div>;
        if (message.role === "assistant") {
          return (
            <Fragment key={item.id}>
              {message.content && typeof message.content === "string" && (
                <div className="iq-bubble iq-assistant iq-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {PRICE_PATTERN.test(message.content) ? "This response contains pricing, which is not displayed during intake. Please ask about the menu or your event details instead." : message.content}
                  </ReactMarkdown>
                </div>
              )}
              {message.toolCalls?.length ? <details className="iq-muted"><summary>Assistant actions</summary>{message.toolCalls.map(tool => <p key={tool.id}>{tool.function.name}</p>)}</details> : null}
            </Fragment>
          );
        }
        return null;
      })}
    </>
  );
}

export function InquiryChat({ draft, agent }: { draft: InquiryDraft; agent: IntakeAgentState }) {
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const { details, active, editing, edited, interacted, locked } = draft;
  const sending = agent.busy || agent.running;

  useEffect(() => {
    if (!interacted) return;
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active, interacted]);

  useEffect(() => {
    const log = logRef.current;
    if (log && agent.turns.length > 0) log.scrollTop = log.scrollHeight;
  }, [agent.turns, agent.running]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const ok = await agent.send(text);
    if (!ok) setInput(text);
  }

  return (
    <section className="iq-panel iq-chat" aria-labelledby="iq-chat-title">
      <div className="iq-chat-head">
        <h3 id="iq-chat-title">Chat with Sazón Catering</h3>
        <p>Demo only · Please use synthetic or anonymized information.</p>
      </div>
      <div className="iq-log" ref={logRef} aria-live="polite">
        <div className="iq-bubble iq-assistant">¡Hola! I'll ask a few quick questions about your gathering. Tap or type your answers and your request card will fill in as we go.</div>
        {STEPS.map(step => {
          const captured = isCaptured(details, step.key);
          const isActive = active === step.key;
          if (!captured && !isActive) return null;
          return (
            <Fragment key={step.key}>
              <div className="iq-bubble iq-assistant">{step.prompt}</div>
              {isActive ? (
                <div ref={activeRef}>
                  <StepControl step={step.key} details={details} onSave={draft.setValue} onCancel={editing ? draft.cancelEdit : undefined} autoFocus={interacted} />
                </div>
              ) : (
                <div className="iq-bubble iq-user">
                  {displayValue(details, step.key)}
                  {edited.includes(step.key) && <span className="iq-edited">Updated</span>}
                </div>
              )}
            </Fragment>
          );
        })}
        {!active && (
          <div className="iq-bubble iq-assistant">
            {locked ? "Your demo inquiry is saved." : "That's everything I need. Check your request and submit it when you're ready."}
            <div className="iq-actions"><button type="button" className="iq-btn iq-primary" onClick={draft.openReview}>{locked ? "View your request" : "Review and confirm"}</button></div>
          </div>
        )}
        {agent.turns.length > 0 && <div className="iq-divider" role="separator"><span>Conversation with Sazón</span></div>}
        <SazonMessages agent={agent} />
        {sending && <p className="iq-muted">Sazón is responding…</p>}
        {agent.error && <p role="alert" className="iq-error">{agent.error}</p>}
      </div>
      <form onSubmit={send} className="iq-compose">
        <input aria-label="Message Sazón Catering" className="iq-input" value={input} onChange={event => setInput(event.target.value)} placeholder="Ask Sazón a question…" />
        <button type="submit" className="iq-btn iq-primary iq-send" disabled={!input.trim() || sending}>Send</button>
        {sending && <button type="button" className="iq-btn iq-secondary" onClick={agent.stop}>Stop</button>}
      </form>
      <p className="iq-note">Sazón can answer questions, but your request card fills in only from the quick-pick answers above.</p>
    </section>
  );
}
