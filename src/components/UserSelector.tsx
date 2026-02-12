import React from 'react';
import { User } from 'lucide-react';

export type UserType = 'me' | 'wife';

interface UserSelectorProps {
    currentUser: UserType;
    onUserChange: (user: UserType) => void;
}

const DonutIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

export const UserSelector: React.FC<UserSelectorProps> = ({ currentUser, onUserChange }) => {
    return (
        <div className="flex p-1 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl w-full sm:w-fit self-center sm:self-auto ring-1 ring-black/5">
            <button
                onClick={() => onUserChange('me')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${currentUser === 'me'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
            >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                自分
            </button>
            <button
                onClick={() => onUserChange('wife')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${currentUser === 'wife'
                        ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm ring-1 ring-black/5'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
            >
                <DonutIcon />
                こみき
            </button>
        </div>
    );
};
