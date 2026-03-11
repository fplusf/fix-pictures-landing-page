import { cn } from '@/src/lib/utils';
import { UploadIcon } from 'lucide-react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface DropzoneProps {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
}

export const Dropzone = ({ disabled, onFiles, multiple = true }: DropzoneProps) => {
  const handleDrop = useCallback(
    (accepted: File[]) => {
      if (!accepted.length) return;
      onFiles(accepted);
    },
    [onFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple,
    onDrop: handleDrop,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'group relative flex min-h-[290px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-white p-7 text-center transition hover:border-primary/70 hover:bg-emerald-50/40',
        disabled && 'cursor-not-allowed opacity-70',
        isDragActive && 'border-primary bg-emerald-50/60',
      )}
    >
      <input {...getInputProps()} />
      <span className="mb-6 grid h-14 w-14 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-primary shadow-sm">
        <UploadIcon className="h-6 w-6" />
      </span>
      <p className="text-xl font-semibold text-zinc-900">Drop product images to start autopilot</p>
      <p className="mt-1 text-sm text-zinc-600">
        {disabled ? 'Processing in progress...' : multiple ? 'or click / paste to add a batch' : 'or click / paste to upload'}
      </p>
      <p className="mt-4 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600">
        JPG, PNG, WEBP · up to 25MB each · min 500px
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        {disabled ? 'Please wait while current images are processed.' : 'Output: pure white, grounded, Amazon-ready 2000px JPG'}
      </p>
      <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {multiple ? 'Batch mode enabled' : 'Single image mode'}
      </p>
    </div>
  );
};
