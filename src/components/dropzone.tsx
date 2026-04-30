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
        'group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-white p-4 text-center transition hover:border-primary/70 hover:bg-emerald-50/40 sm:min-h-[220px] sm:p-6 lg:min-h-[290px] lg:p-7',
        disabled && 'cursor-not-allowed opacity-70',
        isDragActive && 'border-primary bg-emerald-50/60',
      )}
    >
      <input {...getInputProps()} />
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-primary shadow-sm sm:mb-5 sm:h-14 sm:w-14">
        <UploadIcon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <p className="text-base font-semibold text-zinc-900 sm:text-xl">Drop product images to start autopilot</p>
      <p className="mt-1 text-sm text-zinc-600">
        {disabled ? 'Processing in progress...' : multiple ? 'or tap / paste to add a batch' : 'or tap / paste to upload'}
      </p>
      <p className="mt-3 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600 sm:mt-4">
        JPG, PNG, WEBP · up to 25MB each · min 500px
      </p>
      <p className="mt-1.5 text-xs text-zinc-500 sm:mt-2">
        {disabled ? 'Please wait while current images are processed.' : 'Output: pure white, grounded, Amazon-ready 2000px JPG'}
      </p>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500 sm:mt-5">
        {multiple ? 'Batch mode enabled' : 'Single image mode'}
      </p>
    </div>
  );
};
