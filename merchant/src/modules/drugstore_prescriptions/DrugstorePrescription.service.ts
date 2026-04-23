import { ExperienceOneInternalClient } from "../drugstore_internal/ExperienceOneInternalClient";

export class DrugstorePrescriptionService {
  private static readonly prescriptionPath = "/api/v1/main/drugstore/internal/prescriptions";

  static async listForMerchant(merchantId: string, status?: string) {
    return ExperienceOneInternalClient.get(this.prescriptionPath, { merchantId, status });
  }

  static async reviewForMerchant(
    merchantId: string,
    prescriptionId: string,
    payload: { action: "approved" | "rejected" | "needs_clarification"; note?: string; reviewerId?: string; reviewerName?: string }
  ) {
    return ExperienceOneInternalClient.post(`${this.prescriptionPath}/${prescriptionId}/review`, {
      merchantId,
      ...payload,
    });
  }
}
