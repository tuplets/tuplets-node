import { HTTPClient, type HTTPClientOptions } from "./internal/http";
import { JobsResource } from "./resources/jobs";
import { SolutionsResource } from "./resources/solutions";
import { UploadsResource } from "./resources/uploads";

export interface TupletsClientOptions extends HTTPClientOptions {}

export class TupletsClient {
  private readonly http: HTTPClient;

  readonly jobs: JobsResource;
  readonly uploads: UploadsResource;
  readonly solutions: SolutionsResource;

  constructor(options: TupletsClientOptions) {
    this.http = new HTTPClient(options);
    this.jobs = new JobsResource(this.http);
    this.uploads = new UploadsResource(this.http);
    this.solutions = new SolutionsResource(this.http);
  }
}
