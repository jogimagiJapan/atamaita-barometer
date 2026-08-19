import type { AlertLevel, ConditionSurveyResult, PressureData } from './data-generator';

const HOUR_MS = 60 * 60 * 1000;
const MAX_GAP_HOURS = 6;

const FALLING_RANK: Record<AlertLevel, number> = {
    normal: 0,
    rising: 0,
    caution: 1,
    warning: 2,
    danger: 3,
};

function classifyDiff(diff3h: number): { label: string; level: AlertLevel } {
    if (diff3h <= -6) return { label: '警戒', level: 'danger' };
    if (diff3h <= -4) return { label: '注意', level: 'warning' };
    if (diff3h <= -2) return { label: 'やや注意', level: 'caution' };
    if (diff3h >= 4) return { label: '上昇注意', level: 'rising' };
    return { label: '正常', level: 'normal' };
}

function applyAbsoluteFloor(pressure: number, current: { label: string; level: AlertLevel }) {
    if (pressure <= 990 && FALLING_RANK[current.level] < FALLING_RANK.warning) {
        return { label: '注意', level: 'warning' as const };
    }
    if (pressure <= 1000 && FALLING_RANK[current.level] < FALLING_RANK.caution) {
        return { label: 'やや注意', level: 'caution' as const };
    }
    return current;
}

export function analyzePressure(data: PressureData[]): PressureData[] {
    const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return sorted.map((point, i) => {
        const prev = i > 0 ? sorted[i - 1] : undefined;
        const hours = prev
            ? (point.timestamp.getTime() - prev.timestamp.getTime()) / HOUR_MS
            : 0;
        const rawDiff = prev ? point.pressure - prev.pressure : 0;
        const diff3h = hours > 0 && hours <= MAX_GAP_HOURS ? rawDiff * (3 / hours) : 0;

        const classified = applyAbsoluteFloor(point.pressure, classifyDiff(diff3h));

        return {
            ...point,
            diff3h,
            label: classified.label,
            level: classified.level,
        };
    });
}

export function maxFallingLevel(points: PressureData[]): AlertLevel {
    return points.reduce<AlertLevel>((max, point) => {
        const level = point.level ?? 'normal';
        return FALLING_RANK[level] > FALLING_RANK[max] ? level : max;
    }, 'normal');
}

export function summarizeConditionCorrelation(
    data: PressureData[],
    surveys: ConditionSurveyResult[],
): { relevantCount: number; duringDrop: number } | null {
    const relevant = surveys.filter(
        (s) => s.type === 'uneasy' || s.type === 'headache' || s.type === 'medicine',
    );
    if (relevant.length === 0) return null;

    const windowMs = 90 * 60 * 1000;
    let duringDrop = 0;

    for (const survey of relevant) {
        if (data.length === 0) continue;

        let nearest = data[0];
        let best = Math.abs(survey.timestamp.getTime() - data[0].timestamp.getTime());
        for (const point of data) {
            const diff = Math.abs(survey.timestamp.getTime() - point.timestamp.getTime());
            if (diff < best) {
                best = diff;
                nearest = point;
            }
        }

        const isDrop = nearest.level === 'caution' || nearest.level === 'warning' || nearest.level === 'danger';
        if (best <= windowMs && isDrop) {
            duringDrop += 1;
        }
    }

    return { relevantCount: relevant.length, duringDrop };
}
