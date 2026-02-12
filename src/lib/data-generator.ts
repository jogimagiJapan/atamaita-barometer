import { addHours, subWeeks, addWeeks, startOfHour } from 'date-fns';

export interface PressureData {
    timestamp: Date;
    pressure: number;
    label?: string;
    level?: 'danger' | 'warning' | 'caution' | 'rising' | 'normal';
}

export function generateMockPressureData(currentDate: Date): PressureData[] {
    const startDate = subWeeks(startOfHour(currentDate), 1);
    const endDate = addWeeks(startDate, 2);
    const data: PressureData[] = [];

    let trend = 0;

    for (let d = startDate; d <= endDate; d = addHours(d, 1)) {
        // 日々の変動 (±1hPa)
        const dailyCycle = Math.sin((d.getHours() / 24) * Math.PI * 2) * 1;

        // 天候による変動 (ランダムウォーク的なトレンド)
        trend += (Math.random() - 0.5) * 0.8;
        trend *= 0.95; // トレンドが大きくなりすぎないように減衰

        // 急激な低下を意図的に混ぜる (シミュレーション用)
        let suddenDrop = 0;
        const day = d.getDate();
        const hour = d.getHours();

        // 特定の時間帯に警戒レベルの低下を発生させる
        if (day % 3 === 0 && hour > 10 && hour < 14) {
            suddenDrop = -1.2;
        }

        const pressure = 1013 + dailyCycle + trend + suddenDrop;

        data.push({
            timestamp: d,
            pressure: parseFloat(pressure.toFixed(1)),
        });
    }

    return data;
}
