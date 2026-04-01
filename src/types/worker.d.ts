declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}

// Stub for @imgly/background-removal.
// Full types come from the installed package after `npm install`.
declare module '@imgly/background-removal' {
  export interface Config {
    publicPath?: string;
    progress?: (key: string, current: number, total: number) => void;
    model?: string;
    output?: {
      format?: 'image/png' | 'image/jpeg' | 'image/webp';
      quality?: number;
      type?: 'foreground' | 'background' | 'mask';
    };
  }
  export function removeBackground(
    input: Blob | ImageData | ArrayBuffer | URL | string,
    config?: Config,
  ): Promise<Blob>;
}

// Stub for @huggingface/transformers.
// Full types come from the installed package after `npm install`.
declare module '@huggingface/transformers' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const env: any;
  export class AutoModel {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static from_pretrained(modelId: string, options?: any): Promise<any>;
  }
  export class AutoProcessor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static from_pretrained(modelId: string, options?: any): Promise<any>;
  }
  export class RawImage {
    width: number;
    height: number;
    data: Uint8Array | Float32Array;
    dims: number[];
    constructor(data: Uint8Array | Float32Array, width: number, height: number, channels: number);
    static fromBlob(blob: Blob): Promise<RawImage>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromTensor(tensor: any): RawImage;
    resize(width: number, height: number): Promise<RawImage>;
  }
}
