import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { Cleanliness } from './data';

// 제보 공유 백엔드. 스키마는 supabase/schema.sql — SQL Editor에서 먼저 실행할 것.
// 로그인이 없는 앱이라 anon 키 하나로 insert/select를 전부 처리한다.

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface RemoteReportRow {
  facility_id: string;
  stars: number;
  clean: Cleanliness;
  fee: 'free' | 'paid';
  hot_water: boolean | null;
  created_at: string; // ISO 8601
}

/**
 * 전체 제보를 최신순으로 가져온다. 지금 규모(548스팟 · 1,740시설)에서 5000건이면
 * 넉넉하지만, 데이터가 계속 쌓이면 이 한 방 조회 방식은 결국 페이지네이션이나
 * 시설별 조회로 바꿔야 한다.
 */
export async function fetchAllReports(): Promise<RemoteReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('facility_id, stars, clean, fee, hot_water, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data ?? [];
}

export interface SubmitReportInput {
  facilityId: string;
  stars: number;
  clean: Cleanliness;
  fee: 'free' | 'paid';
  hotWater?: boolean;
  deviceId: string;
}

export async function submitReport(input: SubmitReportInput): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    facility_id: input.facilityId,
    stars: input.stars,
    clean: input.clean,
    fee: input.fee,
    hot_water: input.hotWater ?? null,
    device_id: input.deviceId,
  });
  if (error) throw error;
}
