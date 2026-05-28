import { describe, expect, it } from "vitest";
import { findFastTransferInfo } from "@shared/fastTransfer";
import type { OfficialFastTransferRecord } from "@shared/fastTransfer";

describe("findFastTransferInfo", () => {
  const records: OfficialFastTransferRecord[] = [
    {
      stationName: "사당",
      fromLineId: "2",
      fromTerminusName: "교대(법원.검찰청)",
      toLineId: "4",
      nextStationName: "남태령",
      toTerminusName: "남태령",
      car: 5,
      door: 3,
    },
    {
      stationName: "사당",
      fromLineId: "2",
      fromTerminusName: "대림(구로구청)",
      toLineId: "4",
      nextStationName: "남태령",
      toTerminusName: "남태령",
      car: 6,
      door: 1,
    },
    {
      stationName: "총신대입구(이수)",
      fromLineId: "7",
      fromTerminusName: "장암",
      toLineId: "4",
      nextStationName: "사당",
      toTerminusName: "남태령",
      car: 2,
      door: 2,
    },
  ];

  it("uses route station candidates to distinguish circular line directions", () => {
    expect(
      findFastTransferInfo(records, {
        stationName: "사당",
        fromLineId: "2",
        toLineId: "4",
        fromDirectionNames: ["강남", "교대", "서초", "방배", "사당"],
        toDirectionNames: ["남태령"],
        nextStationName: "남태령",
      }),
    ).toMatchObject({ car: 5, door: 3, source: "molit" });

    expect(
      findFastTransferInfo(records, {
        stationName: "사당",
        fromLineId: "2-seongsu",
        toLineId: "4",
        fromDirectionNames: ["신도림", "대림", "구로디지털단지", "사당"],
        toDirectionNames: ["남태령"],
        nextStationName: "남태령",
      }),
    ).toMatchObject({ car: 6, door: 1, source: "molit" });
  });

  it("matches official parenthetical station names against app station aliases", () => {
    expect(
      findFastTransferInfo(records, {
        stationName: "이수",
        fromLineId: "7",
        toLineId: "4",
        fromDirectionNames: ["장암"],
        toDirectionNames: ["사당", "남태령"],
        nextStationName: "사당",
      }),
    ).toMatchObject({ car: 2, door: 2, source: "molit" });
  });
});
