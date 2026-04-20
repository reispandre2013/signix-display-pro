type MediaUrlHint = "image" | "video" | "html" | "banner";

function inferMediaHint(url: string, explicit?: string | null): MediaUrlHint {
  const hint = String(explicit ?? "").toLowerCase();
  if (hint === "video") return "video";
  if (hint === "html") return "html";
  if (hint === "banner") return "banner";
  if (hint === "image") return "image";

  const lower = url.toLowerCase();
  if (/\.(mp4|m4v|webm|mov)(\?|$)/.test(lower)) return "video";
  if (/\.(html|htm)(\?|$)/.test(lower)) return "html";
  return "image";
}

export function toDirectMediaUrl(url?: string | null, mediaTypeHint?: string | null) {
  if (!url) return "";

  const normalizedUrl = url.trim();
  const mediaHint = inferMediaHint(normalizedUrl, mediaTypeHint);
  const isGoogleDrive = /(?:drive|docs)\.google\.com|googleusercontent\.com/.test(normalizedUrl);
  const driveId =
    normalizedUrl.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1] ||
    normalizedUrl.match(/drive\.google\.com\/thumbnail\?id=([^&]+)/)?.[1] ||
    normalizedUrl.match(/lh3\.googleusercontent\.com\/d\/([^=/?]+)/)?.[1] ||
    (isGoogleDrive ? normalizedUrl.match(/[?&]id=([^&]+)/)?.[1] : undefined);

  if (driveId) {
    if (mediaHint === "video") {
      // Para vídeo no Drive, usar endpoint de download/stream.
      return `https://drive.google.com/uc?export=download&id=${driveId}`;
    }
    return `https://lh3.googleusercontent.com/d/${driveId}=w1600`;
  }

  if (normalizedUrl.includes("dropbox.com")) {
    const cleanUrl = normalizedUrl.replace(/[?&](dl|raw)=\d/g, "");
    return cleanUrl.concat(cleanUrl.includes("?") ? "&raw=1" : "?raw=1");
  }

  return normalizedUrl;
}

export function getMediaUrlCandidates(
  ...args: Array<string | null | undefined | { mediaTypeHint?: string | null }>
) {
  let mediaTypeHint: string | null = null;
  let urls = args as Array<string | null | undefined>;
  const first = args[0];
  if (first && typeof first === "object" && !Array.isArray(first)) {
    mediaTypeHint = first.mediaTypeHint ?? null;
    urls = args.slice(1) as Array<string | null | undefined>;
  }
  return Array.from(
    new Set(urls.map((url) => toDirectMediaUrl(url, mediaTypeHint)).filter(Boolean)),
  );
}

export function applyMediaFallback(img: HTMLImageElement) {
  const sources = JSON.parse(img.dataset.sources ?? "[]") as string[];
  const currentIndex = Number(img.dataset.sourceIndex ?? "0");
  const nextSource = sources[currentIndex + 1];

  if (!nextSource) {
    img.style.display = "none";
    return;
  }

  img.style.display = "";
  img.dataset.sourceIndex = String(currentIndex + 1);
  img.src = nextSource;
}