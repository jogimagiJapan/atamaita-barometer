export type AlertLevel = 'danger' | 'warning' | 'caution' | 'rising' | 'normal';
export type SurveyType = 'excellent' | 'uneasy' | 'headache' | 'medicine';

export interface PressureData {
    timestamp: Date;
    pressure: number;
    label?: string;
    level?: AlertLevel;
    /** 直前スロットの差を 3 時間あたりに換算した値 (hPa / 3h) */
    diff3h?: number;
    weather?: string;
    weatherDescription?: string;
    temperature?: number;
    windSpeed?: number;
    icon?: string;
}

export interface ConditionSurveyResult {
    timestamp: Date;
    type: SurveyType;
}

/** チャート / テーマと揃えたレベル色 */
export const LEVEL_COLORS: Record<AlertLevel, string> = {
    danger: '#f43f5e',
    warning: '#f59e0b',
    caution: '#fbbf24',
    rising: '#8b5cf6',
    normal: '#94a3b8',
};
