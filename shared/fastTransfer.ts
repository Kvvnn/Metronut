export type FastTransferStatus = "available";

export interface FastTransferInfo {
  car: number;
  door: number;
  label: string;
  status: FastTransferStatus;
  source: "molit";
}

export interface OfficialFastTransferRecord {
  stationName: string;
  fromLineId: string;
  fromTerminusName?: string;
  toLineId: string;
  nextStationName?: string;
  toTerminusName?: string;
  car: number;
  door: number;
}

export interface FastTransferLookupInput {
  stationName: string;
  fromLineId: string;
  toLineId: string;
  fromDirection?: string;
  toDirection?: string;
  fromDirectionNames?: readonly string[];
  toDirectionNames?: readonly string[];
  nextStationName?: string;
}

const LINE_ID_ALIASES: Record<string, string> = {
  "2-seongsu": "2",
  "2-sinjeong": "2",
};

const NAME_ALIASES: Record<string, readonly string[]> = {
  "총신대입구": ["이수"],
  "이수": ["총신대입구"],
  "불암산": ["당고개"],
  "당고개": ["불암산"],
};

export function getBaseTransferLineId(lineId: string) {
  return LINE_ID_ALIASES[lineId] ?? lineId;
}

function normalizeFastTransferName(value: string | undefined) {
  return (value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, "")
    .replace(/[·.]/g, "")
    .replace(/방면|행|순환/g, "")
    .trim();
}

export function getFastTransferNameAlternatives(value: string | undefined) {
  const source = value ?? "";
  const alternatives = new Set<string>();

  const add = (candidate: string | undefined) => {
    const normalized = normalizeFastTransferName(candidate);
    if (!normalized) return;
    alternatives.add(normalized);
    NAME_ALIASES[normalized]?.forEach(alias => alternatives.add(alias));
  };

  add(source);
  add(source.replace(/\([^)]*\)/g, ""));

  const parentheticalRegex = /\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = parentheticalRegex.exec(source))) {
    match[1]
      .split(/[\/,]/)
      .map((part: string) => part.trim())
      .forEach(add);
  }

  return Array.from(alternatives);
}

function namesMatch(left: string | undefined, right: string | undefined) {
  const leftNames = getFastTransferNameAlternatives(left);
  const rightNames = new Set(getFastTransferNameAlternatives(right));
  return leftNames.some(name => rightNames.has(name));
}

function directionCandidates(
  primary: string | undefined,
  names: readonly string[] | undefined,
) {
  return [primary, ...(names ?? [])].filter((name): name is string => Boolean(name));
}

function getDirectionScore(
  candidates: readonly string[],
  officialName: string | undefined,
  exactScore: number,
) {
  if (!officialName || candidates.length === 0) return 0;

  const officialNames = getFastTransferNameAlternatives(officialName);
  if (officialNames.length === 0) return 0;

  for (const candidate of candidates) {
    const candidateNames = getFastTransferNameAlternatives(candidate);
    if (candidateNames.some(name => officialNames.includes(name))) return exactScore;
  }

  for (const candidate of candidates) {
    const candidateNames = getFastTransferNameAlternatives(candidate);
    if (
      candidateNames.some(candidateName =>
        officialNames.some(officialName =>
          candidateName.includes(officialName) || officialName.includes(candidateName),
        ),
      )
    ) {
      return Math.max(1, exactScore - 2);
    }
  }

  return 0;
}

function toFastTransferInfo(record: OfficialFastTransferRecord): FastTransferInfo {
  return {
    car: record.car,
    door: record.door,
    label: `${record.car}번칸 ${record.door}번째 문`,
    status: "available",
    source: "molit",
  };
}

export function findFastTransferInfo(
  records: readonly OfficialFastTransferRecord[],
  input: FastTransferLookupInput,
): FastTransferInfo | null {
  const fromLineId = getBaseTransferLineId(input.fromLineId);
  const toLineId = getBaseTransferLineId(input.toLineId);
  const fromDirectionNames = directionCandidates(input.fromDirection, input.fromDirectionNames);
  const toDirectionNames = directionCandidates(input.toDirection, input.toDirectionNames);

  let bestRecord: OfficialFastTransferRecord | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestIndex = -1;

  records.forEach((record, index) => {
    if (getBaseTransferLineId(record.fromLineId) !== fromLineId) return;
    if (getBaseTransferLineId(record.toLineId) !== toLineId) return;
    if (!namesMatch(input.stationName, record.stationName)) return;

    let score = 20;
    if (input.nextStationName && record.nextStationName) {
      score += namesMatch(input.nextStationName, record.nextStationName) ? 8 : -3;
    }

    score += getDirectionScore(fromDirectionNames, record.fromTerminusName, 6);
    score += getDirectionScore(toDirectionNames, record.toTerminusName, 6);
    score += getDirectionScore(toDirectionNames, record.nextStationName, 3);

    if (record.fromTerminusName) score += 0.1;
    if (record.toTerminusName) score += 0.1;
    if (record.nextStationName) score += 0.1;

    if (!bestRecord || score > bestScore || (score === bestScore && index < bestIndex)) {
      bestRecord = record;
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestRecord ? toFastTransferInfo(bestRecord) : null;
}

export function formatFastTransferInfo(info: FastTransferInfo) {
  return info.label || `${info.car}번칸 ${info.door}번째 문`;
}
