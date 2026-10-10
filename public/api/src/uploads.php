<?php
// Envoi d'images (photo de profil, logo d'équipe) : vérifiées, recadrées et réencodées avec GD.
declare(strict_types=1);

const UPLOAD_MAX_BYTES = 6 * 1024 * 1024;
const IMAGE_SIZE = 512;

function upload_dir(): string
{
    return rtrim(config()['upload_dir'] ?? dirname(__DIR__, 2) . '/uploads', '/');
}

function upload_url(string $name): string
{
    return rtrim(config()['upload_url'] ?? 'https://supercity.fr/uploads', '/') . '/' . $name;
}

/**
 * Lit l'image envoyée dans le champ `photo` (multipart/form-data), la recadre en carré
 * IMAGE_SIZE px et l'enregistre. `$mode` : 'cover' (photo, rognée, JPEG) ou 'contain'
 * (logo, entier sur fond transparent, PNG). Renvoie l'adresse publique.
 */
function save_uploaded_image(string $prefix, string $mode): string
{
    $f = $_FILES['photo'] ?? null;
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        throw new HttpError(422, 'validation_failed', 'Aucune image reçue.', ['photo' => 'Choisis une image.']);
    }
    if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE || $f['size'] > UPLOAD_MAX_BYTES) {
        throw new HttpError(422, 'validation_failed', 'Image trop lourde.', ['photo' => 'Image trop lourde (6 Mo maximum).']);
    }
    if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
        throw new HttpError(400, 'upload_failed', "L'envoi de l'image a échoué.");
    }
    $info = @getimagesize($f['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true)) {
        throw new HttpError(422, 'validation_failed', 'Format non accepté.', ['photo' => 'Envoie une image JPEG, PNG ou WebP.']);
    }
    if ($info[0] * $info[1] > 40_000_000) {
        throw new HttpError(422, 'validation_failed', 'Image trop grande.', ['photo' => 'Image trop grande.']);
    }
    $src = @imagecreatefromstring((string)file_get_contents($f['tmp_name']));
    if (!$src) {
        throw new HttpError(422, 'validation_failed', 'Image illisible.', ['photo' => 'Image illisible.']);
    }
    $src = orient($src, $f['tmp_name'], $info[2]);
    [$w, $h] = [imagesx($src), imagesy($src)];
    $dst = imagecreatetruecolor(IMAGE_SIZE, IMAGE_SIZE);
    if ($mode === 'cover') {
        $side = min($w, $h);
        imagecopyresampled($dst, $src, 0, 0, intdiv($w - $side, 2), intdiv($h - $side, 2), IMAGE_SIZE, IMAGE_SIZE, $side, $side);
    } else {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
        imagealphablending($dst, true);
        $scale = IMAGE_SIZE / max($w, $h);
        [$nw, $nh] = [(int)round($w * $scale), (int)round($h * $scale)];
        imagecopyresampled($dst, $src, intdiv(IMAGE_SIZE - $nw, 2), intdiv(IMAGE_SIZE - $nh, 2), 0, 0, $nw, $nh, $w, $h);
    }
    $dir = upload_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        throw new HttpError(500, 'upload_failed', "Impossible d'enregistrer l'image.");
    }
    // Aucun script ne doit pouvoir s'exécuter dans le dossier des images.
    if (!is_file("$dir/.htaccess")) {
        file_put_contents("$dir/.htaccess", "Options -Indexes -ExecCGI\nRemoveHandler .php .phtml .php5 .php7 .php8\n<FilesMatch \"\\.(php|phtml|phar)\">\n  Require all denied\n</FilesMatch>\n");
    }
    $ext = $mode === 'cover' ? 'jpg' : 'png';
    $name = $prefix . '-' . bin2hex(random_bytes(10)) . '.' . $ext;
    $ok = $mode === 'cover' ? imagejpeg($dst, "$dir/$name", 85) : imagepng($dst, "$dir/$name", 7);
    if (!$ok) {
        throw new HttpError(500, 'upload_failed', "Impossible d'enregistrer l'image.");
    }
    return upload_url($name);
}

/** Redresse les photos de téléphone selon leur orientation EXIF. */
function orient(GdImage $img, string $path, int $type): GdImage
{
    if ($type !== IMAGETYPE_JPEG || !function_exists('exif_read_data')) {
        return $img;
    }
    $o = (int)(@exif_read_data($path)['Orientation'] ?? 1);
    $angle = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
    return $angle ? (imagerotate($img, $angle, 0) ?: $img) : $img;
}

/** Supprime une ancienne image si elle vient de nos envois. */
function delete_upload(?string $url): void
{
    $base = rtrim(config()['upload_url'] ?? 'https://supercity.fr/uploads', '/') . '/';
    if ($url && str_starts_with($url, $base)) {
        $name = basename(substr($url, strlen($base)));
        if (preg_match('/^[a-z]+-[0-9a-f]{20}\.(jpg|png)$/', $name)) {
            @unlink(upload_dir() . '/' . $name);
        }
    }
}
