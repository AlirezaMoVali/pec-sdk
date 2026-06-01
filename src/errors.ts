export class PecError extends Error {
  readonly status: number;
  readonly pecMessage?: string;
  readonly cause?: unknown;

  constructor(message: string, status: number, pecMessage?: string, cause?: unknown) {
    super(message);
    this.name = 'PecError';
    this.status = status;
    this.pecMessage = pecMessage;
    this.cause = cause;
  }
}

export class PecValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PecValidationError';
  }
}

export class PecTransportError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PecTransportError';
    this.cause = cause;
  }
}
