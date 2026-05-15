import type { Job } from "../types/job";
import type { City } from "../types/city";
import type { AuthSession } from "../types/auth";
import type { SavedRoute } from "../types/savedRoute";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";
const TOKEN_STORAGE_KEY = "token";
const USER_ID_STORAGE_KEY = "userId";
const USERNAME_STORAGE_KEY = "username";
const EMAIL_STORAGE_KEY = "email";
const IS_GUEST_STORAGE_KEY = "isGuest";
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

let pendingGuestSession: Promise<AuthSession> | null = null;

type ApiResponse<T> = {
  data: T;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}

async function issueAccessToken(): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok) {
    throw new Error("Failed to issue access token");
  }

  const payload = (await response.json()) as ApiResponse<{
    token: string;
    userId: string;
    isGuest?: boolean;
    username?: string;
    email?: string;
  }>;
  saveAuthSession(payload.data);

  return payload.data;
}

async function issueGuestSessionOnce(): Promise<AuthSession> {
  if (!pendingGuestSession) {
    pendingGuestSession = issueAccessToken().finally(() => {
      pendingGuestSession = null;
    });
  }

  return pendingGuestSession;
}

function saveAuthSession(session: AuthSession): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, session.token);

  if (session.userId) {
    window.localStorage.setItem(USER_ID_STORAGE_KEY, session.userId);
  }

  if (session.isGuest) {
    window.localStorage.setItem(IS_GUEST_STORAGE_KEY, "true");
  } else {
    window.localStorage.removeItem(IS_GUEST_STORAGE_KEY);
  }

  if (session.username) {
    window.localStorage.setItem(USERNAME_STORAGE_KEY, session.username);
  } else {
    window.localStorage.removeItem(USERNAME_STORAGE_KEY);
  }

  if (session.email) {
    window.localStorage.setItem(EMAIL_STORAGE_KEY, session.email);
  } else {
    window.localStorage.removeItem(EMAIL_STORAGE_KEY);
  }
}

export async function getAuthSession(): Promise<AuthSession> {
  const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

  if (savedToken) {
    const email = window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? undefined;
    const isLegacyGuest = Boolean(email?.endsWith("@token.local"));
    const userId = window.localStorage.getItem(USER_ID_STORAGE_KEY);
    const isGuest =
      window.localStorage.getItem(IS_GUEST_STORAGE_KEY) === "true" || isLegacyGuest;

    if (isGuest && (!userId || !OBJECT_ID_PATTERN.test(userId))) {
      clearAuthSession();
      return issueGuestSessionOnce();
    }

    return {
      token: savedToken,
      userId,
      isGuest,
      username: isLegacyGuest ? undefined : window.localStorage.getItem(USERNAME_STORAGE_KEY) ?? undefined,
      email: isLegacyGuest ? undefined : email,
    };
  }

  return issueGuestSessionOnce();
}

export async function getAccessToken(): Promise<string> {
  const session = await getAuthSession();
  return session.token;
}

export function clearAuthSession(): void {
  pendingGuestSession = null;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_ID_STORAGE_KEY);
  window.localStorage.removeItem(USERNAME_STORAGE_KEY);
  window.localStorage.removeItem(EMAIL_STORAGE_KEY);
  window.localStorage.removeItem(IS_GUEST_STORAGE_KEY);
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  const payload = (await response.json()) as ApiResponse<AuthSession>;
  saveAuthSession(payload.data);
  return payload.data;
}

export async function register(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  const payload = (await response.json()) as ApiResponse<AuthSession>;
  saveAuthSession(payload.data);
  return payload.data;
}

export function listRouteSearchJobs(): Promise<Job[]> {
  return request<Job[]>("/api/route-search/jobs");
}

export function listCities(): Promise<City[]> {
  return request<City[]>("/api/cities");
}

export function getRouteSearchJob(jobId: string): Promise<Job> {
  return request<Job>(`/api/route-search/jobs/${jobId}`);
}

export function createRouteSearchJob(input: {
  fromCityId: string;
  toCityId: string;
}): Promise<Job> {
  return request<Job>("/api/route-search/jobs", {
    method: "POST",
    headers: {
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(input),
  });
}

export function listSavedRoutes(): Promise<SavedRoute[]> {
  return request<SavedRoute[]>("/api/saved");
}

export function saveRoute(input: {
  route: string[];
  totalDistance: number;
}): Promise<SavedRoute> {
  return request<SavedRoute>("/api/saved", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteSavedRoute(savedRouteId: string): Promise<void> {
  await request<void>(`/api/saved/${savedRouteId}`, {
    method: "DELETE",
  });
}
