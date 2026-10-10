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

/** Une image arrive dans le corps de la requête. */
function has_received_image(): bool
{
    if (is_multipart()) {
        return isset($_FILES['photo']) && $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE;
    }
    return is_string(body()['photo_base64'] ?? null) && body()['photo_base64'] !== '';
}

function is_multipart(): bool
{
    return str_starts_with((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data');
}

/**
 * Chemin du fichier reçu : champ `photo` d'un envoi multipart/form-data, ou champ JSON
 * `photo_base64` (ce que fait l'appli sur téléphone, plus fiable que le multipart).
 */
function received_image_path(): string
{
    if (!has_received_image()) {
        throw new HttpError(422, 'validation_failed', 'Aucune image reçue.', ['photo' => 'Choisis une image.']);
    }
    $tooBig = new HttpError(422, 'validation_failed', 'Image trop lourde.', ['photo' => 'Image trop lourde (6 Mo maximum).']);
    if (is_multipart()) {
        $f = $_FILES['photo'];
        if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE || $f['size'] > UPLOAD_MAX_BYTES) {
            throw $tooBig;
        }
        if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
            throw new HttpError(400, 'upload_failed', "L'envoi de l'image a échoué.");
        }
        return $f['tmp_name'];
    }
    $b64 = preg_replace('/^data:[^,]*,/', '', body()['photo_base64']);
    if (strlen($b64) > intdiv(UPLOAD_MAX_BYTES * 4, 3) + 16) {
        throw $tooBig;
    }
    $bin = base64_decode($b64, true);
    if ($bin === false || $bin === '') {
        throw new HttpError(422, 'validation_failed', 'Image illisible.', ['photo' => 'Image illisible.']);
    }
    $tmp = tempnam(sys_get_temp_dir(), 'sc-img');
    file_put_contents($tmp, $bin);
    register_shutdown_function(fn() => @unlink($tmp));
    return $tmp;
}

/**
 * Lit l'image reçue (voir received_image_path), la recadre en carré
 * IMAGE_SIZE px et l'enregistre. `$mode` : 'cover' (photo, rognée, JPEG), 'contain'
 * (logo, entier sur fond transparent, PNG) ou 'fit' (publication, proportions gardées,
 * 1080 px au plus, JPEG). Renvoie l'adresse publique.
 */
function save_uploaded_image(string $prefix, string $mode): string
{
    $tmp = received_image_path();
    $info = @getimagesize($tmp);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true)) {
        throw new HttpError(422, 'validation_failed', 'Format non accepté.', ['photo' => 'Envoie une image JPEG, PNG ou WebP.']);
    }
    if ($info[0] * $info[1] > 40_000_000) {
        throw new HttpError(422, 'validation_failed', 'Image trop grande.', ['photo' => 'Image trop grande.']);
    }
    $src = @imagecreatefromstring((string)file_get_contents($tmp));
    if (!$src) {
        throw new HttpError(422, 'validation_failed', 'Image illisible.', ['photo' => 'Image illisible.']);
    }
    $src = orient($src, $tmp, $info[2]);
    [$w, $h] = [imagesx($src), imagesy($src)];
    if ($mode === 'fit') {
        $scale = min(1, 1080 / max($w, $h));
        [$nw, $nh] = [max(1, (int)round($w * $scale)), max(1, (int)round($h * $scale))];
        $dst = imagecreatetruecolor($nw, $nh);
        imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
    } else {
        $dst = imagecreatetruecolor(IMAGE_SIZE, IMAGE_SIZE);
    }
    if ($mode === 'cover') {
        $side = min($w, $h);
        imagecopyresampled($dst, $src, 0, 0, intdiv($w - $side, 2), intdiv($h - $side, 2), IMAGE_SIZE, IMAGE_SIZE, $side, $side);
    } elseif ($mode === 'contain') {
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
    $ext = $mode === 'contain' ? 'png' : 'jpg';
    $name = $prefix . '-' . bin2hex(random_bytes(10)) . '.' . $ext;
    $ok = $mode === 'contain' ? imagepng($dst, "$dir/$name", 7) : imagejpeg($dst, "$dir/$name", 85);
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
