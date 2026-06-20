import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EntryImage } from '../../types';
import { uploadImage, deleteImage, updateImageCaption } from '../../services/images';

interface ImageStripProps {
  entryId: string;
  userId: string;
  images: EntryImage[];
  onImagesChange: (images: EntryImage[]) => void;
  readOnly?: boolean;
}

export function ImageStrip({
  entryId,
  userId,
  images,
  onImagesChange,
  readOnly = false,
}: ImageStripProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');

  const handleUpload = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);

    const newImages: EntryImage[] = [...images];
    const fileArr = Array.from(files);

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      if (!file.type.startsWith('image/')) continue;

      const res = await uploadImage(userId, entryId, file, newImages.length + i);
      if (res.success) {
        newImages.push(res.data);
      }
    }

    onImagesChange(newImages);
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (readOnly) return;
    const files = e.dataTransfer.files;
    if (files.length) handleUpload(files);
  }, [readOnly, images]);

  const handleDelete = async (image: EntryImage) => {
    if (!confirm('Remove this image?')) return;
    const res = await deleteImage(image.id, image.storage_key, userId);
    if (res.success) {
      onImagesChange(images.filter((i) => i.id !== image.id));
    }
  };

  const startEditCaption = (image: EntryImage) => {
    setEditingCaption(image.id);
    setCaptionText(image.caption ?? '');
  };

  const saveCaption = async (imageId: string) => {
    const res = await updateImageCaption(imageId, userId, captionText);
    if (res.success) {
      onImagesChange(
        images.map((img) => (img.id === imageId ? { ...img, caption: captionText } : img))
      );
    }
    setEditingCaption(null);
  };

  return (
    <div>
      {/* Images */}
      <AnimatePresence>
        {images.map((image) => (
          <motion.figure
            key={image.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="my-10 group"
            style={{ position: 'relative' }}
          >
            {/* Photo */}
            <div className="relative inline-block w-full">
              <img
                src={image.url ?? ''}
                alt={image.caption ?? ''}
                className="archive-photo"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />

              {/* Delete overlay (on hover) */}
              {!readOnly && (
                <button
                  onClick={() => handleDelete(image)}
                  className="absolute top-2 right-2 px-2 py-1 font-mono text-2xs tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{
                    backgroundColor: 'rgba(10,10,10,0.8)',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger)',
                  }}
                >
                  REMOVE
                </button>
              )}
            </div>

            {/* Caption */}
            {editingCaption === image.id ? (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={captionText}
                  onChange={e => setCaptionText(e.target.value)}
                  onBlur={() => saveCaption(image.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveCaption(image.id);
                    if (e.key === 'Escape') setEditingCaption(null);
                  }}
                  autoFocus
                  placeholder="Add a caption…"
                  className="flex-1 bg-transparent border-b text-sm outline-none"
                  style={{
                    borderColor: 'var(--amber)',
                    color: 'var(--parchment)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                  }}
                />
              </div>
            ) : (
              <figcaption
                className={`archive-photo-caption mt-2 ${!readOnly ? 'cursor-text hover:opacity-70' : ''}`}
                onClick={!readOnly ? () => startEditCaption(image) : undefined}
              >
                {image.caption || (!readOnly && (
                  <span style={{ color: 'var(--border-2)' }}>Add caption…</span>
                ))}
              </figcaption>
            )}
          </motion.figure>
        ))}
      </AnimatePresence>

      {/* Drop zone / Upload */}
      {!readOnly && (
        <div
          className={`mt-6 border border-dashed py-6 text-center transition-colors duration-150 ${
            dragOver ? 'border-amber' : ''
          }`}
          style={{
            borderColor: dragOver ? 'var(--amber)' : 'var(--border)',
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleUpload(e.target.files)}
          />

          {uploading ? (
            <span className="font-mono text-xs tracking-widest animate-pulse" style={{ color: 'var(--ghost)' }}>
              UPLOADING…
            </span>
          ) : (
            <div>
              <p className="font-mono text-xs tracking-wide mb-2" style={{ color: 'var(--ghost)' }}>
                Drop photographs, scans, maps
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="font-mono text-2xs tracking-widest uppercase transition-colors duration-150"
                style={{ color: 'var(--border-2)' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--amber)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--border-2)')}
              >
                or choose files
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
