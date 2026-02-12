import type { PressureData } from './data-generator';

export function analyzePressure(data: PressureData[]): PressureData[] {
    return data.map((point) => {
        const currentTime = point.timestamp.getTime();

        // Find point approx 1 hour ago and 3 hours ago
        const oneHourAgo = data.find(p => {
            const diff = currentTime - p.timestamp.getTime();
            return diff >= 50 * 60 * 1000 && diff <= 70 * 60 * 1000;
        });
        const threeHoursAgo = data.find(p => {
            const diff = currentTime - p.timestamp.getTime();
            return diff >= 170 * 60 * 1000 && diff <= 190 * 60 * 1000;
        });

        const pCurrent = point.pressure;
        let diff1h = oneHourAgo ? pCurrent - oneHourAgo.pressure : 0;
        let diff3h = threeHoursAgo ? pCurrent - threeHoursAgo.pressure : 0;

        // API (3h) の場合は1h差分が取れないため、3h差分から按分して推測するか、
        // あるいは3h差分のみで判定する。ここでは3h差分を最優先。

        let label = '正常';
        let level: 'danger' | 'warning' | 'caution' | 'rising' | 'normal' = 'normal';

        if (diff3h <= -3 || diff1h <= -1) {
            label = '警戒';
            level = 'danger';
        } else if (diff3h <= -1.5) {
            label = '注意';
            level = 'warning';
        } else if (diff3h <= -0.5) {
            label = 'やや注意';
            level = 'caution';
        } else if (diff3h >= 1.5) {
            label = '上昇注意';
            level = 'rising';
        }

        return {
            ...point,
            label,
            level,
        };
    });
}
