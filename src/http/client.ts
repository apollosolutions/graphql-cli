export interface HttpRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface HttpResponse<T = unknown> {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  json(): Promise<T>;
  text(): Promise<string>;
}

export async function httpRequest<T>(request: HttpRequest): Promise<HttpResponse<T>> {
  const response = await fetch(request.url, {
    method: request.method ?? 'POST',
    headers: request.headers,
    body: request.body,
  });

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return {
    status: response.status,
    ok: response.ok,
    headers,
    json: () => response.json(),
    text: () => response.text(),
  };
}
