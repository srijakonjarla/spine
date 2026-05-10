// Google Books thumbnails default to ~128px wide (zoom=1) and add an
// "edge=curl" page-curl artifact. Strip the artifact and request a larger
// variant. Other hosts pass through unchanged.
export function upgradeCoverUrl(url: string | undefined): string {
  if (!url) return "";
  if (
    !url.includes("books.google.com") &&
    !url.includes("books.googleusercontent.com")
  ) {
    return url;
  }
  return url.replace(/&edge=curl/g, "").replace(/([?&])zoom=\d+/, "$1zoom=2");
}
