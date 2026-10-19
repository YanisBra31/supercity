// Réduit une image choisie sur l'ordinateur avant l'envoi (photos de plusieurs Mo), en JPEG, ou en PNG pour un logo.
export async function shrinkImage(file: File, maxSide: number, png = false): Promise<File> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Format que le navigateur ne sait pas lire : on laisse le serveur répondre.
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d')!;
  if (!png) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, png ? 'image/png' : 'image/jpeg', 0.85));
  if (!blob) return file;
  return new File([blob], png ? 'logo.png' : 'photo.jpg', { type: blob.type });
}
