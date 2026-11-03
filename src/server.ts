export default {
  async fetch() {
    return new Response("Workspace app is served by Vite.", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
