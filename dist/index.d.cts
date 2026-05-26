interface HTTPClientOptions {
    apiKey: string;
    baseUrl?: string;
    timeoutMs?: number;
    userAgent?: string;
    fetch?: typeof globalThis.fetch;
}
interface RequestOptions {
    headers?: HeadersInit;
    body?: BodyInit | null;
    authenticated?: boolean;
    expectJson?: boolean;
    timeoutMs?: number;
}
declare class HTTPClient {
    private readonly options;
    private readonly fetchImpl;
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly userAgent;
    constructor(options: HTTPClientOptions);
    requestJson<T>(method: string, path: string, options?: RequestOptions): Promise<T>;
    requestVoid(method: string, path: string, options?: RequestOptions): Promise<void>;
    private request;
    private buildUrl;
    private readBody;
    private toError;
}

type TranscriptionModel = "standard" | "premium";
type JobState = "queued" | "running" | "completed" | "failed";
type InsightsTier = "fast" | "deep";
type JsonObject = Record<string, unknown>;
type BinaryPayload = Blob | ArrayBuffer | ArrayBufferView;
interface JobCreateParams {
    language?: string;
    transcriptionModel?: TranscriptionModel;
    diarization?: boolean;
    piiProcessing?: boolean;
    insights?: boolean;
    insightsFast?: boolean;
    insightsDeep?: boolean;
}
interface UploadedAudioReference {
    objectKey: string;
    uploadToken: string;
}
interface CreateUploadTargetParams {
    filename: string;
    size: number;
    contentType?: string;
}
interface JobAccepted {
    status: "accepted";
    id: string;
    statusUrl: string;
    cancelUrl: string;
    cancelToken: string;
}
interface BrowserUploadTarget {
    uploadUrl: string;
    uploadMethod: "PUT";
    uploadHeaders: Record<string, string>;
    objectKey: string;
    uploadToken: string;
    expiresInSeconds: number;
}
interface JobStatus {
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
interface JobList {
    items: JobStatus[];
    totalItems: number;
    statusFilter: string | null;
}
interface SolutionsInquiryRequest {
    companyName: string;
    contactEmail: string;
    role: string;
    projectType: string;
    budgetRange: string;
    audioHoursOfProcessing: string;
    requirements: string;
}
interface SolutionsInquirySubmission {
    status: string;
    message: string;
    inquiryId: string;
    submittedAt: string;
}
interface WaitOptions {
    pollIntervalMs?: number;
    timeoutMs?: number;
}

declare class JobsResource {
    private readonly http;
    constructor(http: HTTPClient);
    createFromFile(filePath: string, params?: JobCreateParams, contentType?: string): Promise<JobAccepted>;
    createFromBytes(filename: string, data: BinaryPayload, params?: JobCreateParams, contentType?: string): Promise<JobAccepted>;
    createFromUrl(remoteUrl: string, params?: JobCreateParams): Promise<JobAccepted>;
    createFromUploadedAudio(reference: UploadedAudioReference, params?: JobCreateParams): Promise<JobAccepted>;
    get(jobId: string): Promise<JobStatus>;
    list(options?: {
        status?: string;
        limit?: number;
    }): Promise<JobList>;
    cancel(jobId: string): Promise<void>;
    cancelWithToken(cancelToken: string): Promise<void>;
    downloadResult(jobId: string): Promise<JsonObject>;
    wait(jobId: string, options?: WaitOptions): Promise<JobStatus>;
}

declare class SolutionsResource {
    private readonly http;
    constructor(http: HTTPClient);
    createInquiry(request: SolutionsInquiryRequest): Promise<SolutionsInquirySubmission>;
}

declare class UploadsResource {
    private readonly http;
    constructor(http: HTTPClient);
    createTarget(params: CreateUploadTargetParams): Promise<BrowserUploadTarget>;
    uploadFile(target: BrowserUploadTarget, filePath: string, contentType?: string): Promise<void>;
    uploadBytes(target: BrowserUploadTarget, data: BinaryPayload, contentType?: string): Promise<void>;
}

interface TupletsClientOptions extends HTTPClientOptions {
}
declare class TupletsClient {
    private readonly http;
    readonly jobs: JobsResource;
    readonly uploads: UploadsResource;
    readonly solutions: SolutionsResource;
    constructor(options: TupletsClientOptions);
}

declare class TupletsError extends Error {
    constructor(message: string);
}
declare class APIStatusError extends TupletsError {
    readonly statusCode: number;
    readonly responseBody: unknown;
    constructor(message: string, statusCode: number, responseBody: unknown);
}
declare class AuthenticationError extends APIStatusError {
}
declare class PermissionDeniedError extends APIStatusError {
}
declare class ValidationError extends APIStatusError {
}
declare class PaymentRequiredError extends APIStatusError {
}
declare class NotFoundError extends APIStatusError {
}
declare class ConflictError extends APIStatusError {
}
declare class GoneError extends APIStatusError {
}
declare class RateLimitError extends APIStatusError {
}
declare class RequestTimeoutError extends TupletsError {
}
declare class WaitTimeoutError extends TupletsError {
}

export { APIStatusError, AuthenticationError, type BinaryPayload, type BrowserUploadTarget, ConflictError, type CreateUploadTargetParams, GoneError, type InsightsTier, type JobAccepted, type JobCreateParams, type JobList, type JobState, type JobStatus, type JsonObject, NotFoundError, PaymentRequiredError, PermissionDeniedError, RateLimitError, RequestTimeoutError, type SolutionsInquiryRequest, type SolutionsInquirySubmission, type TranscriptionModel, TupletsClient, type TupletsClientOptions, TupletsError, type UploadedAudioReference, ValidationError, type WaitOptions, WaitTimeoutError };
