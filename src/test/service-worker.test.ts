import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const serviceWorkerSource = readFileSync("public/sw.js", "utf8");

interface WorkerEvent {
  request: Request;
  respondWith?: (response: Promise<Response>) => void;
}

function createServiceWorker(fetchMock: typeof fetch = vi.fn()) {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const entries = new Map<string, Response>();
  const cache = {
    add: vi.fn(async () => undefined),
    match: vi.fn(async (request: Request | string) =>
      entries.get(typeof request === "string" ? request : request.url),
    ),
    put: vi.fn(async (request: Request, response: Response) => {
      entries.set(request.url, response);
    }),
  };
  const cachesMock = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ["flowtask-static-v1"]),
    delete: vi.fn(async () => true),
  };
  const selfMock = {
    location: { origin: "https://flowtask.example.test" },
    clients: { claim: vi.fn(async () => undefined) },
    skipWaiting: vi.fn(async () => undefined),
    addEventListener: (type: string, callback: (event: WorkerEvent) => void) =>
      listeners.set(type, callback),
  };
  runInNewContext(serviceWorkerSource, {
    self: selfMock,
    caches: cachesMock,
    fetch: fetchMock,
    URL,
    Response,
  });
  return {
    cache,
    caches: cachesMock,
    dispatch(request: Request) {
      let responsePromise: Promise<Response> | undefined;
      listeners.get("fetch")?.({
        request,
        respondWith: (promise: Promise<Response>) => {
          responsePromise = promise;
        },
      });
      return responsePromise;
    },
  };
}

describe("service worker request caching", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "does not intercept or cache %s requests",
    async (method) => {
      const fetchMock = vi.fn(async () => new Response("ok"));
      const worker = createServiceWorker(fetchMock as typeof fetch);
      const response = worker.dispatch(
        new Request("https://flowtask.example.test/api/items", { method }),
      );
      expect(response).toBeUndefined();
      expect(worker.caches.open).not.toHaveBeenCalled();
      expect(worker.cache.put).not.toHaveBeenCalled();
    },
  );

  it.each([
    "https://project.supabase.co/rest/v1/workspaces",
    "https://project.supabase.co/functions/v1/workspace-invitations",
    "https://flowtask.example.test/functions/v1/workspace-invitations",
  ])("bypasses caching for Supabase request %s", async (url) => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    const worker = createServiceWorker(fetchMock as typeof fetch);
    const response = await worker.dispatch(new Request(url));
    expect(response?.status).toBe(200);
    expect(worker.caches.open).not.toHaveBeenCalled();
    expect(worker.cache.put).not.toHaveBeenCalled();
  });

  it("caches successful same-origin static GET responses", async () => {
    const fetchMock = vi.fn(async () => new Response("asset"));
    const worker = createServiceWorker(fetchMock as typeof fetch);
    await worker.dispatch(new Request("https://flowtask.example.test/assets/app.js"));
    expect(worker.cache.put).toHaveBeenCalledOnce();
  });

  it("returns the network response when writing to cache fails", async () => {
    const fetchMock = vi.fn(async () => new Response("asset"));
    const worker = createServiceWorker(fetchMock as typeof fetch);
    worker.cache.put.mockRejectedValueOnce(new Error("quota exceeded"));
    const response = await worker.dispatch(
      new Request("https://flowtask.example.test/assets/app.js"),
    );
    await expect(response?.text()).resolves.toBe("asset");
  });

  it("falls back to network when opening the cache fails", async () => {
    const fetchMock = vi.fn(async () => new Response("asset"));
    const worker = createServiceWorker(fetchMock as typeof fetch);
    worker.caches.open.mockRejectedValueOnce(new Error("cache unavailable"));
    const response = await worker.dispatch(
      new Request("https://flowtask.example.test/assets/app.js"),
    );
    await expect(response?.text()).resolves.toBe("asset");
  });
});
