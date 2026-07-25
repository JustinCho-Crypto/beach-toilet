import { REWARD_TABLE, REWARD_DAILY_LIMIT } from './config';
import { storageGet, storageSet } from './bridge';
import { Cleanliness } from './data';

// 제보 저장 + 토스포인트 보상 로직.
// 실제 포인트 지급은 M3에서 앱인토스 프로모션/지급 API와 연동 — 여기서는 로컬 원장만 관리.

export interface Report {
  facilityId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  clean: Cleanliness;
  fee: 'free' | 'paid';
  hotWater?: boolean;
  ts: number;
  reward: number; // 0이면 보상 없이 제보만 저장됨
}

const REPORTS_KEY = 'bt.reports';
const DAILY_KEY = 'bt.rewardDaily'; // { date: 'YYYY-MM-DD', count: number }

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getReports(): Report[] {
  return storageGet<Report[]>(REPORTS_KEY, []);
}

export function rewardCountToday(): number {
  const rec = storageGet<{ date: string; count: number }>(DAILY_KEY, { date: '', count: 0 });
  return rec.date === today() ? rec.count : 0;
}

export function rewardsRemainingToday(): number {
  return Math.max(0, REWARD_DAILY_LIMIT - rewardCountToday());
}

/** 같은 시설에 오늘 이미 제보했는지 (1인 1시설 1일 1회 쿨다운) */
export function reportedToday(facilityId: string): boolean {
  const t = today();
  return getReports().some((r) => {
    if (r.facilityId !== facilityId) return false;
    const d = new Date(r.ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return key === t;
  });
}

/** 확률표(기획안 §3)대로 보상 금액을 추첨한다. */
export function drawReward(): number {
  const roll = Math.random();
  let acc = 0;
  for (const { amount, p } of REWARD_TABLE) {
    acc += p;
    if (roll < acc) return amount;
  }
  return REWARD_TABLE[0].amount;
}

/** 제보를 저장하고, 일일 한도 내면 보상 금액을 반환한다 (한도 초과 시 0). */
export function saveReport(input: Omit<Report, 'ts' | 'reward'>, rewardEligible: boolean): Report {
  let reward = 0;
  if (rewardEligible && rewardsRemainingToday() > 0) {
    reward = drawReward();
    storageSet(DAILY_KEY, { date: today(), count: rewardCountToday() + 1 });
  }
  const report: Report = { ...input, ts: Date.now(), reward };
  const all = getReports();
  all.unshift(report);
  storageSet(REPORTS_KEY, all);
  return report;
}

export function totalPoints(): number {
  return getReports().reduce((sum, r) => sum + r.reward, 0);
}

// ---------- 시설별 제보 집계 (핀 배지/리스트 메타에 사용) ----------

export interface FacilityAgg {
  count: number;
  avgStars: number;
  clean: Cleanliness | null; // 최근 제보 우선 다수결
  fee: 'free' | 'paid' | null;
  hotWater: boolean | null;
  lastTs: number | null;
}

export function aggregateFor(facilityId: string): FacilityAgg {
  const reports = getReports().filter((r) => r.facilityId === facilityId);
  if (reports.length === 0) {
    return { count: 0, avgStars: 0, clean: null, fee: null, hotWater: null, lastTs: null };
  }
  const recent = reports.slice(0, 10); // 최근 10건 가중
  const avgStars = recent.reduce((s, r) => s + r.stars, 0) / recent.length;
  const cleanVotes: Record<Cleanliness, number> = { clean: 0, normal: 0, dirty: 0 };
  recent.forEach((r) => { cleanVotes[r.clean] += 1; });
  const clean = (Object.entries(cleanVotes) as [Cleanliness, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
  const fee = recent[0].fee;
  const hw = recent.find((r) => r.hotWater !== undefined)?.hotWater ?? null;
  return { count: reports.length, avgStars, clean, fee, hotWater: hw, lastTs: reports[0].ts };
}

export function formatAgo(ts: number): string {
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff < day) return '오늘';
  if (diff < 2 * day) return '어제';
  return `${Math.floor(diff / day)}일 전`;
}
