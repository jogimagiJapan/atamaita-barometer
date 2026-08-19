import type { PressureData } from './data-generator';

const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const CURRENT_URL = 'https://api.openweathermap.org/data/2.5/weather';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const LEGACY_STORAGE_KEY = 'pressure_history';
const MERGE_WINDOW_MS = 45 * 60 * 1000;
const HISTORY_DAYS = 10;

interface OwmWeatherItem {
    dt: number;
    main: { pressure: number; temp: number };
    weather: { main: string; description: string; icon: string }[];
    wind?: { speed: number };
}

function getApiKey(): string {
    const key = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!key) {
        throw new Error('OpenWeather API key is not configured');
    }
    return key;
}

function historyKey(lat: number, lon: number): string {
    return `pressure_history:${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function mapWeatherItem(item: OwmWeatherItem): PressureData {
    return {
        timestamp: new Date(item.dt * 1000),
        pressure: item.main.pressure,
        weather: item.weather[0]?.main,
        weatherDescription: item.weather[0]?.description,
        icon: item.weather[0]?.icon,
        temperature: item.main.temp,
        windSpeed: item.wind?.speed,
    };
}

function commonQuery(lat: number, lon: number): string {
    const params = new URLSearchParams({
        appid: getApiKey(),
        units: 'metric',
        lang: 'ja',
        lat: String(lat),
        lon: String(lon),
    });
    return params.toString();
}

export async function fetchPressureSeries(
    lat: number,
    lon: number,
    signal?: AbortSignal,
): Promise<PressureData[]> {
    const query = commonQuery(lat, lon);
    const [currentRes, forecastRes] = await Promise.all([
        fetch(`${CURRENT_URL}?${query}`, { signal }),
        fetch(`${FORECAST_URL}?${query}`, { signal }),
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
        throw new Error('Failed to fetch weather data');
    }

    const currentJson = (await currentRes.json()) as OwmWeatherItem;
    const forecastJson = (await forecastRes.json()) as { list: OwmWeatherItem[] };
    const current = mapWeatherItem(currentJson);
    const forecast = forecastJson.list.map(mapWeatherItem);

    const merged = [
        current,
        ...forecast.filter(
            (point) => Math.abs(point.timestamp.getTime() - current.timestamp.getTime()) > MERGE_WINDOW_MS,
        ),
    ];

    return merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export interface CitySearchResult {
    name: string;
    lat: number;
    lon: number;
    country: string;
    state?: string;
    local_names?: Record<string, string>;
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<CitySearchResult[]> {
    if (!query || query.length < 2) return [];
    try {
        const params = new URLSearchParams({
            q: query,
            limit: '5',
            appid: getApiKey(),
        });
        const response = await fetch(`${GEO_URL}?${params.toString()}`, { signal });
        if (!response.ok) throw new Error('Failed to search cities');
        return (await response.json()) as CitySearchResult[];
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return [];
        console.error('Geo API Error:', error);
        return [];
    }
}

export function getLocalPressureHistory(lat: number, lon: number): PressureData[] {
    const stored = localStorage.getItem(historyKey(lat, lon));
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored) as Array<Omit<PressureData, 'timestamp'> & { timestamp: string }>;
        return parsed.map((item) => ({
            ...item,
            timestamp: new Date(item.timestamp),
        }));
    } catch {
        return [];
    }
}

export function savePressureToHistory(lat: number, lon: number, newData: PressureData[]) {
    const currentHistory = getLocalPressureHistory(lat, lon);
    const combined = [...currentHistory, ...newData];
    const unique = Array.from(new Map(combined.map((item) => [item.timestamp.getTime(), item])).values());

    const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
    const filtered = unique
        .filter((item) => item.timestamp.getTime() > cutoff)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    localStorage.setItem(historyKey(lat, lon), JSON.stringify(filtered));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
}
