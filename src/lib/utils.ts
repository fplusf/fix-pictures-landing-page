import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatHex = (rgb: [number, number, number]) =>
  `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
