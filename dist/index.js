// src/errors.ts
var TupletsError = class extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
};
var APIStatusError = class extends TupletsError {
  constructor(message, statusCode, responseBody) {
    super(message);
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
  statusCode;
  responseBody;
};
var AuthenticationError = class extends APIStatusError {
};
var PermissionDeniedError = class extends APIStatusError {
};
var ValidationError = class extends APIStatusError {
};
var PaymentRequiredError = class extends APIStatusError {
};
var NotFoundError = class extends APIStatusError {
};
var ConflictError = class extends APIStatusError {
};
var GoneError = class extends APIStatusError {
};
var RateLimitError = class extends APIStatusError {
};
var RequestTimeoutError = class extends TupletsError {
};
var WaitTimeoutError = class extends TupletsError {
};
var statusErrorMap = {
  400: ValidationError,
  401: AuthenticationError,
  402: PaymentRequiredError,
  403: PermissionDeniedError,
  404: NotFoundError,
  409: ConflictError,
  410: GoneError,
  429: RateLimitError
};
function createAPIError(statusCode, message, responseBody) {
  const ErrorClass = statusErrorMap[statusCode] ?? APIStatusError;
  return new ErrorClass(message, statusCode, responseBody);
}

// src/internal/utils.ts
var SDK_VERSION = "0.1.0";
var DEFAULT_BASE_URL = "https://api.tuplets.ai";
var DEFAULT_TIMEOUT_MS = 6e4;
var DEFAULT_POLL_INTERVAL_MS = 2e3;
var DEFAULT_USER_AGENT = `tuplets-typescript/${SDK_VERSION}`;
var contentTypeByExtension = {
  aac: "audio/aac",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  webm: "audio/webm",
  wma: "audio/x-ms-wma"
};
function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function boolToApi(value) {
  return value ? "true" : "false";
}
function guessContentType(filename) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return contentTypeByExtension[extension] ?? "application/octet-stream";
}
function toBlob(data, contentType) {
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
function appendJobCreateParams(form, params = {}) {
  form.append("language", params.language ?? "auto");
  form.append("transcription_model", params.transcriptionModel ?? "standard");
  form.append("diarization", boolToApi(params.diarization));
  form.append("pii_processing", boolToApi(params.piiProcessing));
  form.append("insights", boolToApi(params.insights));
  form.append("insights_fast", boolToApi(params.insightsFast));
  form.append("insights_deep", boolToApi(params.insightsDeep));
}
function serializeSolutionsInquiry(request) {
  return {
    company_name: request.companyName,
    contact_email: request.contactEmail,
    role: request.role,
    project_type: request.projectType,
    budget_range: request.budgetRange,
    audio_hours_of_processing: request.audioHoursOfProcessing,
    requirements: request.requirements
  };
}
function mapJobAccepted(payload) {
  return {
    status: "accepted",
    id: String(payload.id),
    statusUrl: String(payload.status_url),
    cancelUrl: String(payload.cancel_url),
    cancelToken: String(payload.cancel_token)
  };
}
function mapBrowserUploadTarget(payload) {
  return {
    uploadUrl: String(payload.upload_url),
    uploadMethod: "PUT",
    uploadHeaders: payload.upload_headers ?? {},
    objectKey: String(payload.object_key),
    uploadToken: String(payload.upload_token),
    expiresInSeconds: Number(payload.expires_in_seconds)
  };
}
function mapJobStatus(payload) {
  return {
    id: String(payload.id),
    status: String(payload.status),
    result: payload.result ?? null,
    errorMessage: payload.error_message ?? null,
    audioDurationSeconds: payload.audio_duration_seconds == null ? null : Number(payload.audio_duration_seconds),
    transcriptionModel: payload.transcription_model ?? "standard",
    diarization: Boolean(payload.diarization),
    piiProcessing: Boolean(payload.pii_processing),
    insights: Boolean(payload.insights),
    insightsFast: Boolean(payload.insights_fast),
    insightsDeep: Boolean(payload.insights_deep),
    insightsTier: payload.insights_tier ?? null,
    estimatedCostUsd: payload.estimated_cost_usd == null ? null : Number(payload.estimated_cost_usd),
    billedCostUsd: payload.billed_cost_usd == null ? null : Number(payload.billed_cost_usd),
    billingStatus: payload.billing_status ?? null,
    sourceType: payload.source_type ?? null,
    resultDownloadAvailable: Boolean(payload.result_download_available),
    sourceAudioAvailable: Boolean(payload.source_audio_available),
    progressPercent: payload.progress_percent == null ? null : Number(payload.progress_percent),
    estimatedSecondsRemaining: payload.estimated_seconds_remaining == null ? null : Number(payload.estimated_seconds_remaining),
    cancelToken: payload.cancel_token ?? null,
    createdAt: String(payload.created_at),
    startedAt: payload.started_at ?? null,
    completedAt: payload.completed_at ?? null,
    runtimeMs: payload.runtime_ms == null ? null : Number(payload.runtime_ms)
  };
}
function mapJobList(payload) {
  return {
    items: Array.isArray(payload.items) ? payload.items.map((item) => mapJobStatus(item)) : [],
    totalItems: Number(payload.total_items ?? 0),
    statusFilter: payload.status_filter ?? null
  };
}
function mapSolutionsInquirySubmission(payload) {
  return {
    status: String(payload.status),
    message: String(payload.message),
    inquiryId: String(payload.inquiry_id),
    submittedAt: String(payload.submitted_at)
  };
}

// src/internal/http.ts
var HTTPClient = class {
  constructor(options) {
    this.options = options;
    if (!options.apiKey.trim()) {
      throw new TupletsError("TupletsClient requires a non-empty API key.");
    }
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }
  options;
  fetchImpl;
  baseUrl;
  timeoutMs;
  userAgent;
  async requestJson(method, path, options = {}) {
    const response = await this.request(method, path, options);
    const body = await this.readBody(response);
    if (!response.ok) {
      throw this.toError(response.status, body);
    }
    if (body && typeof body === "object") {
      return body;
    }
    throw new TupletsError("Expected a JSON object response from the Tuplets API.");
  }
  async requestVoid(method, path, options = {}) {
    const response = await this.request(method, path, options);
    const body = await this.readBody(response);
    if (!response.ok) {
      throw this.toError(response.status, body);
    }
  }
  async request(method, path, options) {
    const headers = new Headers(options.headers ?? {});
    headers.set("User-Agent", this.userAgent);
    if (options.expectJson !== false && !headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    if (options.authenticated !== false && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${this.options.apiKey}`);
    }
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await this.fetchImpl(this.buildUrl(path), {
        method,
        headers,
        body: options.body,
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new RequestTimeoutError(`Tuplets request timed out after ${timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  buildUrl(path) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }
  async readBody(response) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }
    const text = await response.text();
    return text.length > 0 ? text : null;
  }
  toError(statusCode, body) {
    const message = body && typeof body === "object" && "detail" in body && typeof body.detail === "string" ? body.detail : typeof body === "string" && body.trim().length > 0 ? body : `Tuplets API request failed with status ${statusCode}.`;
    return createAPIError(statusCode, message, body);
  }
};

// src/resources/jobs.ts
import { readFile } from "fs/promises";
import { basename } from "path";
var JobsResource = class {
  constructor(http) {
    this.http = http;
  }
  http;
  async createFromFile(filePath, params = {}, contentType) {
    const data = await readFile(filePath);
    return this.createFromBytes(basename(filePath), data, params, contentType);
  }
  async createFromBytes(filename, data, params = {}, contentType) {
    const form = new FormData();
    form.append(
      "audio_file",
      toBlob(data, contentType ?? guessContentType(filename)),
      filename
    );
    appendJobCreateParams(form, params);
    const payload = await this.http.requestJson("POST", "/jobs", {
      body: form
    });
    return mapJobAccepted(payload);
  }
  async createFromUrl(remoteUrl, params = {}) {
    const form = new FormData();
    appendJobCreateParams(form, params);
    form.append("remote_url", remoteUrl);
    const payload = await this.http.requestJson("POST", "/jobs", {
      body: form
    });
    return mapJobAccepted(payload);
  }
  async createFromUploadedAudio(reference, params = {}) {
    const form = new FormData();
    appendJobCreateParams(form, params);
    form.append("uploaded_audio_key", reference.objectKey);
    form.append("uploaded_audio_token", reference.uploadToken);
    const payload = await this.http.requestJson("POST", "/jobs", {
      body: form
    });
    return mapJobAccepted(payload);
  }
  async get(jobId) {
    const payload = await this.http.requestJson("GET", `/jobs/${jobId}`);
    return mapJobStatus(payload);
  }
  async list(options = {}) {
    const search = new URLSearchParams();
    if (options.status) {
      search.set("status", options.status);
    }
    search.set("limit", String(options.limit ?? 20));
    const payload = await this.http.requestJson(
      "GET",
      `/jobs?${search.toString()}`
    );
    return mapJobList(payload);
  }
  async cancel(jobId) {
    await this.http.requestVoid("DELETE", `/jobs/${jobId}`);
  }
  async cancelWithToken(cancelToken) {
    await this.http.requestVoid("POST", "/jobs/cancel", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancel_token: cancelToken })
    });
  }
  async downloadResult(jobId) {
    return this.http.requestJson("GET", `/jobs/${jobId}/download`);
  }
  async wait(jobId, options = {}) {
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const deadline = options.timeoutMs == null ? null : Date.now() + options.timeoutMs;
    while (true) {
      const job = await this.get(jobId);
      if (job.status === "completed" || job.status === "failed") {
        return job;
      }
      if (deadline !== null && Date.now() >= deadline) {
        throw new WaitTimeoutError(`Timed out waiting for job ${jobId} to finish.`);
      }
      await sleep(pollIntervalMs);
    }
  }
};

// src/resources/solutions.ts
var SolutionsResource = class {
  constructor(http) {
    this.http = http;
  }
  http;
  async createInquiry(request) {
    const payload = await this.http.requestJson(
      "POST",
      "/solutions/inquiries",
      {
        authenticated: false,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializeSolutionsInquiry(request))
      }
    );
    return mapSolutionsInquirySubmission(payload);
  }
};

// src/resources/uploads.ts
import { readFile as readFile2 } from "fs/promises";
import { basename as basename2 } from "path";
var UploadsResource = class {
  constructor(http) {
    this.http = http;
  }
  http;
  async createTarget(params) {
    const payload = await this.http.requestJson(
      "POST",
      "/jobs/upload-target",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: params.filename,
          size: params.size,
          content_type: params.contentType ?? null
        })
      }
    );
    return mapBrowserUploadTarget(payload);
  }
  async uploadFile(target, filePath, contentType) {
    const data = await readFile2(filePath);
    await this.uploadBytes(
      target,
      data,
      contentType ?? guessContentType(basename2(filePath))
    );
  }
  async uploadBytes(target, data, contentType) {
    const headers = new Headers(target.uploadHeaders);
    if (contentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }
    await this.http.requestVoid(target.uploadMethod, target.uploadUrl, {
      authenticated: false,
      expectJson: false,
      headers,
      body: toBlob(data, contentType ?? headers.get("Content-Type") ?? void 0)
    });
  }
};

// src/client.ts
var TupletsClient = class {
  http;
  jobs;
  uploads;
  solutions;
  constructor(options) {
    this.http = new HTTPClient(options);
    this.jobs = new JobsResource(this.http);
    this.uploads = new UploadsResource(this.http);
    this.solutions = new SolutionsResource(this.http);
  }
};
export {
  APIStatusError,
  AuthenticationError,
  ConflictError,
  GoneError,
  NotFoundError,
  PaymentRequiredError,
  PermissionDeniedError,
  RateLimitError,
  RequestTimeoutError,
  TupletsClient,
  TupletsError,
  ValidationError,
  WaitTimeoutError
};
//# sourceMappingURL=index.js.map