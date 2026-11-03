# Garde de nuit — vidéo 3D générée en code

Scène Three.js (personnage low-poly procédural) rendue image par image dans Chromium headless.

```bash
npm install                      # three@0.170.0
python3 -m http.server 8123 &    # sert index.html
node drive.js stills 4 13 21     # images de contrôle
node drive.js video              # -> video.mp4 (1335 images, 30 fps)
```
Ambiances sonores : ElevenLabs Sound Effects v2, mixées avec ffmpeg.
