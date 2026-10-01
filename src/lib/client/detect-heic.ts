// The ISO base media "ftyp" box sits at bytes 4..12; HEIC/HEIF photos
// identify themselves by the brand that follows it.
const HEIC_BRANDS = ["ftypheic", "ftypheif", "ftypheix", "ftyphevc", "ftypmif1"];

export async function detectHeicFile(file: File): Promise<boolean> {
  if (/\.(heic|heif)$/i.test(file.name)) return true;
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const headerText = String.fromCharCode(...headerBytes);
  return HEIC_BRANDS.some((brand) => headerText.includes(brand));
}
