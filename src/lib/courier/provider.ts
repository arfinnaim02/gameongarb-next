export type ShipmentInput = {
  orderNumber: string;
  name: string;
  phone: string;
  address: string;
  amount: number;
};
export interface CourierProvider {
  createShipment(
    i: ShipmentInput,
  ): Promise<{ consignmentId: string; trackingId: string }>;
  getShipment(id: string): Promise<{ status: string }>;
  cancelShipment(id: string): Promise<void>;
  trackShipment(
    id: string,
  ): Promise<{ status: string; events: { at: string; label: string }[] }>;
}
export class MockCourierProvider implements CourierProvider {
  async createShipment(i: ShipmentInput) {
    return {
      consignmentId: `MOCK-${i.orderNumber}`,
      trackingId: `TRACK-${Date.now()}`,
    };
  }
  async getShipment() {
    return { status: "created" };
  }
  async cancelShipment() {
    return;
  }
  async trackShipment() {
    return {
      status: "in_transit",
      events: [
        { at: new Date().toISOString(), label: "Mock shipment created" },
      ],
    };
  }
}
