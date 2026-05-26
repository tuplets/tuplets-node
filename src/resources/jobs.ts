import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { WaitTimeoutError } from "../errors";
import { HTTPClient } from "../internal/http";
import {
  DEFAULT_POLL_INTERVAL_MS,
  appendJobCreateParams,
  guessContentType,
  mapJobAccepted,
  mapJobList,
  mapJobStatus,
  sleep,
  toBlob,
} from "../internal/utils";
import type {
  BinaryPayload,
  JobAccepted,
  JobCreateParams,
  JobList,
  JobStatus,
  JsonObject,
  UploadedAudioReference,
  WaitOptions,
} from "../models";

export class JobsResource {
  constructor(private readonly http: HTTPClient) {}

  async createFromFile(
    filePath: string,
    params: JobCreateParams = {},
    contentType?: string,
  ): Promise<JobAccepted> {
    const data = await readFile(filePath);
    return this.createFromBytes(basename(filePath), data, params, contentType);
  }

  async createFromBytes(
    filename: string,
    data: BinaryPayload,
    params: JobCreateParams = {},
    contentType?: string,
  ): Promise<JobAccepted> {
    const form = new FormData();
    form.append(
      "audio_file",
      toBlob(data, contentType ?? guessContentType(filename)),
      filename,
    );
    appendJobCreateParams(form, params);

    const payload = await this.http.requestJson<Record<string, unknown>>("POST", "/jobs", {
      body: form,
    });
    return mapJobAccepted(payload);
  }

  async createFromUrl(remoteUrl: string, params: JobCreateParams = {}): Promise<JobAccepted> {
    const form = new FormData();
    appendJobCreateParams(form, params);
    form.append("remote_url", remoteUrl);

    const payload = await this.http.requestJson<Record<string, unknown>>("POST", "/jobs", {
      body: form,
    });
    return mapJobAccepted(payload);
  }

  async createFromUploadedAudio(
    reference: UploadedAudioReference,
    params: JobCreateParams = {},
  ): Promise<JobAccepted> {
    const form = new FormData();
    appendJobCreateParams(form, params);
    form.append("uploaded_audio_key", reference.objectKey);
    form.append("uploaded_audio_token", reference.uploadToken);

    const payload = await this.http.requestJson<Record<string, unknown>>("POST", "/jobs", {
      body: form,
    });
    return mapJobAccepted(payload);
  }

  async get(jobId: string): Promise<JobStatus> {
    const payload = await this.http.requestJson<Record<string, unknown>>("GET", `/jobs/${jobId}`);
    return mapJobStatus(payload);
  }

  async list(options: { status?: string; limit?: number } = {}): Promise<JobList> {
    const search = new URLSearchParams();
    if (options.status) {
      search.set("status", options.status);
    }
    search.set("limit", String(options.limit ?? 20));

    const payload = await this.http.requestJson<Record<string, unknown>>(
      "GET",
      `/jobs?${search.toString()}`,
    );
    return mapJobList(payload);
  }

  async cancel(jobId: string): Promise<void> {
    await this.http.requestVoid("DELETE", `/jobs/${jobId}`);
  }

  async cancelWithToken(cancelToken: string): Promise<void> {
    await this.http.requestVoid("POST", "/jobs/cancel", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancel_token: cancelToken }),
    });
  }

  async downloadResult(jobId: string): Promise<JsonObject> {
    return this.http.requestJson<JsonObject>("GET", `/jobs/${jobId}/download`);
  }

  async wait(jobId: string, options: WaitOptions = {}): Promise<JobStatus> {
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
}
