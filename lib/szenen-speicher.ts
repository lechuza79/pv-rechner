// Where the browser loads prepared landscape scenes from: the public read-only bucket
// at Hetzner (Falkenstein). Kept free of node imports so client components can use it.
export const SZENEN_BUCKET = "solar-check-szenen";
export const SZENEN_REGION = "fsn1";
export const SZENEN_HOST = `${SZENEN_BUCKET}.${SZENEN_REGION}.your-objectstorage.com`;
export const SZENEN_BASIS_URL = `https://${SZENEN_HOST}`;

export const szeneUrl = (place: string, file = "scene.json") => `${SZENEN_BASIS_URL}/landscape-tours/${place}/${file}`;
