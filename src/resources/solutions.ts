import { HTTPClient } from "../internal/http";
import {
  mapSolutionsInquirySubmission,
  serializeSolutionsInquiry,
} from "../internal/utils";
import type {
  SolutionsInquiryRequest,
  SolutionsInquirySubmission,
} from "../models";

export class SolutionsResource {
  constructor(private readonly http: HTTPClient) {}

  async createInquiry(
    request: SolutionsInquiryRequest,
  ): Promise<SolutionsInquirySubmission> {
    const payload = await this.http.requestJson<Record<string, unknown>>(
      "POST",
      "/solutions/inquiries",
      {
        authenticated: false,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializeSolutionsInquiry(request)),
      },
    );

    return mapSolutionsInquirySubmission(payload);
  }
}
