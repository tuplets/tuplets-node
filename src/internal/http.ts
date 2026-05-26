import {
  APIStatusError,
  RequestTimeoutError,
  TupletsError,
  createAPIError,
} from "../errors";
import {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  normalizeBaseUrl,
} from "./utils";

export interface HTTPClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  userAgent?: string;
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions {
  headers?: HeadersInit;
  body?: BodyInit | null;
  authenticated?: boolean;
  expectJson?: boolean;
  timeoutMs?: number;
}

export class HTTPClient {
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(private readonly options: HTTPClientOptions) {
    if (!options.apiKey.trim()) {
      throw new TupletsError("TupletsClient requires a non-empty API key.");
    }

    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  async requestJson<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(method, path, options);
    const body = await this.readBody(response);

    if (!response.ok) {
      throw this.toError(response.status, body);
    }

    if (body && typeof body === "object") {
      return body as T;
    }

    throw new TupletsError("Expected a JSON object response from the Tuplets API.");
  }

  async requestVoid(method: string, path: string, options: RequestOptions = {}): Promise<void> {
    const response = await this.request(method, path, options);
    const body = await this.readBody(response);
    if (!response.ok) {
      throw this.toError(response.status, body);
    }
  }

  private async request(method: string, path: string, options: RequestOptions): Promise<Response> {
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
        signal: controller.signal,
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

  private buildUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  private async readBody(response: Response): Promise<unknown> {
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

  private toError(statusCode: number, body: unknown): APIStatusError {
    const message =
      body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
        ? body.detail
        : typeof body === "string" && body.trim().length > 0
          ? body
          : `Tuplets API request failed with status ${statusCode}.`;

    return createAPIError(statusCode, message, body);
  }
}
