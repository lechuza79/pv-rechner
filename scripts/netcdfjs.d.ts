// netcdfjs ships its own types behind an "exports" map, which this project's
// moduleResolution ("node") cannot follow. Only the part the climate build uses.
declare module 'netcdfjs' {
  export class NetCDFReader {
    constructor(data: ArrayBufferLike | Uint8Array);
    getDataVariable(name: string): unknown[];
  }
}
