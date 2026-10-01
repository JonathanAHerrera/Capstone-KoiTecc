import imageCompression from "browser-image-compression";

export type CompressImageProgressHandler = (percent: number) => void;

export async function compressImageForUpload(
  imageFile: File,
  onProgress?: CompressImageProgressHandler,
): Promise<File> {
  const compressedFile = await imageCompression(imageFile, {
    maxWidthOrHeight: 2048,
    maxSizeMB: 1.5,
    useWebWorker: true,
    onProgress,
  });
  if (compressedFile.name === imageFile.name) return compressedFile;
  return new File([compressedFile], imageFile.name, {
    type: compressedFile.type,
    lastModified: imageFile.lastModified,
  });
}
