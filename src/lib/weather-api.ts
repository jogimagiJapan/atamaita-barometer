import type { PressureData } from './data-generator';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || 'a8ed85507072a92670027e55435c93a8';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast';

export async function fetchWeatherForecast(query: string | { lat: number, lon: number }): Promise<PressureData[]> {
    try {
        let url = `${BASE_URL}?appid=${API_KEY}&units=metric`;
        if (typeof query === 'object') {
            url += `&lat=${query.lat}&lon=${query.lon}`;
        } else {
            url += `&q=${query}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }
        const data = await response.json();

        return data.list.map((item: any) => ({
            timestamp: new Date(item.dt * 1000),
            pressure: item.main.pressure,
            weather: item.weather[0]?.main,
            weatherDescription: item.weather[0]?.description,
            icon: item.weather[0]?.icon,
            temperature: item.main.temp,
            windSpeed: item.wind.speed,
        }));
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

export interface CitySearchResult {
    name: string;
    lat: number;
    lon: number;
    country: string;
    state?: string;
    local_names?: Record<string, string>;
}

export async function searchCities(query: string): Promise<CitySearchResult[]> {
    if (!query || query.length < 2) return [];
    try {
        const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`);
        if (!response.ok) throw new Error('Failed to search cities');
        return await response.json();
    } catch (error) {
        console.error('Geo API Error:', error);
        return [];
    }
}

// LocalStorage helpers
const STORAGE_KEY = 'pressure_history';

export function getLocalPressureHistory(): PressureData[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
        }));
    } catch {
        return [];
    }
}

export function savePressureToHistory(newData: PressureData[]) {
    const currentHistory = getLocalPressureHistory();

    // Merge and deduplicate by timestamp string
    const combined = [...currentHistory, ...newData];
    const unique = Array.from(new Map(combined.map(item => [item.timestamp.getTime(), item])).values());

    // Sort and keep only last 10 days to prevent bloat
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const filtered = unique
        .filter(item => item.timestamp.getTime() > tenDaysAgo)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
