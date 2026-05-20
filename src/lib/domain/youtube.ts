const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeVideoId(input: string): string {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid YouTube URL.");
  }

  const host = url.hostname.replace(/^www\./, "");
  let candidate: string | null = null;

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/embed/")) {
      candidate = url.pathname.split("/")[2] ?? null;
    }
  }

  if (host === "youtu.be") {
    candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (!candidate || !VIDEO_ID_PATTERN.test(candidate)) {
    throw new Error("Enter a valid YouTube URL.");
  }

  return candidate;
}
