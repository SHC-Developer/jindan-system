/**
 * 한국 공휴일 (holidays-kr 연도별 JSON 기반).
 * CDN: https://raw.githubusercontent.com/hyunbinseo/holidays-kr/main/public/YYYY.json
 * 형식: { "YYYY-MM-DD": ["휴일명"], ... }
 */

const CDN_BASE =
  'https://raw.githubusercontent.com/hyunbinseo/holidays-kr/main/public';

const cache = new Map<number, Set<string>>();

function parseYearJson(data: Record<string, unknown>): Set<string> {
  const set = new Set<string>();
  for (const key of Object.keys(data)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      set.add(key);
    }
  }
  return set;
}

/** 연도별 공휴일 dateKey 집합 조회 (캐시). */
export async function getHolidayDateKeys(year: number): Promise<Set<string>> {
  const cached = cache.get(year);
  if (cached) return cached;

  const url = `${CDN_BASE}/${year}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    cache.set(year, new Set());
    return new Set();
  }
  const data = (await res.json()) as Record<string, unknown>;
  const set = parseYearJson(data);
  cache.set(year, set);
  return set;
}

/** 해당 dateKey가 공휴일인지 (캐시된 연도 데이터 사용). */
export async function isHolidaySeoulAsync(dateKey: string): Promise<boolean> {
  const year = parseInt(dateKey.slice(0, 4), 10);
  const set = await getHolidayDateKeys(year);
  return set.has(dateKey);
}

/** 동기 판단용: 현재 캐시에 있는 연도만 확인. 캐시 없으면 false. */
const syncCache = new Map<string, boolean>();

export function isHolidaySeoul(dateKey: string): boolean {
  const cached = syncCache.get(dateKey);
  if (cached !== undefined) return cached;
  const year = parseInt(dateKey.slice(0, 4), 10);
  const set = cache.get(year);
  const result = set ? set.has(dateKey) : false;
  syncCache.set(dateKey, result);
  return result;
}

/** 연도 데이터를 미리 로드해 두면 isHolidaySeoul 동기 사용 가능. */
export function preloadHolidaysYear(year: number): Promise<Set<string>> {
  syncCache.clear();
  return getHolidayDateKeys(year);
}

/** 캘린더용: 여러 연도 로드 후 동기 isHolidaySeoul 사용. */
export async function preloadHolidaysYears(years: number[]): Promise<void> {
  await Promise.all(years.map((y) => getHolidayDateKeys(y)));
  syncCache.clear();
}
