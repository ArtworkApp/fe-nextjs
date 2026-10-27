import { apiBaseUrl } from '../apiBaseUrl';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ApiError {
  error?: {
    code?: string;
    fields?: Record<string, string[]>;
  };
}

export function authUrl(path: string): string {
  return `${apiBaseUrl() ?? '/api/v1'}/auth/${path}`;
}

export async function readApiError(response: Response): Promise<ApiError> {
  try {
    return await response.json() as ApiError;
  } catch {
    return {};
  }
}
