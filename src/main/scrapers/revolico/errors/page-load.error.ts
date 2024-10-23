export class PageLoadError extends Error {
  public constructor(status: number = 500, url: string) {
    super(`Failed to load page: ${url} with status ${status}`);
    Object.setPrototypeOf(this, PageLoadError.prototype);
  }
}
