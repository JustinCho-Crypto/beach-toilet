import { grantPromotionReward } from '@apps-in-toss/web-framework';
import { REWARD_TABLE, REWARD_DAILY_LIMIT, PROMOTION_CODE } from './config';
import { storageGet, storageSet, hydrateStorage } from './bridge';
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
  /** 제보 시점에 적립된 금액. 아직 토스포인트로 전환되기 전의 앱 내 포인트다. */
  reward: number;
}

const REPORTS_KEY = 'bt.reports';
const DAILY_KEY = 'bt.rewardDaily'; // { date: 'YYYY-MM-DD', count: number }
const CONVERTED_KEY = 'bt.converted'; // 지금까지 토스포인트로 전환한 누적 금액

/** 앱 부팅 시 1회 호출: 공식 Storage에서 제보/포인트 원장을 읽어온다. */
export function initPoints(): Promise<void> {
  return hydrateStorage([REPORTS_KEY, DAILY_KEY, CONVERTED_KEY]);
}

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

/** 제보로 적립한 누적 금액 (전환 여부 무관) */
export function totalEarned(): number {
  return getReports().reduce((sum, r) => sum + r.reward, 0);
}

/** 이미 토스포인트로 전환한 누적 금액 */
export function totalConverted(): number {
  return storageGet<number>(CONVERTED_KEY, 0);
}

/** 아직 전환하지 않고 남아 있는 포인트 */
export function pendingPoints(): number {
  return Math.max(0, totalEarned() - totalConverted());
}

export interface ConvertResult {
  amount: number;
  ok: boolean;
  /** 실패 사유 (유저에게 그대로 보여줄 수 있는 문구) */
  message?: string;
}

/**
 * 남은 포인트를 토스포인트로 전환한다. 보상형 광고 시청 완료 후에만 호출할 것.
 * grantPromotionReward는 클라이언트 브릿지로 직접 토스 서버에 지급을 요청한다 —
 * 별도 백엔드나 mTLS 인증서는 필요 없다(그건 서버 간 API 전용).
 */
export async function convertPending(): Promise<ConvertResult> {
  const amount = pendingPoints();
  if (amount <= 0) return { amount: 0, ok: false };

  try {
    const result = await grantPromotionReward({ params: { promotionCode: PROMOTION_CODE, amount } });

    if (result === undefined) {
      return { amount: 0, ok: false, message: '앱 업데이트 후 다시 시도해 주세요' };
    }
    if (result === 'ERROR') {
      return { amount: 0, ok: false, message: '포인트 지급 중 오류가 발생했어요' };
    }
    if ('errorCode' in result) {
      return { amount: 0, ok: false, message: result.message || '포인트 지급에 실패했어요' };
    }

    storageSet(CONVERTED_KEY, totalConverted() + amount);
    return { amount, ok: true };
  } catch {
    // 토스 웹뷰 밖(로컬 개발) — 프로모션 브릿지 미지원. 로컬 원장만 갱신해 개발을 이어간다.
    storageSet(CONVERTED_KEY, totalConverted() + amount);
    return { amount, ok: true };
  }
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
