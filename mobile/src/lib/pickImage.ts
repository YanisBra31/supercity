// Choisir une image dans la galerie, recadrée en carré.
import * as ImagePicker from 'expo-image-picker';

export async function pickSquareImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
  return res.canceled ? null : res.assets[0];
}
