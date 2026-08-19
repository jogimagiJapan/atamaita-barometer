export interface Place {
    name: string;
    lat: number;
    lon: number;
}

export const LOCATION_PRESETS: Place[] = [
    { name: '大阪市中央区', lat: 34.6863, lon: 135.5197 },
    { name: '東京都千代田区', lat: 35.6938, lon: 139.7535 },
    { name: '名古屋市中区', lat: 35.1681, lon: 136.9066 },
    { name: '福岡市中央区', lat: 33.5902, lon: 130.4017 },
    { name: '札幌市中央区', lat: 43.0621, lon: 141.3544 },
];

export const DEFAULT_PLACE = LOCATION_PRESETS[0];
