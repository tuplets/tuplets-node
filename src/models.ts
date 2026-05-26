export type TranscriptionModel = "standard" | "premium";
export type JobState = "queued" | "running" | "completed" | "failed";
export type InsightsTier = "fast" | "deep";

export type JsonObject = Record<string, unknown>;
export type BinaryPayload = Blob | ArrayBuffer | ArrayBufferView;

export interface JobCreateParams {
  language?: string;
  transcriptionModel?: TranscriptionModel;
  diarization?: boolean;
  piiProcessing?: boolean;
  insights?: boolean;
  insightsFast?: boolean;
  insightsDeep?: boolean;
}

export interface UploadedAudioReference {
  objectKey: string;
  uploadToken: string;
}

export interface CreateUploadTargetParams {
  filename: string;
  size: number;
  contentType?: string;
}

export interface JobAccepted {
  status: "accepted";
  id: string;
  statusUrl: string;
  cancelUrl: string;
  cancelToken: string;
}

export interface BrowserUploadTarget {
  uploadUrl: string;
  uploadMethod: "PUT";
  uploadHeaders: Record<string, string>;
  objectKey: string;
  uploadToken: string;
  expiresInSeconds: number;
}

export interface JobStatus {
  id: string;
  status: string;
  result: JsonObject | null;
  errorMessage: string | null;
  audioDurationSeconds: number | null;
  transcriptionModel: TranscriptionModel;
  diarization: boolean;
  piiProcessing: boolean;
  insights: boolean;
  insightsFast: boolean;
  insightsDeep: boolean;
  insightsTier: InsightsTier | null;
  estimatedCostUsd: number | null;
  billedCostUsd: number | null;
  billingStatus: string | null;
  sourceType: string | null;
  resultDownloadAvailable: boolean;
  sourceAudioAvailable: boolean;
  progressPercent: number | null;
  estimatedSecondsRemaining: number | null;
  cancelToken: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  runtimeMs: number | null;
}

export interface JobList {
  items: JobStatus[];
  totalItems: number;
  statusFilter: string | null;
}

export interface SolutionsInquiryRequest {
  companyName: string;
  contactEmail: string;
  role: string;
  projectType: string;
  budgetRange: string;
  audioHoursOfProcessing: string;
  requirements: string;
}

export interface SolutionsInquirySubmission {
  status: string;
  message: string;
  inquiryId: string;
  submittedAt: string;
}

export interface WaitOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}
