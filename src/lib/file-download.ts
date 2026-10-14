/** Deliver a generated file without revoking its URL before mobile/Safari starts reading it. */
export function downloadBlob(blob: Blob, filename: string) {
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error("The generated file is empty.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Immediate revocation can cancel downloads in Safari, mobile browsers and PWAs.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadResponse(response: Response, filename: string, label = "Report") {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${label} generation failed (${response.status})${body ? `: ${body.replace(/<[^>]*>/g, "").slice(0, 200)}` : "."}`);
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html") || contentType.includes("application/json")) {
    const body = await response.text().catch(() => "");
    throw new Error(`${label} generation returned an error instead of a file${body ? `: ${body.replace(/<[^>]*>/g, "").slice(0, 200)}` : "."}`);
  }
  downloadBlob(await response.blob(), filename);
}
