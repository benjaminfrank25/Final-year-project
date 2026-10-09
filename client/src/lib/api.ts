export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function send<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, credentials: "include" });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? "Something went wrong");
  }

  return data as T;
}

export function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const hasBody = options.body !== undefined;

  return send<T>(path, {
    method: options.method ?? "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });
}

export function apiForm<T>(
  path: string,
  form: FormData,
  method = "POST",
): Promise<T> {
  return send<T>(path, { method, body: form });
}

export interface FormUploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface FormServerProgress {
  type: "progress";
  stage: string;
  message: string;
  parsedCount?: number;
  createdCount?: number;
  totalCount?: number;
  failedCount?: number;
}

export function apiFormWithProgress<T>(
  path: string,
  form: FormData,
  onUploadProgress: (progress: FormUploadProgress) => void,
  onServerProgress: (progress: FormServerProgress) => void,
  method = "POST",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let responseOffset = 0;
    let pendingLine = "";
    let settled = false;

    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const handleLine = (line: string) => {
      if (!line.trim() || settled) return;
      let event: {
        type: "progress" | "result" | "error";
        stage?: string;
        message?: string;
        parsedCount?: number;
        createdCount?: number;
        totalCount?: number;
        failedCount?: number;
        result?: T;
      };
      try {
        event = JSON.parse(line);
      } catch {
        rejectOnce(new ApiError(0, "The server returned an invalid import update"));
        return;
      }

      if (event.type === "progress") {
        onServerProgress({
          type: "progress",
          stage: event.stage ?? "processing",
          message: event.message ?? "Processing class list...",
          parsedCount: event.parsedCount,
          createdCount: event.createdCount,
          totalCount: event.totalCount,
          failedCount: event.failedCount,
        });
      } else if (event.type === "result") {
        if (event.result === undefined) {
          rejectOnce(new ApiError(0, "The server returned an incomplete import result"));
          return;
        }
        settled = true;
        resolve(event.result);
      } else if (event.type === "error") {
        rejectOnce(
          new ApiError(
            0,
            event.message ?? "The class-list import could not be completed",
          ),
        );
      }
    };

    const consumeResponse = () => {
      const response = xhr.responseText;
      const newContent = response.slice(responseOffset);
      responseOffset = response.length;
      const lines = `${pendingLine}${newContent}`.split("\n");
      pendingLine = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
    };

    xhr.open(method, `/api${path}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      onUploadProgress({
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : 0,
        percent:
          event.lengthComputable && event.total > 0
            ? Math.round((event.loaded / event.total) * 100)
            : 0,
      });
    };
    xhr.onprogress = consumeResponse;
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = "Something went wrong";
        try {
          message = JSON.parse(xhr.responseText).message ?? message;
        } catch {
          // Keep the standard message if the server did not return JSON.
        }
        rejectOnce(new ApiError(xhr.status, message));
        return;
      }

      consumeResponse();
      if (pendingLine.trim()) handleLine(pendingLine);
      if (!settled) {
        rejectOnce(new ApiError(0, "The server ended the import without a result"));
      }
    };
    xhr.onerror = () =>
      rejectOnce(new ApiError(0, "Can't reach the server. Check your connection."));
    xhr.onabort = () =>
      rejectOnce(new ApiError(0, "The class-list upload was interrupted"));
    xhr.send(form);
  });
}

export function errorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
