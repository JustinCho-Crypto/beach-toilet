import { grantPromotionReward } from '@apps-in-toss/web-framework';
import { REWARD_TABLE, REWARD_DAILY_LIMIT, PROMOTION_CODE } from './config';
import { storageGet, storageSet, hydrateStorage } from './bridge';
import { fetchAllReports, submitReport } from './reportsApi';
import { Cleanliness } from './data';

// 제보 저장(공유) + 토스포인트 보상(기기별) 로직.
//
// 두 원장은 성격이 달라 분리돼 있다:
//   - 포인트 원장(적립/전환/일일 한도)은 기기 로컬(공식 Storage)만 본다.
//     로그인이 없는 앱이라 "1인 1일 n회" 같은 어뷰징 방어는 애초에 기기 단위 이상으로
//     강제할 수 없다(CLAUDE.md §3-3에 남긴 알려진 한계).
//   - 제보 내용(별점·청결·요금 등)은 Supabase(supabase/schema.sql)에도 올라가
//     다른 유저에게 보인다. 이게 없으면 "남이 남긴 최신 정보를 본다"는 이 앱의
//     핵심 가치가 실제로는 작동하지 않는다.

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
const DEVICE_ID_KEY = 'bt.deviceId';

/** 집계(aggregateFor)에 필요한 최소 형태. 로컬 Report와 서버 RemoteReportRow를 여기로 맞춘다. */
interface AggEntry {
  facilityId: string;
  stars: number;
  clean: Cleanliness;
  fee: 'free' | 'paid';
  hotWater?: boolean;
  ts: number;
}

// 서버에서 가져온 전체 제보(다른 유저 포함) 캐시. aggregateFor가 지도 렌더링 경로 곳곳에서
// 동기 호출되기 때문에(map.ts), 네트워크 호출은 syncReports()로 미리 끝내 두고
// aggregateFor 자체는 계속 동기 함수로 남긴다.
let remoteReports: AggEntry[] = [];
let remoteSynced = false;

/** 부팅 시 1회: 서버에서 전체 제보를 가져와 캐시를 채운다. 실패하면 이 기기 제보만 보인다. */
export async function syncReports(): Promise<void> {
  try {
    const rows = await fetchAllReports();
    remoteReports = rows.map((r) => ({
      facilityId: r.facility_id,
      stars: r.stars,
      clean: r.clean,
      fee: r.fee,
      hotWater: r.hot_water ?? undefined,
      ts: new Date(r.created_at).getTime(),
    }));
    remoteSynced = true;
  } catch (e) {
    console.error('[reports] 서버 동기화 실패 — 이 기기의 제보만 표시해요', e);
  }
}

function getDeviceId(): string {
  let id = storageGet<string | null>(DEVICE_ID_KEY, null);
  if (!id) {
    id = crypto.randomUUID();
    storageSet(DEVICE_ID_KEY, id);
  }
  return id;
}

/** 앱 부팅 시 1회 호출: 공식 Storage에서 포인트 원장을 읽고, 서버에서 제보를 동기화한다. */
export async function initPoints(): Promise<void> {
  await hydrateStorage([REPORTS_KEY, DAILY_KEY, CONVERTED_KEY, DEVICE_ID_KEY]);
  await syncReports();
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

/**
 * 제보를 저장하고, 일일 한도 내면 보상 금액을 반환한다 (한도 초과 시 0).
 * 포인트 적립(로컬)은 서버 제출 성공 여부와 무관하게 항상 확정된다 — 유저가 실제로
 * 제보 행위(+ 광고 시청)를 완료했다는 사실은 네트워크 상태와 별개이기 때문이다.
 * 서버 제출이 실패해도 이 기기에서는 정상적으로 보이고, 다음 syncReports()에서
 * 다른 기기 제보가 채워진다 — 다만 이번 제보 자체는 재전송되지 않는다(재시도 큐는 미구현).
 */
export async function saveReport(input: Omit<Report, 'ts' | 'reward'>, rewardEligible: boolean): Promise<Report> {
  let reward = 0;
  if (rewardEligible && rewardsRemainingToday() > 0) {
    reward = drawReward();
    storageSet(DAILY_KEY, { date: today(), count: rewardCountToday() + 1 });
  }
  const report: Report = { ...input, ts: Date.now(), reward };
  const all = getReports();
  all.unshift(report);
  storageSet(REPORTS_KEY, all);

  try {
    await submitReport({
      facilityId: input.facilityId,
      stars: input.stars,
      clean: input.clean,
      fee: input.fee,
      hotWater: input.hotWater,
      deviceId: getDeviceId(),
    });
    // 서버 확정 즉시 캐시에 반영 — 다음 전체 재동기화를 기다리지 않고 바로 지도에 보이게 한다.
    remoteReports.unshift({
      facilityId: input.facilityId,
      stars: input.stars,
      clean: input.clean,
      fee: input.fee,
      hotWater: input.hotWater,
      ts: report.ts,
    });
    remoteSynced = true;
  } catch (e) {
    console.error('[reports] 서버 제출 실패 — 이 제보는 이 기기에서만 보여요', e);
  }

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
  // 서버 동기화 전/실패 시엔 이 기기 제보만 폴백으로 보여준다(빈 화면보다 낫다).
  const source: AggEntry[] = remoteSynced ? remoteReports : getReports();
  const reports = source.filter((r) => r.facilityId === facilityId);
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
