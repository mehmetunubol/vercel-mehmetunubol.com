export class RateLimitError extends Error {
  constructor(url: string) {
    super(`LinkedIn rate-limited the request (HTTP 429): ${url}`);
    this.name = "RateLimitError";
  }
}

export class BlockedError extends Error {
  constructor(url: string, reason: string) {
    super(`LinkedIn response looks soft-blocked, not empty (${reason}): ${url}`);
    this.name = "BlockedError";
  }
}
