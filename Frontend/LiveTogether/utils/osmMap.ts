export const DEFAULT_OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const resolveOsmTileUrl = () => {
    const rawTileUrl = process.env.EXPO_PUBLIC_TILE_URL?.trim();

    if (!rawTileUrl) {
        return DEFAULT_OSM_TILE_URL;
    }

    if (rawTileUrl.startsWith("https://")) {
        return rawTileUrl;
    }

    if (rawTileUrl.startsWith("http://")) {
        console.warn("[Map] HTTP tile URL detected, switching to HTTPS:", rawTileUrl);
        return rawTileUrl.replace(/^http:\/\//i, "https://");
    }

    console.warn("[Map] Invalid tile URL detected, using default OSM tiles:", rawTileUrl);
    return DEFAULT_OSM_TILE_URL;
};

export const logMapProviderState = (screenName: string, tileUrl: string, platformLabel: string) => {
    console.log(`[${screenName}] provider=react-native-maps platform=${platformLabel} tileUrl=${tileUrl}`);
};