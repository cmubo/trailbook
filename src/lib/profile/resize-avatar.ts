const edge = 512;
const maxBytes = 2 * 1024 * 1024;

export async function resizeToAvatar(file: File) {
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const offsetX = Math.floor((bitmap.width - side) / 2);
  const offsetY = Math.floor((bitmap.height - side) / 2);
  const size = Math.max(1, Math.min(edge, side));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("The photo could not be prepared.");
  }

  context.drawImage(bitmap, offsetX, offsetY, side, side, 0, 0, size, size);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.85);
  });

  if (!blob) {
    throw new Error("The photo could not be prepared.");
  }

  if (blob.size > maxBytes) {
    throw new Error("That photo is still too large.");
  }

  return blob;
}
