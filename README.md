# Tuplets TypeScript SDK

Official TypeScript/JavaScript client for the [Tuplets API](https://api.tuplets.ai) — transcribe audio, run speaker diarization, apply PII redaction, and request structured analytics from Node.js 18+ or any runtime with `fetch`.

- **Docs:** [tuplets.ai/docs](https://tuplets.ai/docs)
- **API reference:** [api.tuplets.ai](https://api.tuplets.ai)
- **Get an API key:** [tuplets.ai/settings/api-keys](https://tuplets.ai/settings/api-keys)

## Installation

```bash
npm install @tupletsai/sdk
```

```bash
pnpm add @tupletsai/sdk
# or
yarn add @tupletsai/sdk
```

Requires **Node.js 18+** (uses native `fetch`). Works in ESM and CommonJS projects.

## Quick start

Transcribe a local file, wait for completion, and print the transcript:

```ts
import { TupletsClient } from "@tupletsai/sdk";

const client = new TupletsClient({
  apiKey: process.env.TUPLETS_API_KEY!,
});

const job = await client.jobs.createFromFile("interview.mp3", {
  language: "en",
});

const finalJob = await client.jobs.wait(job.id);

if (finalJob.status === "completed") {
  const transcript = await client.jobs.downloadResult(job.id);
  console.log(transcript.text);
} else if (finalJob.status === "failed") {
  console.error(finalJob.errorMessage);
}
```

## Authentication

Create an API key in the Tuplets dashboard (prefix `tb_`) and pass it when constructing the client:

```ts
const client = new TupletsClient({ apiKey: "tb_your_api_key" });
```

Every authenticated request sends `Authorization: Bearer tb_...`.

## Client configuration

```ts
import { TupletsClient } from "@tupletsai/sdk";

const client = new TupletsClient({
  apiKey: process.env.TUPLETS_API_KEY!,
  baseUrl: "https://api.tuplets.ai", // default
  timeoutMs: 120_000,                // default: 60_000
  userAgent: "my-app/1.0 (+https://example.com)",
  fetch: customFetch,                // inject for edge runtimes or testing
});
```

## Submitting transcription jobs

All submission methods return a `JobAccepted` object with `id`, `statusUrl`, `cancelUrl`, and `cancelToken`.

### From a local file

```ts
const job = await client.jobs.createFromFile("call.wav", {
  language: "en",
  transcriptionModel: "premium",
});
```

### From bytes or a Blob

```ts
import { readFile } from "node:fs/promises";

const data = await readFile("call.wav");

const job = await client.jobs.createFromBytes("call.wav", data, {
  language: "auto",
});
```

In browsers or edge workers, pass a `Blob` or `ArrayBuffer` instead of a Node `Buffer`.

### From a remote URL

Tuplets fetches the audio from a publicly reachable URL:

```ts
const job = await client.jobs.createFromUrl(
  "https://storage.example.com/recordings/call.mp3",
  { language: "en" },
);
```

### From a direct upload

For large files, upload to object storage first, then reference the upload when creating the job (see [Direct uploads](#direct-uploads)).

```ts
const job = await client.jobs.createFromUploadedAudio(
  {
    objectKey: upload.objectKey,
    uploadToken: upload.uploadToken,
  },
  { language: "en" },
);
```

## Job parameters

Pass options as the second argument to any `create*` method (`JobCreateParams`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | `string` | `"auto"` | BCP-47 language code or `"auto"` for detection |
| `transcriptionModel` | `"standard"` \| `"premium"` | `"standard"` | Accuracy/latency tier |
| `diarization` | `boolean` | `false` | Speaker attribution; when enabled, jobs **fail** if diarization cannot be produced |
| `piiProcessing` | `boolean` | `false` | Detect and redact personally identifiable information |
| `analytics` | `Record<string, unknown>` | — | Structured post-transcription analytics (see below) |

```ts
const job = await client.jobs.createFromFile("call.mp3", {
  language: "en",
  transcriptionModel: "premium",
  diarization: true,
  piiProcessing: true,
});
```

## Polling, waiting, and results

### Poll manually

```ts
const status = await client.jobs.get(job.id);

console.log(status.status);                  // queued | running | completed | failed
console.log(status.progressPercent);         // 0–100 while running
console.log(status.estimatedSecondsRemaining);
console.log(status.result);                  // inline preview when completed
console.log(status.errorMessage);            // set when status === "failed"
```

### Wait until finished

`wait()` polls until the job reaches `completed` or `failed`:

```ts
const finalJob = await client.jobs.wait(job.id, {
  pollIntervalMs: 2_000,  // default: 2_000
  timeoutMs: 600_000,       // optional; throws WaitTimeoutError
});
```

### Download the full transcript

```ts
const transcript = await client.jobs.downloadResult(job.id);
console.log(transcript.text);

for (const segment of (transcript.segments as Array<Record<string, unknown>>) ?? []) {
  console.log(segment.start, segment.end, segment.text);
}
```

When `diarization: true`, segments include speaker labels. Completed jobs may also include an `analytics` object if analytics were requested.

### List and cancel jobs

```ts
const recent = await client.jobs.list({ status: "completed", limit: 20 });
for (const item of recent.items) {
  console.log(item.id, item.status, item.createdAt);
}

await client.jobs.cancel(job.id);

// Cancel without storing the job id (uses token from JobAccepted)
await client.jobs.cancelWithToken(job.cancelToken);
```

## Direct uploads

Upload large audio files to signed storage, then create a job from the upload reference:

```ts
import { statSync } from "node:fs";
import { TupletsClient } from "@tupletsai/sdk";

const client = new TupletsClient({ apiKey: process.env.TUPLETS_API_KEY! });
const filePath = "large-audio.wav";

const upload = await client.uploads.createTarget({
  filename: filePath,
  size: statSync(filePath).size,
  contentType: "audio/wav",
});

await client.uploads.uploadFile(upload, filePath);

const job = await client.jobs.createFromUploadedAudio(
  {
    objectKey: upload.objectKey,
    uploadToken: upload.uploadToken,
  },
  { language: "en", transcriptionModel: "premium" },
);
```

`createTarget` returns a `BrowserUploadTarget` with a pre-signed `uploadUrl`, required `uploadHeaders`, and an expiry (`expiresInSeconds`). Upload with `uploadFile` / `uploadBytes`, or PUT the bytes yourself using the signed URL.

## Analytics

Request generic and custom schema-bound analytics with `analytics`:

```ts
const job = await client.jobs.createFromFile("insurance-call.mp3", {
  language: "en",
  analytics: {
    profile: "full",
    domain: "insurance",
    schema: {
      fields: [
        {
          key: "call_reason",
          label: "Reason for call",
          type: "single_select",
          options: [
            { id: 1, code: "CLAIM_STATUS", label: "Claim status" },
            { id: 2, code: "BILLING", label: "Billing question" },
          ],
        },
      ],
    },
  },
});

const finalJob = await client.jobs.wait(job.id);
if (finalJob.analytics) {
  console.log(finalJob.analytics.custom);
}
```

See [tuplets.ai/docs](https://tuplets.ai/docs) for supported profiles, domains, and schema field types.

## Error handling

API failures throw typed errors with `statusCode` and optional `responseBody`:

| Error | HTTP status |
|-------|-------------|
| `ValidationError` | 400 |
| `AuthenticationError` | 401 |
| `PaymentRequiredError` | 402 |
| `PermissionDeniedError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `GoneError` | 410 |
| `RateLimitError` | 429 |
| `APIStatusError` | other 4xx/5xx |
| `RequestTimeoutError` | client-side request timeout |
| `WaitTimeoutError` | polling timeout (not an HTTP error) |

```ts
import {
  AuthenticationError,
  RateLimitError,
  TupletsClient,
} from "@tupletsai/sdk";

const client = new TupletsClient({ apiKey: process.env.TUPLETS_API_KEY! });

try {
  await client.jobs.get("job_unknown");
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error(error.statusCode, error.message);
  } else if (error instanceof RateLimitError) {
    // backoff and retry
  }
}
```

## TypeScript types

The package exports typed models for requests and responses:

```ts
import type {
  JobCreateParams,
  JobAccepted,
  JobStatus,
  JobList,
  BrowserUploadTarget,
  UploadedAudioReference,
  TranscriptionModel,
  JobState,
  WaitOptions,
} from "@tupletsai/sdk";
```

Field names follow camelCase in TypeScript (e.g. `transcriptionModel`, `piiProcessing`) and map to the API's snake_case form fields automatically.

## API surface

| Resource | Methods |
|----------|---------|
| `client.jobs` | `createFromFile`, `createFromBytes`, `createFromUrl`, `createFromUploadedAudio`, `get`, `list`, `wait`, `cancel`, `cancelWithToken`, `downloadResult` |
| `client.uploads` | `createTarget`, `uploadFile`, `uploadBytes` |
| `client.solutions` | `createInquiry` (public enterprise inquiries; no API key required) |

## Support

- Documentation: [tuplets.ai/docs](https://tuplets.ai/docs)
- Contact: [contact@tuplets.ai](mailto:contact@tuplets.ai)
