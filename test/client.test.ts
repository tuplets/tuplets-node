import { describe, expect, it, vi } from "vitest";

import { TupletsClient } from "../src/index";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("TupletsClient", () => {
  it("creates a job from URL with bearer auth and form fields", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const form = await request.formData();

      expect(request.headers.get("authorization")).toBe("Bearer tb_test_key");
      expect(form.get("remote_url")).toBe("https://storage.example.com/call.wav");
      expect(form.get("diarization")).toBe("true");
      expect(form.get("pii_processing")).toBe("true");

      return jsonResponse(201, {
        status: "accepted",
        id: "job_123",
        status_url: "https://api.tuplets.ai/jobs/job_123",
        cancel_url: "https://api.tuplets.ai/jobs/job_123",
        cancel_token: "cancel_123",
      });
    });

    const client = new TupletsClient({ apiKey: "tb_test_key", fetch: fetchMock });

    const job = await client.jobs.createFromUrl("https://storage.example.com/call.wav", {
      language: "en",
      diarization: true,
      piiProcessing: true,
    });

    expect(job.id).toBe("job_123");
    expect(job.statusUrl).toBe("https://api.tuplets.ai/jobs/job_123");
  });

  it("creates a job with analytics JSON in form fields", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const form = await request.formData();
      const analytics = JSON.parse(String(form.get("analytics")));

      expect(analytics).toEqual({
        profile: "full",
        domain: "insurance",
      });

      return jsonResponse(201, {
        status: "accepted",
        id: "job_456",
        status_url: "https://api.tuplets.ai/jobs/job_456",
        cancel_url: "https://api.tuplets.ai/jobs/job_456",
        cancel_token: "cancel_456",
      });
    });

    const client = new TupletsClient({ apiKey: "tb_test_key", fetch: fetchMock });

    const job = await client.jobs.createFromUrl("https://storage.example.com/call.wav", {
      analytics: { profile: "full", domain: "insurance" },
    });

    expect(job.id).toBe("job_456");
  });

  it("wait polls until completion", async () => {
    const responses = [
      jsonResponse(200, {
        id: "job_123",
        status: "queued",
        result: null,
        error_message: null,
        audio_duration_seconds: 30,
        transcription_model: "standard",
        diarization: false,
        pii_processing: false,
        estimated_cost_usd: 0.1,
        billed_cost_usd: null,
        billing_status: "pending",
        source_type: "upload",
        result_download_available: false,
        source_audio_available: true,
        progress_percent: 5,
        estimated_seconds_remaining: 2,
        cancel_token: "cancel_123",
        created_at: "2026-01-01T00:00:00+00:00",
        started_at: null,
        completed_at: null,
        runtime_ms: null,
      }),
      jsonResponse(200, {
        id: "job_123",
        status: "completed",
        result: { text: "Finished" },
        error_message: null,
        audio_duration_seconds: 30,
        transcription_model: "standard",
        diarization: false,
        pii_processing: false,
        estimated_cost_usd: 0.1,
        billed_cost_usd: 0.1,
        billing_status: "billed",
        source_type: "upload",
        result_download_available: true,
        source_audio_available: true,
        progress_percent: 100,
        estimated_seconds_remaining: 0,
        cancel_token: null,
        created_at: "2026-01-01T00:00:00+00:00",
        started_at: "2026-01-01T00:00:02+00:00",
        completed_at: "2026-01-01T00:00:04+00:00",
        runtime_ms: 2200,
      }),
    ];

    const fetchMock = vi.fn(async () => responses.shift() as Response);
    const client = new TupletsClient({ apiKey: "tb_test_key", fetch: fetchMock });

    const job = await client.jobs.wait("job_123", { pollIntervalMs: 0, timeoutMs: 1_000 });

    expect(job.status).toBe("completed");
    expect(job.result).toEqual({ text: "Finished" });
  });

  it("uploads signed bytes without an authorization header", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      expect(request.url).toBe("https://uploads.example.com/object");
      expect(request.headers.get("authorization")).toBeNull();
      expect(request.headers.get("content-type")).toBe("audio/wav");
      return new Response("ok", { status: 200 });
    });

    const client = new TupletsClient({ apiKey: "tb_test_key", fetch: fetchMock });

    await client.uploads.uploadBytes(
      {
        uploadUrl: "https://uploads.example.com/object",
        uploadMethod: "PUT",
        uploadHeaders: { "Content-Type": "audio/wav" },
        objectKey: "uploads/account/object.wav",
        uploadToken: "upload_token",
        expiresInSeconds: 900,
      },
      new Uint8Array([1, 2, 3]),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});