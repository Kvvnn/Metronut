/**
 * Generated from `국토교통부_철도역 빠른 환승 정보_20250923.csv`.
 * Source encoding: CP949, data date: 2025-09-23.
 * Run `node scripts/generate-fast-transfers.mjs` after replacing the CSV.
 */
import type { OfficialFastTransferRecord } from "@shared/fastTransfer";

export const OFFICIAL_FAST_TRANSFERS = [
  {
    "stationName": "가락시장",
    "fromLineId": "3",
    "toLineId": "8",
    "nextStationName": "문정",
    "toTerminusName": "모란",
    "car": 9,
    "door": 4
  },
  {
    "stationName": "가락시장",
    "fromLineId": "3",
    "toLineId": "8",
    "nextStationName": "송파",
    "toTerminusName": "암사",
    "car": 9,
    "door": 4
  },
  {
    "stationName": "가락시장",
    "fromLineId": "3",
    "fromTerminusName": "오금",
    "toLineId": "8",
    "nextStationName": "문정",
    "toTerminusName": "모란",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "가락시장",
    "fromLineId": "3",
    "fromTerminusName": "오금",
    "toLineId": "8",
    "nextStationName": "송파",
    "toTerminusName": "암사",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "가락시장",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "3",
    "nextStationName": "경찰병원",
    "toTerminusName": "오금",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "가락시장",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "3",
    "nextStationName": "수서",
    "toTerminusName": "구파발",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "가락시장",
    "fromLineId": "8",
    "fromTerminusName": "암사",
    "toLineId": "3",
    "nextStationName": "경찰병원",
    "toTerminusName": "오금",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "가락시장",
    "fromLineId": "8",
    "fromTerminusName": "암사",
    "toLineId": "3",
    "nextStationName": "수서",
    "toTerminusName": "구파발",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "가산디지털단지",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "7",
    "nextStationName": "남구로",
    "toTerminusName": "장암",
    "car": 10,
    "door": 3
  },
  {
    "stationName": "가산디지털단지",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "7",
    "nextStationName": "철산",
    "car": 10,
    "door": 3
  },
  {
    "stationName": "가산디지털단지",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "7",
    "nextStationName": "남구로",
    "toTerminusName": "장암",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "가산디지털단지",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "7",
    "nextStationName": "철산",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "가산디지털단지",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "1",
    "nextStationName": "구로",
    "toTerminusName": "소요산",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "가산디지털단지",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "1",
    "nextStationName": "독산",
    "toTerminusName": "신창(순천향대)",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "가산디지털단지",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "1",
    "nextStationName": "구로",
    "toTerminusName": "소요산",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "가산디지털단지",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "1",
    "nextStationName": "독산",
    "toTerminusName": "신창(순천향대)",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "강남",
    "fromLineId": "2",
    "fromTerminusName": "교대(법원.검찰청)",
    "toLineId": "shinbundang",
    "nextStationName": "양재(서초구청)",
    "toTerminusName": "광교(경기대)",
    "car": 6,
    "door": 3
  },
  {
    "stationName": "강남",
    "fromLineId": "2",
    "fromTerminusName": "선릉",
    "toLineId": "shinbundang",
    "nextStationName": "양재(서초구청)",
    "toTerminusName": "광교(경기대)",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "강남",
    "fromLineId": "shinbundang",
    "fromTerminusName": "강남",
    "toLineId": "2",
    "nextStationName": "교대(법원.검찰청)",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "강남",
    "fromLineId": "shinbundang",
    "fromTerminusName": "강남",
    "toLineId": "2",
    "nextStationName": "역삼",
    "toTerminusName": "시청",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "강남구청",
    "fromLineId": "7",
    "toLineId": "suinbundang",
    "nextStationName": "선정릉(한국과학창의재단)",
    "toTerminusName": "수원",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "강남구청",
    "fromLineId": "7",
    "toLineId": "suinbundang",
    "nextStationName": "압구정로데오",
    "toTerminusName": "왕십리",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "강남구청",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "suinbundang",
    "nextStationName": "선정릉(한국과학창의재단)",
    "toTerminusName": "수원",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "강남구청",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "suinbundang",
    "nextStationName": "압구정로데오",
    "toTerminusName": "왕십리",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "강남구청",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "7",
    "nextStationName": "청담",
    "toTerminusName": "장암",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "강남구청",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "7",
    "nextStationName": "학동",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "강남구청",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "7",
    "nextStationName": "청담",
    "toTerminusName": "장암",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "강남구청",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "7",
    "nextStationName": "학동",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "건대입구",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "7",
    "nextStationName": "어린이대공원(세종대)",
    "toTerminusName": "장암",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "건대입구",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "7",
    "nextStationName": "자양(뚝섬한강공원)",
    "car": 8,
    "door": 3
  },
  {
    "stationName": "건대입구",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "7",
    "nextStationName": "어린이대공원(세종대)",
    "toTerminusName": "장암",
    "car": 3,
    "door": 2
  },
  {
    "stationName": "건대입구",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "7",
    "nextStationName": "자양(뚝섬한강공원)",
    "car": 3,
    "door": 2
  },
  {
    "stationName": "건대입구",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "2",
    "nextStationName": "구의(광진구청)",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "건대입구",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "2",
    "nextStationName": "성수",
    "toTerminusName": "시청",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "건대입구",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "2",
    "nextStationName": "구의(광진구청)",
    "toTerminusName": "충정로(경기대입구)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "건대입구",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "2",
    "nextStationName": "성수",
    "toTerminusName": "시청",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "검암",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "incheon2",
    "nextStationName": "검바위",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "검암",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "incheon2",
    "nextStationName": "독정",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "검암",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "incheon2",
    "nextStationName": "검바위",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "검암",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "incheon2",
    "nextStationName": "독정",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "검암",
    "fromLineId": "incheon2",
    "fromTerminusName": "검단오류",
    "toLineId": "airport",
    "nextStationName": "계양",
    "toTerminusName": "서울역",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "검암",
    "fromLineId": "incheon2",
    "fromTerminusName": "검단오류",
    "toLineId": "airport",
    "nextStationName": "청라국제도시",
    "toTerminusName": "인천공항1터미널",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "검암",
    "fromLineId": "incheon2",
    "fromTerminusName": "운연",
    "toLineId": "airport",
    "nextStationName": "계양",
    "toTerminusName": "서울역",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "검암",
    "fromLineId": "incheon2",
    "fromTerminusName": "운연",
    "toLineId": "airport",
    "nextStationName": "청라국제도시",
    "toTerminusName": "인천공항1터미널",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "계양",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "incheon1",
    "nextStationName": "계양",
    "toTerminusName": "국제업무지구",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "계양",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "incheon1",
    "nextStationName": "계양",
    "toTerminusName": "국제업무지구",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "계양",
    "fromLineId": "incheon1",
    "fromTerminusName": "계양",
    "toLineId": "airport",
    "nextStationName": "검암",
    "toTerminusName": "인천공항1터미널",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "계양",
    "fromLineId": "incheon1",
    "fromTerminusName": "계양",
    "toLineId": "airport",
    "nextStationName": "김포공항",
    "toTerminusName": "서울역",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "3",
    "toLineId": "7",
    "nextStationName": "내방",
    "car": 9,
    "door": 2
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "3",
    "toLineId": "7",
    "nextStationName": "반포",
    "toTerminusName": "장암",
    "car": 9,
    "door": 2
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "7",
    "nextStationName": "내방",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "7",
    "nextStationName": "반포",
    "toTerminusName": "장암",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "3",
    "toLineId": "9",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "9",
    "car": 9,
    "door": 2
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "3",
    "nextStationName": "교대(법원.검찰청)",
    "toTerminusName": "오금",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "3",
    "nextStationName": "잠원",
    "toTerminusName": "구파발",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "3",
    "nextStationName": "교대(법원.검찰청)",
    "toTerminusName": "오금",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "3",
    "nextStationName": "잠원",
    "toTerminusName": "구파발",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "9",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "9",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "9",
    "fromTerminusName": "개화",
    "toLineId": "3",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "9",
    "fromTerminusName": "종합운동장",
    "toLineId": "3",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "9",
    "fromTerminusName": "개화",
    "toLineId": "7",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "고속터미널",
    "fromLineId": "9",
    "fromTerminusName": "종합운동장",
    "toLineId": "7",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "6",
    "nextStationName": "대흥(서강대앞)",
    "toTerminusName": "응암",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "6",
    "nextStationName": "효창공원앞",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "6",
    "nextStationName": "대흥(서강대앞)",
    "toTerminusName": "응암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "6",
    "nextStationName": "효창공원앞",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "airport",
    "nextStationName": "서울역",
    "toTerminusName": "서울역",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "airport",
    "nextStationName": "홍대입구",
    "toTerminusName": "인천공항1터미널",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "airport",
    "nextStationName": "서울역",
    "toTerminusName": "서울역",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "airport",
    "nextStationName": "홍대입구",
    "toTerminusName": "인천공항1터미널",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "문산",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "문산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "5",
    "nextStationName": "마포",
    "toTerminusName": "방화",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "5",
    "nextStationName": "애오개",
    "toTerminusName": "마천",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "5",
    "nextStationName": "마포",
    "toTerminusName": "방화",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "5",
    "nextStationName": "애오개",
    "toTerminusName": "마천",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "airport",
    "nextStationName": "서울역",
    "toTerminusName": "서울역",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "airport",
    "nextStationName": "홍대입구",
    "toTerminusName": "인천공항1터미널",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "airport",
    "nextStationName": "서울역",
    "toTerminusName": "서울역",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "airport",
    "nextStationName": "홍대입구",
    "toTerminusName": "인천공항1터미널",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "문산",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "gyeongui",
    "nextStationName": "효창공원앞",
    "toTerminusName": "용산",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "문산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "gyeongui",
    "nextStationName": "효창공원앞",
    "toTerminusName": "용산",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "5",
    "nextStationName": "마포",
    "toTerminusName": "방화",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "5",
    "nextStationName": "애오개",
    "toTerminusName": "마천",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "5",
    "nextStationName": "마포",
    "toTerminusName": "방화",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "5",
    "nextStationName": "애오개",
    "toTerminusName": "마천",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "6",
    "nextStationName": "대흥(서강대앞)",
    "toTerminusName": "응암",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "6",
    "nextStationName": "효창공원앞",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "6",
    "nextStationName": "대흥(서강대앞)",
    "toTerminusName": "응암",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "6",
    "nextStationName": "효창공원앞",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "문산",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "문산",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "gyeongui",
    "nextStationName": "효창공원앞",
    "toTerminusName": "용산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "공덕",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "5",
    "nextStationName": "마포",
    "toTerminusName": "방화",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "5",
    "nextStationName": "애오개",
    "toTerminusName": "강동",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "5",
    "nextStationName": "마포",
    "toTerminusName": "방화",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "5",
    "nextStationName": "애오개",
    "toTerminusName": "강동",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "6",
    "nextStationName": "대흥(서강대앞)",
    "toTerminusName": "응암",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "공덕",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "6",
    "nextStationName": "효창공원앞",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "공덕",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "6",
    "nextStationName": "대흥(서강대앞)",
    "toTerminusName": "응암",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "공덕",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "6",
    "nextStationName": "효창공원앞",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 8,
    "door": 3
  },
  {
    "stationName": "광운대",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "gyeongchun",
    "nextStationName": "상봉",
    "toTerminusName": "청량리",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "광운대",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "gyeongchun",
    "nextStationName": "상봉",
    "toTerminusName": "춘천(한림대)",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "광운대",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "광운대",
    "toLineId": "1",
    "nextStationName": "석계",
    "toTerminusName": "신창(순천향대)",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "광운대",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "광운대",
    "toLineId": "1",
    "nextStationName": "월계",
    "toTerminusName": "소요산",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "교대(법원.검찰청)",
    "fromLineId": "2",
    "fromTerminusName": "강남",
    "toLineId": "3",
    "nextStationName": "고속터미널",
    "toTerminusName": "구파발",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "교대(법원.검찰청)",
    "fromLineId": "2",
    "fromTerminusName": "강남",
    "toLineId": "3",
    "nextStationName": "남부터미널(예술의전당)",
    "toTerminusName": "오금",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "교대(법원.검찰청)",
    "fromLineId": "2",
    "fromTerminusName": "사당",
    "toLineId": "3",
    "nextStationName": "고속터미널",
    "toTerminusName": "구파발",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "교대(법원.검찰청)",
    "fromLineId": "2",
    "fromTerminusName": "사당",
    "toLineId": "3",
    "nextStationName": "남부터미널(예술의전당)",
    "toTerminusName": "오금",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "교대(법원.검찰청)",
    "fromLineId": "3",
    "toLineId": "2",
    "nextStationName": "강남",
    "toTerminusName": "시청",
    "car": 9,
    "door": 3
  },
  {
    "stationName": "교대(법원.검찰청)",
    "fromLineId": "3",
    "toLineId": "2",
    "nextStationName": "서초",
    "toTerminusName": "충정로(경기대입구)",
    "car": 3,
    "door": 2
  },
  {
    "stationName": "교대(법원.검찰청)",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "2",
    "nextStationName": "강남",
    "toTerminusName": "시청",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "교대(법원.검찰청)",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "2",
    "nextStationName": "서초",
    "toTerminusName": "충정로(경기대입구)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "군자(능동)",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "7",
    "nextStationName": "어린이대공원(세종대)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "군자(능동)",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "7",
    "nextStationName": "중곡",
    "toTerminusName": "장암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "군자(능동)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "7",
    "nextStationName": "어린이대공원(세종대)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "군자(능동)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "7",
    "nextStationName": "중곡",
    "toTerminusName": "장암",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "군자(능동)",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "5",
    "nextStationName": "아차산(어린이대공원후문)",
    "toTerminusName": "마천",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "군자(능동)",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "5",
    "nextStationName": "장한평",
    "toTerminusName": "방화",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "군자(능동)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "5",
    "nextStationName": "아차산(어린이대공원후문)",
    "toTerminusName": "마천",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "군자(능동)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "5",
    "nextStationName": "장한평",
    "toTerminusName": "방화",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "금정",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "4",
    "toTerminusName": "남태령",
    "car": 0,
    "door": 0
  },
  {
    "stationName": "금정",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "4",
    "toTerminusName": "불암산(당고개)",
    "car": 9,
    "door": 2
  },
  {
    "stationName": "금정",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "4",
    "toTerminusName": "남태령",
    "car": 0,
    "door": 0
  },
  {
    "stationName": "금정",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "4",
    "toTerminusName": "불암산(당고개)",
    "car": 9,
    "door": 2
  },
  {
    "stationName": "금정",
    "fromLineId": "4",
    "toLineId": "1",
    "nextStationName": "군포",
    "toTerminusName": "신창(순천향대)",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "금정",
    "fromLineId": "4",
    "toLineId": "1",
    "nextStationName": "명학",
    "toTerminusName": "소요산",
    "car": 0,
    "door": 0
  },
  {
    "stationName": "금정",
    "fromLineId": "4",
    "fromTerminusName": "오이도",
    "toLineId": "1",
    "nextStationName": "군포",
    "toTerminusName": "신창(순천향대)",
    "car": 0,
    "door": 0
  },
  {
    "stationName": "금정",
    "fromLineId": "4",
    "fromTerminusName": "오이도",
    "toLineId": "1",
    "nextStationName": "명학",
    "toTerminusName": "소요산",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "김포공항",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "9",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "김포공항",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "9",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "김포공항",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "airport",
    "nextStationName": "계양",
    "toTerminusName": "인천공항1터미널",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "김포공항",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "airport",
    "nextStationName": "디지털미디어시티",
    "toTerminusName": "서울역",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "김포공항",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "airport",
    "nextStationName": "계양",
    "toTerminusName": "인천공항1터미널",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "김포공항",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "airport",
    "nextStationName": "디지털미디어시티",
    "toTerminusName": "서울역",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "김포공항",
    "fromLineId": "9",
    "fromTerminusName": "개화",
    "toLineId": "5",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "김포공항",
    "fromLineId": "9",
    "fromTerminusName": "종합운동장",
    "toLineId": "5",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "김포공항",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "5",
    "nextStationName": "개화산",
    "toTerminusName": "방화",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "김포공항",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "5",
    "nextStationName": "송정",
    "toTerminusName": "마천",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "김포공항",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "5",
    "nextStationName": "개화산",
    "toTerminusName": "방화",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "김포공항",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "5",
    "nextStationName": "송정",
    "toTerminusName": "마천",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "김포공항",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "9",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "김포공항",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "9",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "까치산",
    "fromLineId": "2",
    "fromTerminusName": "까치산",
    "toLineId": "5",
    "nextStationName": "신정(은행정)",
    "toTerminusName": "마천",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "까치산",
    "fromLineId": "2",
    "fromTerminusName": "까치산",
    "toLineId": "5",
    "nextStationName": "화곡",
    "toTerminusName": "방화",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "까치산",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "까치산",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "노량진",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "9",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "노량진",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "9",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "노량진",
    "fromLineId": "9",
    "fromTerminusName": "개화",
    "toLineId": "1",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "노량진",
    "fromLineId": "9",
    "fromTerminusName": "종합운동장",
    "toLineId": "1",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "노원",
    "fromLineId": "4",
    "toLineId": "7",
    "nextStationName": "마들",
    "toTerminusName": "장암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "노원",
    "fromLineId": "4",
    "toLineId": "7",
    "nextStationName": "중계",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "노원",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "7",
    "nextStationName": "마들",
    "toTerminusName": "장암",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "노원",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "7",
    "nextStationName": "중계",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "노원",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "4",
    "nextStationName": "상계",
    "toTerminusName": "불암산(당고개)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "노원",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "4",
    "nextStationName": "창동",
    "toTerminusName": "남태령",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "노원",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "4",
    "nextStationName": "상계",
    "toTerminusName": "불암산(당고개)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "노원",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "4",
    "nextStationName": "창동",
    "toTerminusName": "남태령",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "당산",
    "fromLineId": "2",
    "fromTerminusName": "영등포구청",
    "toLineId": "9",
    "nextStationName": "국회의사당",
    "toTerminusName": "중앙보훈병원",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "당산",
    "fromLineId": "2",
    "fromTerminusName": "영등포구청",
    "toLineId": "9",
    "nextStationName": "선유도",
    "toTerminusName": "개화",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "당산",
    "fromLineId": "2",
    "fromTerminusName": "합정",
    "toLineId": "9",
    "nextStationName": "국회의사당",
    "toTerminusName": "중앙보훈병원",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "당산",
    "fromLineId": "2",
    "fromTerminusName": "합정",
    "toLineId": "9",
    "nextStationName": "선유도",
    "toTerminusName": "개화",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "당산",
    "fromLineId": "9",
    "fromTerminusName": "개화",
    "toLineId": "2",
    "nextStationName": "영등포구청",
    "toTerminusName": "시청",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "당산",
    "fromLineId": "9",
    "fromTerminusName": "개화",
    "toLineId": "2",
    "nextStationName": "합정",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "당산",
    "fromLineId": "9",
    "fromTerminusName": "중앙보훈병원",
    "toLineId": "2",
    "nextStationName": "영등포구청",
    "toTerminusName": "시청",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "당산",
    "fromLineId": "9",
    "fromTerminusName": "중앙보훈병원",
    "toLineId": "2",
    "nextStationName": "합정",
    "toTerminusName": "충정로(경기대입구)",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "대곡",
    "fromLineId": "3",
    "toLineId": "gyeongui",
    "nextStationName": "곡산",
    "toTerminusName": "문산",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "대곡",
    "fromLineId": "3",
    "toLineId": "gyeongui",
    "nextStationName": "능곡",
    "toTerminusName": "용산",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "대곡",
    "fromLineId": "3",
    "fromTerminusName": "대화",
    "toLineId": "gyeongui",
    "nextStationName": "곡산",
    "toTerminusName": "문산",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "대곡",
    "fromLineId": "3",
    "fromTerminusName": "대화",
    "toLineId": "gyeongui",
    "nextStationName": "능곡",
    "toTerminusName": "용산",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "대곡",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "3",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "대곡",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "3",
    "toTerminusName": "오금",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "대곡",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "3",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "대곡",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "3",
    "toTerminusName": "오금",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "대림(구로구청)",
    "fromLineId": "2",
    "fromTerminusName": "사당",
    "toLineId": "7",
    "nextStationName": "남구로",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "대림(구로구청)",
    "fromLineId": "2",
    "fromTerminusName": "사당",
    "toLineId": "7",
    "nextStationName": "신풍",
    "toTerminusName": "장암",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "대림(구로구청)",
    "fromLineId": "2",
    "fromTerminusName": "신도림",
    "toLineId": "7",
    "nextStationName": "남구로",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "대림(구로구청)",
    "fromLineId": "2",
    "fromTerminusName": "신도림",
    "toLineId": "7",
    "nextStationName": "신풍",
    "toTerminusName": "장암",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "대림(구로구청)",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "2",
    "nextStationName": "구로디지털단지",
    "toTerminusName": "시청",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "대림(구로구청)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "2",
    "nextStationName": "신도림",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "도곡",
    "fromLineId": "3",
    "toLineId": "suinbundang",
    "nextStationName": "구룡",
    "toTerminusName": "수원",
    "car": 6,
    "door": 3
  },
  {
    "stationName": "도곡",
    "fromLineId": "3",
    "toLineId": "suinbundang",
    "nextStationName": "한티",
    "toTerminusName": "왕십리",
    "car": 6,
    "door": 3
  },
  {
    "stationName": "도곡",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "suinbundang",
    "nextStationName": "구룡",
    "toTerminusName": "수원",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "도곡",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "suinbundang",
    "nextStationName": "한티",
    "toTerminusName": "왕십리",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "도곡",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "3",
    "nextStationName": "대치",
    "toTerminusName": "오금",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "도곡",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "3",
    "nextStationName": "매봉",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "도곡",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "3",
    "nextStationName": "대치",
    "toTerminusName": "오금",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "도곡",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "3",
    "nextStationName": "매봉",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "도봉산",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "7",
    "nextStationName": "수락산",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "도봉산",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "7",
    "nextStationName": "장암",
    "toTerminusName": "장암",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "도봉산",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "7",
    "nextStationName": "수락산",
    "car": 9,
    "door": 3
  },
  {
    "stationName": "도봉산",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "7",
    "nextStationName": "장암",
    "toTerminusName": "장암",
    "car": 9,
    "door": 3
  },
  {
    "stationName": "도봉산",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "1",
    "nextStationName": "도봉",
    "toTerminusName": "신창(순천향대)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "도봉산",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "1",
    "nextStationName": "망월사",
    "toTerminusName": "소요산",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "도봉산",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "1",
    "nextStationName": "도봉",
    "toTerminusName": "신창(순천향대)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "도봉산",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "1",
    "nextStationName": "망월사",
    "toTerminusName": "소요산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "동대문",
    "fromLineId": "1",
    "toLineId": "4",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "남태령",
    "car": 9,
    "door": 3
  },
  {
    "stationName": "동대문",
    "fromLineId": "1",
    "toLineId": "4",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "남태령",
    "car": 1,
    "door": 3
  },
  {
    "stationName": "동대문",
    "fromLineId": "1",
    "toLineId": "4",
    "nextStationName": "혜화",
    "toTerminusName": "불암산(당고개)",
    "car": 1,
    "door": 3
  },
  {
    "stationName": "동대문",
    "fromLineId": "1",
    "toLineId": "4",
    "nextStationName": "혜화",
    "toTerminusName": "불암산(당고개)",
    "car": 9,
    "door": 3
  },
  {
    "stationName": "동대문",
    "fromLineId": "4",
    "toLineId": "1",
    "nextStationName": "동묘앞",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "동대문",
    "fromLineId": "4",
    "toLineId": "1",
    "nextStationName": "종로5가",
    "toTerminusName": "서울역",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "동대문",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "1",
    "nextStationName": "동묘앞",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "동대문",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "1",
    "nextStationName": "종로5가",
    "toTerminusName": "서울역",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "2",
    "fromTerminusName": "신당",
    "toLineId": "4",
    "nextStationName": "동대문",
    "toTerminusName": "불암산(당고개)",
    "car": 9,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "2",
    "fromTerminusName": "신당",
    "toLineId": "4",
    "nextStationName": "충무로",
    "toTerminusName": "남태령",
    "car": 9,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "2",
    "fromTerminusName": "을지로4가",
    "toLineId": "4",
    "nextStationName": "동대문",
    "toTerminusName": "불암산(당고개)",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "2",
    "fromTerminusName": "을지로4가",
    "toLineId": "4",
    "nextStationName": "충무로",
    "toTerminusName": "남태령",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "2",
    "fromTerminusName": "신당",
    "toLineId": "5",
    "nextStationName": "을지로4가",
    "toTerminusName": "방화",
    "car": 6,
    "door": 3
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "2",
    "fromTerminusName": "신당",
    "toLineId": "5",
    "nextStationName": "청구",
    "toTerminusName": "마천",
    "car": 6,
    "door": 3
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "2",
    "fromTerminusName": "을지로4가",
    "toLineId": "5",
    "nextStationName": "을지로4가",
    "toTerminusName": "방화",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "2",
    "fromTerminusName": "을지로4가",
    "toLineId": "5",
    "nextStationName": "청구",
    "toTerminusName": "마천",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "4",
    "toLineId": "2",
    "nextStationName": "신당",
    "toTerminusName": "충정로(경기대입구)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "4",
    "toLineId": "2",
    "nextStationName": "을지로입구",
    "toTerminusName": "시청",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "2",
    "nextStationName": "신당",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "2",
    "nextStationName": "을지로입구",
    "toTerminusName": "시청",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "4",
    "toLineId": "5",
    "nextStationName": "을지로4가",
    "toTerminusName": "방화",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "4",
    "toLineId": "5",
    "nextStationName": "청구",
    "toTerminusName": "마천",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "5",
    "nextStationName": "을지로4가",
    "toTerminusName": "방화",
    "car": 9,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "5",
    "nextStationName": "청구",
    "toTerminusName": "마천",
    "car": 9,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "신당",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "을지로4가",
    "toTerminusName": "시청",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "신당",
    "toTerminusName": "충정로(경기대입구)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "을지로4가",
    "toTerminusName": "시청",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "4",
    "nextStationName": "동대문",
    "toTerminusName": "불암산(당고개)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "4",
    "nextStationName": "충무로",
    "toTerminusName": "남태령",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "4",
    "nextStationName": "동대문",
    "toTerminusName": "불암산(당고개)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "동대문역사문화공원",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "4",
    "nextStationName": "충무로",
    "toTerminusName": "남태령",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "동묘앞",
    "fromLineId": "1",
    "toLineId": "6",
    "nextStationName": "신당",
    "toTerminusName": "응암",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "동묘앞",
    "fromLineId": "1",
    "toLineId": "6",
    "nextStationName": "신당",
    "toTerminusName": "응암",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "동묘앞",
    "fromLineId": "1",
    "toLineId": "6",
    "nextStationName": "창신",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "동묘앞",
    "fromLineId": "1",
    "toLineId": "6",
    "nextStationName": "창신",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "동묘앞",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "1",
    "nextStationName": "동대문",
    "toTerminusName": "서울역",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "동묘앞",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "1",
    "nextStationName": "신설동",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "동묘앞",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "1",
    "nextStationName": "동대문",
    "toTerminusName": "서울역",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "동묘앞",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "1",
    "nextStationName": "신설동",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "동작(현충원)",
    "fromLineId": "4",
    "toLineId": "9",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "동작(현충원)",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "9",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "동작(현충원)",
    "fromLineId": "9",
    "fromTerminusName": "개화",
    "toLineId": "4",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "동작(현충원)",
    "fromLineId": "9",
    "fromTerminusName": "종합운동장",
    "toLineId": "4",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "airport",
    "nextStationName": "김포공항",
    "toTerminusName": "인천공항1터미널",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "airport",
    "nextStationName": "홍대입구",
    "toTerminusName": "서울역",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "6",
    "fromTerminusName": "불광",
    "toLineId": "airport",
    "nextStationName": "김포공항",
    "toTerminusName": "인천공항1터미널",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "6",
    "fromTerminusName": "불광",
    "toLineId": "airport",
    "nextStationName": "홍대입구",
    "toTerminusName": "서울역",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "gyeongui",
    "nextStationName": "가좌",
    "toTerminusName": "용산",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "gyeongui",
    "nextStationName": "수색",
    "toTerminusName": "문산",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "gyeongui",
    "nextStationName": "가좌",
    "toTerminusName": "용산",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "gyeongui",
    "nextStationName": "수색",
    "toTerminusName": "문산",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "6",
    "nextStationName": "월드컵경기장(성산)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "6",
    "nextStationName": "증산(명지대앞)",
    "toTerminusName": "응암",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "6",
    "nextStationName": "월드컵경기장(성산)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "6",
    "nextStationName": "증산(명지대앞)",
    "toTerminusName": "응암",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "gyeongui",
    "nextStationName": "가좌",
    "toTerminusName": "용산",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "gyeongui",
    "nextStationName": "수색",
    "toTerminusName": "문산",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "gyeongui",
    "nextStationName": "가좌",
    "toTerminusName": "용산",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "gyeongui",
    "nextStationName": "수색",
    "toTerminusName": "문산",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "6",
    "nextStationName": "월드컵경기장(성산)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "6",
    "nextStationName": "증산(명지대앞)",
    "toTerminusName": "응암",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "6",
    "nextStationName": "월드컵경기장(성산)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "6",
    "nextStationName": "증산(명지대앞)",
    "toTerminusName": "응암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "airport",
    "nextStationName": "김포공항",
    "toTerminusName": "인천공항1터미널",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "디지털미디어시티",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "airport",
    "nextStationName": "김포공항",
    "toTerminusName": "인천공항1터미널",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "망우",
    "fromLineId": "gyeongchun",
    "toLineId": "gyeongui",
    "nextStationName": "상봉",
    "toTerminusName": "문산",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "망우",
    "fromLineId": "gyeongchun",
    "toLineId": "gyeongui",
    "nextStationName": "양원(서울시북부병원)",
    "toTerminusName": "용문",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "망우",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "춘천(한림대)",
    "toLineId": "gyeongui",
    "nextStationName": "양원(서울시북부병원)",
    "toTerminusName": "용문",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "망우",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "gyeongchun",
    "nextStationName": "상봉",
    "toTerminusName": "광운대",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "망우",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "gyeongchun",
    "nextStationName": "신내",
    "toTerminusName": "춘천(한림대)",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "망우",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "gyeongchun",
    "nextStationName": "상봉",
    "toTerminusName": "광운대",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "망우",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "gyeongchun",
    "nextStationName": "신내",
    "toTerminusName": "춘천(한림대)",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "모란",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "suinbundang",
    "nextStationName": "야탑",
    "toTerminusName": "수원",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "모란",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "suinbundang",
    "nextStationName": "태평",
    "toTerminusName": "왕십리",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "모란",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "8",
    "nextStationName": "수진",
    "toTerminusName": "암사",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "모란",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "8",
    "nextStationName": "수진",
    "toTerminusName": "암사",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "보문",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "ui",
    "nextStationName": "신설동",
    "toTerminusName": "북한산우이",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "보문",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "ui",
    "nextStationName": "신설동",
    "toTerminusName": "신설동",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "보문",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "ui",
    "nextStationName": "성신여대입구",
    "toTerminusName": "북한산우이",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "보문",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "ui",
    "nextStationName": "성신여대입구",
    "toTerminusName": "신설동",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "보문",
    "fromLineId": "ui",
    "fromTerminusName": "북한산우이",
    "toLineId": "6",
    "nextStationName": "안암(고대병원앞)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "보문",
    "fromLineId": "ui",
    "fromTerminusName": "북한산우이",
    "toLineId": "6",
    "nextStationName": "창신",
    "toTerminusName": "응암",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "보문",
    "fromLineId": "ui",
    "fromTerminusName": "신설동",
    "toLineId": "6",
    "nextStationName": "안암(고대병원앞)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "보문",
    "fromLineId": "ui",
    "fromTerminusName": "신설동",
    "toLineId": "6",
    "nextStationName": "창신",
    "toTerminusName": "응암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "복정",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "suinbundang",
    "nextStationName": "가천대",
    "toTerminusName": "수원",
    "car": 3,
    "door": 2
  },
  {
    "stationName": "복정",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "suinbundang",
    "nextStationName": "수서",
    "toTerminusName": "왕십리",
    "car": 3,
    "door": 2
  },
  {
    "stationName": "복정",
    "fromLineId": "8",
    "fromTerminusName": "암사",
    "toLineId": "suinbundang",
    "nextStationName": "가천대",
    "toTerminusName": "수원",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "복정",
    "fromLineId": "8",
    "fromTerminusName": "암사",
    "toLineId": "suinbundang",
    "nextStationName": "수서",
    "toTerminusName": "왕십리",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "복정(동서울대학)",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "8",
    "nextStationName": "산성",
    "toTerminusName": "모란",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "복정(동서울대학)",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "8",
    "nextStationName": "장지",
    "toTerminusName": "암사",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "복정(동서울대학)",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "8",
    "nextStationName": "산성",
    "toTerminusName": "모란",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "복정(동서울대학)",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "8",
    "nextStationName": "장지",
    "toTerminusName": "암사",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "부평",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "incheon1",
    "nextStationName": "동수",
    "toTerminusName": "국제업무지구",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "부평",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "incheon1",
    "nextStationName": "부평시장",
    "toTerminusName": "계양",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "부평",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "incheon1",
    "nextStationName": "동수",
    "toTerminusName": "국제업무지구",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "부평",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "incheon1",
    "nextStationName": "부평시장",
    "toTerminusName": "계양",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "부평",
    "fromLineId": "incheon1",
    "fromTerminusName": "계양",
    "toLineId": "1",
    "nextStationName": "백운",
    "toTerminusName": "신창(순천향대)",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "부평",
    "fromLineId": "incheon1",
    "fromTerminusName": "계양",
    "toLineId": "1",
    "nextStationName": "부개",
    "toTerminusName": "소요산",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "부평",
    "fromLineId": "incheon1",
    "fromTerminusName": "국제업무지구",
    "toLineId": "1",
    "nextStationName": "백운",
    "toTerminusName": "신창(순천향대)",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "부평",
    "fromLineId": "incheon1",
    "fromTerminusName": "국제업무지구",
    "toLineId": "1",
    "nextStationName": "부개",
    "toTerminusName": "소요산",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "부평구청",
    "fromLineId": "7",
    "fromTerminusName": "부평구청",
    "toLineId": "incheon1",
    "nextStationName": "갈산",
    "toTerminusName": "계양",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "부평구청",
    "fromLineId": "7",
    "fromTerminusName": "부평구청",
    "toLineId": "incheon1",
    "nextStationName": "부평시장",
    "toTerminusName": "국제업무지구",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "부평구청",
    "fromLineId": "incheon1",
    "fromTerminusName": "계양",
    "toLineId": "7",
    "toTerminusName": "장암",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "부평구청",
    "fromLineId": "incheon1",
    "fromTerminusName": "국제업무지구",
    "toLineId": "7",
    "toTerminusName": "장암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "불광",
    "fromLineId": "3",
    "toLineId": "6",
    "nextStationName": "독바위",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "불광",
    "fromLineId": "3",
    "toLineId": "6",
    "nextStationName": "역촌",
    "toTerminusName": "응암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "불광",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "6",
    "nextStationName": "독바위",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "불광",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "6",
    "nextStationName": "역촌",
    "toTerminusName": "응암",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "불광",
    "fromLineId": "6",
    "toLineId": "3",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "불광",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "3",
    "nextStationName": "녹번",
    "toTerminusName": "오금",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "불광",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "3",
    "nextStationName": "연신내",
    "toTerminusName": "구파발",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "사당",
    "fromLineId": "2",
    "fromTerminusName": "교대(법원.검찰청)",
    "toLineId": "4",
    "nextStationName": "남태령",
    "toTerminusName": "남태령",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "사당",
    "fromLineId": "2",
    "fromTerminusName": "교대(법원.검찰청)",
    "toLineId": "4",
    "nextStationName": "총신대입구(이수)",
    "toTerminusName": "불암산(당고개)",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "사당",
    "fromLineId": "2",
    "fromTerminusName": "대림(구로구청)",
    "toLineId": "4",
    "nextStationName": "남태령",
    "toTerminusName": "남태령",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "사당",
    "fromLineId": "2",
    "fromTerminusName": "대림(구로구청)",
    "toLineId": "4",
    "nextStationName": "총신대입구(이수)",
    "toTerminusName": "불암산(당고개)",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "사당",
    "fromLineId": "4",
    "toLineId": "2",
    "nextStationName": "낙성대",
    "toTerminusName": "충정로(경기대입구)",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "사당",
    "fromLineId": "4",
    "toLineId": "2",
    "nextStationName": "방배",
    "toTerminusName": "시청",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "사당",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "2",
    "nextStationName": "낙성대",
    "toTerminusName": "충정로(경기대입구)",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "사당",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "2",
    "nextStationName": "방배",
    "toTerminusName": "시청",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "삼각지",
    "fromLineId": "4",
    "toLineId": "6",
    "nextStationName": "녹사평(용산구청)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "삼각지",
    "fromLineId": "4",
    "toLineId": "6",
    "nextStationName": "효창공원앞",
    "toTerminusName": "응암",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "삼각지",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "6",
    "nextStationName": "녹사평(용산구청)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "삼각지",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "6",
    "nextStationName": "효창공원앞",
    "toTerminusName": "응암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "삼각지",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "4",
    "nextStationName": "숙대입구(갈월)",
    "toTerminusName": "불암산(당고개)",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "삼각지",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "4",
    "nextStationName": "신용산",
    "toTerminusName": "남태령",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "삼각지",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "4",
    "nextStationName": "숙대입구(갈월)",
    "toTerminusName": "불암산(당고개)",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "삼각지",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "4",
    "nextStationName": "신용산",
    "toTerminusName": "남태령",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "광운대",
    "toLineId": "7",
    "nextStationName": "면목",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "광운대",
    "toLineId": "7",
    "nextStationName": "중화",
    "toTerminusName": "장암",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "춘천(한림대)",
    "toLineId": "7",
    "nextStationName": "면목",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "춘천(한림대)",
    "toLineId": "7",
    "nextStationName": "중화",
    "toTerminusName": "장암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "광운대",
    "toLineId": "gyeongui",
    "nextStationName": "중랑",
    "toTerminusName": "용문",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "춘천(한림대)",
    "toLineId": "gyeongui",
    "nextStationName": "중랑",
    "toTerminusName": "용문",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "7",
    "nextStationName": "면목",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "7",
    "nextStationName": "중화",
    "toTerminusName": "장암",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "7",
    "nextStationName": "면목",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "7",
    "nextStationName": "중화",
    "toTerminusName": "장암",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "gyeongchun",
    "nextStationName": "광운대",
    "toTerminusName": "광운대",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "gyeongchun",
    "nextStationName": "망우",
    "toTerminusName": "춘천(한림대)",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "gyeongchun",
    "nextStationName": "광운대",
    "toTerminusName": "광운대",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "상봉",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "gyeongchun",
    "nextStationName": "망우",
    "toTerminusName": "춘천(한림대)",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "상봉(시외버스터미널)",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "gyeongchun",
    "nextStationName": "광운대",
    "toTerminusName": "광운대",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "상봉(시외버스터미널)",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "gyeongchun",
    "nextStationName": "망우",
    "toTerminusName": "춘천(한림대)",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "상봉(시외버스터미널)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "gyeongchun",
    "nextStationName": "광운대",
    "toTerminusName": "광운대",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "상봉(시외버스터미널)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "gyeongchun",
    "nextStationName": "망우",
    "toTerminusName": "춘천(한림대)",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "상봉(시외버스터미널)",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "gyeongui",
    "nextStationName": "망우",
    "toTerminusName": "문산",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "상봉(시외버스터미널)",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "gyeongui",
    "nextStationName": "중랑",
    "toTerminusName": "용산",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "상봉(시외버스터미널)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "gyeongui",
    "nextStationName": "망우",
    "toTerminusName": "문산",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "상봉(시외버스터미널)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "gyeongui",
    "nextStationName": "중랑",
    "toTerminusName": "용산",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "서강대",
    "fromLineId": "gyeongui",
    "fromTerminusName": "서울역",
    "toLineId": "1",
    "toTerminusName": "소요산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서강대",
    "fromLineId": "gyeongui",
    "fromTerminusName": "서울역",
    "toLineId": "1",
    "nextStationName": "남영",
    "toTerminusName": "인천",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서강대",
    "fromLineId": "gyeongui",
    "fromTerminusName": "서울역",
    "toLineId": "4",
    "nextStationName": "숙대입구(갈월)",
    "toTerminusName": "남태령",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서강대",
    "fromLineId": "gyeongui",
    "fromTerminusName": "서울역",
    "toLineId": "4",
    "nextStationName": "회현(남대문시장)",
    "toTerminusName": "불암산(당고개)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서강대",
    "fromLineId": "gyeongui",
    "fromTerminusName": "서울역",
    "toLineId": "airport",
    "nextStationName": "홍대입구",
    "toTerminusName": "인천공항1터미널",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서울역",
    "fromLineId": "1",
    "toLineId": "4",
    "nextStationName": "숙대입구(갈월)",
    "toTerminusName": "남태령",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "서울역",
    "fromLineId": "1",
    "toLineId": "4",
    "nextStationName": "숙대입구(갈월)",
    "toTerminusName": "남태령",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "서울역",
    "fromLineId": "1",
    "toLineId": "4",
    "nextStationName": "회현(남대문시장)",
    "toTerminusName": "불암산(당고개)",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "서울역",
    "fromLineId": "1",
    "toLineId": "4",
    "nextStationName": "회현(남대문시장)",
    "toTerminusName": "불암산(당고개)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "서울역",
    "fromLineId": "1",
    "toLineId": "airport",
    "nextStationName": "공덕",
    "toTerminusName": "인천공항1터미널",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "서울역",
    "fromLineId": "1",
    "toLineId": "airport",
    "nextStationName": "공덕",
    "toTerminusName": "인천공항1터미널",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "서울역",
    "fromLineId": "1",
    "toLineId": "gyeongui",
    "nextStationName": "신촌",
    "toTerminusName": "문산",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "서울역",
    "fromLineId": "1",
    "toLineId": "gyeongui",
    "nextStationName": "신촌",
    "toTerminusName": "문산",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "toLineId": "1",
    "nextStationName": "남영",
    "toTerminusName": "신창(순천향대)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "toLineId": "1",
    "nextStationName": "시청",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "1",
    "nextStationName": "남영",
    "toTerminusName": "신창(순천향대)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "1",
    "nextStationName": "시청",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "toLineId": "airport",
    "nextStationName": "공덕",
    "toTerminusName": "인천공항1터미널",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "airport",
    "nextStationName": "공덕",
    "toTerminusName": "인천공항1터미널",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "toLineId": "gyeongui",
    "nextStationName": "서울역",
    "toTerminusName": "서울역",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "toLineId": "gyeongui",
    "nextStationName": "신촌",
    "toTerminusName": "문산",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "gyeongui",
    "nextStationName": "서울역",
    "toTerminusName": "서울역",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서울역",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "gyeongui",
    "nextStationName": "신촌",
    "toTerminusName": "문산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "서울역",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "1",
    "toTerminusName": "소요산",
    "car": 3,
    "door": 2
  },
  {
    "stationName": "서울역",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "1",
    "nextStationName": "남영",
    "toTerminusName": "신창(순천향대)",
    "car": 3,
    "door": 2
  },
  {
    "stationName": "서울역",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "4",
    "nextStationName": "숙대입구(갈월)",
    "toTerminusName": "남태령",
    "car": 3,
    "door": 2
  },
  {
    "stationName": "서울역",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "4",
    "nextStationName": "회현(남대문시장)",
    "toTerminusName": "불암산(당고개)",
    "car": 3,
    "door": 2
  },
  {
    "stationName": "서울역",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "gyeongui",
    "nextStationName": "신촌",
    "toTerminusName": "문산",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "석계",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "6",
    "nextStationName": "돌곶이",
    "toTerminusName": "응암",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "석계",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "6",
    "nextStationName": "태릉입구",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "석계",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "6",
    "nextStationName": "돌곶이",
    "toTerminusName": "응암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "석계",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "6",
    "nextStationName": "태릉입구",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "석계",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "1",
    "nextStationName": "광운대",
    "toTerminusName": "소요산",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "석계",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "1",
    "nextStationName": "신이문",
    "toTerminusName": "신창(순천향대)",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "석계",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "1",
    "nextStationName": "광운대",
    "toTerminusName": "소요산",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "석계",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "1",
    "nextStationName": "신이문",
    "toTerminusName": "신창(순천향대)",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "선릉",
    "fromLineId": "2",
    "fromTerminusName": "강남",
    "toLineId": "suinbundang",
    "nextStationName": "선정릉(한국과학창의재단)",
    "toTerminusName": "왕십리",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "선릉",
    "fromLineId": "2",
    "fromTerminusName": "강남",
    "toLineId": "suinbundang",
    "nextStationName": "한티",
    "toTerminusName": "수원",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "선릉",
    "fromLineId": "2",
    "fromTerminusName": "잠실(송파구청)",
    "toLineId": "suinbundang",
    "nextStationName": "선정릉(한국과학창의재단)",
    "toTerminusName": "왕십리",
    "car": 6,
    "door": 3
  },
  {
    "stationName": "선릉",
    "fromLineId": "2",
    "fromTerminusName": "잠실(송파구청)",
    "toLineId": "suinbundang",
    "nextStationName": "한티",
    "toTerminusName": "수원",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "선릉",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "2",
    "nextStationName": "삼성(무역센터)",
    "toTerminusName": "시청",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "선릉",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "2",
    "nextStationName": "역삼",
    "toTerminusName": "충정로(경기대입구)",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "선릉",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "2",
    "nextStationName": "삼성(무역센터)",
    "toTerminusName": "시청",
    "car": 6,
    "door": 3
  },
  {
    "stationName": "선릉",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "2",
    "nextStationName": "역삼",
    "toTerminusName": "충정로(경기대입구)",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "선정릉",
    "fromLineId": "9",
    "fromTerminusName": "개화",
    "toLineId": "suinbundang",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "선정릉",
    "fromLineId": "9",
    "fromTerminusName": "종합운동장",
    "toLineId": "suinbundang",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "선정릉(한국과학창의재단)",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "9",
    "nextStationName": "삼성중앙",
    "toTerminusName": "종합운동장",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "선정릉(한국과학창의재단)",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "9",
    "nextStationName": "언주",
    "toTerminusName": "개화",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "선정릉(한국과학창의재단)",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "9",
    "nextStationName": "삼성중앙",
    "toTerminusName": "종합운동장",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "선정릉(한국과학창의재단)",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "9",
    "nextStationName": "언주",
    "toTerminusName": "개화",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "성신여대입구",
    "fromLineId": "ui",
    "fromTerminusName": "북한산우이",
    "toLineId": "4",
    "nextStationName": "길음",
    "toTerminusName": "불암산(당고개)",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "성신여대입구",
    "fromLineId": "ui",
    "fromTerminusName": "북한산우이",
    "toLineId": "4",
    "nextStationName": "한성대입구(삼선교)",
    "toTerminusName": "남태령",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "성신여대입구",
    "fromLineId": "ui",
    "fromTerminusName": "신설동",
    "toLineId": "4",
    "nextStationName": "길음",
    "toTerminusName": "불암산(당고개)",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "성신여대입구",
    "fromLineId": "ui",
    "fromTerminusName": "신설동",
    "toLineId": "4",
    "nextStationName": "한성대입구(삼선교)",
    "toTerminusName": "남태령",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "성신여대입구(돈암)",
    "fromLineId": "4",
    "fromTerminusName": "남태령",
    "toLineId": "ui",
    "nextStationName": "보문",
    "toTerminusName": "신설동",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "성신여대입구(돈암)",
    "fromLineId": "4",
    "fromTerminusName": "남태령",
    "toLineId": "ui",
    "nextStationName": "정릉",
    "toTerminusName": "북한산우이",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "성신여대입구(돈암)",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "ui",
    "nextStationName": "보문",
    "toTerminusName": "신설동",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "성신여대입구(돈암)",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "ui",
    "nextStationName": "정릉",
    "toTerminusName": "북한산우이",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "수서",
    "fromLineId": "3",
    "toLineId": "suinbundang",
    "nextStationName": "대모산입구",
    "toTerminusName": "왕십리",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "수서",
    "fromLineId": "3",
    "toLineId": "suinbundang",
    "nextStationName": "복정(동서울대학)",
    "toTerminusName": "수원",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "수서",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "suinbundang",
    "nextStationName": "대모산입구",
    "toTerminusName": "왕십리",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "수서",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "suinbundang",
    "nextStationName": "복정(동서울대학)",
    "toTerminusName": "수원",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "수서",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "3",
    "nextStationName": "가락시장",
    "toTerminusName": "오금",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "수서",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "3",
    "nextStationName": "일원",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "수서",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "3",
    "nextStationName": "가락시장",
    "toTerminusName": "오금",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "수서",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "3",
    "nextStationName": "일원",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "수원",
    "fromLineId": "1",
    "toLineId": "suinbundang",
    "nextStationName": "매교",
    "toTerminusName": "왕십리",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "수원",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "suinbundang",
    "nextStationName": "매교",
    "toTerminusName": "왕십리",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "수원",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "1",
    "nextStationName": "세류",
    "toTerminusName": "신창(순천향대)",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "수원",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "1",
    "nextStationName": "화서",
    "toTerminusName": "소요산",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "시청",
    "fromLineId": "1",
    "toLineId": "2",
    "nextStationName": "을지로입구",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "시청",
    "fromLineId": "1",
    "toLineId": "2",
    "nextStationName": "을지로입구",
    "toTerminusName": "충정로(경기대입구)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "시청",
    "fromLineId": "1",
    "toLineId": "2",
    "nextStationName": "충정로(경기대입구)",
    "toTerminusName": "충정로(경기대입구)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "시청",
    "fromLineId": "1",
    "toLineId": "2",
    "nextStationName": "충정로(경기대입구)",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "시청",
    "fromLineId": "2",
    "fromTerminusName": "을지로3가",
    "toLineId": "1",
    "nextStationName": "서울역",
    "toTerminusName": "서울역",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "시청",
    "fromLineId": "2",
    "fromTerminusName": "을지로3가",
    "toLineId": "1",
    "nextStationName": "종각",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "시청",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "1",
    "nextStationName": "서울역",
    "toTerminusName": "서울역",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "시청",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "1",
    "nextStationName": "종각",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "신길",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "5",
    "nextStationName": "여의도",
    "toTerminusName": "마천",
    "car": 9,
    "door": 1
  },
  {
    "stationName": "신길",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "5",
    "nextStationName": "영등포시장",
    "toTerminusName": "방화",
    "car": 9,
    "door": 1
  },
  {
    "stationName": "신길",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "5",
    "nextStationName": "여의도",
    "toTerminusName": "마천",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "신길",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "5",
    "nextStationName": "영등포시장",
    "toTerminusName": "방화",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "신길",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "1",
    "nextStationName": "대방",
    "toTerminusName": "소요산",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "신길",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "1",
    "nextStationName": "영등포",
    "toTerminusName": "신창(순천향대)",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "신길",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "1",
    "nextStationName": "대방",
    "toTerminusName": "소요산",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "신길",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "1",
    "nextStationName": "영등포",
    "toTerminusName": "신창(순천향대)",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "신당",
    "fromLineId": "2",
    "fromTerminusName": "동대문역사문화공원",
    "toLineId": "6",
    "nextStationName": "동묘앞",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "신당",
    "fromLineId": "2",
    "fromTerminusName": "동대문역사문화공원",
    "toLineId": "6",
    "nextStationName": "청구",
    "toTerminusName": "응암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "신당",
    "fromLineId": "2",
    "fromTerminusName": "왕십리",
    "toLineId": "6",
    "nextStationName": "동묘앞",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "신당",
    "fromLineId": "2",
    "fromTerminusName": "왕십리",
    "toLineId": "6",
    "nextStationName": "청구",
    "toTerminusName": "응암",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "신당",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "2",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "시청",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "신당",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "2",
    "nextStationName": "상왕십리",
    "toTerminusName": "충정로(경기대입구)",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "신당",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "2",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "시청",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "신당",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "2",
    "nextStationName": "상왕십리",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "신도림",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "2",
    "nextStationName": "대림(구로구청)",
    "toTerminusName": "시청",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "신도림",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "2",
    "nextStationName": "도림천",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "신도림",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "2",
    "nextStationName": "문래",
    "toTerminusName": "충정로(경기대입구)",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "신도림",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "2",
    "nextStationName": "대림(구로구청)",
    "toTerminusName": "시청",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "신도림",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "2",
    "nextStationName": "도림천",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "신도림",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "2",
    "nextStationName": "문래",
    "toTerminusName": "충정로(경기대입구)",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "대림(구로구청)",
    "toLineId": "1",
    "nextStationName": "구로",
    "toTerminusName": "신창(순천향대)",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "대림(구로구청)",
    "toLineId": "1",
    "nextStationName": "영등포",
    "toTerminusName": "소요산",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "신도림",
    "toLineId": "1",
    "nextStationName": "구로",
    "toTerminusName": "신창(순천향대)",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "신도림",
    "toLineId": "1",
    "nextStationName": "영등포",
    "toTerminusName": "소요산",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "영등포구청",
    "toLineId": "1",
    "nextStationName": "구로",
    "toTerminusName": "신창(순천향대)",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "영등포구청",
    "toLineId": "1",
    "nextStationName": "영등포",
    "toTerminusName": "소요산",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "대림(구로구청)",
    "toLineId": "2",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "신도림",
    "toLineId": "2",
    "nextStationName": "대림(구로구청)",
    "toTerminusName": "시청",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "신도림",
    "toLineId": "2",
    "nextStationName": "문래",
    "toTerminusName": "충정로(경기대입구)",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "신도림",
    "fromLineId": "2",
    "fromTerminusName": "영등포구청",
    "toLineId": "2",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "신설동",
    "fromLineId": "1",
    "toLineId": "2",
    "nextStationName": "용두(동대문구청)",
    "car": 9,
    "door": 4
  },
  {
    "stationName": "신설동",
    "fromLineId": "1",
    "toLineId": "2",
    "nextStationName": "용두(동대문구청)",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "신설동",
    "fromLineId": "1",
    "toLineId": "ui",
    "nextStationName": "보문",
    "toTerminusName": "북한산우이",
    "car": 10,
    "door": 1
  },
  {
    "stationName": "신설동",
    "fromLineId": "1",
    "toLineId": "ui",
    "nextStationName": "보문",
    "toTerminusName": "북한산우이",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "신설동",
    "fromLineId": "ui",
    "fromTerminusName": "신설동",
    "toLineId": "1",
    "nextStationName": "동묘앞",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "신설동",
    "fromLineId": "ui",
    "fromTerminusName": "신설동",
    "toLineId": "1",
    "nextStationName": "제기동",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "신설동",
    "fromLineId": "ui",
    "fromTerminusName": "신설동",
    "toLineId": "2",
    "nextStationName": "용두(동대문구청)",
    "car": 2,
    "door": 1
  },
  {
    "stationName": "약수",
    "fromLineId": "3",
    "toLineId": "6",
    "nextStationName": "버티고개",
    "toTerminusName": "응암",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "약수",
    "fromLineId": "3",
    "toLineId": "6",
    "nextStationName": "청구",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "약수",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "6",
    "nextStationName": "버티고개",
    "toTerminusName": "응암",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "약수",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "6",
    "nextStationName": "청구",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "약수",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "3",
    "nextStationName": "금호",
    "toTerminusName": "오금",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "약수",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "3",
    "nextStationName": "동대입구",
    "toTerminusName": "구파발",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "약수",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "3",
    "nextStationName": "금호",
    "toTerminusName": "오금",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "약수",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "3",
    "nextStationName": "동대입구",
    "toTerminusName": "구파발",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "양재(서초구청)",
    "fromLineId": "3",
    "toLineId": "shinbundang",
    "nextStationName": "강남",
    "toTerminusName": "강남",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "양재(서초구청)",
    "fromLineId": "3",
    "toLineId": "shinbundang",
    "nextStationName": "양재시민의숲(매헌)",
    "toTerminusName": "광교(경기대)",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "양재(서초구청)",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "shinbundang",
    "nextStationName": "양재시민의숲(매헌)",
    "toTerminusName": "광교(경기대)",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "양재(서초구청)",
    "fromLineId": "3",
    "fromTerminusName": "오금",
    "toLineId": "shinbundang",
    "nextStationName": "강남",
    "toTerminusName": "강남",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "양재(서초구청)",
    "fromLineId": "shinbundang",
    "fromTerminusName": "강남",
    "toLineId": "3",
    "nextStationName": "남부터미널(예술의전당)",
    "toTerminusName": "구파발",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "양재(서초구청)",
    "fromLineId": "shinbundang",
    "fromTerminusName": "강남",
    "toLineId": "3",
    "nextStationName": "도곡",
    "toTerminusName": "오금",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "양재(서초구청)",
    "fromLineId": "shinbundang",
    "fromTerminusName": "정자",
    "toLineId": "3",
    "nextStationName": "남부터미널(예술의전당)",
    "toTerminusName": "구파발",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "양재(서초구청)",
    "fromLineId": "shinbundang",
    "fromTerminusName": "정자",
    "toLineId": "3",
    "nextStationName": "도곡",
    "toTerminusName": "오금",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "여의도",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "9",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "여의도",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "9",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "여의도",
    "fromLineId": "9",
    "fromTerminusName": "개화",
    "toLineId": "5",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "여의도",
    "fromLineId": "9",
    "fromTerminusName": "종합운동장",
    "toLineId": "5",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "연신내",
    "fromLineId": "3",
    "toLineId": "6",
    "nextStationName": "구산",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "연신내",
    "fromLineId": "3",
    "toLineId": "6",
    "nextStationName": "독바위",
    "toTerminusName": "응암",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "연신내",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "6",
    "nextStationName": "구산",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 6,
    "door": 3
  },
  {
    "stationName": "연신내",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "6",
    "nextStationName": "독바위",
    "toTerminusName": "응암",
    "car": 6,
    "door": 3
  },
  {
    "stationName": "연신내",
    "fromLineId": "6",
    "fromTerminusName": "디지털미디어시티",
    "toLineId": "3",
    "nextStationName": "구파발",
    "toTerminusName": "구파발",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "연신내",
    "fromLineId": "6",
    "fromTerminusName": "디지털미디어시티",
    "toLineId": "3",
    "nextStationName": "불광",
    "toTerminusName": "오금",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "연신내",
    "fromLineId": "6",
    "fromTerminusName": "불광",
    "toLineId": "3",
    "nextStationName": "구파발",
    "toTerminusName": "구파발",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "연신내",
    "fromLineId": "6",
    "fromTerminusName": "불광",
    "toLineId": "3",
    "nextStationName": "불광",
    "toTerminusName": "오금",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "영등포구청",
    "fromLineId": "2",
    "fromTerminusName": "당산",
    "toLineId": "5",
    "nextStationName": "양평",
    "toTerminusName": "방화",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "영등포구청",
    "fromLineId": "2",
    "fromTerminusName": "당산",
    "toLineId": "5",
    "nextStationName": "영등포시장",
    "toTerminusName": "마천",
    "car": 7,
    "door": 4
  },
  {
    "stationName": "영등포구청",
    "fromLineId": "2",
    "fromTerminusName": "신도림",
    "toLineId": "5",
    "nextStationName": "양평",
    "toTerminusName": "방화",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "영등포구청",
    "fromLineId": "2",
    "fromTerminusName": "신도림",
    "toLineId": "5",
    "nextStationName": "영등포시장",
    "toTerminusName": "마천",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "영등포구청",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "당산",
    "toTerminusName": "충정로(경기대입구)",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "영등포구청",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "문래",
    "toTerminusName": "시청",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "영등포구청",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "당산",
    "toTerminusName": "충정로(경기대입구)",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "영등포구청",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "문래",
    "toTerminusName": "시청",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "오금",
    "fromLineId": "3",
    "fromTerminusName": "오금",
    "toLineId": "5",
    "nextStationName": "개롱",
    "toTerminusName": "마천",
    "car": 9,
    "door": 4
  },
  {
    "stationName": "오금",
    "fromLineId": "3",
    "fromTerminusName": "오금",
    "toLineId": "5",
    "nextStationName": "방이",
    "toTerminusName": "방화",
    "car": 9,
    "door": 4
  },
  {
    "stationName": "오금",
    "fromLineId": "5",
    "fromTerminusName": "마천",
    "toLineId": "3",
    "nextStationName": "경찰병원",
    "toTerminusName": "구파발",
    "car": 1,
    "door": 3
  },
  {
    "stationName": "오금",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "3",
    "nextStationName": "경찰병원",
    "toTerminusName": "구파발",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "오이도",
    "fromLineId": "4",
    "fromTerminusName": "오이도",
    "toLineId": "suinbundang",
    "nextStationName": "월곶",
    "toTerminusName": "송도",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "오이도",
    "fromLineId": "suinbundang",
    "fromTerminusName": "오이도",
    "toLineId": "4",
    "toTerminusName": "불암산(당고개)",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "옥수",
    "fromLineId": "3",
    "toLineId": "gyeongui",
    "nextStationName": "응봉",
    "toTerminusName": "문산",
    "car": 9,
    "door": 4
  },
  {
    "stationName": "옥수",
    "fromLineId": "3",
    "toLineId": "gyeongui",
    "nextStationName": "한남",
    "toTerminusName": "용산",
    "car": 9,
    "door": 4
  },
  {
    "stationName": "옥수",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "gyeongui",
    "nextStationName": "응봉",
    "toTerminusName": "문산",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "옥수",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "gyeongui",
    "nextStationName": "한남",
    "toTerminusName": "용산",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "옥수",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "3",
    "nextStationName": "금호",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "옥수",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "3",
    "nextStationName": "압구정",
    "toTerminusName": "오금",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "옥수",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "3",
    "nextStationName": "금호",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "옥수",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "3",
    "nextStationName": "압구정",
    "toTerminusName": "오금",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "온수",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "7",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "온수",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "7",
    "nextStationName": "천왕",
    "toTerminusName": "장암",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "온수",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "7",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "온수",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "7",
    "nextStationName": "천왕",
    "toTerminusName": "장암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "온수(성공회대입구)",
    "fromLineId": "7",
    "toLineId": "1",
    "nextStationName": "역곡",
    "toTerminusName": "신창(순천향대)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "온수(성공회대입구)",
    "fromLineId": "7",
    "toLineId": "1",
    "nextStationName": "오류동",
    "toTerminusName": "소요산",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "온수(성공회대입구)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "1",
    "nextStationName": "역곡",
    "toTerminusName": "신창(순천향대)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "온수(성공회대입구)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "1",
    "nextStationName": "오류동",
    "toTerminusName": "소요산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "5",
    "nextStationName": "마장",
    "toTerminusName": "마천",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "5",
    "nextStationName": "행당",
    "toTerminusName": "방화",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "5",
    "nextStationName": "마장",
    "toTerminusName": "마천",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "5",
    "nextStationName": "행당",
    "toTerminusName": "방화",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "gyeongui",
    "nextStationName": "응봉",
    "toTerminusName": "용산",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "gyeongui",
    "nextStationName": "청량리",
    "toTerminusName": "문산",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "gyeongui",
    "nextStationName": "응봉",
    "toTerminusName": "용산",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "gyeongui",
    "nextStationName": "청량리",
    "toTerminusName": "문산",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "suinbundang",
    "nextStationName": "압구정로데오",
    "toTerminusName": "왕십리",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "왕십리",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "suinbundang",
    "nextStationName": "압구정로데오",
    "toTerminusName": "수원",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "상왕십리",
    "toTerminusName": "시청",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "한양대",
    "toTerminusName": "충정로(경기대입구)",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "상왕십리",
    "toTerminusName": "시청",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "한양대",
    "toTerminusName": "충정로(경기대입구)",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "gyeongui",
    "nextStationName": "응봉",
    "toTerminusName": "용산",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "gyeongui",
    "nextStationName": "청량리",
    "toTerminusName": "문산",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "gyeongui",
    "nextStationName": "응봉",
    "toTerminusName": "용산",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "gyeongui",
    "nextStationName": "청량리",
    "toTerminusName": "문산",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "suinbundang",
    "nextStationName": "서울숲",
    "toTerminusName": "수원",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "왕십리",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "suinbundang",
    "nextStationName": "서울숲",
    "toTerminusName": "수원",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "2",
    "nextStationName": "상왕십리",
    "toTerminusName": "시청",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "2",
    "nextStationName": "한양대",
    "toTerminusName": "충정로(경기대입구)",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "2",
    "nextStationName": "상왕십리",
    "toTerminusName": "시청",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "2",
    "nextStationName": "한양대",
    "toTerminusName": "충정로(경기대입구)",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "5",
    "nextStationName": "마장",
    "toTerminusName": "강동",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "5",
    "nextStationName": "행당",
    "toTerminusName": "방화",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "5",
    "nextStationName": "마장",
    "toTerminusName": "강동",
    "car": 1,
    "door": 3
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "5",
    "nextStationName": "행당",
    "toTerminusName": "방화",
    "car": 1,
    "door": 3
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "suinbundang",
    "nextStationName": "서울숲",
    "toTerminusName": "수원",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "suinbundang",
    "nextStationName": "서울숲",
    "toTerminusName": "왕십리",
    "car": 5,
    "door": 4
  },
  {
    "stationName": "왕십리",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "2",
    "nextStationName": "상왕십리",
    "toTerminusName": "시청",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "2",
    "nextStationName": "한양대",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "5",
    "nextStationName": "마장",
    "toTerminusName": "마천",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "5",
    "nextStationName": "행당",
    "toTerminusName": "방화",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "왕십리",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "gyeongui",
    "nextStationName": "응봉",
    "toTerminusName": "용산",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "왕십리",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "gyeongui",
    "nextStationName": "청량리",
    "toTerminusName": "문산",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "용산",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "gyeongui",
    "nextStationName": "이촌",
    "toTerminusName": "용산",
    "car": 10,
    "door": 2
  },
  {
    "stationName": "용산",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "gyeongui",
    "nextStationName": "효창공원앞",
    "toTerminusName": "문산",
    "car": 10,
    "door": 2
  },
  {
    "stationName": "용산",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "gyeongui",
    "nextStationName": "이촌",
    "toTerminusName": "용산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "용산",
    "fromLineId": "1",
    "fromTerminusName": "신창(순천향대)",
    "toLineId": "gyeongui",
    "nextStationName": "효창공원앞",
    "toTerminusName": "문산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "용산",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "1",
    "nextStationName": "남영",
    "toTerminusName": "소요산",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "용산",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "1",
    "nextStationName": "노량진",
    "toTerminusName": "신창(순천향대)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "용산",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "1",
    "nextStationName": "남영",
    "toTerminusName": "소요산",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "용산",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "1",
    "nextStationName": "노량진",
    "toTerminusName": "신창(순천향대)",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "원인재",
    "fromLineId": "incheon1",
    "fromTerminusName": "계양",
    "toLineId": "suinbundang",
    "nextStationName": "남동인더스파크",
    "toTerminusName": "오이도",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "원인재",
    "fromLineId": "incheon1",
    "fromTerminusName": "계양",
    "toLineId": "suinbundang",
    "nextStationName": "연수",
    "toTerminusName": "송도",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "원인재",
    "fromLineId": "incheon1",
    "fromTerminusName": "국제업무지구",
    "toLineId": "suinbundang",
    "nextStationName": "남동인더스파크",
    "toTerminusName": "오이도",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "원인재",
    "fromLineId": "incheon1",
    "fromTerminusName": "국제업무지구",
    "toLineId": "suinbundang",
    "nextStationName": "연수",
    "toTerminusName": "송도",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "원인재",
    "fromLineId": "suinbundang",
    "fromTerminusName": "오이도",
    "toLineId": "incheon1",
    "nextStationName": "동춘",
    "toTerminusName": "국제업무지구",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "원인재",
    "fromLineId": "suinbundang",
    "fromTerminusName": "오이도",
    "toLineId": "incheon1",
    "nextStationName": "신연수",
    "toTerminusName": "계양",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "원인재",
    "fromLineId": "suinbundang",
    "fromTerminusName": "인천",
    "toLineId": "incheon1",
    "nextStationName": "동춘",
    "toTerminusName": "국제업무지구",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "원인재",
    "fromLineId": "suinbundang",
    "fromTerminusName": "인천",
    "toLineId": "incheon1",
    "nextStationName": "신연수",
    "toTerminusName": "계양",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "을지로3가",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "3",
    "nextStationName": "종로3가",
    "toTerminusName": "구파발",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "을지로3가",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "3",
    "nextStationName": "충무로",
    "toTerminusName": "오금",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "을지로3가",
    "fromLineId": "2",
    "fromTerminusName": "을지로4가",
    "toLineId": "3",
    "nextStationName": "종로3가",
    "toTerminusName": "구파발",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "을지로3가",
    "fromLineId": "2",
    "fromTerminusName": "을지로4가",
    "toLineId": "3",
    "nextStationName": "충무로",
    "toTerminusName": "오금",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "을지로3가",
    "fromLineId": "3",
    "toLineId": "2",
    "nextStationName": "을지로4가",
    "toTerminusName": "충정로(경기대입구)",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "을지로3가",
    "fromLineId": "3",
    "toLineId": "2",
    "nextStationName": "을지로입구",
    "toTerminusName": "시청",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "을지로3가",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "2",
    "nextStationName": "을지로4가",
    "toTerminusName": "충정로(경기대입구)",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "을지로3가",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "2",
    "nextStationName": "을지로입구",
    "toTerminusName": "시청",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "을지로4가",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "5",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "마천",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "을지로4가",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "5",
    "nextStationName": "종로3가(탑골공원)",
    "toTerminusName": "방화",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "을지로4가",
    "fromLineId": "2",
    "fromTerminusName": "을지로4가",
    "toLineId": "5",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "마천",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "을지로4가",
    "fromLineId": "2",
    "fromTerminusName": "을지로4가",
    "toLineId": "5",
    "nextStationName": "종로3가(탑골공원)",
    "toTerminusName": "방화",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "을지로4가",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "을지로4가",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "을지로3가",
    "toTerminusName": "시청",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "을지로4가",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "충정로(경기대입구)",
    "car": 8,
    "door": 1
  },
  {
    "stationName": "을지로4가",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "을지로3가",
    "toTerminusName": "시청",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "이촌",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "4",
    "nextStationName": "동작(현충원)",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "이촌",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "4",
    "nextStationName": "신용산",
    "toTerminusName": "불암산(당고개)",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "이촌",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "4",
    "nextStationName": "동작(현충원)",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "이촌",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "4",
    "nextStationName": "신용산",
    "toTerminusName": "불암산(당고개)",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "이촌(국립중앙박물관)",
    "fromLineId": "4",
    "toLineId": "gyeongui",
    "nextStationName": "서빙고",
    "toTerminusName": "문산",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "이촌(국립중앙박물관)",
    "fromLineId": "4",
    "toLineId": "gyeongui",
    "nextStationName": "용산",
    "toTerminusName": "용산",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "이촌(국립중앙박물관)",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "gyeongui",
    "nextStationName": "서빙고",
    "toTerminusName": "문산",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "이촌(국립중앙박물관)",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "gyeongui",
    "nextStationName": "용산",
    "toTerminusName": "용산",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "인천",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "suinbundang",
    "nextStationName": "신포",
    "toTerminusName": "오이도",
    "car": 0,
    "door": 0
  },
  {
    "stationName": "인천",
    "fromLineId": "suinbundang",
    "fromTerminusName": "인천",
    "toLineId": "1",
    "nextStationName": "동인천",
    "toTerminusName": "소요산",
    "car": 0,
    "door": 0
  },
  {
    "stationName": "인천시청",
    "fromLineId": "incheon1",
    "fromTerminusName": "계양",
    "toLineId": "incheon2",
    "nextStationName": "석바위시장",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "인천시청",
    "fromLineId": "incheon1",
    "fromTerminusName": "계양",
    "toLineId": "incheon2",
    "nextStationName": "석천사거리",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "인천시청",
    "fromLineId": "incheon1",
    "fromTerminusName": "국제업무지구",
    "toLineId": "incheon2",
    "nextStationName": "석바위시장",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "인천시청",
    "fromLineId": "incheon1",
    "fromTerminusName": "국제업무지구",
    "toLineId": "incheon2",
    "nextStationName": "석천사거리",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "인천시청",
    "fromLineId": "incheon2",
    "fromTerminusName": "검단오류",
    "toLineId": "incheon1",
    "nextStationName": "간석오거리",
    "toTerminusName": "계양",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "인천시청",
    "fromLineId": "incheon2",
    "fromTerminusName": "검단오류",
    "toLineId": "incheon1",
    "nextStationName": "예술회관",
    "toTerminusName": "계양",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "인천시청",
    "fromLineId": "incheon2",
    "fromTerminusName": "운연",
    "toLineId": "incheon1",
    "nextStationName": "간석오거리",
    "toTerminusName": "국제업무지구",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "인천시청",
    "fromLineId": "incheon2",
    "fromTerminusName": "운연",
    "toLineId": "incheon1",
    "nextStationName": "예술회관",
    "toTerminusName": "국제업무지구",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "잠실(송파구청)",
    "fromLineId": "2",
    "fromTerminusName": "건대입구",
    "toLineId": "8",
    "nextStationName": "몽촌토성(평화의문)",
    "toTerminusName": "암사",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "잠실(송파구청)",
    "fromLineId": "2",
    "fromTerminusName": "건대입구",
    "toLineId": "8",
    "nextStationName": "석촌",
    "toTerminusName": "모란",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "잠실(송파구청)",
    "fromLineId": "2",
    "fromTerminusName": "선릉",
    "toLineId": "8",
    "nextStationName": "몽촌토성(평화의문)",
    "toTerminusName": "암사",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "잠실(송파구청)",
    "fromLineId": "2",
    "fromTerminusName": "선릉",
    "toLineId": "8",
    "nextStationName": "석촌",
    "toTerminusName": "모란",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "잠실(송파구청)",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "2",
    "nextStationName": "잠실나루",
    "toTerminusName": "시청",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "잠실(송파구청)",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "2",
    "nextStationName": "잠실새내",
    "toTerminusName": "충정로(경기대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "잠실(송파구청)",
    "fromLineId": "8",
    "fromTerminusName": "암사",
    "toLineId": "2",
    "nextStationName": "잠실나루",
    "toTerminusName": "시청",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "잠실(송파구청)",
    "fromLineId": "8",
    "fromTerminusName": "암사",
    "toLineId": "2",
    "nextStationName": "잠실새내",
    "toTerminusName": "충정로(경기대입구)",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "정자",
    "fromLineId": "shinbundang",
    "fromTerminusName": "강남",
    "toLineId": "suinbundang",
    "nextStationName": "미금(분당서울대병원)",
    "toTerminusName": "왕십리",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "정자",
    "fromLineId": "shinbundang",
    "fromTerminusName": "강남",
    "toLineId": "suinbundang",
    "nextStationName": "수내(한국잡월드)",
    "toTerminusName": "수원",
    "car": 2,
    "door": 4
  },
  {
    "stationName": "정자",
    "fromLineId": "shinbundang",
    "fromTerminusName": "광교(경기대)",
    "toLineId": "suinbundang",
    "nextStationName": "미금(분당서울대병원)",
    "toTerminusName": "왕십리",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "정자",
    "fromLineId": "shinbundang",
    "fromTerminusName": "광교(경기대)",
    "toLineId": "suinbundang",
    "nextStationName": "수내(한국잡월드)",
    "toTerminusName": "수원",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "정자",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "shinbundang",
    "nextStationName": "동천",
    "toTerminusName": "광교(경기대)",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "정자",
    "fromLineId": "suinbundang",
    "fromTerminusName": "수원",
    "toLineId": "shinbundang",
    "nextStationName": "동천",
    "toTerminusName": "광교(경기대)",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "정자",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "shinbundang",
    "toTerminusName": "강남",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "정자",
    "fromLineId": "suinbundang",
    "fromTerminusName": "왕십리",
    "toLineId": "shinbundang",
    "toTerminusName": "강남",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "종로3가",
    "fromLineId": "1",
    "toLineId": "3",
    "nextStationName": "안국",
    "toTerminusName": "구파발",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "종로3가",
    "fromLineId": "1",
    "toLineId": "3",
    "nextStationName": "을지로3가",
    "toTerminusName": "오금",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "종로3가",
    "fromLineId": "1",
    "toLineId": "5",
    "nextStationName": "광화문(세종문화회관)",
    "toTerminusName": "방화",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "종로3가",
    "fromLineId": "1",
    "toLineId": "5",
    "nextStationName": "을지로4가",
    "toTerminusName": "마천",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "종로3가",
    "fromLineId": "3",
    "toLineId": "1",
    "nextStationName": "종각",
    "toTerminusName": "서울역",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "종로3가",
    "fromLineId": "3",
    "toLineId": "1",
    "nextStationName": "종로5가",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 9,
    "door": 1
  },
  {
    "stationName": "종로3가",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "1",
    "nextStationName": "종각",
    "toTerminusName": "서울역",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "종로3가",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "1",
    "nextStationName": "종로5가",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "종로3가",
    "fromLineId": "3",
    "toLineId": "5",
    "nextStationName": "광화문(세종문화회관)",
    "toTerminusName": "방화",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "종로3가",
    "fromLineId": "3",
    "toLineId": "5",
    "nextStationName": "을지로4가",
    "toTerminusName": "마천",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "종로3가",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "5",
    "nextStationName": "광화문(세종문화회관)",
    "toTerminusName": "방화",
    "car": 9,
    "door": 2
  },
  {
    "stationName": "종로3가",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "5",
    "nextStationName": "을지로4가",
    "toTerminusName": "마천",
    "car": 9,
    "door": 2
  },
  {
    "stationName": "종로3가(탑골공원)",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "1",
    "nextStationName": "종각",
    "toTerminusName": "서울역",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "종로3가(탑골공원)",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "1",
    "nextStationName": "종로5가",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "종로3가(탑골공원)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "1",
    "nextStationName": "종각",
    "toTerminusName": "서울역",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "종로3가(탑골공원)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "1",
    "nextStationName": "종로5가",
    "toTerminusName": "청량리(서울시립대입구)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "종로3가(탑골공원)",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "3",
    "nextStationName": "안국",
    "toTerminusName": "구파발",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "종로3가(탑골공원)",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "3",
    "nextStationName": "을지로3가",
    "toTerminusName": "오금",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "종로3가(탑골공원)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "3",
    "nextStationName": "안국",
    "toTerminusName": "구파발",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "종로3가(탑골공원)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "3",
    "nextStationName": "을지로3가",
    "toTerminusName": "오금",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "종합운동장",
    "fromLineId": "2",
    "fromTerminusName": "건대입구",
    "toLineId": "9",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "종합운동장",
    "fromLineId": "2",
    "fromTerminusName": "선릉",
    "toLineId": "9",
    "car": 9,
    "door": 1
  },
  {
    "stationName": "종합운동장",
    "fromLineId": "9",
    "fromTerminusName": "종합운동장",
    "toLineId": "2",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "주안",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "incheon2",
    "nextStationName": "시민공원",
    "car": 9,
    "door": 4
  },
  {
    "stationName": "주안",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "incheon2",
    "nextStationName": "주안국가산단",
    "car": 9,
    "door": 4
  },
  {
    "stationName": "주안",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "incheon2",
    "nextStationName": "시민공원",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "주안",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "incheon2",
    "nextStationName": "주안국가산단",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "주안",
    "fromLineId": "incheon2",
    "fromTerminusName": "검단오류",
    "toLineId": "1",
    "nextStationName": "간석",
    "toTerminusName": "소요산",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "주안",
    "fromLineId": "incheon2",
    "fromTerminusName": "검단오류",
    "toLineId": "1",
    "nextStationName": "도화",
    "toTerminusName": "인천",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "주안",
    "fromLineId": "incheon2",
    "fromTerminusName": "운연",
    "toLineId": "1",
    "nextStationName": "간석",
    "toTerminusName": "소요산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "주안",
    "fromLineId": "incheon2",
    "fromTerminusName": "운연",
    "toLineId": "1",
    "nextStationName": "도화",
    "toTerminusName": "인천",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "창동",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "4",
    "nextStationName": "노원",
    "toTerminusName": "불암산(당고개)",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "창동",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "4",
    "nextStationName": "쌍문",
    "toTerminusName": "남태령",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "창동",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "4",
    "nextStationName": "노원",
    "toTerminusName": "불암산(당고개)",
    "car": 10,
    "door": 3
  },
  {
    "stationName": "창동",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "4",
    "nextStationName": "쌍문",
    "toTerminusName": "남태령",
    "car": 10,
    "door": 3
  },
  {
    "stationName": "창동",
    "fromLineId": "4",
    "toLineId": "1",
    "nextStationName": "녹천",
    "toTerminusName": "신창(순천향대)",
    "car": 8,
    "door": 1
  },
  {
    "stationName": "창동",
    "fromLineId": "4",
    "toLineId": "1",
    "nextStationName": "방학",
    "toTerminusName": "소요산",
    "car": 8,
    "door": 1
  },
  {
    "stationName": "창동",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "1",
    "nextStationName": "녹천",
    "toTerminusName": "신창(순천향대)",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "창동",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "1",
    "nextStationName": "방학",
    "toTerminusName": "소요산",
    "car": 3,
    "door": 4
  },
  {
    "stationName": "천호(풍납토성)",
    "fromLineId": "5",
    "fromTerminusName": "마천",
    "toLineId": "8",
    "nextStationName": "암사",
    "toTerminusName": "암사",
    "car": 8,
    "door": 1
  },
  {
    "stationName": "천호(풍납토성)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "8",
    "nextStationName": "강동구청",
    "toTerminusName": "모란",
    "car": 1,
    "door": 2
  },
  {
    "stationName": "천호(풍납토성)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "8",
    "nextStationName": "암사",
    "toTerminusName": "암사",
    "car": 1,
    "door": 3
  },
  {
    "stationName": "천호(풍납토성)",
    "fromLineId": "5",
    "fromTerminusName": "상일동",
    "toLineId": "8",
    "nextStationName": "강동구청",
    "toTerminusName": "모란",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "천호(풍납토성)",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "5",
    "nextStationName": "강동",
    "toTerminusName": "마천",
    "car": 5,
    "door": 2
  },
  {
    "stationName": "천호(풍납토성)",
    "fromLineId": "8",
    "fromTerminusName": "모란",
    "toLineId": "5",
    "nextStationName": "광나루(장신대)",
    "toTerminusName": "방화",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "천호(풍납토성)",
    "fromLineId": "8",
    "fromTerminusName": "암사",
    "toLineId": "5",
    "nextStationName": "강동",
    "toTerminusName": "마천",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "천호(풍납토성)",
    "fromLineId": "8",
    "fromTerminusName": "암사",
    "toLineId": "5",
    "nextStationName": "광나루(장신대)",
    "toTerminusName": "방화",
    "car": 1,
    "door": 3
  },
  {
    "stationName": "청구",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "6",
    "nextStationName": "신당",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "청구",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "6",
    "nextStationName": "약수",
    "toTerminusName": "응암",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "청구",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "6",
    "nextStationName": "신당",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "청구",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "6",
    "nextStationName": "약수",
    "toTerminusName": "응암",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "청구",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "5",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "방화",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "청구",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "5",
    "nextStationName": "신금호",
    "toTerminusName": "마천",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "청구",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "5",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "방화",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "청구",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "5",
    "nextStationName": "신금호",
    "toTerminusName": "마천",
    "car": 6,
    "door": 1
  },
  {
    "stationName": "청량리",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "청량리",
    "toLineId": "1",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "청량리",
    "fromLineId": "gyeongchun",
    "fromTerminusName": "청량리",
    "toLineId": "1",
    "nextStationName": "제기동",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "청량리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "1",
    "toTerminusName": "신창(순천향대)",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "청량리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "1",
    "nextStationName": "회기",
    "toTerminusName": "소요산",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "청량리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "1",
    "toTerminusName": "신창(순천향대)",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "청량리",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "1",
    "nextStationName": "회기",
    "toTerminusName": "소요산",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "청량리(서울시립대입구)",
    "fromLineId": "1",
    "toLineId": "gyeongui",
    "nextStationName": "왕십리",
    "toTerminusName": "용산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "청량리(서울시립대입구)",
    "fromLineId": "1",
    "toLineId": "gyeongui",
    "nextStationName": "왕십리",
    "toTerminusName": "용산",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "청량리(서울시립대입구)",
    "fromLineId": "1",
    "toLineId": "gyeongui",
    "nextStationName": "회기",
    "toTerminusName": "문산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "청량리(서울시립대입구)",
    "fromLineId": "1",
    "toLineId": "gyeongui",
    "nextStationName": "회기",
    "toTerminusName": "문산",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "총신대입구(이수)",
    "fromLineId": "4",
    "toLineId": "7",
    "nextStationName": "남성",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "총신대입구(이수)",
    "fromLineId": "4",
    "toLineId": "7",
    "nextStationName": "내방",
    "toTerminusName": "장암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "총신대입구(이수)",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "7",
    "nextStationName": "남성",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "총신대입구(이수)",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "7",
    "nextStationName": "내방",
    "toTerminusName": "장암",
    "car": 10,
    "door": 4
  },
  {
    "stationName": "총신대입구(이수)",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "4",
    "nextStationName": "동작(현충원)",
    "toTerminusName": "불암산(당고개)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "총신대입구(이수)",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "4",
    "nextStationName": "사당",
    "toTerminusName": "남태령",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "총신대입구(이수)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "4",
    "nextStationName": "동작(현충원)",
    "toTerminusName": "불암산(당고개)",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "총신대입구(이수)",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "4",
    "nextStationName": "사당",
    "toTerminusName": "남태령",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "충무로",
    "fromLineId": "3",
    "toLineId": "4",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "불암산(당고개)",
    "car": 4,
    "door": 4
  },
  {
    "stationName": "충무로",
    "fromLineId": "3",
    "toLineId": "4",
    "nextStationName": "명동",
    "toTerminusName": "남태령",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "충무로",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "4",
    "nextStationName": "동대문역사문화공원",
    "toTerminusName": "불암산(당고개)",
    "car": 8,
    "door": 1
  },
  {
    "stationName": "충무로",
    "fromLineId": "3",
    "fromTerminusName": "수서",
    "toLineId": "4",
    "nextStationName": "명동",
    "toTerminusName": "남태령",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "충무로",
    "fromLineId": "4",
    "toLineId": "3",
    "nextStationName": "동대입구",
    "toTerminusName": "오금",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "충무로",
    "fromLineId": "4",
    "toLineId": "3",
    "nextStationName": "을지로3가",
    "toTerminusName": "구파발",
    "car": 7,
    "door": 1
  },
  {
    "stationName": "충무로",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "3",
    "nextStationName": "동대입구",
    "toTerminusName": "오금",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "충무로",
    "fromLineId": "4",
    "fromTerminusName": "불암산(당고개)",
    "toLineId": "3",
    "nextStationName": "을지로3가",
    "toTerminusName": "구파발",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "충정로(경기대입구)",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "5",
    "nextStationName": "서대문",
    "toTerminusName": "마천",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "충정로(경기대입구)",
    "fromLineId": "2",
    "fromTerminusName": "시청",
    "toLineId": "5",
    "nextStationName": "애오개",
    "toTerminusName": "방화",
    "car": 7,
    "door": 3
  },
  {
    "stationName": "충정로(경기대입구)",
    "fromLineId": "2",
    "fromTerminusName": "홍대입구",
    "toLineId": "5",
    "nextStationName": "서대문",
    "toTerminusName": "마천",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "충정로(경기대입구)",
    "fromLineId": "2",
    "fromTerminusName": "홍대입구",
    "toLineId": "5",
    "nextStationName": "애오개",
    "toTerminusName": "방화",
    "car": 4,
    "door": 2
  },
  {
    "stationName": "충정로(경기대입구)",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "시청",
    "toTerminusName": "시청",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "충정로(경기대입구)",
    "fromLineId": "5",
    "fromTerminusName": "강동",
    "toLineId": "2",
    "nextStationName": "아현",
    "toTerminusName": "시청",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "충정로(경기대입구)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "시청",
    "toTerminusName": "시청",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "충정로(경기대입구)",
    "fromLineId": "5",
    "fromTerminusName": "방화",
    "toLineId": "2",
    "nextStationName": "아현",
    "toTerminusName": "시청",
    "car": 4,
    "door": 1
  },
  {
    "stationName": "태릉입구",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "7",
    "nextStationName": "공릉(서울과학기술대)",
    "toTerminusName": "장암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "태릉입구",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "7",
    "nextStationName": "먹골",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "태릉입구",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "7",
    "nextStationName": "공릉(서울과학기술대)",
    "toTerminusName": "장암",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "태릉입구",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "7",
    "nextStationName": "먹골",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "태릉입구",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "6",
    "nextStationName": "석계",
    "toTerminusName": "응암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "태릉입구",
    "fromLineId": "7",
    "fromTerminusName": "온수(성공회대입구)",
    "toLineId": "6",
    "nextStationName": "화랑대(서울여대입구)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "태릉입구",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "6",
    "nextStationName": "석계",
    "toTerminusName": "응암",
    "car": 8,
    "door": 3
  },
  {
    "stationName": "태릉입구",
    "fromLineId": "7",
    "fromTerminusName": "장암",
    "toLineId": "6",
    "nextStationName": "화랑대(서울여대입구)",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 8,
    "door": 3
  },
  {
    "stationName": "합정",
    "fromLineId": "2",
    "fromTerminusName": "당산",
    "toLineId": "6",
    "nextStationName": "망원",
    "toTerminusName": "응암",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "합정",
    "fromLineId": "2",
    "fromTerminusName": "당산",
    "toLineId": "6",
    "nextStationName": "상수",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "합정",
    "fromLineId": "2",
    "fromTerminusName": "홍대입구",
    "toLineId": "6",
    "nextStationName": "망원",
    "toTerminusName": "응암",
    "car": 9,
    "door": 2
  },
  {
    "stationName": "합정",
    "fromLineId": "2",
    "fromTerminusName": "홍대입구",
    "toLineId": "6",
    "nextStationName": "상수",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 9,
    "door": 2
  },
  {
    "stationName": "합정",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "2",
    "nextStationName": "당산",
    "toTerminusName": "시청",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "합정",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "2",
    "nextStationName": "홍대입구",
    "toTerminusName": "충정로(경기대입구)",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "합정",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "2",
    "nextStationName": "당산",
    "toTerminusName": "시청",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "합정",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "2",
    "nextStationName": "홍대입구",
    "toTerminusName": "충정로(경기대입구)",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "airport",
    "nextStationName": "공덕",
    "toTerminusName": "서울역",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "airport",
    "nextStationName": "디지털미디어시티",
    "toTerminusName": "인천공항1터미널",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "2",
    "fromTerminusName": "합정",
    "toLineId": "airport",
    "nextStationName": "공덕",
    "toTerminusName": "서울역",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "2",
    "fromTerminusName": "합정",
    "toLineId": "airport",
    "nextStationName": "디지털미디어시티",
    "toTerminusName": "인천공항1터미널",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "gyeongui",
    "nextStationName": "가좌",
    "toTerminusName": "문산",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "2",
    "fromTerminusName": "충정로(경기대입구)",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "용산",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "2",
    "fromTerminusName": "합정",
    "toLineId": "gyeongui",
    "nextStationName": "가좌",
    "toTerminusName": "문산",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "2",
    "fromTerminusName": "합정",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "용산",
    "car": 8,
    "door": 2
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "2",
    "nextStationName": "신촌",
    "toTerminusName": "충정로(경기대입구)",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "2",
    "nextStationName": "합정",
    "toTerminusName": "시청",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "2",
    "nextStationName": "신촌",
    "toTerminusName": "충정로(경기대입구)",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "2",
    "nextStationName": "합정",
    "toTerminusName": "시청",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "gyeongui",
    "nextStationName": "가좌",
    "toTerminusName": "문산",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "airport",
    "fromTerminusName": "서울역",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "용산",
    "car": 5,
    "door": 3
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "gyeongui",
    "nextStationName": "가좌",
    "toTerminusName": "문산",
    "car": 2,
    "door": 2
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "airport",
    "fromTerminusName": "인천공항1터미널",
    "toLineId": "gyeongui",
    "nextStationName": "서강대",
    "toTerminusName": "용산",
    "car": 1,
    "door": 4
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "2",
    "nextStationName": "신촌",
    "toTerminusName": "충정로(경기대입구)",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "2",
    "nextStationName": "합정",
    "toTerminusName": "시청",
    "car": 5,
    "door": 1
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "2",
    "nextStationName": "신촌",
    "toTerminusName": "충정로(경기대입구)",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "2",
    "nextStationName": "합정",
    "toTerminusName": "시청",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "airport",
    "nextStationName": "김포공항",
    "toTerminusName": "인천공항1터미널",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "홍대입구",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "airport",
    "nextStationName": "김포공항",
    "toTerminusName": "인천공항1터미널",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "회기",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "gyeongui",
    "nextStationName": "중랑",
    "toTerminusName": "문산",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "회기",
    "fromLineId": "1",
    "fromTerminusName": "소요산",
    "toLineId": "gyeongui",
    "nextStationName": "청량리",
    "toTerminusName": "용산",
    "car": 7,
    "door": 2
  },
  {
    "stationName": "회기",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "gyeongui",
    "nextStationName": "중랑",
    "toTerminusName": "문산",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "회기",
    "fromLineId": "1",
    "fromTerminusName": "인천",
    "toLineId": "gyeongui",
    "nextStationName": "청량리",
    "toTerminusName": "용산",
    "car": 4,
    "door": 3
  },
  {
    "stationName": "회기",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "1",
    "toTerminusName": "신창(순천향대)",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "회기",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "1",
    "nextStationName": "외대앞",
    "toTerminusName": "소요산",
    "car": 6,
    "door": 2
  },
  {
    "stationName": "회기",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "1",
    "toTerminusName": "신창(순천향대)",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "회기",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "1",
    "nextStationName": "외대앞",
    "toTerminusName": "소요산",
    "car": 3,
    "door": 3
  },
  {
    "stationName": "효창공원앞",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "gyeongui",
    "nextStationName": "공덕",
    "toTerminusName": "문산",
    "car": 8,
    "door": 4
  },
  {
    "stationName": "효창공원앞",
    "fromLineId": "6",
    "fromTerminusName": "봉화산(서울의료원)",
    "toLineId": "gyeongui",
    "nextStationName": "용산",
    "toTerminusName": "용산",
    "car": 3,
    "door": 1
  },
  {
    "stationName": "효창공원앞",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "gyeongui",
    "nextStationName": "공덕",
    "toTerminusName": "문산",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "효창공원앞",
    "fromLineId": "6",
    "fromTerminusName": "응암",
    "toLineId": "gyeongui",
    "nextStationName": "용산",
    "toTerminusName": "용산",
    "car": 6,
    "door": 4
  },
  {
    "stationName": "효창공원앞",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "6",
    "nextStationName": "공덕",
    "toTerminusName": "응암",
    "car": 1,
    "door": 1
  },
  {
    "stationName": "효창공원앞",
    "fromLineId": "gyeongui",
    "fromTerminusName": "문산",
    "toLineId": "6",
    "nextStationName": "삼각지",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 8,
    "door": 3
  },
  {
    "stationName": "효창공원앞",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "6",
    "nextStationName": "공덕",
    "toTerminusName": "응암",
    "car": 2,
    "door": 3
  },
  {
    "stationName": "효창공원앞",
    "fromLineId": "gyeongui",
    "fromTerminusName": "용산",
    "toLineId": "6",
    "nextStationName": "삼각지",
    "toTerminusName": "봉화산(서울의료원)",
    "car": 2,
    "door": 3
  }
] as const satisfies readonly OfficialFastTransferRecord[];
