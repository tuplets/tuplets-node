import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { HTTPClient } from "../internal/http";
import {
  guessContentType,
  mapBrowserUploadTarget,
  toBlob,
} from "../internal/utils";
import type {
  BinaryPayload,
  BrowserUploadTarget,
  CreateUploadTargetParams,
} from "../models";

export class UploadsResource {
  constructor(private readonly http: HTTPClient) {}

  async createTarget(params: CreateUploadTargetParams): Promise<BrowserUploadTarget> {
    const payload = await this.http.requestJson<Record<string, unknown>>(
      "POST",
      "/jobs/upload-target",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: params.filename,
          size: params.size,
          content_type: params.contentType ?? null,
        }),
      },
    );

    return mapBrowserUploadTarget(payload);
  }

  async uploadFile(
    target: BrowserUploadTarget,
    filePath: string,
    contentType?: string,
  ): Promise<void> {
    const data = await readFile(filePath);
    await this.uploadBytes(
      target,
      data,
      contentType ?? guessContentType(basename(filePath)),
    );
  }

  async uploadBytes(
    target: BrowserUploadTarget,
    data: BinaryPayload,
    contentType?: string,
  ): Promise<void> {
    const headers = new Headers(target.uploadHeaders);
    if (contentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }

    await this.http.requestVoid(target.uploadMethod, target.uploadUrl, {
      authenticated: false,
      expectJson: false,
      headers,
      body: toBlob(data, contentType ?? headers.get("Content-Type") ?? undefined),
    });
  }
}
