require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = Number(process.env.PORT || 3000);
const USE_MOCK_FALLBACK = String(process.env.USE_MOCK_FALLBACK || 'false') === 'true';
const DEFAULTS = {
  stage1: process.env.DEFAULT_STAGE1 || '부산광역시',
  stage2: process.env.DEFAULT_STAGE2 || '해운대구',
  centerLat: Number(process.env.DEFAULT_CENTER_LAT || 35.1631),
  centerLon: Number(process.env.DEFAULT_CENTER_LNG || 129.1635),
};

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAP_ID = process.env.GOOGLE_MAP_ID || 'DEMO_MAP_ID';

const NEMC_BASE_URL = process.env.NEMC_BASE_URL || 'https://apis.data.go.kr/B552657/ErmctInfoInqireService';
const NEMC_REALTIME_PATH = process.env.NEMC_REALTIME_PATH || '/getEmrrmRltmUsefulSckbdInfoInqire';
const NEMC_BASIC_PATH = process.env.NEMC_BASIC_PATH || '/getEgytBassInfoInqire';
const NEMC_LIST_PATH = process.env.NEMC_LIST_PATH || '/getEgytListInfoInqire';
const NEMC_NUM_ROWS = Number(process.env.NEMC_NUM_ROWS || 100);

const mockHospitals = [
  {
    hpid: 'MOCK-H001', dutyName: '해운대백병원', dutyAddr: '부산광역시 해운대구 해운대로 875', dutyTel3: '051-797-0100', dutyEmclsName: '지역응급의료센터',
    wgs84Lat: 35.1699, wgs84Lon: 129.1772,
    hvec: 5, hvoc: 2, hvicc: 6, hvcc: 1, hvncc: 0, hvccc: 2, hvgc: 140,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-797-0101',
    hv2: 4, hv3: 3, hv4: 6, hv5: 3, hv6: 1, hv7: 0, hv8: 0, hv9: 2, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H002', dutyName: '좋은강안병원', dutyAddr: '부산광역시 수영구 수영로 493', dutyTel3: '051-610-9000', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.1579, wgs84Lon: 129.1136,
    hvec: 1, hvoc: 0, hvicc: 2, hvcc: 0, hvncc: 0, hvccc: 0, hvgc: 60,
    hvctayn: 'Y', hvmriayn: 'N', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-610-9001',
    hv2: 1, hv3: 1, hv4: 1, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H003', dutyName: '부산대학교병원', dutyAddr: '부산광역시 서구 구덕로 179', dutyTel3: '051-240-7000', dutyEmclsName: '권역응급의료센터',
    wgs84Lat: 35.1013, wgs84Lon: 129.0197,
    hvec: 7, hvoc: 3, hvicc: 8, hvcc: 1, hvncc: 1, hvccc: 3, hvgc: 220,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-240-7001',
    hv2: 6, hv3: 4, hv4: 8, hv5: 4, hv6: 2, hv7: 1, hv8: 0, hv9: 3, hv10: 'Y', hv11: 'Y', hv12: '051-240-7002',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H004', dutyName: '동아대학교병원', dutyAddr: '부산광역시 서구 대신공원로 26', dutyTel3: '051-240-2500', dutyEmclsName: '권역응급의료센터',
    wgs84Lat: 35.0968, wgs84Lon: 129.0134,
    hvec: 6, hvoc: 2, hvicc: 5, hvcc: 1, hvncc: 1, hvccc: 2, hvgc: 180,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-240-2501',
    hv2: 3, hv3: 2, hv4: 5, hv5: 2, hv6: 1, hv7: 0, hv8: 0, hv9: 2, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H005', dutyName: '인제대학교 해운대백병원', dutyAddr: '부산광역시 해운대구 해운대로 875', dutyTel3: '051-797-3000', dutyEmclsName: '지역응급의료센터',
    wgs84Lat: 35.1711, wgs84Lon: 129.1755,
    hvec: 4, hvoc: 1, hvicc: 4, hvcc: 0, hvncc: 0, hvccc: 1, hvgc: 100,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-797-3001',
    hv2: 2, hv3: 2, hv4: 3, hv5: 2, hv6: 0, hv7: 0, hv8: 0, hv9: 1, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H006', dutyName: '부산의료원', dutyAddr: '부산광역시 연제구 월드컵대로 359', dutyTel3: '051-507-3000', dutyEmclsName: '지역응급의료센터',
    wgs84Lat: 35.1818, wgs84Lon: 129.0808,
    hvec: 3, hvoc: 1, hvicc: 3, hvcc: 0, hvncc: 0, hvccc: 1, hvgc: 90,
    hvctayn: 'Y', hvmriayn: 'N', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-507-3001',
    hv2: 2, hv3: 1, hv4: 2, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 1, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H007', dutyName: '고신대학교복음병원', dutyAddr: '부산광역시 서구 감천로 262', dutyTel3: '051-990-6114', dutyEmclsName: '권역응급의료센터',
    wgs84Lat: 35.0945, wgs84Lon: 129.0087,
    hvec: 8, hvoc: 3, hvicc: 7, hvcc: 2, hvncc: 1, hvccc: 2, hvgc: 200,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-990-6115',
    hv2: 5, hv3: 3, hv4: 7, hv5: 3, hv6: 2, hv7: 1, hv8: 0, hv9: 3, hv10: 'Y', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H008', dutyName: '부산백병원', dutyAddr: '부산광역시 부산진구 복지로 75', dutyTel3: '051-890-6114', dutyEmclsName: '지역응급의료센터',
    wgs84Lat: 35.1553, wgs84Lon: 129.0340,
    hvec: 4, hvoc: 1, hvicc: 3, hvcc: 0, hvncc: 0, hvccc: 1, hvgc: 110,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-890-6115',
    hv2: 2, hv3: 2, hv4: 3, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 1, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H009', dutyName: '메리놀병원', dutyAddr: '부산광역시 중구 중구로 121', dutyTel3: '051-461-2001', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.1061, wgs84Lon: 129.0307,
    hvec: 2, hvoc: 1, hvicc: 2, hvcc: 0, hvncc: 0, hvccc: 0, hvgc: 70,
    hvctayn: 'Y', hvmriayn: 'N', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-461-2002',
    hv2: 1, hv3: 1, hv4: 2, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H010', dutyName: '부민병원', dutyAddr: '부산광역시 부산진구 부전로 59', dutyTel3: '051-330-3000', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.1595, wgs84Lon: 129.0589,
    hvec: 2, hvoc: 1, hvicc: 1, hvcc: 0, hvncc: 0, hvccc: 0, hvgc: 50,
    hvctayn: 'Y', hvmriayn: 'N', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-330-3001',
    hv2: 1, hv3: 0, hv4: 1, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H011', dutyName: '센텀병원', dutyAddr: '부산광역시 해운대구 센텀중앙로 79', dutyTel3: '051-720-0000', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.1690, wgs84Lon: 129.1308,
    hvec: 3, hvoc: 1, hvicc: 2, hvcc: 0, hvncc: 0, hvccc: 0, hvgc: 65,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-720-0001',
    hv2: 1, hv3: 1, hv4: 2, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H012', dutyName: '온종합병원', dutyAddr: '부산광역시 동래구 충렬대로 120', dutyTel3: '051-550-9500', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.2031, wgs84Lon: 129.0818,
    hvec: 3, hvoc: 1, hvicc: 2, hvcc: 0, hvncc: 0, hvccc: 1, hvgc: 80,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-550-9501',
    hv2: 2, hv3: 1, hv4: 2, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H013', dutyName: '동래봉생병원', dutyAddr: '부산광역시 동래구 중앙대로 1523', dutyTel3: '051-552-7000', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.2055, wgs84Lon: 129.0778,
    hvec: 2, hvoc: 1, hvicc: 2, hvcc: 0, hvncc: 0, hvccc: 0, hvgc: 55,
    hvctayn: 'Y', hvmriayn: 'N', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-552-7001',
    hv2: 1, hv3: 1, hv4: 1, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H014', dutyName: '양산부산대학교병원', dutyAddr: '경상남도 양산시 물금읍 금오로 20', dutyTel3: '055-360-1000', dutyEmclsName: '권역응급의료센터',
    wgs84Lat: 35.3375, wgs84Lon: 129.0116,
    hvec: 10, hvoc: 4, hvicc: 10, hvcc: 2, hvncc: 2, hvccc: 3, hvgc: 300,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '055-360-1001',
    hv2: 7, hv3: 5, hv4: 9, hv5: 5, hv6: 3, hv7: 1, hv8: 0, hv9: 4, hv10: 'Y', hv11: 'Y', hv12: '055-360-1002',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H015', dutyName: '일신기독병원', dutyAddr: '부산광역시 동구 정공단로 27', dutyTel3: '051-630-0300', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.1293, wgs84Lon: 129.0485,
    hvec: 2, hvoc: 1, hvicc: 2, hvcc: 0, hvncc: 0, hvccc: 0, hvgc: 60,
    hvctayn: 'Y', hvmriayn: 'N', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-630-0301',
    hv2: 1, hv3: 1, hv4: 1, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H016', dutyName: '좋은삼선병원', dutyAddr: '부산광역시 동구 범내1길 37', dutyTel3: '051-644-2002', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.1354, wgs84Lon: 129.0530,
    hvec: 2, hvoc: 0, hvicc: 1, hvcc: 0, hvncc: 0, hvccc: 0, hvgc: 45,
    hvctayn: 'Y', hvmriayn: 'N', hvangioayn: 'N', hvventiayn: 'N', hvamyn: 'Y', hv1: '051-644-2003',
    hv2: 1, hv3: 0, hv4: 1, hv5: 0, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H017', dutyName: '김해중앙병원', dutyAddr: '경상남도 김해시 김해대로 2216', dutyTel3: '055-330-7000', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.2360, wgs84Lon: 128.8808,
    hvec: 3, hvoc: 1, hvicc: 2, hvcc: 0, hvncc: 0, hvccc: 0, hvgc: 70,
    hvctayn: 'Y', hvmriayn: 'N', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '055-330-7001',
    hv2: 1, hv3: 1, hv4: 2, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-H018', dutyName: '부산성모병원', dutyAddr: '부산광역시 남구 용호로 232', dutyTel3: '051-933-7114', dutyEmclsName: '응급의료기관',
    wgs84Lat: 35.1165, wgs84Lon: 129.0869,
    hvec: 2, hvoc: 1, hvicc: 1, hvcc: 0, hvncc: 0, hvccc: 0, hvgc: 50,
    hvctayn: 'Y', hvmriayn: 'N', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '051-933-7115',
    hv2: 1, hv3: 0, hv4: 1, hv5: 1, hv6: 0, hv7: 0, hv8: 0, hv9: 0, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  // ===== 서울 =====
  {
    hpid: 'MOCK-S001', dutyName: '서울대학교병원', dutyAddr: '서울특별시 종로구 대학로 101', dutyTel3: '02-2072-2114', dutyEmclsName: '권역응급의료센터',
    wgs84Lat: 37.5796, wgs84Lon: 126.9990,
    hvec: 12, hvoc: 5, hvicc: 10, hvcc: 3, hvncc: 2, hvccc: 3, hvgc: 350,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '02-2072-2115',
    hv2: 8, hv3: 6, hv4: 10, hv5: 5, hv6: 3, hv7: 2, hv8: 0, hv9: 4, hv10: 'Y', hv11: 'Y', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-S002', dutyName: '세브란스병원', dutyAddr: '서울특별시 서대문구 연세로 50-1', dutyTel3: '02-2228-0800', dutyEmclsName: '권역응급의료센터',
    wgs84Lat: 37.5622, wgs84Lon: 126.9410,
    hvec: 10, hvoc: 4, hvicc: 8, hvcc: 2, hvncc: 1, hvccc: 2, hvgc: 300,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '02-2228-0801',
    hv2: 7, hv3: 5, hv4: 8, hv5: 4, hv6: 2, hv7: 1, hv8: 0, hv9: 3, hv10: 'Y', hv11: 'Y', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-S003', dutyName: '삼성서울병원', dutyAddr: '서울특별시 강남구 일원로 81', dutyTel3: '02-3410-2114', dutyEmclsName: '권역응급의료센터',
    wgs84Lat: 37.4881, wgs84Lon: 127.0855,
    hvec: 9, hvoc: 4, hvicc: 9, hvcc: 2, hvncc: 2, hvccc: 3, hvgc: 320,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '02-3410-2115',
    hv2: 6, hv3: 4, hv4: 9, hv5: 4, hv6: 2, hv7: 1, hv8: 0, hv9: 3, hv10: 'Y', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-S004', dutyName: '서울아산병원', dutyAddr: '서울특별시 송파구 올림픽로43길 88', dutyTel3: '02-3010-3114', dutyEmclsName: '권역응급의료센터',
    wgs84Lat: 37.5270, wgs84Lon: 127.1080,
    hvec: 11, hvoc: 5, hvicc: 12, hvcc: 3, hvncc: 2, hvccc: 4, hvgc: 400,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '02-3010-3115',
    hv2: 9, hv3: 6, hv4: 11, hv5: 5, hv6: 3, hv7: 2, hv8: 0, hv9: 5, hv10: 'Y', hv11: 'Y', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-S005', dutyName: '고려대안암병원', dutyAddr: '서울특별시 성북구 인촌로 73', dutyTel3: '02-920-5114', dutyEmclsName: '지역응급의료센터',
    wgs84Lat: 37.5868, wgs84Lon: 127.0254,
    hvec: 6, hvoc: 2, hvicc: 5, hvcc: 1, hvncc: 0, hvccc: 1, hvgc: 160,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'Y', hvventiayn: 'Y', hvamyn: 'Y', hv1: '02-920-5115',
    hv2: 4, hv3: 3, hv4: 5, hv5: 2, hv6: 1, hv7: 0, hv8: 0, hv9: 2, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-S006', dutyName: '중앙대학교병원', dutyAddr: '서울특별시 동작구 흑석로 102', dutyTel3: '02-6299-1114', dutyEmclsName: '지역응급의료센터',
    wgs84Lat: 37.5044, wgs84Lon: 126.9577,
    hvec: 5, hvoc: 2, hvicc: 4, hvcc: 1, hvncc: 0, hvccc: 1, hvgc: 140,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '02-6299-1115',
    hv2: 3, hv3: 2, hv4: 4, hv5: 2, hv6: 1, hv7: 0, hv8: 0, hv9: 1, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  {
    hpid: 'MOCK-S007', dutyName: '한양대학교병원', dutyAddr: '서울특별시 성동구 왕십리로 222-1', dutyTel3: '02-2290-8114', dutyEmclsName: '지역응급의료센터',
    wgs84Lat: 37.5577, wgs84Lon: 127.0437,
    hvec: 4, hvoc: 2, hvicc: 3, hvcc: 0, hvncc: 0, hvccc: 1, hvgc: 120,
    hvctayn: 'Y', hvmriayn: 'Y', hvangioayn: 'N', hvventiayn: 'Y', hvamyn: 'Y', hv1: '02-2290-8115',
    hv2: 2, hv3: 2, hv4: 3, hv5: 2, hv6: 0, hv7: 0, hv8: 0, hv9: 1, hv10: 'N', hv11: 'N', hv12: '',
    hvidate: new Date().toISOString(),
  },
  // ===== 대구 =====
  { hpid:'MOCK-DG01', dutyName:'경북대학교병원', dutyAddr:'대구광역시 중구 동덕로 130', dutyTel3:'053-200-5114', dutyEmclsName:'권역응급의료센터', wgs84Lat:35.8659, wgs84Lon:128.6061, hvec:8, hvoc:3, hvicc:7, hvcc:2, hvncc:1, hvccc:2, hvgc:250, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'053-200-5115', hv2:5, hv3:3, hv4:7, hv5:3, hv6:2, hv7:1, hv8:0, hv9:3, hv10:'Y', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-DG02', dutyName:'영남대학교병원', dutyAddr:'대구광역시 남구 현충로 170', dutyTel3:'053-620-3114', dutyEmclsName:'권역응급의료센터', wgs84Lat:35.8513, wgs84Lon:128.6255, hvec:6, hvoc:2, hvicc:5, hvcc:1, hvncc:0, hvccc:1, hvgc:180, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'053-620-3115', hv2:4, hv3:2, hv4:5, hv5:2, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-DG03', dutyName:'대구가톨릭대학교병원', dutyAddr:'대구광역시 남구 두류공원로17길 33', dutyTel3:'053-650-4114', dutyEmclsName:'지역응급의료센터', wgs84Lat:35.8543, wgs84Lon:128.5784, hvec:5, hvoc:2, hvicc:4, hvcc:0, hvncc:0, hvccc:1, hvgc:150, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'053-650-4115', hv2:3, hv3:2, hv4:4, hv5:2, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 인천 =====
  { hpid:'MOCK-IC01', dutyName:'가천대길병원', dutyAddr:'인천광역시 남동구 남동대로774번길 21', dutyTel3:'032-460-3114', dutyEmclsName:'권역응급의료센터', wgs84Lat:37.4506, wgs84Lon:126.7020, hvec:7, hvoc:3, hvicc:6, hvcc:1, hvncc:1, hvccc:2, hvgc:200, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'032-460-3115', hv2:5, hv3:3, hv4:6, hv5:3, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-IC02', dutyName:'인하대학교병원', dutyAddr:'인천광역시 중구 인항로 27', dutyTel3:'032-890-2114', dutyEmclsName:'권역응급의료센터', wgs84Lat:37.4509, wgs84Lon:126.6544, hvec:6, hvoc:2, hvicc:5, hvcc:1, hvncc:0, hvccc:1, hvgc:170, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'032-890-2115', hv2:4, hv3:2, hv4:5, hv5:2, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-IC03', dutyName:'인천성모병원', dutyAddr:'인천광역시 부평구 동수로 56', dutyTel3:'032-280-5114', dutyEmclsName:'지역응급의료센터', wgs84Lat:37.4864, wgs84Lon:126.7228, hvec:4, hvoc:1, hvicc:3, hvcc:0, hvncc:0, hvccc:1, hvgc:120, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'032-280-5115', hv2:2, hv3:1, hv4:3, hv5:1, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 광주 =====
  { hpid:'MOCK-GJ01', dutyName:'전남대학교병원', dutyAddr:'광주광역시 동구 제봉로 42', dutyTel3:'062-220-5114', dutyEmclsName:'권역응급의료센터', wgs84Lat:35.1412, wgs84Lon:126.9226, hvec:8, hvoc:3, hvicc:6, hvcc:1, hvncc:1, hvccc:2, hvgc:220, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'062-220-5115', hv2:5, hv3:3, hv4:6, hv5:3, hv6:2, hv7:1, hv8:0, hv9:3, hv10:'Y', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-GJ02', dutyName:'조선대학교병원', dutyAddr:'광주광역시 동구 필문대로 365', dutyTel3:'062-220-3114', dutyEmclsName:'지역응급의료센터', wgs84Lat:35.1381, wgs84Lon:126.9307, hvec:5, hvoc:2, hvicc:4, hvcc:0, hvncc:0, hvccc:1, hvgc:150, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'062-220-3115', hv2:3, hv3:2, hv4:4, hv5:2, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 대전 =====
  { hpid:'MOCK-DJ01', dutyName:'충남대학교병원', dutyAddr:'대전광역시 중구 문화로 282', dutyTel3:'042-280-7114', dutyEmclsName:'권역응급의료센터', wgs84Lat:36.3219, wgs84Lon:127.4083, hvec:7, hvoc:3, hvicc:6, hvcc:1, hvncc:1, hvccc:2, hvgc:200, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'042-280-7115', hv2:5, hv3:3, hv4:6, hv5:3, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-DJ02', dutyName:'을지대학교병원', dutyAddr:'대전광역시 서구 둔산서로 95', dutyTel3:'042-611-3114', dutyEmclsName:'지역응급의료센터', wgs84Lat:36.3514, wgs84Lon:127.3782, hvec:5, hvoc:2, hvicc:4, hvcc:0, hvncc:0, hvccc:1, hvgc:140, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'042-611-3115', hv2:3, hv3:2, hv4:4, hv5:2, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 울산 =====
  { hpid:'MOCK-US01', dutyName:'울산대학교병원', dutyAddr:'울산광역시 동구 방어진순환도로 877', dutyTel3:'052-250-7114', dutyEmclsName:'권역응급의료센터', wgs84Lat:35.5341, wgs84Lon:129.3585, hvec:7, hvoc:3, hvicc:6, hvcc:1, hvncc:1, hvccc:2, hvgc:190, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'052-250-7115', hv2:5, hv3:3, hv4:6, hv5:3, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-US02', dutyName:'동강병원', dutyAddr:'울산광역시 중구 태화로 239', dutyTel3:'052-241-1114', dutyEmclsName:'지역응급의료센터', wgs84Lat:35.5505, wgs84Lon:129.3160, hvec:4, hvoc:1, hvicc:3, hvcc:0, hvncc:0, hvccc:1, hvgc:100, hvctayn:'Y', hvmriayn:'N', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'052-241-1115', hv2:2, hv3:1, hv4:3, hv5:1, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 세종 =====
  { hpid:'MOCK-SJ01', dutyName:'세종충남대학교병원', dutyAddr:'세종특별자치시 보듬7로 20', dutyTel3:'044-995-4114', dutyEmclsName:'지역응급의료센터', wgs84Lat:36.5040, wgs84Lon:127.0100, hvec:5, hvoc:2, hvicc:4, hvcc:0, hvncc:0, hvccc:1, hvgc:130, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'044-995-4115', hv2:3, hv3:2, hv4:4, hv5:2, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 경기도 =====
  { hpid:'MOCK-GG01', dutyName:'아주대학교병원', dutyAddr:'경기도 수원시 영통구 월드컵로 164', dutyTel3:'031-219-5114', dutyEmclsName:'권역응급의료센터', wgs84Lat:37.2792, wgs84Lon:127.0465, hvec:9, hvoc:4, hvicc:8, hvcc:2, hvncc:1, hvccc:2, hvgc:280, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'031-219-5115', hv2:6, hv3:4, hv4:8, hv5:4, hv6:2, hv7:1, hv8:0, hv9:3, hv10:'Y', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-GG02', dutyName:'분당서울대학교병원', dutyAddr:'경기도 성남시 분당구 구미로173번길 82', dutyTel3:'031-787-7114', dutyEmclsName:'권역응급의료센터', wgs84Lat:37.3520, wgs84Lon:127.1236, hvec:8, hvoc:3, hvicc:7, hvcc:1, hvncc:1, hvccc:2, hvgc:260, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'031-787-7115', hv2:5, hv3:3, hv4:7, hv5:3, hv6:1, hv7:0, hv8:0, hv9:3, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-GG03', dutyName:'고려대안산병원', dutyAddr:'경기도 안산시 단원구 적금로 123', dutyTel3:'031-412-5114', dutyEmclsName:'지역응급의료센터', wgs84Lat:37.3181, wgs84Lon:126.8518, hvec:5, hvoc:2, hvicc:4, hvcc:0, hvncc:0, hvccc:1, hvgc:150, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'031-412-5115', hv2:3, hv3:2, hv4:4, hv5:2, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 강원도 =====
  { hpid:'MOCK-GW01', dutyName:'강원대학교병원', dutyAddr:'강원특별자치도 춘천시 백령로 156', dutyTel3:'033-258-2000', dutyEmclsName:'권역응급의료센터', wgs84Lat:37.8677, wgs84Lon:127.7431, hvec:6, hvoc:2, hvicc:5, hvcc:1, hvncc:0, hvccc:1, hvgc:160, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'033-258-2001', hv2:4, hv3:2, hv4:5, hv5:2, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-GW02', dutyName:'원주세브란스기독병원', dutyAddr:'강원특별자치도 원주시 일산로 20', dutyTel3:'033-741-1114', dutyEmclsName:'권역응급의료센터', wgs84Lat:37.3522, wgs84Lon:127.9453, hvec:7, hvoc:3, hvicc:5, hvcc:1, hvncc:0, hvccc:1, hvgc:180, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'033-741-1115', hv2:4, hv3:3, hv4:5, hv5:3, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 충청북도 =====
  { hpid:'MOCK-CB01', dutyName:'충북대학교병원', dutyAddr:'충청북도 청주시 서원구 1순환로 776', dutyTel3:'043-269-6114', dutyEmclsName:'권역응급의료센터', wgs84Lat:36.6230, wgs84Lon:127.4597, hvec:6, hvoc:2, hvicc:5, hvcc:1, hvncc:0, hvccc:1, hvgc:170, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'043-269-6115', hv2:4, hv3:2, hv4:5, hv5:2, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 충청남도 =====
  { hpid:'MOCK-CN01', dutyName:'단국대학교병원', dutyAddr:'충청남도 천안시 동남구 망향로 201', dutyTel3:'041-550-6114', dutyEmclsName:'권역응급의료센터', wgs84Lat:36.8379, wgs84Lon:127.1436, hvec:7, hvoc:3, hvicc:5, hvcc:1, hvncc:0, hvccc:1, hvgc:190, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'041-550-6115', hv2:4, hv3:3, hv4:5, hv5:3, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-CN02', dutyName:'순천향대학교천안병원', dutyAddr:'충청남도 천안시 동남구 순천향6길 31', dutyTel3:'041-570-2114', dutyEmclsName:'지역응급의료센터', wgs84Lat:36.8156, wgs84Lon:127.1505, hvec:5, hvoc:2, hvicc:4, hvcc:0, hvncc:0, hvccc:1, hvgc:140, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'041-570-2115', hv2:3, hv3:2, hv4:4, hv5:2, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 전라북도 =====
  { hpid:'MOCK-JB01', dutyName:'전북대학교병원', dutyAddr:'전북특별자치도 전주시 덕진구 건지로 20', dutyTel3:'063-250-1114', dutyEmclsName:'권역응급의료센터', wgs84Lat:35.8446, wgs84Lon:127.1361, hvec:7, hvoc:3, hvicc:6, hvcc:1, hvncc:1, hvccc:2, hvgc:210, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'063-250-1115', hv2:5, hv3:3, hv4:6, hv5:3, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-JB02', dutyName:'원광대학교병원', dutyAddr:'전북특별자치도 익산시 익산대로 895', dutyTel3:'063-859-1114', dutyEmclsName:'지역응급의료센터', wgs84Lat:35.9557, wgs84Lon:126.9567, hvec:5, hvoc:2, hvicc:4, hvcc:0, hvncc:0, hvccc:1, hvgc:150, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'063-859-1115', hv2:3, hv3:2, hv4:4, hv5:2, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 전라남도 =====
  { hpid:'MOCK-JN01', dutyName:'화순전남대학교병원', dutyAddr:'전라남도 화순군 화순읍 서양로 322', dutyTel3:'061-379-7114', dutyEmclsName:'권역응급의료센터', wgs84Lat:35.0804, wgs84Lon:126.9873, hvec:6, hvoc:2, hvicc:5, hvcc:1, hvncc:0, hvccc:1, hvgc:170, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'061-379-7115', hv2:4, hv3:2, hv4:5, hv5:2, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-JN02', dutyName:'목포한국병원', dutyAddr:'전라남도 목포시 영산로 483', dutyTel3:'061-270-5114', dutyEmclsName:'지역응급의료센터', wgs84Lat:34.8005, wgs84Lon:126.4219, hvec:4, hvoc:1, hvicc:3, hvcc:0, hvncc:0, hvccc:0, hvgc:80, hvctayn:'Y', hvmriayn:'N', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'061-270-5115', hv2:2, hv3:1, hv4:3, hv5:1, hv6:0, hv7:0, hv8:0, hv9:0, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 경상북도 =====
  { hpid:'MOCK-GB01', dutyName:'포항성모병원', dutyAddr:'경상북도 포항시 남구 대잠동길 17', dutyTel3:'054-272-0151', dutyEmclsName:'지역응급의료센터', wgs84Lat:36.0100, wgs84Lon:129.3592, hvec:5, hvoc:2, hvicc:4, hvcc:0, hvncc:0, hvccc:1, hvgc:120, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'054-272-0152', hv2:3, hv3:2, hv4:4, hv5:2, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-GB02', dutyName:'안동병원', dutyAddr:'경상북도 안동시 앙실로 11', dutyTel3:'054-840-1004', dutyEmclsName:'지역응급의료센터', wgs84Lat:36.5569, wgs84Lon:128.7308, hvec:4, hvoc:1, hvicc:3, hvcc:0, hvncc:0, hvccc:0, hvgc:90, hvctayn:'Y', hvmriayn:'N', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'054-840-1005', hv2:2, hv3:1, hv4:3, hv5:1, hv6:0, hv7:0, hv8:0, hv9:0, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 경상남도 =====
  { hpid:'MOCK-GN01', dutyName:'창원경상국립대학교병원', dutyAddr:'경상남도 창원시 성산구 삼정자로 11', dutyTel3:'055-214-1000', dutyEmclsName:'권역응급의료센터', wgs84Lat:35.2340, wgs84Lon:128.6819, hvec:7, hvoc:3, hvicc:6, hvcc:1, hvncc:1, hvccc:2, hvgc:200, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'055-214-1001', hv2:5, hv3:3, hv4:6, hv5:3, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-GN02', dutyName:'삼성창원병원', dutyAddr:'경상남도 창원시 마산회원구 팔룡로 158', dutyTel3:'055-290-6114', dutyEmclsName:'지역응급의료센터', wgs84Lat:35.2245, wgs84Lon:128.5782, hvec:5, hvoc:2, hvicc:4, hvcc:0, hvncc:0, hvccc:1, hvgc:140, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'055-290-6115', hv2:3, hv3:2, hv4:4, hv5:2, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  // ===== 제주도 =====
  { hpid:'MOCK-JJ01', dutyName:'제주대학교병원', dutyAddr:'제주특별자치도 제주시 아란13길 15', dutyTel3:'064-717-1114', dutyEmclsName:'권역응급의료센터', wgs84Lat:33.4616, wgs84Lon:126.5605, hvec:6, hvoc:2, hvicc:5, hvcc:1, hvncc:0, hvccc:1, hvgc:150, hvctayn:'Y', hvmriayn:'Y', hvangioayn:'Y', hvventiayn:'Y', hvamyn:'Y', hv1:'064-717-1115', hv2:4, hv3:2, hv4:5, hv5:2, hv6:1, hv7:0, hv8:0, hv9:2, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
  { hpid:'MOCK-JJ02', dutyName:'한라병원', dutyAddr:'제주특별자치도 제주시 도령로 65', dutyTel3:'064-740-5000', dutyEmclsName:'지역응급의료센터', wgs84Lat:33.4891, wgs84Lon:126.4994, hvec:4, hvoc:1, hvicc:3, hvcc:0, hvncc:0, hvccc:0, hvgc:100, hvctayn:'Y', hvmriayn:'N', hvangioayn:'N', hvventiayn:'Y', hvamyn:'Y', hv1:'064-740-5001', hv2:2, hv3:1, hv4:3, hv5:1, hv6:0, hv7:0, hv8:0, hv9:1, hv10:'N', hv11:'N', hv12:'', hvidate:new Date().toISOString() },
];

function decodeXml(text = '') {
  return String(text)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseSimpleXmlItem(itemXml) {
  const out = {};
  const tagRegex = /<([A-Za-z0-9_:-]+)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = tagRegex.exec(itemXml))) {
    const [, tag, rawValue] = match;
    // CDATA 제거 후 중첩 태그 체크 (CDATA 자체는 허용해야 함)
    const stripped = rawValue.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
    if (stripped.includes('<') && stripped.includes('>')) continue;
    out[tag] = decodeXml(rawValue);
  }
  return out;
}

function getItemsFromXml(xmlText) {
  const itemMatches = String(xmlText).match(/<item>([\s\S]*?)<\/item>/g) || [];
  return itemMatches.map((block) => parseSimpleXmlItem(block));
}

function getResponseMeta(xmlText = '') {
  const code = String(xmlText).match(/<resultCode>(.*?)<\/resultCode>/)?.[1]?.trim() || '';
  const message = decodeXml(String(xmlText).match(/<resultMsg>(.*?)<\/resultMsg>/)?.[1] || String(xmlText).match(/<resultMag>(.*?)<\/resultMag>/)?.[1] || '');
  return { resultCode: code, resultMsg: message };
}

function asNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function yesNo(value) {
  return String(value || '').toUpperCase() === 'Y';
}

function isMeaningful(value) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  if (!text) return false;
  return !['이름 없음', '-', 'null', 'undefined', 'NaN'].includes(text);
}

function firstMeaningful(...values) {
  return values.find((v) => isMeaningful(v));
}

function normalizedHospitalName(item = {}) {
  return firstMeaningful(
    item.dutyName,
    item.dutyname,
    item.dutyNm,
    item.dutynm,
    item.yadmNm,
    item.yadmnm,
    item.name,
    item.hospName,
    item.hospitalName,
  ) || '이름 없음';
}

function normalizeHospital(item = {}) {
  return {
    id: firstMeaningful(item.hpid, item.id, normalizedHospitalName(item)) || Math.random().toString(36).slice(2),
    hpid: firstMeaningful(item.hpid, item.id) || null,
    dutyName: normalizedHospitalName(item),
    dutyAddr: firstMeaningful(item.dutyAddr, item.dutyaddr, item.address, item.addr) || '',
    dutyTel3: firstMeaningful(item.dutyTel3, item.dutytel3, item.phone, item.dutytel1, item.dutyTel1) || '',
    dutyEmclsName: firstMeaningful(item.dutyEmclsName, item.dutyemclsname, item.className, item.emclsName) || '',
    wgs84Lat: asNumber(firstMeaningful(item.wgs84Lat, item.wgs84lat, item.lat, item.latitude)),
    wgs84Lon: asNumber(firstMeaningful(item.wgs84Lon, item.wgs84lon, item.lon, item.lng, item.longitude)),
    hvec: asNumber(item.hvec),
    hvoc: asNumber(item.hvoc),
    hvcc: asNumber(item.hvcc),
    hvncc: asNumber(item.hvncc),
    hvccc: asNumber(item.hvccc),
    hvicc: asNumber(item.hvicc),
    hvgc: asNumber(item.hvgc),
    hvdnm: item.hvdnm || '',
    hvctayn: item.hvctayn || '',
    hvmriayn: item.hvmriayn || '',
    hvangioayn: item.hvangioayn || '',
    hvventiayn: item.hvventiayn || '',
    hvamyn: item.hvamyn || '',
    hv1: item.hv1 || '',
    hv2: asNumber(item.hv2),
    hv3: asNumber(item.hv3),
    hv4: asNumber(item.hv4),
    hv5: asNumber(item.hv5),
    hv6: asNumber(item.hv6),
    hv7: asNumber(item.hv7),
    hv8: asNumber(item.hv8),
    hv9: asNumber(item.hv9),
    hv10: item.hv10 || '',
    hv11: item.hv11 || '',
    hv12: item.hv12 || '',
    hvidate: item.hvidate || '',
  };
}

function mergeHospitalRecords(...records) {
  const normalized = records.filter(Boolean).map(normalizeHospital);
  const merged = normalized.reduce((acc, item) => ({ ...acc, ...item }), {});
  return {
    ...merged,
    id: firstMeaningful(...normalized.map((r) => r.id)) || merged.id,
    hpid: firstMeaningful(...normalized.map((r) => r.hpid)) || merged.hpid || null,
    dutyName: firstMeaningful(...normalized.map((r) => r.dutyName)) || '이름 없음',
    dutyAddr: firstMeaningful(...normalized.map((r) => r.dutyAddr)) || '',
    dutyTel3: firstMeaningful(...normalized.map((r) => r.dutyTel3)) || '',
    dutyEmclsName: firstMeaningful(...normalized.map((r) => r.dutyEmclsName)) || '',
    wgs84Lat: normalized.map((r) => r.wgs84Lat).find((v) => Number.isFinite(v)) ?? null,
    wgs84Lon: normalized.map((r) => r.wgs84Lon).find((v) => Number.isFinite(v)) ?? null,
  };
}

function joinNemcUrl(base, pathname) {
  const normalizedBase = String(base || '').replace(/\/+$/, '');
  const normalizedPath = String(pathname || '').replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
}

function buildNemcUrl(pathname, params = {}, serviceKeyVariant) {
  const url = new URL(joinNemcUrl(NEMC_BASE_URL, pathname));
  url.searchParams.set('serviceKey', serviceKeyVariant ?? (process.env.NEMC_SERVICE_KEY || ''));
  if (params.pageNo) url.searchParams.set('pageNo', String(params.pageNo));
  if (params.numOfRows) url.searchParams.set('numOfRows', String(params.numOfRows));
  if (params.STAGE1) url.searchParams.set('STAGE1', params.STAGE1);
  if (params.STAGE2) url.searchParams.set('STAGE2', params.STAGE2);
  if (params.Q0) url.searchParams.set('Q0', params.Q0);
  if (params.Q1) url.searchParams.set('Q1', params.Q1);
  if (params.HPID) url.searchParams.set('HPID', params.HPID);
  if (params.hpid) url.searchParams.set('HPID', params.hpid);
  return url.toString();
}

function getServiceKeyCandidates() {
  const raw = String(process.env.NEMC_SERVICE_KEY || '').trim();
  if (!raw) return [''];
  const variants = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded && !variants.includes(decoded)) variants.push(decoded);
  } catch {}
  return variants;
}

async function fetchXml(pathname, params = {}) {
  let lastError = null;
  for (const serviceKeyVariant of getServiceKeyCandidates()) {
    const url = buildNemcUrl(pathname, params, serviceKeyVariant);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        headers: {
          Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'RefuseLog-NEMC/1.5',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await res.text();
      const meta = getResponseMeta(text);
      if (res.ok && (!meta.resultCode || meta.resultCode === '00')) return text;
      lastError = new Error(`NEMC ${res.status}: ${meta.resultMsg || text.slice(0, 180) || 'Unknown error'}`);
      debugLog('WARN', 'NEMC 응답 에러', { status: res.status, msg: meta.resultMsg, code: meta.resultCode });
    } catch (error) {
      lastError = error;
      debugLog('ERROR', 'NEMC fetch 실패', { msg: error.message, url: url.slice(0, 80) });
    }
  }
  throw lastError || new Error('응급실 API 호출 실패');
}

function parseNemcDate(text) {
  if (!text) return null;
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = String(text).match(/(\d{4})-(\d{1,2})-(\d{1,2})\s*(오전|오후)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  let [, y, m, d, meridiem, hh, mm, ss] = match;
  let hour = Number(hh);
  if (meridiem === '오후' && hour < 12) hour += 12;
  if (meridiem === '오전' && hour === 12) hour = 0;
  return new Date(Number(y), Number(m) - 1, Number(d), hour, Number(mm), Number(ss || 0));
}

function minutesSince(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function haversineKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every((v) => Number.isFinite(v))) return null;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 10) / 10;
}


function normalizeStage2Name(stage2 = '') {
  const raw = String(stage2 || '').trim();
  if (!raw) return '';
  const compact = raw.split(/\s+/).pop() || raw;
  return compact.replace(/^부산광역시$/,'').trim() || compact;
}

function computeCapacityScore(h) {
  const emergency = (h.hvec || 0) * 7;
  const surgery = (h.hvoc || 0) * 5;
  const icu = (h.hvicc || 0) * 3.2 + (h.hvcc || 0) * 3 + (h.hvncc || 0) * 3 + (h.hvccc || 0) * 3;
  const ward = Math.min((h.hvgc || 0) * 0.08, 12);
  const specialtyBeds = (h.hv2 || 0) * 1.5 + (h.hv3 || 0) * 1.5 + (h.hv6 || 0) * 1.8 + (h.hv9 || 0) * 2.2;
  const equipment = [h.hvctayn, h.hvmriayn, h.hvangioayn, h.hvventiayn, h.hvamyn].filter(yesNo).length * 3.8;
  return Math.round((emergency + surgery + icu + ward + specialtyBeds + equipment) * 10) / 10;
}

function classBonus(name = '') {
  if (/권역응급의료센터/.test(name)) return 12;
  if (/지역응급의료센터/.test(name)) return 6;
  if (/전문응급의료센터/.test(name)) return 8;
  if (/응급의료기관/.test(name)) return 3;
  return 0;
}

function severityBase(ktas) {
  return ({ 1: 12, 2: 20, 3: 35, 4: 52, 5: 68 })[Number(ktas)] || 35;
}

function specialtyAdjustment(request, h) {
  const specialty = request?.specialty || '';
  let delta = 0;
  const notes = [];
  if (specialty === '외상') {
    if ((h.hv9 || 0) > 0) { delta -= 8; notes.push('외상 병상 반영'); } else { delta += 10; notes.push('외상 병상 부족'); }
    if ((h.hvoc || 0) > 0) { delta -= 5; notes.push('수술실 가용'); } else { delta += 8; notes.push('수술실 부족'); }
    if (yesNo(h.hvctayn)) delta -= 2; else delta += 4;
  } else if (specialty === '심혈관') {
    if (yesNo(h.hvangioayn)) { delta -= 9; notes.push('조영장비 가용'); } else { delta += 12; notes.push('조영장비 부족'); }
    if ((h.hv2 || 0) > 0 || (h.hvicc || 0) > 0) delta -= 4; else delta += 6;
  } else if (specialty === '소아') {
    if (yesNo(h.hv10)) { delta -= 6; notes.push('소아 VENTI 가용'); } else { delta += 10; notes.push('소아 VENTI 부족'); }
    if (yesNo(h.hv11)) delta -= 4; else delta += 6;
  } else if (specialty === '신경') {
    if ((h.hv6 || 0) > 0) { delta -= 6; notes.push('신경외과 ICU 반영'); } else { delta += 9; notes.push('신경외과 ICU 부족'); }
    if (yesNo(h.hvmriayn)) delta -= 3; else delta += 5;
  } else if (specialty === '내과') {
    if ((h.hv2 || 0) > 0) delta -= 4; else delta += 5;
  }
  return { delta, notes };
}

function computePrediction(h, request = {}, userLat, userLon) {
  const cap = computeCapacityScore(h);
  const freshnessMinutes = minutesSince(parseNemcDate(h.hvidate));
  const stalePenalty = freshnessMinutes == null ? 10 : freshnessMinutes > 180 ? 20 : freshnessMinutes > 90 ? 12 : freshnessMinutes > 45 ? 6 : 0;
  const specialty = specialtyAdjustment(request, h);
  const distanceKm = haversineKm(userLat, userLon, h.wgs84Lat, h.wgs84Lon);
  const distancePenalty = distanceKm == null ? 8 : Math.round(distanceKm * 1.8);
  const missingPenalty = [h.hvec, h.hvoc, h.hvicc, h.hvgc].filter((v) => v == null).length * 4;
  const emptyPenalty = (h.hvec || 0) === 0 ? 15 : 0;
  const equipmentPenalty = [h.hvctayn, h.hvmriayn, h.hvangioayn].filter((v) => v && !yesNo(v)).length * 2;
  const minutes = clamp(Math.round(severityBase(request.ktas) + distancePenalty + stalePenalty + missingPenalty + emptyPenalty + equipmentPenalty - Math.min(cap * 0.06, 15) - classBonus(h.dutyEmclsName) + specialty.delta), 7, 180);
  const evidenceCount = [h.hvec, h.hvoc, h.hvicc, h.hvcc, h.hvncc, h.hvccc, h.hvgc, h.hvctayn, h.hvmriayn, h.hvangioayn, h.hvventiayn, h.hvamyn, h.hvidate, h.wgs84Lat, h.wgs84Lon].filter((v) => v !== null && v !== undefined && v !== '').length;
  let confidence = '낮음';
  if (evidenceCount >= 12 && (freshnessMinutes == null || freshnessMinutes <= 60)) confidence = '높음';
  else if (evidenceCount >= 8) confidence = '보통';
  const pressure = minutes <= 20 ? '낮음' : minutes <= 45 ? '보통' : minutes <= 75 ? '높음' : '매우 높음';
  const rationale = [];
  rationale.push(`병상 ${h.hvec ?? '-'} / 수술실 ${h.hvoc ?? '-'} / ICU ${h.hvicc ?? '-'}`);
  rationale.push(`CT ${yesNo(h.hvctayn) ? '가능' : '미확인'} · MRI ${yesNo(h.hvmriayn) ? '가능' : '미확인'} · 구급차 ${yesNo(h.hvamyn) ? '가능' : '미확인'}`);
  if (distanceKm != null) rationale.push(`현 위치 기준 약 ${distanceKm}km`);
  if (freshnessMinutes != null) rationale.push(`업데이트 ${freshnessMinutes}분 전`);
  if (specialty.notes.length) rationale.push(specialty.notes.join(' · '));
  const score = Math.round(200 - minutes + cap + classBonus(h.dutyEmclsName) + (confidence === '높음' ? 10 : confidence === '보통' ? 4 : 0) - (distanceKm || 0));
  return { predictedWaitMinutes: minutes, predictedPressure: pressure, confidence, capacityScore: cap, freshnessMinutes, distanceKm, rationale, recommendationScore: score, evidenceCount };
}

function mockForRegion(stage1 = '') {
  const s = String(stage1 || '');
  const regionKeywords = {
    '서울': '서울', '부산': '부산', '대구': '대구', '인천': '인천',
    '광주': '광주', '대전': '대전', '울산': '울산', '세종': '세종',
    '경기': '경기', '강원': '강원', '충북': '충청북', '충남': '충청남',
    '전북': '전북', '전라북': '전북', '전남': '전라남', '경북': '경상북',
    '경남': '경상남', '제주': '제주',
  };
  for (const [key, addr] of Object.entries(regionKeywords)) {
    if (s.includes(key)) {
      const filtered = mockHospitals.filter(h => h.dutyAddr?.includes(addr) || h.dutyAddr?.includes(key));
      return filtered.length ? filtered : mockHospitals;
    }
  }
  return mockHospitals;
}

async function fetchHospitalsOnce(stage1, stage2) {
  if (!process.env.NEMC_SERVICE_KEY) {
    if (USE_MOCK_FALLBACK) return mockForRegion(stage1).map((item) => ({ ...normalizeHospital(item), dataOrigin: 'mock' }));
    throw new Error('NEMC_SERVICE_KEY가 비어 있어.');
  }

  let realtimeXml, listXml;
  try {
    [realtimeXml, listXml] = await Promise.all([
      fetchXml(NEMC_REALTIME_PATH, { STAGE1: stage1, STAGE2: stage2, pageNo: 1, numOfRows: NEMC_NUM_ROWS }),
      fetchXml(NEMC_LIST_PATH, { Q0: stage1, Q1: stage2, pageNo: 1, numOfRows: NEMC_NUM_ROWS }).catch((e) => { debugLog('WARN', '목록API 실패', e.message); return null; }),
    ]);
  } catch (e) {
    debugLog('ERROR', '실시간API 실패', e.message);
    if (USE_MOCK_FALLBACK) return mockForRegion(stage1).map((item) => ({ ...normalizeHospital(item), dataOrigin: 'mock' }));
    throw e;
  }

  const realtimeItems = getItemsFromXml(realtimeXml).map(normalizeHospital);
  debugLog('INFO', `실시간API ${realtimeItems.length}곳, 목록API ${listXml ? getItemsFromXml(listXml).length : 0}곳`);
  
  const listItems = listXml ? getItemsFromXml(listXml).map(normalizeHospital) : [];
  const listMap = new Map(listItems.filter((item) => item.hpid).map((item) => [String(item.hpid), item]));

  let merged = realtimeItems
    .map((rt) => mergeHospitalRecords(listMap.get(String(rt.hpid)), rt, { dataOrigin: 'nemc-live' }))
    .filter((item) => item.hpid || item.dutyName);

  const needBasic = merged
    .filter((item) => !isMeaningful(item.dutyName) || !isMeaningful(item.dutyAddr) || item.wgs84Lat == null || item.wgs84Lon == null)
    .slice(0, 30);

  if (needBasic.length) {
    debugLog('INFO', `기본정보API 보충 필요: ${needBasic.length}곳`);
    const basicResults = await Promise.all(needBasic.map(async (item) => {
      try {
        const basicXml = await fetchXml(NEMC_BASIC_PATH, { HPID: item.hpid, pageNo: 1, numOfRows: 1 });
        const basic = getItemsFromXml(basicXml).map(normalizeHospital)[0];
        return [String(item.hpid), basic || null];
      } catch {
        return [String(item.hpid), null];
      }
    }));
    const basicMap = new Map(basicResults.filter(([, v]) => v));
    debugLog('INFO', `기본정보API 보충 성공: ${basicMap.size}곳`);
    merged = merged.map((item) => mergeHospitalRecords(item, basicMap.get(String(item.hpid)), { dataOrigin: 'nemc-live' }));
  }

  // 이름 없는 병원이 과반수면 → 데이터 불완전 → mock 병합
  const noNameCount = merged.filter((item) => !isMeaningful(item.dutyName) || item.wgs84Lat == null).length;
  if (USE_MOCK_FALLBACK && noNameCount > merged.length / 2) {
    debugLog('WARN', `NEMC 데이터 불완전 (이름없음 ${noNameCount}/${merged.length}곳) → mock 병합`);
    const mockNorm = mockForRegion(stage1).map((item) => ({ ...normalizeHospital(item), dataOrigin: 'mock' }));
    // NEMC 데이터 중 이름 있는 것만 유지 + mock 추가
    const validNemc = merged.filter((item) => isMeaningful(item.dutyName) && item.wgs84Lat != null);
    const existingIds = new Set(validNemc.map((item) => item.hpid));
    const newMock = mockNorm.filter((item) => !existingIds.has(item.hpid));
    merged = [...validNemc, ...newMock];
  }

  return merged.map((item) => ({ ...item, dataOrigin: item.dataOrigin || 'nemc-live' }));
}


const hospitalCache = new Map(); // key → { hospitals, fetchedAt }
const HOSPITAL_CACHE_TTL_MS = 90 * 1000; // 90초

async function fetchHospitals(stage1, stage2) {
  const normalizedStage2 = normalizeStage2Name(stage2);
  const cacheKey = `${stage1}::${normalizedStage2 || stage2}`;
  const cached = hospitalCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < HOSPITAL_CACHE_TTL_MS) {
    debugLog('INFO', `병원 캐시 사용 (${Math.round((Date.now() - cached.fetchedAt) / 1000)}초 전 갱신)`);
    return cached.hospitals;
  }

  const variants = [];
  const pushVariant = (s1, s2) => {
    const key = `${s1}::${s2}`;
    if (!variants.some((item) => `${item.stage1}::${item.stage2}` === key)) variants.push({ stage1: s1, stage2: s2 });
  };
  pushVariant(stage1, normalizedStage2 || stage2);
  if (!normalizedStage2 || normalizedStage2 === stage1 || normalizedStage2 === DEFAULTS.stage1) {
    if (stage1 === DEFAULTS.stage1) pushVariant(stage1, DEFAULTS.stage2);
    pushVariant(stage1, '');
  }
  let lastError = null;
  for (const variant of variants) {
    try {
      const hospitals = await fetchHospitalsOnce(variant.stage1, variant.stage2);
      if (hospitals.length) {
        hospitalCache.set(cacheKey, { hospitals, fetchedAt: Date.now() });
        return hospitals;
      }
      lastError = new Error('조회 결과 없음');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('응급실 조회 실패');
}


const fs = require('fs');
const RUNTIME_STATE_FILE = path.join(__dirname, 'runtime-state.json');
function readRuntimeState() {
  try {
    if (!fs.existsSync(RUNTIME_STATE_FILE)) {
      return { requests: [], logs: [] };
    }
    const raw = fs.readFileSync(RUNTIME_STATE_FILE, 'utf8');
    const parsed = raw ? JSON.parse(raw) : {};
    return { requests: Array.isArray(parsed.requests) ? parsed.requests : [], logs: Array.isArray(parsed.logs) ? parsed.logs : [] };
  } catch {
    return { requests: [], logs: [] };
  }
}
function writeRuntimeState(nextState) {
  const cleaned = {
    requests: Array.isArray(nextState.requests) ? nextState.requests : [],
    logs: Array.isArray(nextState.logs) ? nextState.logs : [],
  };
  try {
    fs.writeFileSync(RUNTIME_STATE_FILE, JSON.stringify(cleaned, null, 2));
  } catch {}
  return cleaned;
}
function mergeRuntimeState(incoming) {
  const current = readRuntimeState();
  const mergedMap = new Map();
  [...current.requests, ...(Array.isArray(incoming.requests) ? incoming.requests : [])].forEach((item) => {
    if (!item || !item.id) return;
    const prev = mergedMap.get(item.id);
    const prevTs = prev?.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
    const nextTs = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    if (!prev || nextTs >= prevTs) mergedMap.set(item.id, item);
  });
  const logMap = new Map();
  [...current.logs, ...(Array.isArray(incoming.logs) ? incoming.logs : [])].forEach((item) => {
    const key = `${item?.time || ''}|${item?.message || ''}`;
    if (!logMap.has(key)) logMap.set(key, item);
  });
  return writeRuntimeState({ requests: [...mergedMap.values()], logs: [...logMap.values()].slice(-200) });
}

app.get('/api/runtime', (_req, res) => {
  const runtime = readRuntimeState();
  res.json({ ok: true, ...runtime });
});

app.post('/api/runtime', (req, res) => {
  const runtime = mergeRuntimeState(req.body || {});
  res.json({ ok: true, ...runtime });
});

app.get('/api/route', async (req, res) => {
  const originLat = Number(req.query.originLat);
  const originLon = Number(req.query.originLon);
  const destLat = Number(req.query.destLat);
  const destLon = Number(req.query.destLon);
  if (![originLat, originLon, destLat, destLon].every(Number.isFinite)) {
    return res.status(400).json({ ok: false, error: 'origin/destination 좌표 필요' });
  }

  // 1차: OSRM (무료 실제 도로 경로)
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const osrmRes = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeout);
    const osrmData = await osrmRes.json();
    if (osrmData.code === 'Ok' && osrmData.routes?.[0]) {
      const route = osrmData.routes[0];
      const path = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
      debugLog('INFO', `OSRM 경로 성공: ${path.length}포인트, ${Math.round(route.distance)}m, ${Math.round(route.duration)}초`);
      return res.json({
        ok: true,
        distanceMeters: Math.round(route.distance || 0),
        durationSec: Math.round(route.duration || 0),
        path,
        source: 'osrm',
      });
    }
  } catch (e) {
    debugLog('WARN', 'OSRM 실패, Google Routes로 전환', e.message);
  }

  // 2차: Google Routes API
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: originLat, longitude: originLon } } },
          destination: { location: { latLng: { latitude: destLat, longitude: destLon } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          polylineQuality: 'HIGH_QUALITY',
          polylineEncoding: 'ENCODED_POLYLINE',
          languageCode: 'ko-KR',
          units: 'METRIC',
        }),
      });
      const data = await response.json();
      if (response.ok && data.routes?.[0]) {
        const route = data.routes[0];
        const durationSec = Number(String(route.duration || '0s').replace('s', '')) || 0;
        return res.json({
          ok: true,
          distanceMeters: route.distanceMeters || 0,
          durationSec,
          encodedPolyline: route.polyline?.encodedPolyline || '',
          source: 'google',
        });
      }
    } catch (e) {
      debugLog('WARN', 'Google Routes도 실패', e.message);
    }
  }

  return res.status(500).json({ ok: false, error: '경로 조회 실패 (OSRM+Google 모두)' });
});

app.get('/api/config', (_req, res) => {
  res.json({
    defaults: DEFAULTS,
    hasNemcKey: Boolean(process.env.NEMC_SERVICE_KEY),
    useMockFallback: USE_MOCK_FALLBACK,
    predictorVersion: 'nemc-google-v10',
    googleMapsKey: GOOGLE_MAPS_API_KEY,
    googleMapId: GOOGLE_MAP_ID,
  });
});

app.get('/api/hospitals', async (req, res) => {
  const stage1 = String(req.query.stage1 || DEFAULTS.stage1);
  const stage2 = normalizeStage2Name(String(req.query.stage2 || DEFAULTS.stage2)) || DEFAULTS.stage2;
  const userLat = Number(req.query.userLat || req.query.lat || DEFAULTS.centerLat);
  const userLon = Number(req.query.userLon || req.query.lon || DEFAULTS.centerLon);
  const request = {
    ktas: req.query.ktas ? Number(req.query.ktas) : null,
    specialty: String(req.query.specialty || ''),
    location: String(req.query.location || ''),
  };
  try {
    const hospitals = await fetchHospitals(stage1, stage2);
    const enriched = hospitals
      .map((h) => ({ ...h, prediction: computePrediction(h, request, userLat, userLon) }))
      .sort((a, b) => b.prediction.recommendationScore - a.prediction.recommendationScore);
    const waits = enriched.map((h) => h.prediction.predictedWaitMinutes).filter(Number.isFinite);
    debugLog('INFO', `병원 ${enriched.length}곳 로드 (${process.env.NEMC_SERVICE_KEY ? 'nemc-live' : 'mock'})`, { stage1, stage2, names: enriched.slice(0,3).map(h=>h.dutyName) });
    res.json({
      ok: true,
      source: process.env.NEMC_SERVICE_KEY ? 'nemc-live' : 'mock',
      stage1,
      stage2,
      request,
      summary: {
        hospitalCount: enriched.length,
        avgPredictedWait: waits.length ? Math.round(waits.reduce((s, v) => s + v, 0) / waits.length) : null,
        highConfidenceCount: enriched.filter((h) => h.prediction.confidence === '높음').length,
        zeroBedCount: enriched.filter((h) => (h.hvec || 0) === 0).length,
      },
      hospitals: enriched,
    });
  } catch (error) {
    console.error('[NEMC ERROR]', error.message || error);
    debugLog('ERROR', 'Hospital API 호출 실패', { msg: error.message, stage1, stage2 });
    if (USE_MOCK_FALLBACK) {
      const hospitals = mockForRegion(stage1).map((h) => {
        const normalized = { ...normalizeHospital(h), dataOrigin: 'mock' };
        return { ...normalized, prediction: computePrediction(normalized, request, userLat, userLon) };
      });
      debugLog('WARN', `Mock 폴백 사용: ${hospitals.length}곳`, { stage1, stage2 });
      return res.json({ ok: true, source: 'mock-fallback', stage1, stage2, request, summary: { hospitalCount: hospitals.length }, hospitals });
    }
    res.status(500).json({ ok: false, error: error.message || '응급실 API 호출 실패' });
  }
});

app.get('/api/reverse-geocode', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ ok: false, error: 'lat/lon 필요' });
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=ko`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { headers: { 'User-Agent': 'RefuseLog-ReverseGeocode/1.0' }, signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`reverse geocode ${response.status}`);
    const data = await response.json();
    const address = data.address || {};
    const stage1 = firstMeaningful(address.state, address.province, address.region, DEFAULTS.stage1) || DEFAULTS.stage1;
    const detailedStage2 = firstMeaningful(address.city_district, address.suburb, address.borough, address.quarter, address.neighbourhood, address.county, address.city, address.town, DEFAULTS.stage2) || DEFAULTS.stage2;
    const stage2 = normalizeStage2Name(detailedStage2) || DEFAULTS.stage2;
    res.json({ ok: true, stage1, stage2, displayName: data.display_name || '', lat, lon });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || 'reverse geocode failed' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasNemcKey: Boolean(process.env.NEMC_SERVICE_KEY), predictorVersion: 'nemc-google-v10', hasGoogleMapsKey: Boolean(GOOGLE_MAPS_API_KEY) });
});

app.get(['/emt', '/hq', '/hospital'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', `${req.path.replace('/', '') || 'emt'}.html`));
});

// ===== 디버그 로그 파일 =====
const LOG_FILE = path.join(__dirname, 'debug.log');
function debugLog(level, msg, data = '') {
  const ts = new Date().toLocaleString('ko-KR', { hour12: false });
  const line = `[${ts}] [${level}] ${msg} ${data ? JSON.stringify(data) : ''}\n`;
  console.log(line.trim());
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

// 시작 시 로그 초기화
try { fs.writeFileSync(LOG_FILE, `=== RefuseLog 서버 시작 ${new Date().toLocaleString('ko-KR')} ===\n`); } catch {}

app.get('/emt-tablet', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'emt-tablet.html'));
});

app.get(['/login', '/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ===== 서버 시작 (포트 충돌 처리) =====
const server = app.listen(PORT, () => {
  debugLog('INFO', `서버 시작 http://localhost:${PORT}`);
  debugLog('INFO', `NEMC 키 존재: ${Boolean(process.env.NEMC_SERVICE_KEY)}`);
  debugLog('INFO', `Mock 폴백: ${USE_MOCK_FALLBACK}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ 포트 ${PORT}이 이미 사용 중이야!`);
    console.error(`\n해결 방법:`);
    console.error(`  1. CMD에서: netstat -ano | findstr :${PORT}`);
    console.error(`  2. 나온 PID 번호로: taskkill /PID [번호] /F`);
    console.error(`  3. 다시: node server.js\n`);
    console.error(`또는 다른 포트 사용: set PORT=3001 && node server.js\n`);
  } else {
    console.error('서버 오류:', err);
  }
  process.exit(1);
});
