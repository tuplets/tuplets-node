import type {
  BinaryPayload,
  BrowserUploadTarget,
  JobAccepted,
  JobCreateParams,
  JobList,
  JobStatus,
  JsonObject,
  SolutionsInquiryRequest,
  SolutionsInquirySubmission,
} from "../models";

export const SDK_VERSION = "0.1.0";
export const DEFAULT_BASE_URL = "https://api.tuplets.ai";
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_POLL_INTERVAL_MS = 2_000;
export const DEFAULT_USER_AGENT = `tuplets-typescript/${SDK_VERSION}`;

const contentTypeByExtension: Record<string, string> = {
  aac: "audio/aac",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  webm: "audio/webm",
  wma: "audio/x-ms-wma",
};

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function boolToApi(value: boolean | undefined): string {
  return value ? "true" : "false";
}

export function guessContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return contentTypeByExtension[extension] ?? "application/octet-stream";
}

export function toBlob(data: BinaryPayload, contentType?: string): Blob {
  if (data instanceof Blob) {
    if (!contentType || data.type === contentType) {
      return data;
    }
    return new Blob([data], { type: contentType });
  }

  if (ArrayBuffer.isView(data)) {
    const copy = new Uint8Array(data.byteLength);
    copy.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    return new Blob([copy], { type: contentType });
  }

  return new Blob([data], { type: contentType });
}

export function appendJobCreateParams(form: FormData, params: JobCreateParams = {}): void {
  form.append("language", params.language ?? "auto");
  form.append("transcription_model", params.transcriptionModel ?? "standard");
  form.append("diarization", boolToApi(params.diarization));
  form.append("pii_processing", boolToApi(params.piiProcessing));
  if (params.analytics !== undefined) {
    form.append("analytics", JSON.stringify(params.analytics));
  }
}

export function serializeSolutionsInquiry(
  request: SolutionsInquiryRequest,
): Record<string, string> {
  return {
    company_name: request.companyName,
    contact_email: request.contactEmail,
    role: request.role,
    project_type: request.projectType,
    budget_range: request.budgetRange,
    audio_hours_of_processing: request.audioHoursOfProcessing,
    requirements: request.requirements,
  };
}

export function mapJobAccepted(payload: Record<string, unknown>): JobAccepted {
  return {
    status: "accepted",
    id: String(payload.id),
    statusUrl: String(payload.status_url),
    cancelUrl: String(payload.cancel_url),
    cancelToken: String(payload.cancel_token),
  };
}

export function mapBrowserUploadTarget(
  payload: Record<string, unknown>,
): BrowserUploadTarget {
  return {
    uploadUrl: String(payload.upload_url),
    uploadMethod: "PUT",
    uploadHeaders: (payload.upload_headers as Record<string, string>) ?? {},
    objectKey: String(payload.object_key),
    uploadToken: String(payload.upload_token),
    expiresInSeconds: Number(payload.expires_in_seconds),
  };
}

export function mapJobStatus(payload: Record<string, unknown>): JobStatus {
  return {
    id: String(payload.id),
    status: String(payload.status) as JobStatus["status"],
    result: (payload.result as JsonObject | null) ?? null,
    errorMessage: (payload.error_message as string | null) ?? null,
    audioDurationSeconds:
      payload.audio_duration_seconds == null ? null : Number(payload.audio_duration_seconds),
    transcriptionModel: (payload.transcription_model as JobStatus["transcriptionModel"]) ?? "standard",
    diarization: Boolean(payload.diarization),
    piiProcessing: Boolean(payload.pii_processing),
    analytics:
      payload.analytics != null && typeof payload.analytics === "object" && !Array.isArray(payload.analytics)
        ? (payload.analytics as JsonObject)
        : null,
    estimatedCostUsd:
      payload.estimated_cost_usd == null ? null : Number(payload.estimated_cost_usd),
    billedCostUsd:
      payload.billed_cost_usd == null ? null : Number(payload.billed_cost_usd),
    billingStatus: (payload.billing_status as string | null) ?? null,
    sourceType: (payload.source_type as string | null) ?? null,
    resultDownloadAvailable: Boolean(payload.result_download_available),
    sourceAudioAvailable: Boolean(payload.source_audio_available),
    progressPercent: payload.progress_percent == null ? null : Number(payload.progress_percent),
    estimatedSecondsRemaining:
      payload.estimated_seconds_remaining == null
        ? null
        : Number(payload.estimated_seconds_remaining),
    cancelToken: (payload.cancel_token as string | null) ?? null,
    createdAt: String(payload.created_at),
    startedAt: (payload.started_at as string | null) ?? null,
    completedAt: (payload.completed_at as string | null) ?? null,
    runtimeMs: payload.runtime_ms == null ? null : Number(payload.runtime_ms),
  };
}

export function mapJobList(payload: Record<string, unknown>): JobList {
  return {
    items: Array.isArray(payload.items)
      ? payload.items.map((item) => mapJobStatus(item as Record<string, unknown>))
      : [],
    totalItems: Number(payload.total_items ?? 0),
    statusFilter: (payload.status_filter as string | null) ?? null,
  };
}

export function mapSolutionsInquirySubmission(
  payload: Record<string, unknown>,
): SolutionsInquirySubmission {
  return {
    status: String(payload.status),
    message: String(payload.message),
    inquiryId: String(payload.inquiry_id),
    submittedAt: String(payload.submitted_at),
  };
}
