import { ApiResponse } from "@shared/types"
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "No response body");
      console.warn(`[API] Non-OK status ${res.status} from ${path}: ${text.slice(0, 100)}`);
      throw new Error(`HTTP Error ${res.status} at ${path}: ${text.slice(0, 50)}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      throw new Error(`Expected JSON at ${path} but received ${contentType || 'plain text'}: ${text.slice(0, 50)}`);
    }
    let json: ApiResponse<T>;
    try {
      json = (await res.json()) as ApiResponse<T>;
    } catch (parseError) {
      throw new Error(`Malformed JSON response from ${path}`);
    }
    if (!json.success || json.data === undefined) {
      throw new Error(json.error || `Request logic failed at ${path}`);
    }
    return json.data;
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[API CLIENT ERROR] Path: ${path}`, errorMessage);
    throw new Error(errorMessage);
  }
}