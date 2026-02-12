import React from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';

export type SurveyType = 'excellent' | 'uneasy' | 'headache' | 'medicine';

interface ConditionSurveyProps {
    onAddResult: (type: SurveyType) => void;
    currentUser: 'me' | 'wife';
}

export const ConditionSurvey: React.FC<ConditionSurveyProps> = ({ onAddResult, currentUser }) => {
    const isMe = currentUser === 'me';

    const options: { type: SurveyType; label: string; icon: string; color: string }[] = [
        { type: 'excellent', label: '快調', icon: '😊', color: 'hover:bg-green-50 text-green-700 ring-green-100' },
        { type: 'uneasy', label: '違和感', icon: '😐', color: 'hover:bg-amber-50 text-amber-700 ring-amber-100' },
        { type: 'headache', label: '頭痛あり', icon: '🤕', color: 'hover:bg-rose-50 text-rose-700 ring-rose-100' },
        { type: 'medicine', label: '服薬', icon: '💊', color: 'hover:bg-indigo-50 text-indigo-700 ring-indigo-100' },
    ];

    return (
        <div className="mt-12">
            <div className="flex items-center gap-3 mb-6 px-2">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors duration-500 ${isMe ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-rose-50 dark:bg-rose-900/40'}`}>
                    <MessageSquare className={`w-5 h-5 ${isMe ? 'text-blue-500' : 'text-rose-500'}`} />
                </div>
                <div>
                    <h3 className="font-black text-xl text-slate-800 dark:text-slate-100">体調を記録する</h3>
                    <p className="text-sm text-slate-400 font-medium">現在の気分を選択してください</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {options.map((opt) => (
                    <button
                        key={opt.type}
                        onClick={() => onAddResult(opt.type)}
                        className={`flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm ring-1 ring-black/5 dark:ring-white/5 transition-all hover:scale-[1.02] active:scale-95 group ${opt.color}/0 ${opt.color} hover:ring-4`}
                    >
                        <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{opt.icon}</span>
                        <span className="text-sm font-bold">{opt.label}</span>
                    </button>
                ))}
            </div>

            <div className={`mt-8 flex items-center justify-center gap-2 text-xs text-slate-300 font-bold uppercase tracking-widest`}>
                <Sparkles className={`w-3.5 h-3.5 ${isMe ? 'text-blue-500/50' : 'text-rose-500/50'}`} />
                <span>AIによる分析データに反映されます</span>
            </div>
        </div>
    );
};
