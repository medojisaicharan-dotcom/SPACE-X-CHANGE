import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { readImageAsDataUrl } from '@/utils/files';
import { useToast } from '@/contexts/ToastContext';

export function ImageUploader({
  value,
  onChange,
  max = 3,
  label = 'Photos',
  helper = 'PNG, JPG, WEBP or GIF up to 900 KB each.',
}: {
  value: string[];
  onChange: (images: string[]) => void;
  max?: number;
  label?: string;
  helper?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = max - value.length;
    if (remaining <= 0) {
      toast.warning('Photo limit reached', `You can attach up to ${max} images.`);
      return;
    }
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      try {
        next.push(await readImageAsDataUrl(file));
      } catch (error) {
        toast.error('Could not add image', error instanceof Error ? error.message : 'Invalid file.');
      }
    }
    if (next.length > 0) onChange([...value, ...next]);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <p className="label-base">{label}</p>
      <div className="flex flex-wrap gap-3">
        {value.map((image, index) => (
          <div key={`${image.slice(0, 24)}-${index}`} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200">
            <img src={image} alt={`Attachment ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="absolute inset-0 flex items-center justify-center bg-navy-950/60 text-white opacity-0 transition group-hover:opacity-100"
              aria-label={`Remove image ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {value.length < max ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 text-slate-400 transition hover:border-navy-400 hover:text-navy-600"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-medium">Add photo</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <p className="mt-1.5 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
