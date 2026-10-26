import type { AlertLevel, ConditionSurveyResult, PressureData } from './data-generator';

const HOUR_MS = 60 * 60 * 1000;
const MAX_GAP_HOURS = 6;

/** OpenWeather の整数気圧向け閾値（3時間換算 hPa） */
export const PRESSURE_THRESHOLDS = {
  dangerDiff3h: -5,
  warningDiff3h: -3,
  cautionDiff3h: -1.5,
  risingDiff3h: 3,
  dangerDiff6h: -8,
  warningDiff6h: -5,
  cautionDiff6h: -3,
  absoluteDanger: 985,
  absoluteWarning: 995,
  absoluteCaution: 1005,
} as const;

export const LEVEL_CRITERIA_JA = [
  {
    level: 'danger' as const,
    label: '警戒',
    colorClass: 'text-danger',
    summary: '急激な気圧低下',
    rules: [
      `3時間換算で ${PRESSURE_THRESHOLDS.dangerDiff3h} hPa 以下`,
      `直近約6時間で ${PRESSURE_THRESHOLDS.dangerDiff6h} hPa 以下`,
      `気圧が ${PRESSURE_THRESHOLDS.absoluteDanger} hPa 以下`,
    ],
  },
  {
    level: 'warning' as const,
    label: '注意',
    colorClass: 'text-warning',
    summary: '明確な気圧低下',
    rules: [
      `3時間換算で ${PRESSURE_THRESHOLDS.warningDiff3h} hPa 以下`,
      `直近約6時間で ${PRESSURE_THRESHOLDS.warningDiff6h} hPa 以下`,
      `気圧が ${PRESSURE_THRESHOLDS.absoluteWarning} hPa 以下`,
    ],
  },
  {
    level: 'caution' as const,
    label: 'やや注意',
    colorClass: 'text-caution',
    summary: '軽い気圧低下',
    rules: [
      `3時間換算で ${PRESSURE_THRESHOLDS.cautionDiff3h} hPa 以下`,
      `直近約6時間で ${PRESSURE_THRESHOLDS.cautionDiff6h} hPa 以下`,
      `気圧が ${PRESSURE_THRESHOLDS.absoluteCaution} hPa 以下`,
    ],
  },
  {
    level: 'rising' as const,
    label: '上昇注意',
    colorClass: 'text-rising',
    summary: '急な気圧上昇',
    rules: [`3時間換算で +${PRESSURE_THRESHOLDS.risingDiff3h} hPa 以上`],
  },
] as const;

const FALLING_RANK: Record<AlertLevel, number> = {
  normal: 0,
  rising: 0,
  caution: 1,
  warning: 2,
  danger: 3,
};

export type TimeBand = '深夜' | '早朝' | '午前' | '昼' | '午後' | '夕方' | '夜';

export function timeBandOf(date: Date): TimeBand {
  const h = date.getHours();
  if (h < 4) return '深夜';
  if (h < 7) return '早朝';
  if (h < 11) return '午前';
  if (h < 14) return '昼';
  if (h < 17) return '午後';
  if (h < 20) return '夕方';
  return '夜';
}

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

export function formatTimeBandRange(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  const dayLabel = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS_JA[d.getDay()]})`;
  const startBand = timeBandOf(start);
  const endBand = timeBandOf(end);

  if (sameDay && startBand === endBand) {
    return `${dayLabel(start)} ${startBand}`;
  }
  if (sameDay) {
    return `${dayLabel(start)} ${startBand}〜${endBand}`;
  }
  return `${dayLabel(start)} ${startBand} 〜 ${dayLabel(end)} ${endBand}`;
}

function pickWorse(
  a: { label: string; level: AlertLevel; reasons: string[] },
  b: { label: string; level: AlertLevel; reasons: string[] },
) {
  if (FALLING_RANK[b.level] > FALLING_RANK[a.level]) return b;
  if (FALLING_RANK[b.level] === FALLING_RANK[a.level] && b.level !== 'normal' && b.level !== 'rising') {
    return { ...a, reasons: [...a.reasons, ...b.reasons.filter((r) => !a.reasons.includes(r))] };
  }
  if (a.level === 'normal' && b.level === 'rising') return b;
  if (a.level === 'rising' && FALLING_RANK[b.level] > 0) return b;
  return a;
}

function classifyFromDiff3h(diff3h: number): { label: string; level: AlertLevel; reasons: string[] } {
  const t = PRESSURE_THRESHOLDS;
  if (diff3h <= t.dangerDiff3h) {
    return { label: '警戒', level: 'danger', reasons: [`3h換算 ${diff3h.toFixed(1)} hPa`] };
  }
  if (diff3h <= t.warningDiff3h) {
    return { label: '注意', level: 'warning', reasons: [`3h換算 ${diff3h.toFixed(1)} hPa`] };
  }
  if (diff3h <= t.cautionDiff3h) {
    return { label: 'やや注意', level: 'caution', reasons: [`3h換算 ${diff3h.toFixed(1)} hPa`] };
  }
  if (diff3h >= t.risingDiff3h) {
    return { label: '上昇注意', level: 'rising', reasons: [`3h換算 +${diff3h.toFixed(1)} hPa`] };
  }
  return { label: '正常', level: 'normal', reasons: [] };
}

function classifyFromDiff6h(diff6h: number | null): { label: string; level: AlertLevel; reasons: string[] } {
  if (diff6h === null) return { label: '正常', level: 'normal', reasons: [] };
  const t = PRESSURE_THRESHOLDS;
  if (diff6h <= t.dangerDiff6h) {
    return { label: '警戒', level: 'danger', reasons: [`6h累計 ${diff6h.toFixed(1)} hPa`] };
  }
  if (diff6h <= t.warningDiff6h) {
    return { label: '注意', level: 'warning', reasons: [`6h累計 ${diff6h.toFixed(1)} hPa`] };
  }
  if (diff6h <= t.cautionDiff6h) {
    return { label: 'やや注意', level: 'caution', reasons: [`6h累計 ${diff6h.toFixed(1)} hPa`] };
  }
  return { label: '正常', level: 'normal', reasons: [] };
}

function classifyFromAbsolute(pressure: number): { label: string; level: AlertLevel; reasons: string[] } {
  const t = PRESSURE_THRESHOLDS;
  if (pressure <= t.absoluteDanger) {
    return { label: '警戒', level: 'danger', reasons: [`絶対気圧 ${pressure} hPa`] };
  }
  if (pressure <= t.absoluteWarning) {
    return { label: '注意', level: 'warning', reasons: [`絶対気圧 ${pressure} hPa`] };
  }
  if (pressure <= t.absoluteCaution) {
    return { label: 'やや注意', level: 'caution', reasons: [`絶対気圧 ${pressure} hPa`] };
  }
  return { label: '正常', level: 'normal', reasons: [] };
}

function findNear(data: PressureData[], currentTime: number, targetHoursAgo: number) {
  const target = currentTime - targetHoursAgo * HOUR_MS;
  let best: PressureData | undefined;
  let bestDist = Infinity;
  for (const p of data) {
    const dist = Math.abs(p.timestamp.getTime() - target);
    if (dist < bestDist && dist <= 2 * HOUR_MS) {
      best = p;
      bestDist = dist;
    }
  }
  return best;
}

export function analyzePressure(data: PressureData[]): PressureData[] {
  const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return sorted.map((point, i) => {
    const prev = i > 0 ? sorted[i - 1] : undefined;
    const hours = prev
      ? (point.timestamp.getTime() - prev.timestamp.getTime()) / HOUR_MS
      : 0;
    const rawDiff = prev ? point.pressure - prev.pressure : 0;
    const diff3h = hours > 0 && hours <= MAX_GAP_HOURS ? rawDiff * (3 / hours) : 0;

    const sixHoursAgo = findNear(sorted.slice(0, i + 1), point.timestamp.getTime(), 6);
    const diff6h = sixHoursAgo ? point.pressure - sixHoursAgo.pressure : null;

    const by3h = classifyFromDiff3h(diff3h);
    const by6h = classifyFromDiff6h(diff6h);
    const byAbs = classifyFromAbsolute(point.pressure);
    const classified = pickWorse(pickWorse(by3h, by6h), byAbs);

    return {
      ...point,
      diff3h,
      diff6h: diff6h ?? undefined,
      label: classified.label,
      level: classified.level,
      reasons: classified.reasons,
      timeBand: timeBandOf(point.timestamp),
    };
  });
}

export function maxFallingLevel(points: PressureData[]): AlertLevel {
  return points.reduce<AlertLevel>((max, point) => {
    const level = point.level ?? 'normal';
    return FALLING_RANK[level] > FALLING_RANK[max] ? level : max;
  }, 'normal');
}

export interface AlertWindow {
  level: 'danger' | 'warning' | 'caution';
  label: string;
  start: Date;
  end: Date;
  timeRangeLabel: string;
  peakPressure: number;
  peakDiff3h: number;
  reasons: string[];
}

const ALERT_LEVELS = new Set(['danger', 'warning', 'caution']);

/** 連続する警戒/注意区間をまとめる（グラフ帯・一覧用） */
export function buildAlertWindows(data: PressureData[]): AlertWindow[] {
  const windows: AlertWindow[] = [];
  let current: {
    level: 'danger' | 'warning' | 'caution';
    label: string;
    start: Date;
    end: Date;
    peakPressure: number;
    peakDiff3h: number;
    reasons: string[];
  } | null = null;

  const flush = () => {
    if (!current) return;
    windows.push({
      ...current,
      timeRangeLabel: formatTimeBandRange(current.start, current.end),
    });
    current = null;
  };

  for (const point of data) {
    const level = point.level;
    if (!level || !ALERT_LEVELS.has(level)) {
      flush();
      continue;
    }
    const alertLevel = level as 'danger' | 'warning' | 'caution';
    if (!current) {
      current = {
        level: alertLevel,
        label: point.label ?? alertLevel,
        start: point.timestamp,
        end: point.timestamp,
        peakPressure: point.pressure,
        peakDiff3h: point.diff3h ?? 0,
        reasons: [...(point.reasons ?? [])],
      };
      continue;
    }

    if (FALLING_RANK[alertLevel] > FALLING_RANK[current.level]) {
      current.level = alertLevel;
      current.label = alertLevel === 'danger' ? '警戒' : alertLevel === 'warning' ? '注意' : 'やや注意';
    }
    current.end = point.timestamp;
    current.peakPressure = Math.min(current.peakPressure, point.pressure);
    current.peakDiff3h = Math.min(current.peakDiff3h, point.diff3h ?? 0);
    for (const reason of point.reasons ?? []) {
      if (!current.reasons.includes(reason)) current.reasons.push(reason);
    }
  }
  flush();
  return windows;
}

export function summarizeConditionCorrelation(
  data: PressureData[],
  surveys: ConditionSurveyResult[],
): { relevantCount: number; duringDrop: number } | null {
  const relevant = surveys.filter(
    (s) => s.type === 'uneasy' || s.type === 'headache' || s.type === 'medicine',
  );
  if (relevant.length === 0) return null;

  const windowMs = 90 * 60 * 1000;
  let duringDrop = 0;

  for (const survey of relevant) {
    if (data.length === 0) continue;

    let nearest = data[0];
    let best = Math.abs(survey.timestamp.getTime() - data[0].timestamp.getTime());
    for (const point of data) {
      const diff = Math.abs(survey.timestamp.getTime() - point.timestamp.getTime());
      if (diff < best) {
        best = diff;
        nearest = point;
      }
    }

    const isDrop = nearest.level === 'caution' || nearest.level === 'warning' || nearest.level === 'danger';
    if (best <= windowMs && isDrop) {
      duringDrop += 1;
    }
  }

  return { relevantCount: relevant.length, duringDrop };
}
