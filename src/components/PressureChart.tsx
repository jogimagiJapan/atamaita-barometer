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
} from 'recharts';
import { format, isSameDay, differenceInMinutes } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { AlertLevel, ConditionSurveyResult, PressureData } from '../lib/data-generator';
import { LEVEL_COLORS } from '../lib/data-generator';

export type { ConditionSurveyResult };

interface PressureChartProps {
    data: PressureData[];
    surveyResults: ConditionSurveyResult[];
    currentDate: Date;
    accentColor?: string;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: PressureData }> }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const weatherLabel = data.weatherDescription || data.weather;
        return (
            <div className="bg-white/90 backdrop-blur-md p-4 shadow-xl border border-black/5 rounded-2xl text-sm min-w-[140px]">
                <p className="font-bold text-slate-800 mb-2">
                    {format(data.timestamp, 'M/d(E) HH:mm', { locale: ja })}
                </p>
                <div className="space-y-1">
                    <p className="flex justify-between text-slate-500">
                        <span>気圧:</span>
                        <span className="text-slate-900 font-mono font-bold">{data.pressure} hPa</span>
                    </p>
                    {weatherLabel && (
                        <p className="flex justify-between text-slate-500">
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

    const gradientStops = useMemo(() => {
        if (chartData.length < 2) return null;
        const start = chartData[0].timestampNum;
        const end = chartData[chartData.length - 1].timestampNum;
        const range = end - start || 1;

        return chartData.map((d, i) => {
            const offset = ((d.timestampNum - start) / range) * 100;
            return (
                <React.Fragment key={i}>
                    <stop offset={`${offset}%`} stopColor={getColorByLevel(d.level)} stopOpacity={0.2} />
                </React.Fragment>
            );
        });
    }, [chartData]);

    const dayTicks = useMemo(() => {
        return chartData
            .filter((d, i) => i === 0 || !isSameDay(d.timestamp, chartData[i - 1].timestamp))
            .map((d) => d.timestampNum);
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

    const nowLineX = chartData.find(d => d.timestamp >= currentDate)?.timestampNum;

    return (
        <div className="w-full relative mt-8">
            <div
                ref={scrollRef}
                className="w-full overflow-x-auto overflow-y-hidden no-scrollbar bg-white rounded-[2rem] shadow-sm ring-1 ring-black/5 transition-all p-6 pt-10"
            >
                <div style={{ width: '2400px', height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                        >
                            <defs>
                                <linearGradient id="colorLevel" x1="0" y1="0" x2="1" y2="0">
                                    {gradientStops}
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                            <XAxis
                                dataKey="timestampNum"
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return format(d, 'M/d(E)', { locale: ja });
                                }}
                                ticks={dayTicks}
                                interval={0}
                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 800 }}
                                axisLine={false}
                                tickLine={false}
                                padding={{ left: 10, right: 10 }}
                            />
                            <YAxis
                                domain={['dataMin - 3', 'dataMax + 3']}
                                hide
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {nowLineX !== undefined && (
                                <ReferenceLine
                                    x={nowLineX}
                                    stroke={accentColor}
                                    strokeWidth={2}
                                    label={{ position: 'top', value: '現在', fill: accentColor, fontSize: 12, fontWeight: 'bold' }}
                                />
                            )}

                            {chartData.map((d, i) => {
                                if (i > 0 && !isSameDay(d.timestamp, chartData[i - 1].timestamp)) {
                                    return (
                                        <ReferenceLine
                                            key={i}
                                            x={d.timestampNum}
                                            stroke="#cbd5e1"
                                            strokeWidth={1}
                                            strokeDasharray="4 4"
                                        />
                                    );
                                }
                                return null;
                            })}

                            <Area
                                type="monotone"
                                dataKey="pressure"
                                stroke={accentColor}
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorLevel)"
                                dot={(props: { cx?: number; cy?: number; payload?: { symbol?: string | null; timestampNum: number } }) => {
                                    const { cx, cy, payload } = props;
                                    if (payload?.symbol && cx !== undefined && cy !== undefined) {
                                        return (
                                            <g key={`sym-${payload.timestampNum}`}>
                                                <circle cx={cx} cy={cy} r={14} fill="white" stroke="#e2e8f0" />
                                                <text x={cx} y={cy} dy={5} textAnchor="middle" fontSize={16}>{payload.symbol}</text>
                                            </g>
                                        );
                                    }
                                    return <g key={`empty-${payload?.timestampNum ?? cx}`} />;
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 sm:hidden">
                <div className="w-8 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full w-1/3" style={{ backgroundColor: accentColor }}></div>
                </div>
            </div>
        </div>
    );
};
