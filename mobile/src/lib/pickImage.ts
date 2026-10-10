// Choisir une image dans la galerie, puis la convertir (JPEG, ou PNG pour un logo) et la réduire avant l'envoi
// (l'iPhone donne souvent du HEIC, que le serveur ne sait pas lire, et des photos de plusieurs Mo).
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; width: number; height: number; mimeType: string; fileName: string };

async function convert(asset: ImagePicker.ImagePickerAsset, maxSide: number, png: boolean): Promise<PickedImage> {
  const scale = Math.min(1, maxSide / Math.max(asset.width || maxSide, asset.height || maxSide));
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (scale < 1) ctx.resize({ width: Math.round(asset.width * scale) });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync(png ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: 0.85 });
  return png
    ? { uri: out.uri, width: out.width, height: out.height, mimeType: 'image/png', fileName: 'logo.png' }
    : { uri: out.uri, width: out.width, height: out.height, mimeType: 'image/jpeg', fileName: 'photo.jpg' };
}

async function pick(options: ImagePicker.ImagePickerOptions, maxSide: number, png = false): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, ...options });
  if (res.canceled || !res.assets[0]) return null;
  return convert(res.assets[0], maxSide, png);
}

/** Photo de profil : recadrage carré. */
export const pickSquareImage = () => pick({ allowsEditing: true, aspect: [1, 1] }, 1024);

/** Logo d'équipe : carré, en PNG pour garder la transparence. */
export const pickLogoImage = () => pick({ allowsEditing: true, aspect: [1, 1] }, 1024, true);

/** Photo de publication : proportions gardées. */
export const pickPostImage = () => pick({}, 1600);
