const hasFileExtension = (pathname) => /\/[^/]+\.[^/]+$/.test(pathname);

const unavailable = () =>
  new Response("Static asset binding unavailable.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return unavailable();
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed.", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }

    const directResponse = await env.ASSETS.fetch(request);
    const url = new URL(request.url);

    if (directResponse.status !== 404 || hasFileExtension(url.pathname)) {
      return directResponse;
    }

    url.pathname = "/index.html";
    const indexRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
      redirect: "manual",
    });

    return env.ASSETS.fetch(indexRequest);
  },
};
