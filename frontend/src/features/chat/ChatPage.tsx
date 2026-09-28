import { useEffect, useRef, useState } from "react";

import { Button, Disclaimer, LatticeLoader, PageHeader, cardBase } from "../../components/ui";
import { api } from "../../lib/api";
import type { ChatMessage, ChatResponse } from "../../lib/types";

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<ChatMessage[]>("/chat/history")
      .then(({ data }) => setMessages(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      sentiment: null,
      ts: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPending(true);
    try {
      const { data } = await api.post<ChatResponse>("/chat", { message: text });
      setOffline(data.source === "fallback");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          sentiment: null,
          ts: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't respond just now. Please try again.",
          sentiment: null,
          ts: new Date().toISOString(),
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <PageHeader
        title="Gym Buddy"
        subtitle="Your motivational AI coach."
        actions={
          offline && (
            <span className="rounded-full bg-hot/10 px-3 py-1 text-xs font-medium text-hot">
              AI offline — basic reply
            </span>
          )
        }
      />

      <div className={`${cardBase} flex-1 overflow-y-auto p-5`}>
        {messages.length === 0 && !pending && (
          <p className="py-12 text-center text-sm text-ink-3">
            Say hi to get started — ask about workouts, nutrition, or motivation.
          </p>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-accent text-accent-ink"
                    : "bg-surface-raised text-ink-2"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-surface-raised px-4 py-3">
                <LatticeLoader
                  status="working"
                  label="Thinking"
                  pattern="orbit"
                  grid={3}
                  shape="round"
                  cellSize={6}
                  gap={2}
                  fontSize={14}
                  step={90}
                  idleOpacity={0.15}
                  showTimer
                />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="auth-input flex-1"
        />
        <Button disabled={pending || !input.trim()}>Send</Button>
      </form>

      <Disclaimer className="mt-3">
        Not a medical device. Coaching replies are informational only — not medical
        advice.
      </Disclaimer>
    </div>
  );
}
