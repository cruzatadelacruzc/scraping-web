export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(status: number, data: Record<string, unknown>): ApiError {
    return new ApiError(
      status,
      (data.code as string) || 'UNKNOWN_ERROR',
      (data.message as string) || 'An error occurred'
    );
  }
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status: number; data: Record<string, unknown> } };
    if (axiosError.response) {
      return ApiError.fromResponse(axiosError.response.status, axiosError.response.data);
    }
  }

  if (error instanceof Error) {
    return new ApiError(0, 'NETWORK_ERROR', error.message);
  }

  return new ApiError(0, 'UNKNOWN_ERROR', 'An unknown error occurred');
}
