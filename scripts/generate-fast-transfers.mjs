import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceFileName = "국토교통부_철도역 빠른 환승 정보_20250923.csv";
const outputPath = path.join(rootDir, "client/src/data/officialFastTransfers.ts");
const metroDataPath = path.join(rootDir, "client/src/data/metroData.json");

const lineNameToId = new Map([
  ["1호선", "1"],
  ["2호선", "2"],
  ["3호선", "3"],
  ["4호선", "4"],
  ["5호선", "5"],
  ["6호선", "6"],
  ["7호선", "7"],
  ["8호선", "8"],
  ["9호선", "9"],
  ["경의중앙", "gyeongui"],
  ["경춘", "gyeongchun"],
  ["공항철도", "airport"],
  ["수인분당", "suinbundang"],
  ["신분당선", "shinbundang"],
  ["우이신설", "ui"],
  ["인천1호선", "incheon1"],
  ["인천2호선", "incheon2"],
  ["김포골드라인", "gimpo"],
  ["서해선", "seohaeline"],
  ["신림선", "sinlim"],
]);

function findSourceFile() {
  const argPath = process.argv[2];
  if (argPath) return path.resolve(rootDir, argPath);

  const sourceFile = fs
    .readdirSync(rootDir)
    .find(fileName => fileName.normalize("NFC") === sourceFileName);

  if (!sourceFile) {
    throw new Error(`${sourceFileName} 파일을 프로젝트 루트에서 찾을 수 없습니다.`);
  }

  return path.join(rootDir, sourceFile);
}

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

function normalizeStationName(value) {
  return value
    .normalize("NFC")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function compactRecord(record) {
  const compacted = {
    stationName: record.stationName,
    fromLineId: record.fromLineId,
  };

  if (record.fromTerminusName) compacted.fromTerminusName = record.fromTerminusName;
  compacted.toLineId = record.toLineId;
  if (record.nextStationName) compacted.nextStationName = record.nextStationName;
  if (record.toTerminusName) compacted.toTerminusName = record.toTerminusName;
  compacted.car = record.car;
  compacted.door = record.door;

  return compacted;
}

const sourcePath = findSourceFile();
const csvText = execFileSync("iconv", ["-f", "cp949", "-t", "utf-8", sourcePath], {
  encoding: "utf8",
});
const metroData = JSON.parse(fs.readFileSync(metroDataPath, "utf8"));
const supportedStations = new Set(
  metroData.stations.map(station => normalizeStationName(station.name)),
);

const [headerLine, ...rows] = csvText.trim().split(/\r?\n/);
const headers = parseCsvLine(headerLine);
const indexByHeader = new Map(headers.map((header, index) => [header, index]));
const records = [];
const seen = new Set();

for (const row of rows) {
  const columns = parseCsvLine(row);
  const fromLineId = lineNameToId.get(columns[indexByHeader.get("노선명")] ?? "");
  const toLineId = lineNameToId.get(columns[indexByHeader.get("환승선")] ?? "");
  const stationName = columns[indexByHeader.get("역명")]?.trim();
  const car = Number(columns[indexByHeader.get("차량순서")]);
  const door = Number(columns[indexByHeader.get("차량출입문번호")]);

  if (!fromLineId || !toLineId || !stationName || !Number.isFinite(car) || !Number.isFinite(door)) {
    continue;
  }

  if (!supportedStations.has(normalizeStationName(stationName))) continue;

  const record = compactRecord({
    stationName,
    fromLineId,
    fromTerminusName: columns[indexByHeader.get("종착역명")]?.trim(),
    toLineId,
    nextStationName: columns[indexByHeader.get("환승이후역명")]?.trim(),
    toTerminusName: columns[indexByHeader.get("환승기점역명")]?.trim(),
    car,
    door,
  });
  const key = JSON.stringify(record);

  if (seen.has(key)) continue;
  seen.add(key);
  records.push(record);
}

records.sort((left, right) => {
  const stationCompare = left.stationName.localeCompare(right.stationName, "ko");
  if (stationCompare !== 0) return stationCompare;
  const fromCompare = left.fromLineId.localeCompare(right.fromLineId);
  if (fromCompare !== 0) return fromCompare;
  const toCompare = left.toLineId.localeCompare(right.toLineId);
  if (toCompare !== 0) return toCompare;
  return `${left.fromTerminusName ?? ""}|${left.nextStationName ?? ""}|${left.toTerminusName ?? ""}`
    .localeCompare(`${right.fromTerminusName ?? ""}|${right.nextStationName ?? ""}|${right.toTerminusName ?? ""}`, "ko");
});

const output = `/**
 * Generated from \`${sourceFileName}\`.
 * Source encoding: CP949, data date: 2025-09-23.
 * Run \`node scripts/generate-fast-transfers.mjs\` after replacing the CSV.
 */
import type { OfficialFastTransferRecord } from "@shared/fastTransfer";

export const OFFICIAL_FAST_TRANSFERS = ${JSON.stringify(records, null, 2)} as const satisfies readonly OfficialFastTransferRecord[];
`;

fs.writeFileSync(outputPath, output);
console.log(`Wrote ${records.length} fast-transfer records to ${path.relative(rootDir, outputPath)}`);
