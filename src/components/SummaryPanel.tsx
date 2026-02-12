import React from 'react';
import { AlertTriangle, Info, ArrowDown, ArrowUp } from 'lucide-react';
import type { PressureData } from '../lib/data-generator';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SummaryPanelProps {
    currentData: PressureData;
    todayMaxLevel: 'danger' | 'warning' | 'caution' | 'rising' | 'normal';
    trend: 'falling' | 'rising' | 'steady';
    currentUser: 'me' | 'wife';
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ currentData, todayMaxLevel, trend, currentUser }) => {
    const isMe = currentUser === 'me';

    const getLevelInfo = (level: string) => {
        switch (level) {
            case 'danger': return { label: '警戒', color: 'text-danger', bg: 'bg-danger/5', icon: <AlertTriangle className="w-8 h-8 text-danger" /> };
            case 'warning': return { label: '注意', color: 'text-warning', bg: 'bg-warning/5', icon: <AlertTriangle className="w-8 h-8 text-warning" /> };
            case 'caution': return { label: 'やや注意', color: 'text-caution', bg: 'bg-caution/5', icon: <Info className="w-8 h-8 text-caution" /> };
            case 'rising': return { label: '上昇注意', color: 'text-rising', bg: 'bg-rising/5', icon: <ArrowUp className="w-8 h-8 text-rising" /> };
            default: return {
                label: '正常',
                color: 'text-slate-400',
                bg: 'bg-slate-50 dark:bg-slate-800/30',
                icon: <Info className={`w-8 h-8 ${isMe ? 'text-blue-500/30' : 'text-rose-500/30'}`} />
            };
        }
    };

    const status = getLevelInfo(currentData.level || 'normal');
    const maxStatus = getLevelInfo(todayMaxLevel);

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Status Card */}
                <div className={`md:col-span-2 p-8 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm ring-1 ring-black/5 dark:ring-white/5 transition-all ${status.bg} border-none flex flex-col justify-between min-h-[200px]`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Current Pressure</p>
                            <h2 className="text-5xl font-black text-slate-800 dark:text-white">
                                {currentData.pressure} <span className="text-xl font-medium text-slate-400">hPa</span>
                            </h2>
                        </div>
                        {status.icon}
                    </div>

                    <div className="flex items-center gap-4 mt-6">
                        <span className={`px-5 py-2 rounded-2xl text-sm font-bold ${status.bg.replace('/5', '/15')} ${status.color} ring-1 ring-current/10`}>
                            {status.label}
                        </span>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-2xl">
                            {trend === 'falling' ? <ArrowDown className="w-4 h-4" /> : trend === 'rising' ? <ArrowUp className={`w-4 h-4 ${isMe ? 'text-blue-500' : 'text-rose-500'}`} /> : null}
                            {trend === 'falling' ? '気圧低下中' : trend === 'rising' ? '気圧上昇中' : '安定しています'}
                        </div>
                    </div>
                </div>

                {/* Max Level Card */}
                <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm ring-1 ring-black/5 dark:ring-white/5 transition-all flex flex-col justify-between relative overflow-hidden">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Peak</p>
                        <h3 className={`text-2xl font-black ${maxStatus.color}`}>
                            {maxStatus.label}
                        </h3>
                    </div>
                    <div className="mt-4">
                        <p className="text-xs font-bold text-slate-300">
                            {format(new Date(), 'yyyy / MM / dd (E)', { locale: ja })}
                        </p>
                    </div>

                    {/* Decorative Dot - now themed */}
                    <div className={`absolute top-6 right-6 w-2.5 h-2.5 rounded-full ${todayMaxLevel === 'normal' ? (isMe ? 'bg-blue-500/50' : 'bg-rose-500/50') : maxStatus.color.replace('text-', 'bg-')}`} />
                </div>
            </div>
        </div>
    );
};
