import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ImageCropModalProps {
  file: File;
  /** Ratio largeur/hauteur du cadre (défaut 4:3, adapté au catalogue). */
  aspect?: number;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

// Taille du cadre de prévisualisation (en pixels CSS).
const VW = 320;

/**
 * Recadrage simple d'une image (pan + zoom) dans un cadre au bon ratio,
 * puis export de l'image recadrée via canvas. Aucune dépendance externe.
 */
export default function ImageCropModal({ file, aspect = 4 / 3, onCancel, onConfirm }: ImageCropModalProps) {
  const { t } = useTranslation();
  const VH = Math.round(VW / aspect);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // translation du coin haut-gauche de l'image dans le cadre
  const [url, setUrl] = useState('');

  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // Charge l'image et initialise le cadrage (couvre le cadre, centré).
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const cover = Math.max(VW / img.naturalWidth, VH / img.naturalHeight);
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
      setMinScale(cover);
      setScale(cover);
      setPos({ x: (VW - img.naturalWidth * cover) / 2, y: (VH - img.naturalHeight * cover) / 2 });
      setReady(true);
    };
    img.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const clamp = (x: number, y: number, s: number) => ({
    x: Math.min(0, Math.max(VW - nat.w * s, x)),
    y: Math.min(0, Math.max(VH - nat.h * s, y)),
  });

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const nx = drag.current.px + (e.clientX - drag.current.x);
    const ny = drag.current.py + (e.clientY - drag.current.y);
    setPos(clamp(nx, ny, scale));
  };
  const onPointerUp = () => { drag.current = null; };

  // Zoom autour du centre du cadre.
  const onZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s1 = Number(e.target.value);
    const cx = (VW / 2 - pos.x) / scale;
    const cy = (VH / 2 - pos.y) / scale;
    const nx = VW / 2 - cx * s1;
    const ny = VH / 2 - cy * s1;
    setScale(s1);
    setPos(clamp(nx, ny, s1));
  };

  const confirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const OW = 1024;
    const OH = Math.round(OW / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = OW;
    canvas.height = OH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Région source visible dans le cadre.
    const sx = -pos.x / scale;
    const sy = -pos.y / scale;
    const sw = VW / scale;
    const sh = VH / scale;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OW, OH);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const base = file.name.replace(/\.[^.]+$/, '');
      onConfirm(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">{t('image_crop.title', { defaultValue: "Cadrer l'image" })}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-xs text-gray-400 mb-3">
          {t('image_crop.hint', { defaultValue: 'Glissez pour déplacer, utilisez le zoom pour cadrer.' })}
        </p>

        <div className="flex justify-center">
          <div
            className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100 touch-none select-none cursor-move"
            style={{ width: VW, height: VH }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {ready && (
              <img
                src={url}
                alt=""
                draggable={false}
                className="absolute top-0 left-0 max-w-none"
                style={{
                  width: nat.w * scale,
                  height: nat.h * scale,
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-gray-500">{t('image_crop.zoom', { defaultValue: 'Zoom' })}</span>
          <input
            type="range"
            min={minScale}
            max={minScale * 4}
            step={0.001}
            value={scale}
            onChange={onZoom}
            className="flex-1 accent-[#3d8c14]"
          />
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel} className="btn-secondary">{t('common.cancel', { defaultValue: 'Annuler' })}</button>
          <button onClick={confirm} className="btn-primary">{t('image_crop.confirm', { defaultValue: 'Valider' })}</button>
        </div>
      </div>
    </div>
  );
}
