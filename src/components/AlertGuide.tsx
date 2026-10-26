import React from 'react';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { LEVEL_CRITERIA_JA, type AlertWindow } from '../lib/pressure-analyzer';
import { LEVEL_COLORS } from '../lib/data-generator';

interface AlertGuideProps {
    /** 判定基準カードだけ表示（時間帯は SummaryPanel 側） */
    showCriteria?: boolean;
}

interface AlertWindowsListProps {
    windows: AlertWindow[];
    /** 本日ピーク下など、コンパクト表示 */
    compact?: boolean;
}

export const AlertWindowsList: React.FC<AlertWindowsListProps> = ({ windows, compact = false }) => {
    const upcoming = windows.filter((w) => w.end.getTime() >= Date.now() - 3 * 60 * 60 * 1000);

    if (compact) {
        return (
            <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                    <Clock3 className="w-4 h-4 text-warning" />
                    <p className="text-sm font-black text-slate-700">注意・警戒の時間帯</p>
                </div>
                {upcoming.length === 0 ? (
                    <p className="text-xs font-medium text-slate-400">
                        本日・直近で注意・警戒の帯はありません。
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {upcoming.map((w, i) => (
                            <li
                                key={`${w.start.getTime()}-${i}`}
                                className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: LEVEL_COLORS[w.level] }}
                                    />
                                    <span
                                        className="text-xs font-black"
                                        style={{ color: LEVEL_COLORS[w.level] }}
                                    >
                                        {w.label}
                                    </span>
                                    <span className="text-xs font-bold text-slate-600">{w.timeRangeLabel}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium pl-4">
                                    最低 {w.peakPressure} hPa
                                    {w.peakDiff3h < 0 ? ` · 3h換算 ${w.peakDiff3h.toFixed(1)}` : ''}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    return (
        <section className="p-6 bg-white rounded-[2rem] shadow-sm ring-1 ring-black/5">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <Clock3 className="w-5 h-5 text-warning" />
                </div>
                <div>
                    <h3 className="font-black text-lg text-slate-800">注意・警戒の時間帯</h3>
                    <p className="text-sm text-slate-400">グラフ上の色付き帯と同じ区間です</p>
                </div>
            </div>
            {upcoming.length === 0 ? (
                <p className="text-sm font-medium text-slate-400">
                    現時点では注意・警戒に当たる時間帯はありません。
                </p>
            ) : (
                <ul className="space-y-3">
                    {upcoming.map((w, i) => (
                        <li
                            key={`${w.start.getTime()}-${i}`}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-2xl border border-slate-100 px-4 py-3"
                        >
                            <div className="flex items-center gap-2 shrink-0">
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: LEVEL_COLORS[w.level] }}
                                />
                                <span
                                    className="text-sm font-black"
                                    style={{ color: LEVEL_COLORS[w.level] }}
                                >
                                    {w.label}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-slate-700">{w.timeRangeLabel}</p>
                            <p className="text-xs text-slate-400 font-medium sm:ml-auto">
                                最低 {w.peakPressure} hPa
                                {w.peakDiff3h < 0 ? ` / 3h換算 ${w.peakDiff3h.toFixed(1)}` : ''}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export const AlertGuide: React.FC<AlertGuideProps> = ({ showCriteria = true }) => {
    if (!showCriteria) return null;

    return (
        <div className="mt-10 space-y-6">
            <section className="p-6 bg-white rounded-[2rem] shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-danger" />
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-slate-800">警戒・注意の判定基準</h3>
                        <p className="text-sm text-slate-400">複数条件のいちばん重い結果を採用します</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {LEVEL_CRITERIA_JA.map((item) => (
                        <div key={item.level} className="rounded-2xl border border-slate-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: LEVEL_COLORS[item.level] }}
                                />
                                <p className={`font-black ${item.colorClass}`}>{item.label}</p>
                                <span className="text-xs text-slate-400 font-medium">{item.summary}</span>
                            </div>
                            <ul className="space-y-1.5">
                                {item.rules.map((rule) => (
                                    <li key={rule} className="text-sm text-slate-600 font-medium">
                                        · {rule}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};
