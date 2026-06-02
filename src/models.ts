export type TranscriptionModel = "standard" | "premium";
export type JobState = "queued" | "running" | "completed" | "failed";

export type JsonObject = Record<string, unknown>;
export type BinaryPayload = Blob | ArrayBuffer | ArrayBufferView;

/** Execution metadata nested under completed job results (`result.feature_execution`). */
export interface FeatureExecution {
  transcription_requested?: boolean;
  transcription_applied?: boolean;
  transcription_model_requested?: TranscriptionModel;
  transcription_model_applied?: TranscriptionModel | null;
  transcription_elapsed_seconds?: number;
  diarization_requested?: boolean;
  diarization_applied?: boolean;
  diarization_elapsed_seconds?: number;
  pii_processing_requested?: boolean;
  pii_processing_applied?: boolean;
  pii_processing_elapsed_seconds?: number;
  pii_processing_language?: string;
  pii_processing_skip_reason?: string;
  generic_analytics_requested?: boolean;
  generic_analytics_tier_requested?: string | null;
  generic_analytics_applied?: boolean;
  generic_analytics_tier_applied?: string | null;
  generic_analytics_elapsed_seconds?: number;
  analytics_requested?: boolean;
  analytics_profile_requested?: string | null;
  analytics_applied?: boolean;
  analytics_elapsed_seconds?: number;
  custom_analytics_requested?: boolean;
  custom_analytics_applied?: boolean;
  custom_analytics_elapsed_seconds?: number;
}

/**
 * Parameters for job submission.
 *
 * When `diarization` is `true`, speaker attribution is treated as a required
 * outcome. Jobs can finish as `failed` if usable diarization cannot be
 * produced.
 */
export interface JobCreateParams {
  language?: string;
  transcriptionModel?: TranscriptionModel;
  /** Enable speaker diarization. Diarized jobs can fail if speaker attribution cannot be produced. */
  diarization?: boolean;
  piiProcessing?: boolean;
  analytics?: JsonObject;
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

/**
 * Normalized job status returned by the API.
 *
 * `result` is populated only for completed jobs. When `diarization` is
 * enabled, failed speaker attribution leaves `result` as `null` and surfaces
 * the failure detail through `errorMessage`.
 */
export interface JobStatus {
  id: string;
  status: JobState;
  result: JsonObject | null;
  errorMessage: string | null;
  audioDurationSeconds: number | null;
  transcriptionModel: TranscriptionModel;
  diarization: boolean;
  piiProcessing: boolean;
  analytics: JsonObject | null;
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
