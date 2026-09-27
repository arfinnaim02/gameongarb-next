export type PaymentRequest = {
  orderNumber: string;
  amount: number;
  callbackUrl: string;
};
export type PaymentResult = {
  reference: string;
  redirectUrl?: string;
  status: "PENDING" | "PAID" | "FAILED";
  mode: "mock" | "sandbox" | "production";
};
export interface PaymentProvider {
  createPayment(input: PaymentRequest): Promise<PaymentResult>;
  executePayment(reference: string): Promise<PaymentResult>;
  queryPayment(reference: string): Promise<PaymentResult>;
  refundPayment(reference: string, amount: number): Promise<PaymentResult>;
}
export class MockBkashProvider implements PaymentProvider {
  async createPayment(i: PaymentRequest) {
    return {
      reference: `MOCK-${i.orderNumber}`,
      redirectUrl: `${i.callbackUrl}?mock=1`,
      status: "PENDING" as const,
      mode: "mock" as const,
    };
  }
  async executePayment(reference: string) {
    return { reference, status: "PAID" as const, mode: "mock" as const };
  }
  async queryPayment(reference: string) {
    return { reference, status: "PENDING" as const, mode: "mock" as const };
  }
  async refundPayment(reference: string) {
    return { reference, status: "PAID" as const, mode: "mock" as const };
  }
}
export class BkashProvider implements PaymentProvider {
  constructor(
    private config: {
      baseUrl: string;
      appKey: string;
      appSecret: string;
      username: string;
      password: string;
      mode: "sandbox" | "production";
    },
  ) {}
  private async call(path: string, body: unknown) {
    const r = await fetch(`${this.config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-app-key": this.config.appKey,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("bKash request failed");
    return r.json();
  }
  async createPayment(i: PaymentRequest) {
    const d = (await this.call("/create", i)) as {
      paymentID: string;
      bkashURL: string;
    };
    return {
      reference: d.paymentID,
      redirectUrl: d.bkashURL,
      status: "PENDING" as const,
      mode: this.config.mode,
    };
  }
  async executePayment(reference: string) {
    await this.call("/execute", { paymentID: reference });
    return { reference, status: "PAID" as const, mode: this.config.mode };
  }
  async queryPayment(reference: string) {
    await this.call("/query", { paymentID: reference });
    return { reference, status: "PENDING" as const, mode: this.config.mode };
  }
  async refundPayment(reference: string, amount: number) {
    await this.call("/refund", { paymentID: reference, amount });
    return { reference, status: "PAID" as const, mode: this.config.mode };
  }
}
