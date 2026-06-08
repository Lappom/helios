export function getFoodIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const foodsIndex = segments.indexOf("foods");

  if (foodsIndex === -1 || !segments[foodsIndex + 1]) {
    return "";
  }

  const nextSegment = segments[foodsIndex + 1]!;
  if (nextSegment === "search" || nextSegment === "barcode") {
    return "";
  }

  return nextSegment;
}

export function getBarcodeFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const barcodeIndex = segments.indexOf("barcode");

  if (barcodeIndex === -1 || !segments[barcodeIndex + 1]) {
    return "";
  }

  return decodeURIComponent(segments[barcodeIndex + 1]!);
}
