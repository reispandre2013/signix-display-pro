function extractDriveId(url: string): string | null {
  return (
    url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1] ||
    url.match(/drive\.google\.com\/thumbnail\?id=([^&]+)/)?.[1] ||
    url.match(/lh3\.googleusercontent\.com\/d\/([^=/?]+)/)?.[1] ||
    url.match(/[?&]id=([^&]+)/)?.[1] ||
    null
  );
}

export function toDirectMediaUrl(url?: string | null) {
  if (!url) return "";
  const normalizedUrl = url.trim();
  const driveId = extractDriveId(normalizedUrl);
  if (driveId) {
    // Thumbnail API costuma ser a mais permissiva com hotlink em <img>
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1920`;
  }
  if (normalizedUrl.includes("dropbox.com")) {
    const cleanUrl = normalizedUrl.replace(/[?&](dl|raw)=\d/g, "");
    return cleanUrl.concat(cleanUrl.includes("?") ? "&raw=1" : "?raw=1");
  }
  return normalizedUrl;
}

export function getMediaUrlCandidates(...urls: Array<string | null | undefined>) {
  const out: string[] = [];
  const push = (s: string) => {
    if (s && !out.includes(s)) out.push(s);
  };
  for (const raw of urls) {
    if (!raw) continue;
    const url = raw.trim();
    const driveId = extractDriveId(url);
    if (driveId) {
      // Múltiplos fallbacks para Google Drive (mais confiável → menos)
      push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1920`);
      push(`https://lh3.googleusercontent.com/d/${driveId}=w1920`);
      push(`https://drive.google.com/uc?export=view&id=${driveId}`);
      push(`https://docs.google.com/uc?id=${driveId}`);
    } else {
      push(toDirectMediaUrl(url));
    }
  }
  return out;
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
