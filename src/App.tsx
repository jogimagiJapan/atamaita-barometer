import { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, Info, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { analyzePressure } from './lib/pressure-analyzer';
import { PressureChart, type ConditionSurveyResult } from './components/PressureChart';
import { SummaryPanel } from './components/SummaryPanel';
import { ConditionSurvey, type SurveyType } from './components/ConditionSurvey';
import { LocationSelector } from './components/LocationSelector';
import { isSameDay, startOfToday } from 'date-fns';
import { fetchWeatherForecast, getLocalPressureHistory, savePressureToHistory } from './lib/weather-api';
import { UserSelector, type UserType } from './components/UserSelector';
import type { PressureData } from './lib/data-generator';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [location, setLocation] = useState('Osaka,JP');
  const [displayLocation, setDisplayLocation] = useState('大阪市中央区');
  const [currentUser, setCurrentUser] = useState<UserType>('me');
  const [currentDate] = useState(new Date());

  // ユーザーごとのアンケート結果を管理
  const [surveyResults, setSurveyResults] = useState<Record<UserType, ConditionSurveyResult[]>>({
    me: [],
    wife: []
  });

  const isMe = currentUser === 'me';

  // ユーザーごとのテーマ設定
  const theme = useMemo(() => {
    return isMe
      ? {
        bg: 'bg-slate-50 dark:bg-slate-950',
        hex: '#3b82f6',
        accentBg: 'bg-blue-50 dark:bg-blue-900/20',
        accentText: 'text-blue-500 dark:text-blue-400',
        accentBorder: 'border-blue-500',
        headerBg: 'bg-white/60 dark:bg-slate-950/60'
      }
      : {
        bg: 'bg-[#fff5f6] dark:bg-slate-950',
        hex: '#f43f5e',
        accentBg: 'bg-rose-50 dark:bg-rose-900/30',
        accentText: 'text-rose-500 dark:text-rose-400',
        accentBorder: 'border-rose-400',
        headerBg: 'bg-white/60 dark:bg-slate-950/60'
      };
  }, [isMe]);

  // 初回ロード時にLocalStorageからアンケート結果を復旧
  useEffect(() => {
    const saved = localStorage.getItem('user_surveys');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const processed = Object.keys(parsed).reduce((acc, key) => {
          acc[key as UserType] = parsed[key].map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
          return acc;
        }, {} as Record<UserType, ConditionSurveyResult[]>);
        setSurveyResults(processed);
      } catch (e) {
        console.error('Failed to load surveys', e);
      }
    }
  }, []);

  // 変更時に保存
  useEffect(() => {
    if (Object.values(surveyResults).some(arr => arr.length > 0)) {
      localStorage.setItem('user_surveys', JSON.stringify(surveyResults));
    }
  }, [surveyResults]);

  const [allData, setAllData] = useState<PressureData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初回ロードと場所変更時のデータ取得
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const forecast = await fetchWeatherForecast(location);
        savePressureToHistory(forecast);
        const merged = getLocalPressureHistory();
        setAllData(merged);
      } catch (err: any) {
        console.error(err);
        if (getLocalPressureHistory().length > 0) {
          setAllData(getLocalPressureHistory());
          setError('最新データの取得に失敗しました。履歴を表示しています。');
        } else {
          setError('データの取得に失敗しました。APIキーまたはネットワークを確認してください。');
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [location]);

  // 解析データ
  const analyzedData = useMemo(() => analyzePressure(allData), [allData]);

  // 今日のデータ
  const todayData = useMemo(() => {
    const today = startOfToday();
    return analyzedData.filter(d => isSameDay(d.timestamp, today));
  }, [analyzedData]);

  // 現在のデータ
  const currentPoint = useMemo(() => {
    if (analyzedData.length === 0) return null;
    const now = new Date();
    return analyzedData.find(d => d.timestamp >= now) || analyzedData[analyzedData.length - 1];
  }, [analyzedData]);

  // 本日の最大警戒レベル
  const todayMaxLevel = useMemo(() => {
    if (todayData.length === 0) return 'normal';
    const levels = ['normal', 'caution', 'rising', 'warning', 'danger'];
    const maxIndex = todayData.reduce((max, d) => {
      const idx = levels.indexOf(d.level || 'normal');
      return idx > max ? idx : max;
    }, 0);
    return levels[maxIndex] as any;
  }, [todayData]);

  // 気圧トレンド
  const trend = useMemo(() => {
    if (!currentPoint) return 'steady';
    const idx = analyzedData.indexOf(currentPoint);
    if (idx < 1) return 'steady';
    const prev = analyzedData[idx - 1].pressure;
    if (currentPoint.pressure < prev) return 'falling';
    if (currentPoint.pressure > prev) return 'rising';
    return 'steady';
  }, [analyzedData, currentPoint]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleAddSurveyResult = (type: SurveyType) => {
    const newResult = { timestamp: new Date(), type };
    setSurveyResults({
      ...surveyResults,
      [currentUser]: [...surveyResults[currentUser], newResult]
    });
  };

  const handleLocationChange = (loc: string) => {
    setDisplayLocation(loc);
    if (loc.includes('東京')) setLocation('Tokyo,JP');
    else if (loc.includes('名古屋')) setLocation('Nagoya,JP');
    else if (loc.includes('福岡')) setLocation('Fukuoka,JP');
    else if (loc.includes('札幌')) setLocation('Sapporo,JP');
    else setLocation('Osaka,JP');
  };

  return (
    <div className={`min-h-screen pb-20 transition-all duration-700 ease-in-out ${theme.bg} text-slate-800 dark:text-slate-100 font-sans`}>
      <header className={`sticky top-0 z-40 w-full backdrop-blur-xl ${theme.headerBg} border-b border-black/5 dark:border-white/5 transition-colors duration-500`}>
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className={`relative w-10 h-10 flex items-center justify-center`}>
              <div className={`absolute inset-0 border-2 ${theme.accentBorder} rounded-full opacity-20 animate-pulse`}></div>
              <div className={`w-6 h-6 border-4 ${theme.accentBorder} rounded-full flex items-center justify-center transition-colors duration-500`}>
                <div className={`w-1.5 h-1.5 ${isMe ? 'bg-blue-500' : 'bg-rose-500'} rounded-full transition-colors duration-500`}></div>
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-[0.15em] leading-none uppercase text-slate-800 dark:text-white font-mono">
              ATAMAITA <span className="font-light opacity-50">Barometer</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2">
            <UserSelector currentUser={currentUser} onUserChange={setCurrentUser} />
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1"></div>
            <LocationSelector currentLocation={displayLocation} onLocationChange={handleLocationChange} />
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-10 h-10 shrink-0 rounded-2xl bg-white dark:bg-slate-900 text-slate-500 ring-1 ring-black/5 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <section className="mb-12">
          <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full ${theme.accentBg} ${theme.accentText} text-xs font-black uppercase tracking-wider mb-6 transition-all duration-500`}>
            <Info className="w-3.5 h-3.5" />
            <span>Health Advisory: Live Weather Source</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 mb-4">
            現在のコンディション
          </h2>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className={`w-10 h-10 ${isMe ? 'text-blue-500' : 'text-rose-500'} animate-spin transition-colors duration-500`} />
            <p className="text-slate-400 text-sm font-bold animate-pulse">気象データを同期中...</p>
          </div>
        ) : currentPoint ? (
          <>
            {allData.filter(d => d.timestamp < new Date()).length === 0 && (
              <div className={`mb-8 p-4 ${theme.accentBg} border ${theme.accentBorder}/20 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all duration-500`}>
                <Info className={`w-4 h-4 shrink-0 ${isMe ? 'text-blue-500' : 'text-rose-500'}`} />
                <p>データ蓄積中（過去データがまだありません）。予報を表示しています。</p>
              </div>
            )}
            <SummaryPanel currentData={currentPoint} todayMaxLevel={todayMaxLevel} trend={trend} currentUser={currentUser} />

            <section className="mt-16">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight px-2">
                {isMe ? '自分' : 'こみき'}の気圧推移・予報
              </h3>
              <PressureChart
                data={analyzedData}
                surveyResults={surveyResults[currentUser]}
                currentDate={currentDate}
                accentColor={theme.hex}
              />
            </section>

            <ConditionSurvey onAddResult={handleAddSurveyResult} currentUser={currentUser} />
          </>
        ) : (
          <div className="p-12 text-center card-tactile bg-white dark:bg-slate-900">
            <p className="text-slate-400 font-bold">データがありません</p>
          </div>
        )}

        <footer className="mt-24 border-t border-slate-100 dark:border-slate-900 pt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-slate-300 dark:text-slate-600">
              <ExternalLink className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.1em]">
                Data Source: OpenWeatherMap (5-Day / 3-Hour Forecast)
              </p>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              © 2026 ATAMAITA Barometer
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
