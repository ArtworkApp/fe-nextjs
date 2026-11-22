import { authUrl, readApiError } from './api';

export type RecoveryFailure = 'rate_limited' | 'network_error' | 'failed';
export type ResetRequestResult = 'accepted' | RecoveryFailure;
export type ResetConfirmationResult = 'confirmed' | 'invalid_token' | RecoveryFailure;

export interface ResetConfirmation {
  token: string;
  password: string;
}

interface RecoveryRequest {
  url: string;
  options: RequestInit;
}

interface RecoveryResponse {
  received: boolean;
  ok: boolean;
  status?: number;
  errorCode?: string;
}

async function sendRecoveryRequest(path: string, body: object): Promise<Response | null> {
  const request = createRecoveryRequest(path, body);
  return fetchRecoveryRequest(request);
}

function createRecoveryRequest(path: string, body: object): RecoveryRequest {
  return {
    url: authUrl(`password-reset/${path}`),
    options: {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  };
}

async function fetchRecoveryRequest(request: RecoveryRequest): Promise<Response | null> {
  try {
    return await fetch(request.url, request.options);
  } catch {
    return null;
  }
}

function createResetRequestPayload(email: string): { email: string } {
  return { email: email.trim().toLowerCase() };
}

function createResetConfirmationPayload(input: ResetConfirmation): ResetConfirmation {
  return { token: input.token, password: input.password };
}

async function readRecoveryResponse(response: Response | null): Promise<RecoveryResponse> {
  const apiError = response && !response.ok ? await readApiError(response) : {};
  return {
    received: response !== null,
    ok: response?.ok ?? false,
    status: response?.status,
    errorCode: apiError.error?.code,
  };
}

function requestOutcome(response: RecoveryResponse): ResetRequestResult {
  if (!response.received) return 'network_error';
  if (response.ok) return 'accepted';
  if (response.status === 429 || response.errorCode === 'RATE_LIMITED') return 'rate_limited';
  return 'failed';
}

function confirmationOutcome(response: RecoveryResponse): ResetConfirmationResult {
  if (!response.received) return 'network_error';
  if (response.ok) return 'confirmed';
  if (response.status === 429 || response.errorCode === 'RATE_LIMITED') return 'rate_limited';
  if (response.errorCode === 'INVALID_RESET_TOKEN') return 'invalid_token';
  return 'failed';
}

export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
  const payload = createResetRequestPayload(email);
  const response = await sendRecoveryRequest('request', payload);
  const details = await readRecoveryResponse(response);
  return requestOutcome(details);
}

export async function confirmPasswordReset(input: ResetConfirmation): Promise<ResetConfirmationResult> {
  const payload = createResetConfirmationPayload(input);
  const response = await sendRecoveryRequest('confirm', payload);
  const details = await readRecoveryResponse(response);
  return confirmationOutcome(details);
}
