// 서울교통공사 역별 열차시간표 CSV → serviceSchedule.json (1~9호선 실측 반영).
//
// CSV: 역별 도착/출발 시각(24:xx/25:xx = 자정 이후, 00:00 = 누락 placeholder), 요일(1평일/2토/3일·공휴일),
//      급행 G/D, 기점/종점역. 1~9호선만 포함(코레일/민자 노선은 미포함 → 기존 근사 유지).
//
// 추출:
//  - 패턴 = (기점index, 종점index) 그룹. 4대 이상이면 first/last/headway, 미만이면 trips.
//  - 방향 = 우리 metroData index로 판정(down=종점>기점). 2호선 순환은 stop 시퀀스로 내/외선 판정.
//  - minPerStation = 인접역 실측 주행시간의 중앙값.
//  - 종점이 우리 데이터 밖(신규 연장역)이면 열차 경로상 마지막으로 매핑되는 역으로 클램프.
//
// 사용: node scripts/generate-service-schedule.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CSV = path.join(ROOT, "서울교통공사_역코드로 지하철 열차 시간표 검색.csv");
const OUT = path.join(ROOT, "shared/metro/data/serviceSchedule.json");

const metro = JSON.parse(fs.readFileSync(path.join(ROOT, "shared/metro/data/metroData.json"), "utf8"));
const existing = JSON.parse(fs.readFileSync(OUT, "utf8"));

// 노선별 역명→index, index→역명
const idxByName = {};
const nameByIdx = {};
for (const s of metro.stations) {
  (idxByName[s.lineId] ??= {})[s.name] = s.index;
  (nameByIdx[s.lineId] ??= {})[s.index] = s.name;
}
// 노선별 인접 그래프(엣지 양방향) — BFS 경로 길이 검증용
const adj = {};
for (const e of metro.edges) {
  (adj[e.lineId] ??= new Map()).set(e.from, [...((adj[e.lineId].get(e.from)) ?? []), e.to]);
}
// 노선별 "인접 index 쌍" 집합 — 실측 역간 주행시간(minPerStation) 계산용
const adjIdxPairs = {};
for (const e of metro.edges) {
  const a = metro.stations.find((s) => s.id === e.from);
  const b = metro.stations.find((s) => s.id === e.to);
  if (a && b && a.lineId === b.lineId) {
    (adjIdxPairs[a.lineId] ??= new Set()).add(`${a.index}|${b.index}`);
  }
}
const isAdjIdx = (ln, i, j) => adjIdxPairs[ln]?.has(`${i}|${j}`) || adjIdxPairs[ln]?.has(`${j}|${i}`);

// 개명 별칭 (CSV명 → 우리 metroData명). 불암산=옛 당고개(4호선), 자양=뚝섬유원지(7호선).
const ALIAS = { 불암산: "당고개", 자양: "뚝섬유원지" };
const mapName = (ln, n) => idxByName[ln]?.[ALIAS[n] ?? n];

// CSV 파싱 (간단 파서 — 따옴표 없는 단순 CSV)
const raw = fs.readFileSync(CSV, "utf8").replace(/^﻿/, "");
const lines = raw.split(/\r?\n/);
const header = lines[0].split(",");
const col = Object.fromEntries(header.map((h, i) => [h, i]));
const C = {
  line: col["호선"], stcd: col["전철역코드"], stnm: col["전철역명"], trainNo: col["열차번호"],
  arv: col["도착시간"], dep: col["출발시간"], ostcd: col["출발지하철역코드"],
  tstcd: col["도착지하철역코드"], onm: col["출발지하철역명"], tnm: col["도착지하철역명"],
  day: col["요일"], updn: col["상/하행선"],
};

// 한 트립의 고유 키: 열차번호 + 기점코드 + 종점코드.
// (같은 열차번호가 하루에 석남행·장암행 등 여러 트립을 돌므로 번호만으로 묶으면 왕복 시퀀스가 됨)
const tripKey = (f) => `${f[C.trainNo]}|${f[C.ostcd]}|${f[C.tstcd]}`;

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const f = lines[i].split(",");
  if (f.length < header.length) continue;
  if (f[C.line] === "route" || !f[C.line]) continue;
  rows.push(f);
}

const lineId = (f) => String(parseInt(f[C.line], 10));
const toMin = (t) => {
  if (!t || t === "00:00:00") return null; // placeholder
  const [h, m, s] = t.split(":").map(Number);
  return h * 60 + m + (s || 0) / 60;
};
const median = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  return n === 0 ? null : n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
};
const round1 = (x) => Math.round(x * 10) / 10;
const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;

// 노선별 minPerStation: 그래프상 인접한 두 정차역 간 실측 주행시간 중앙값.
// (급행 등 통과 구간·분기 index 점프는 제외하고 실제 한 정거장 구간만 사용)
function computeMinPerStation(ln) {
  const byTrain = new Map();
  for (const f of rows) {
    if (lineId(f) !== ln || f[C.day] !== "1") continue;
    const key = tripKey(f);
    (byTrain.get(key) ?? byTrain.set(key, []).get(key)).push(f);
  }
  const hops = [];
  for (const stops of byTrain.values()) {
    const seq = stops
      .map((f) => ({ idx: mapName(ln, f[C.stnm]), arv: toMin(f[C.arv]), dep: toMin(f[C.dep]) }))
      .filter((s) => s.idx != null)
      .sort((a, b) => (a.dep ?? a.arv ?? 0) - (b.dep ?? b.arv ?? 0));
    for (let i = 0; i < seq.length - 1; i++) {
      // 출발→출발 간격(주행+정차) — 엔진의 offset 보간과 동일한 의미
      const t0 = seq[i].dep;
      const t1 = seq[i + 1].dep;
      if (t0 != null && t1 != null && t1 - t0 > 0 && t1 - t0 < 8 && isAdjIdx(ln, seq[i].idx, seq[i + 1].idx)) {
        hops.push(t1 - t0);
      }
    }
  }
  const m = median(hops);
  return m ? round1(m) : (existing.lines[ln]?.minPerStation ?? 2.5);
}

const idOf = {}; // ln → (name → id)
const indexOfId = {}; // id → index
for (const s of metro.stations) {
  (idOf[s.lineId] ??= {})[s.name] = s.id;
  indexOfId[s.id] = s.index;
}

// BFS 최단 경로(역 id 배열). 경로 없으면 null.
function bfsPath(ln, fromName, toName) {
  const graph = adj[ln];
  if (!graph) return null;
  const from = idOf[ln]?.[ALIAS[fromName] ?? fromName];
  const to = idOf[ln]?.[ALIAS[toName] ?? toName];
  if (!from || !to) return null;
  if (from === to) return [from];
  const prev = new Map([[from, null]]);
  let frontier = [from];
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      for (const nb of graph.get(id) ?? []) {
        if (!prev.has(nb)) {
          prev.set(nb, id);
          if (nb === to) {
            const path = [];
            for (let cur = nb; cur != null; cur = prev.get(cur)) path.push(cur);
            return path.reverse();
          }
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  return null;
}
function bfsLen(ln, fromName, toName) {
  const p = bfsPath(ln, fromName, toName);
  return p ? p.length - 1 : null;
}
// 패턴이 덮는 index 집합 (기점→종점 BFS 경로 위의 역들)
function coverageIndices(ln, oiName, tiName) {
  const path = bfsPath(ln, oiName, tiName);
  return path ? new Set(path.map((id) => indexOfId[id])) : new Set();
}
const isSuperset = (a, b) => {
  for (const x of b) if (!a.has(x)) return false;
  return true;
};
const nameByIdxOf = (ln, idx) => nameByIdx[ln][idx];

const DAY = { weekday: "1", weekend: "3" }; // 평일 / 일요일·공휴일

// 한 (line, day)의 열차별 기점 출발시각 + 실제 stop 시퀀스
function trainsFor(ln, dayCode) {
  const byTrain = new Map();
  for (const f of rows) {
    if (lineId(f) !== ln || f[C.day] !== dayCode) continue;
    const key = tripKey(f);
    (byTrain.get(key) ?? byTrain.set(key, []).get(key)).push(f);
  }
  const trains = [];
  for (const stops of byTrain.values()) {
    // 매핑되는 정차역만, 시간순 정렬
    const seq = stops
      .map((f) => ({ name: f[C.stnm], idx: mapName(ln, f[C.stnm]), dep: toMin(f[C.dep]), arv: toMin(f[C.arv]), updn: f[C.updn] }))
      .filter((s) => s.idx != null && (s.dep != null || s.arv != null))
      .sort((a, b) => (a.dep ?? a.arv) - (b.dep ?? b.arv));
    if (seq.length < 2) continue;
    const origin = seq[0], terminus = seq[seq.length - 1];
    const originDep = origin.dep ?? origin.arv;
    trains.push({ origin, terminus, originDep, updn: origin.updn, seq });
  }
  return trains;
}

function buildLinePatterns(ln, loopLength) {
  const minPerStation = computeMinPerStation(ln);
  const dayPatterns = { weekday: {}, weekend: {} };

  for (const [dayKey, dayCode] of Object.entries(DAY)) {
    const trains = trainsFor(ln, dayCode);
    // 그룹 키: 순환이면 (방향, 'loop' 또는 종점), 아니면 (기점idx, 종점idx)
    const groups = new Map();
    for (const t of trains) {
      const oi = t.origin.idx, ti = t.terminus.idx;
      let circular = false, direction, key;
      if (loopLength != null && oi === ti) {
        // 본선 풀루프 (기점==종점): 내/외선 = updn
        circular = true;
        direction = t.updn === "1" ? "down" : "up"; // updn 1 = 내선(index 증가)
        key = `loop:${direction}`;
      } else {
        // 선형 패턴(지선·단축회차 포함). BFS 경로 길이가 실제 정차수와 맞을 때만 채택
        const realLen = bfsLen(ln, t.origin.name, t.terminus.name);
        if (realLen == null || realLen !== t.seq.length - 1) continue;
        direction = ti > oi ? "down" : "up";
        key = `${oi}>${ti}`;
      }
      const g = groups.get(key) ?? { oi, ti, circular, direction, deps: [] };
      g.deps.push(t.originDep);
      groups.set(key, g);
    }

    const pats = [];
    for (const [, g] of groups) {
      g.deps.sort((a, b) => a - b);
      const gaps = [];
      for (let i = 0; i < g.deps.length - 1; i++) {
        const d = g.deps[i + 1] - g.deps[i];
        if (d > 0 && d < 30) gaps.push(d);
      }
      const hw = median(gaps);
      const termName = g.circular ? (g.direction === "down" ? "내선순환" : "외선순환") : nameByIdx[ln][g.ti];
      const label = g.circular ? termName : `${termName}행`;
      const sched =
        g.deps.length >= 4 && hw
          ? { first: fmt(g.deps[0]), last: fmt(g.deps[g.deps.length - 1]), headwayMin: round1(hw) }
          : { trips: g.deps.map(fmt) };
      pats.push({
        oi: g.oi, ti: g.ti, circular: g.circular, direction: g.direction, label,
        count: g.deps.length, sched,
      });
    }
    dayPatterns[dayKey] = pats;
  }

  // weekday/weekend 패턴을 동일 (oi,ti,circular,direction) 키로 병합
  const merged = new Map();
  for (const [dayKey, pats] of Object.entries(dayPatterns)) {
    for (const p of pats) {
      const key = `${p.circular ? "C" : "L"}:${p.oi}>${p.ti}:${p.direction}`;
      const m = merged.get(key) ?? {
        id: "", label: p.label, direction: p.direction,
        originIndex: p.oi, terminusIndex: p.ti,
        ...(p.circular ? { circular: true } : {}),
        weekday: { trips: [] }, weekend: { trips: [] },
        _count: 0,
      };
      m[dayKey] = p.sched;
      m._count += p.count;
      merged.set(key, m);
    }
  }

  // 노이즈(양 요일 합쳐 2대 미만) 제거 + 커버리지/시각창 메타 부착
  const tw = (sched) => {
    const ts = sched.trips ?? [sched.first, sched.last].filter(Boolean);
    const mins = ts.map((t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; });
    return mins.length ? [Math.min(...mins), Math.max(...mins)] : null;
  };
  const cands = [];
  for (const m of merged.values()) {
    if (m._count < 2) continue;
    const cov = m.circular
      ? new Set(Array.from({ length: loopLength }, (_, i) => i))
      : coverageIndices(ln, nameByIdxOf(ln, m.originIndex), nameByIdxOf(ln, m.terminusIndex));
    const wins = [tw(m.weekday), tw(m.weekend)].filter(Boolean);
    const win = wins.length ? [Math.min(...wins.map((w) => w[0])), Math.max(...wins.map((w) => w[1]))] : [0, 0];
    cands.push({ m, cov, win });
  }

  // 포함관계 가지치기: 같은 방향·circular에서 커버리지·시각창을 모두 포함하는 더 큰 패턴이
  // 있으면 작은 패턴은 중복(첫차/막차/대기 계산에 영향 없음)이라 제거. 큰 것부터 유지.
  cands.sort((a, b) => b.cov.size - a.cov.size || b.m._count - a.m._count);
  const kept = [];
  for (const c of cands) {
    const redundant = kept.some(
      (k) =>
        k.m.direction === c.m.direction &&
        Boolean(k.m.circular) === Boolean(c.m.circular) &&
        isSuperset(k.cov, c.cov) &&
        k.win[0] <= c.win[0] + 1e-9 &&
        k.win[1] >= c.win[1] - 1e-9,
    );
    if (!redundant) kept.push(c);
  }

  // id 부여(운행량 많은 순)
  kept.sort((a, b) => b.m._count - a.m._count);
  const out = [];
  let n = 0;
  for (const { m } of kept) {
    const { _count, ...clean } = m;
    clean.id = `${ln}-${m.direction === "down" ? "d" : "u"}-${n++}`;
    out.push(clean);
  }
  return { minPerStation, patterns: out };
}

// ── 생성 ──────────────────────────────────────────────────────────────────
const LINE_LOOP = { "2": 43 }; // 순환선 본선 역 수
const out = {
  _note: existing._note,
  _disclaimer:
    "1~9호선은 서울교통공사 역별 열차시간표(요일 1평일/3일·공휴일) 실측 기반 자동 생성. " +
    "패턴별 실제 첫차/막차/배차와 실측 minPerStation, 심야 단축운행(단발 trips) 포함. " +
    "코레일/민자 노선(경의중앙·공항·신분당·경춘·수인분당·우이신설·인천1/2·김포·서해·신림·GTX-A)은 " +
    "공식 시간표 미수집분으로 기존 근사치 유지. 급행은 별도 가상노선으로 모델링. 정확한 시각은 현장 안내를 따른다.",
  _sources: [
    "서울교통공사_역코드로 지하철 열차 시간표 검색.csv (1~9호선 역별 실측)",
    "코레일/민자 노선: shared/metro/data/firstLastTrain.json baseline + 공개 배차 근사",
  ],
  lines: {},
};

const CSV_LINES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
for (const ln of CSV_LINES) {
  const { minPerStation, patterns } = buildLinePatterns(ln, LINE_LOOP[ln]);
  out.lines[ln] = {
    name: existing.lines[ln]?.name ?? `${ln}호선`,
    minPerStation,
    ...(LINE_LOOP[ln] ? { circular: false, loopLength: LINE_LOOP[ln] } : {}),
    patterns,
  };
  console.log(`노선 ${ln}: minPerStation=${minPerStation}, 패턴 ${patterns.length}개`);
}

// CSV에 없는 노선(2호선 지선 포함)은 기존 데이터 유지
for (const [k, v] of Object.entries(existing.lines)) {
  if (!out.lines[k]) out.lines[k] = v;
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`\n총 노선: ${Object.keys(out.lines).length}, 저장: ${path.relative(ROOT, OUT)}`);
