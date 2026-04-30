const API_BASE_URL = "https://217.154.6.104:9000/api";

export const DEFAULT_OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const DEFAULT_OSM_TILE_CACHE_PATH = "osm-map-cache";

// Construct the backend proxy tile URL
const BACKEND_OSM_PROXY_URL = `${API_BASE_URL}/tiles/{z}/{x}/{y}.png`;

export const resolveOsmTileUrl = () => {
    // Priority 1: Environment variable override
    const envProxyUrl = process.env.EXPO_PUBLIC_OSM_PROXY_URL?.trim();
    if (envProxyUrl) {
        console.log("[Map] Using environment variable EXPO_PUBLIC_OSM_PROXY_URL");
        return envProxyUrl;
    }

    // Priority 2: Backend proxy (requires API connectivity)
    console.log("[Map] Using backend OSM tile proxy:", BACKEND_OSM_PROXY_URL);
    return BACKEND_OSM_PROXY_URL;
};

export const resolveOsmTileUrlWithFallback = () => {
    const primaryUrl = resolveOsmTileUrl();
    
    // Validate URL format
    if (primaryUrl.startsWith("https://")) {
        return primaryUrl;
    }

    if (primaryUrl.startsWith("http://")) {
        console.warn("[Map] HTTP tile URL detected, switching to HTTPS:", primaryUrl);
        return primaryUrl.replace(/^http:\/\//i, "https://");
    }

    console.warn("[Map] Invalid tile URL detected, using default OSM tiles:", primaryUrl);
    return DEFAULT_OSM_TILE_URL;
};

export const logMapProviderState = (screenName: string, tileUrl: string, platformLabel: string) => {
    console.log(`[${screenName}] provider=react-native-maps platform=${platformLabel} tileUrl=${tileUrl}`);
};