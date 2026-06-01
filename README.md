# Tuplets TypeScript SDK

Official TypeScript SDK for the Tuplets API.

## Installation

```bash
npm install @tuplets/sdk
```

## Usage

```ts
import { JobCreateParams, TupletsClient } from "@tuplets/sdk";

const client = new TupletsClient({ apiKey: process.env.TUPLETS_API_KEY! });

const job = await client.jobs.createFromFile(
  "interview.mp3",
  { language: "en", diarization: true } satisfies JobCreateParams,
);

const finalJob = await client.jobs.wait(job.id);

if (finalJob.status === "completed") {
  const transcript = await client.jobs.downloadResult(job.id);
  console.log(transcript.text);
} else if (finalJob.status === "failed") {
  console.error(finalJob.errorMessage);
}
```

When `diarization: true`, speaker attribution is treated as required. If the API cannot produce usable diarization, the job finishes as `failed` and `result` remains `null`.

## Direct Uploads

```ts
import { TupletsClient } from "@tuplets/sdk";

const client = new TupletsClient({ apiKey: process.env.TUPLETS_API_KEY! });

const upload = await client.uploads.createTarget({
  filename: "large-audio.wav",
  size: 12_000_000,
  contentType: "audio/wav",
});

await client.uploads.uploadFile(upload, "large-audio.wav");

const job = await client.jobs.createFromUploadedAudio(
  {
    objectKey: upload.objectKey,
    uploadToken: upload.uploadToken,
  },
  { language: "en", transcriptionModel: "premium" },
);
```

## Supported Resources

- `client.jobs` for transcription job submission, polling, cancellation, and result download
- `client.uploads` for signed browser/direct upload targets
