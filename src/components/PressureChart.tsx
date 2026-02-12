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
import { format, isSameHour, isSameDay, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { PressureData } from '../lib/data-generator';

export interface ConditionSurveyResult {
    timestamp: Date;
    type: 'excellent' | 'uneasy' | 'headache' | 'medicine';
}

interface PressureChartProps {
    data: PressureData[];
    surveyResults: ConditionSurveyResult[];
    currentDate: Date;
    accentColor?: string; // Hex color
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as PressureData;
        return (
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-4 shadow-xl border border-black/5 dark:border-white/10 rounded-2xl text-sm min-w-[140px]">
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-2">
                    {format(data.timestamp, 'M/d(E) HH:mm', { locale: ja })}
                </p>
                <div className="space-y-1">
                    <p className="flex justify-between text-slate-500">
                        <span>気圧:</span>
                        <span className="text-slate-900 dark:text-slate-100 font-mono font-bold">{data.pressure} hPa</span>
                    </p>
                    <p className={`font-bold mt-2 text-center py-1 rounded-lg ${data.level === 'danger' ? 'bg-danger/20 text-danger' :
                        data.level === 'warning' ? 'bg-warning/20 text-warning' :
                            data.level === 'caution' ? 'bg-caution/20 text-caution' :
                                data.level === 'rising' ? 'bg-rising/20 text-rising' :
                                    'bg-slate-100 dark:bg-slate-700 text-slate-500'
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

const getColorByLevel = (level?: string) => {
    switch (level) {
        case 'danger': return '#ef4444'; // rose-500
        case 'warning': return '#f59e0b'; // amber-500
        case 'caution': return '#fcd34d'; // amber-300
        case 'rising': return '#3b82f6'; // blue-500
        default: return '#94a3b8'; // slate-400
    }
};

export const PressureChart: React.FC<PressureChartProps> = ({ data, surveyResults, currentDate, accentColor = '#3b82f6' }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const chartData = useMemo(() => {
        return data.map(point => {
            const result = surveyResults.find(r => isSameHour(r.timestamp, point.timestamp));
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
        const range = end - start;

        return chartData.map((d, i) => {
            const offset = ((d.timestampNum - start) / range) * 100;
            return (
                <React.Fragment key={i}>
                    <stop offset={`${offset}%`} stopColor={getColorByLevel(d.level)} stopOpacity={0.2} />
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

    return (
        <div className="w-full relative mt-8">
            <div
                ref={scrollRef}
                className="w-full overflow-x-auto overflow-y-hidden no-scrollbar bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm ring-1 ring-black/5 dark:ring-white/5 transition-all p-6 pt-10"
            >
                <div style={{ width: '2400px', height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                        >
                            <defs>
                                <linearGradient id="colorLevel" x1="0" y1="0" x2="1" y2="0">
                                    {gradientStops}
                                </linearGradient>
                                <linearGradient id="colorFade" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="white" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="white" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                            <XAxis
                                dataKey="timestampNum"
                                tickFormatter={(val) => {
                                    const d = new Date(val);
                                    return format(d, 'M/d(E)', { locale: ja });
                                }}
                                ticks={chartData
                                    .filter((d, i) => i === 0 || !isSameDay(d.timestamp, chartData[i - 1].timestamp))
                                    .map(d => startOfDay(d.timestamp).getTime())
                                }
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

                            {chartData.find(d => d.timestamp >= currentDate) && (
                                <ReferenceLine
                                    x={chartData.find(d => d.timestamp >= currentDate)?.timestamp.getTime()}
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
                                            x={d.timestamp.getTime()}
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
                                dot={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    if (payload.symbol) {
                                        return (
                                            <g key={`sym-${payload.timestamp}`}>
                                                <circle cx={cx} cy={cy} r={14} fill="white" stroke="#e2e8f0" />
                                                <text x={cx} y={cy} dy={5} textAnchor="middle" fontSize={16}>{payload.symbol}</text>
                                            </g>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 sm:hidden">
                <div className="w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-1/3" style={{ backgroundColor: accentColor }}></div>
                </div>
            </div>
        </div>
    );
};
