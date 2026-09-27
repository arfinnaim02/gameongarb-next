export interface SmsProvider {
  send(
    to: string,
    message: string,
  ): Promise<{ id: string; status: "sent" | "queued" }>;
}
export class MockSmsProvider implements SmsProvider {
  async send(to: string, message: string) {
    console.info("[MOCK SMS]", { to, message });
    return { id: `mock-${Date.now()}`, status: "sent" as const };
  }
}
export class HttpSmsProvider implements SmsProvider {
  constructor(
    private config: { url: string; apiKey: string; senderId: string },
  ) {}
  async send(to: string, message: string) {
    const r = await fetch(this.config.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ to, message, senderId: this.config.senderId }),
    });
    if (!r.ok) throw new Error("SMS provider failed");
    const d = (await r.json()) as { id: string };
    return { id: d.id, status: "queued" as const };
  }
}
