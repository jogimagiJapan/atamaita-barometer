import React, { useMemo, useEffect, useRef } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceArea,
} from 'recharts';
import {
    format,
    isSameDay,
    differenceInMinutes,
    startOfDay,
    addDays,
    setHours,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import type { AlertLevel, ConditionSurveyResult, PressureData } from '../lib/data-generator';
import { LEVEL_COLORS } from '../lib/data-generator';
import { buildAlertWindows } from '../lib/pressure-analyzer';

export type { ConditionSurveyResult };

interface PressureChartProps {
    data: PressureData[];
    surveyResults: ConditionSurveyResult[];
    currentDate: Date;
    accentColor?: string;
}

type ChartPoint = PressureData & {
    timestampNum: number;
    symbol: string | null;
};

const HOUR_MARKS = [3, 6, 9, 12, 15, 18, 21] as const;

function dayLabel(d: Date): string {
    return format(d, 'M/d(E)', { locale: ja });
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const weatherLabel = data.weatherDescription || data.weather;
        return (
            <div className="bg-white/90 backdrop-blur-md p-4 shadow-xl border border-black/5 rounded-2xl text-sm min-w-[160px]">
                <p className="font-bold text-slate-800 mb-1">
                    {format(data.timestamp, 'M/d(E) HH:mm', { locale: ja })}
                </p>
                {data.timeBand && (
                    <p className="text-xs font-bold text-slate-400 mb-2">{data.timeBand}</p>
                )}
                <div className="space-y-1">
                    <p className="flex justify-between text-slate-500 gap-4">
                        <span>気圧:</span>
                        <span className="text-slate-900 font-mono font-bold">{data.pressure} hPa</span>
                    </p>
                    {data.diff3h !== undefined && (
                        <p className="flex justify-between text-slate-500 gap-4">
                            <span>3h換算:</span>
                            <span className="font-mono font-bold text-slate-700">
                                {data.diff3h > 0 ? '+' : ''}{data.diff3h.toFixed(1)} hPa
                            </span>
                        </p>
                    )}
                    {weatherLabel && (
                        <p className="flex justify-between text-slate-500 gap-4">
                            <span>天気:</span>
                            <span className="text-slate-700 font-bold">{weatherLabel}</span>
                        </p>
                    )}
                    <p className={`font-bold mt-2 text-center py-1 rounded-lg ${data.level === 'danger' ? 'bg-danger/20 text-danger' :
                        data.level === 'warning' ? 'bg-warning/20 text-warning' :
                            data.level === 'caution' ? 'bg-caution/20 text-caution' :
                                data.level === 'rising' ? 'bg-rising/20 text-rising' :
                                    'bg-slate-100 text-slate-500'
                        }`}>
                        {data.label}
                    </p>
                    {data.reasons && data.reasons.length > 0 && (
                        <p className="text-[11px] text-slate-400 font-medium pt-1">
                            {data.reasons.join(' · ')}
                        </p>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const getSymbol = (type: string) => {
    switch (type) {
        case 'excellent': return '😊';
        case 'uneasy': return '😐';
        case 'headache': return '🤕';
        case 'medicine': return '💊';
        default: return '';
    }
};

const getColorByLevel = (level?: AlertLevel) => LEVEL_COLORS[level ?? 'normal'];

const isAlertLevel = (level?: AlertLevel): level is 'danger' | 'warning' | 'caution' =>
    level === 'danger' || level === 'warning' || level === 'caution';

/** 指定時刻にいちばん近いデータ点の timestamp（±90分以内） */
function nearestTick(targets: number[], points: number[]): number[] {
    const result: number[] = [];
    for (const target of targets) {
        let best = target;
        let bestDist = Infinity;
        for (const p of points) {
            const dist = Math.abs(p - target);
            if (dist < bestDist) {
                bestDist = dist;
                best = p;
            }
        }
        if (bestDist <= 90 * 60 * 1000 && !result.includes(best)) {
            result.push(best);
        }
    }
    return result.sort((a, b) => a - b);
}

export const PressureChart: React.FC<PressureChartProps> = ({ data, surveyResults, currentDate, accentColor = '#3b82f6' }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const chartData = useMemo(() => {
        return data.map(point => {
            const matches = surveyResults
                .filter((r) => Math.abs(differenceInMinutes(r.timestamp, point.timestamp)) <= 90)
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            const result = matches[0];

            return {
                ...point,
                timestampNum: point.timestamp.getTime(),
                symbol: result ? getSymbol(result.type) : null,
            };
        });
    }, [data, surveyResults]);

    const alertWindows = useMemo(() => buildAlertWindows(data), [data]);

    const hourTicks = useMemo(() => {
        if (chartData.length === 0) return [];
        const pointTimes = chartData.map((d) => d.timestampNum);
        const start = chartData[0].timestampNum;
        const end = chartData[chartData.length - 1].timestampNum;
        const candidates: number[] = [];

        let day = startOfDay(new Date(start));
        const lastDay = startOfDay(new Date(end));
        while (day.getTime() <= lastDay.getTime()) {
            for (const h of HOUR_MARKS) {
                const t = setHours(day, h).getTime();
                if (t >= start - 2 * 60 * 60 * 1000 && t <= end + 2 * 60 * 60 * 1000) {
                    candidates.push(t);
                }
            }
            day = addDays(day, 1);
        }

        return nearestTick(candidates, pointTimes);
    }, [chartData]);

    const dayBoundaries = useMemo(() => {
        return chartData
            .filter((d, i) => i === 0 || !isSameDay(d.timestamp, chartData[i - 1].timestamp))
            .map((d) => ({
                x: d.timestampNum,
                label: dayLabel(d.timestamp),
            }));
    }, [chartData]);

    const gradientStops = useMemo(() => {
        if (chartData.length < 2) return null;
        const start = chartData[0].timestampNum;
        const end = chartData[chartData.length - 1].timestampNum;
        const range = end - start || 1;

        return chartData.map((d, i) => {
            const offset = ((d.timestampNum - start) / range) * 100;
            const alert = isAlertLevel(d.level);
            return (
                <React.Fragment key={i}>
                    <stop
                        offset={`${offset}%`}
                        stopColor={getColorByLevel(d.level)}
                        stopOpacity={alert ? 0.55 : 0.12}
                    />
                </React.Fragment>
            );
        });
    }, [chartData]);

    useEffect(() => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const chartWidth = container.scrollWidth;
            const totalPoints = chartData.length;
            const currentIndex = chartData.findIndex(d => d.timestamp >= currentDate);

            if (currentIndex !== -1) {
                const scrollPos = (currentIndex / totalPoints) * chartWidth - container.clientWidth / 2 + 100;
                container.scrollLeft = scrollPos;
            }
        }
    }, [chartData, currentDate]);

    const nowLineX = chartData.find(d => d.timestamp >= currentDate)?.timestampNum
        ?? chartData.find(d => d.timestampNum >= currentDate.getTime() - 90 * 60 * 1000)?.timestampNum;

    return (
        <div className="w-full relative mt-8">
            <div
                ref={scrollRef}
                className="w-full overflow-x-auto overflow-y-hidden no-scrollbar bg-white rounded-[2rem] shadow-sm ring-1 ring-black/5 transition-all p-6 pt-10"
            >
                <div style={{ width: '2800px', height: '420px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart
                            data={chartData}
                            margin={{ top: 36, right: 30, left: 8, bottom: 28 }}
                        >
                            <defs>
                                <linearGradient id="colorLevel" x1="0" y1="0" x2="1" y2="0">
                                    {gradientStops}
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                            <XAxis
                                dataKey="timestampNum"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return String(d.getHours());
                                }}
                                ticks={hourTicks}
                                interval={0}
                                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                                padding={{ left: 10, right: 10 }}
                                height={36}
                                label={{
                                    value: '時',
                                    position: 'insideBottomRight',
                                    offset: -4,
                                    fill: '#94a3b8',
                                    fontSize: 10,
                                    fontWeight: 700,
                                }}
                            />
                            <YAxis
                                domain={['dataMin - 3', 'dataMax + 3']}
                                hide
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {alertWindows.map((w, i) => {
                                const x1 = w.start.getTime();
                                let x2 = w.end.getTime();
                                if (x2 <= x1) {
                                    x2 = x1 + 90 * 60 * 1000;
                                }
                                return (
                                    <ReferenceArea
                                        key={`alert-${i}`}
                                        x1={x1}
                                        x2={x2}
                                        fill={LEVEL_COLORS[w.level]}
                                        fillOpacity={w.level === 'danger' ? 0.22 : w.level === 'warning' ? 0.18 : 0.12}
                                        stroke={LEVEL_COLORS[w.level]}
                                        strokeOpacity={0.55}
                                        strokeWidth={1}
                                        ifOverflow="extendDomain"
                                        label={{
                                            value: `${w.label} ${w.timeRangeLabel}`,
                                            position: 'insideTop',
                                            fill: LEVEL_COLORS[w.level],
                                            fontSize: 11,
                                            fontWeight: 800,
                                        }}
                                    />
                                );
                            })}

                            {dayBoundaries.map((b, i) => (
                                <ReferenceLine
                                    key={`day-${i}`}
                                    x={b.x}
                                    stroke="#cbd5e1"
                                    strokeWidth={1}
                                    strokeDasharray="4 4"
                                    label={{
                                        value: b.label,
                                        position: 'insideTopLeft',
                                        fill: '#475569',
                                        fontSize: 12,
                                        fontWeight: 800,
                                        offset: 8,
                                    }}
                                />
                            ))}

                            {nowLineX !== undefined && (
                                <ReferenceLine
                                    x={nowLineX}
                                    stroke={accentColor}
                                    strokeWidth={2}
                                    label={{ position: 'top', value: '現在', fill: accentColor, fontSize: 12, fontWeight: 'bold' }}
                                />
                            )}

                            <Area
                                type="monotone"
                                dataKey="pressure"
                                stroke={accentColor}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorLevel)"
                                activeDot={{ r: 6 }}
                                dot={(props: {
                                    cx?: number;
                                    cy?: number;
                                    payload?: ChartPoint;
                                }) => {
                                    const { cx, cy, payload } = props;
                                    if (cx === undefined || cy === undefined || !payload) {
                                        return <g key="empty" />;
                                    }

                                    if (payload.symbol) {
                                        return (
                                            <g key={`sym-${payload.timestampNum}`}>
                                                <circle cx={cx} cy={cy} r={14} fill="white" stroke="#e2e8f0" />
                                                <text x={cx} y={cy} dy={5} textAnchor="middle" fontSize={16}>{payload.symbol}</text>
                                            </g>
                                        );
                                    }

                                    if (isAlertLevel(payload.level)) {
                                        const color = getColorByLevel(payload.level);
                                        const r = payload.level === 'danger' ? 7 : payload.level === 'warning' ? 6 : 5;
                                        return (
                                            <g key={`alert-dot-${payload.timestampNum}`}>
                                                <circle cx={cx} cy={cy} r={r + 3} fill={color} fillOpacity={0.25} />
                                                <circle cx={cx} cy={cy} r={r} fill={color} stroke="white" strokeWidth={2} />
                                            </g>
                                        );
                                    }

                                    return <g key={`plain-${payload.timestampNum}`} />;
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 px-2 text-xs font-bold text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger" /> 警戒
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-warning" /> 注意
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-caution" /> やや注意
                </span>
                <span className="text-slate-300">横軸: 3・6・9・12・15・18・21 時</span>
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 sm:hidden">
                <div className="w-8 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full w-1/3" style={{ backgroundColor: accentColor }}></div>
                </div>
            </div>
        </div>
    );
};
