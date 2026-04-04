/* =============================================
   사주행운 - app.js
   Gemini API (무료 티어) + 템플릿 혼합 방식
   ============================================= */

/* =============================================
   페이지 초기화 — 년도 select 생성 + 일수 연동
   ============================================= */
document.addEventListener('DOMContentLoaded', function () {

  // ── 카카오 SDK 초기화 ──
  // ⚠️ https://developers.kakao.com 에서 발급한 JavaScript 앱 키를 입력하세요
  // 기존 꿈해몽 사이트 키 재사용 가능: 7b87b3bb674e9bec0fd123f31a4e6e24
  const KAKAO_APP_KEY = '7b87b3bb674e9bec0fd123f31a4e6e24';
  if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
    try { Kakao.init(KAKAO_APP_KEY); } catch(e) { console.warn('Kakao init 실패:', e); }
  }

  // 년도 옵션 생성 (1930 ~ 2026)
  const yearSel = document.getElementById('birthYear');
  for (let y = 2026; y >= 1930; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  }

  // 월/년 변경 시 일수 자동 업데이트
  function updateDays() {
    const year  = parseInt(yearSel.value) || 2000;
    const month = parseInt(document.getElementById('birthMonth').value) || 1;
    const daySel = document.getElementById('birthDay');
    const prevVal = daySel.value;
    const maxDay = new Date(year, month, 0).getDate();

    // 기존 옵션 제거 후 재생성
    daySel.innerHTML = '<option value="">선택</option>';
    for (let d = 1; d <= maxDay; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      daySel.appendChild(opt);
    }
    // 이전 값 유지 (범위 내일 때)
    if (prevVal && parseInt(prevVal) <= maxDay) daySel.value = prevVal;
  }

  // 초기 일수 채우기
  updateDays();
  document.getElementById('birthMonth').addEventListener('change', updateDays);
  yearSel.addEventListener('change', updateDays);

  initTopicSelection();
});

// ⚠️ Gemini API 키를 여기에 입력하세요
// Google AI Studio (https://aistudio.google.com) 에서 무료 발급
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

// ========================
// 주제 설정
// ========================

const TOPIC_CONFIG = {
  today: { label: '오늘의 운세', title: '오늘의 사주', promptHint: '전체 운세를 중심으로 오늘의 흐름을 균형 있게 설명하세요.' },
  love: { label: '연애운', title: '연애운 사주 풀이', promptHint: '연애운을 중심으로 감정 흐름, 대화 분위기, 관계 진전 가능성을 설명하세요.' },
  money: { label: '금전운', title: '금전운 사주 풀이', promptHint: '금전운을 중심으로 재물 흐름, 지출 관리, 수입 기회를 설명하세요.' },
  career: { label: '직업운', title: '직업운 사주 풀이', promptHint: '직업운을 중심으로 업무 흐름, 평가, 이직·승진 가능성을 설명하세요.' },
  health: { label: '건강운', title: '건강운 사주 풀이', promptHint: '건강운을 중심으로 컨디션 흐름, 생활 리듬, 휴식 포인트를 설명하세요.' },
  relationship: { label: '인간관계', title: '인간관계 사주 풀이', promptHint: '인간관계를 중심으로 대인관계 흐름, 소통 분위기, 오해 가능성을 설명하세요.' }
};

// ========================
// 사주 데이터 상수
// ========================

const CHEONGAN = ['갑','을','병','정','무','기','경','신','임','계'];
const JIJI = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const JIJI_ANIMAL = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];
const JIJI_KO = {
  '자':'子','축':'丑','인':'寅','묘':'卯','진':'辰','사':'巳',
  '오':'午','미':'未','신':'申','유':'酉','술':'戌','해':'亥'
};
const CHEONGAN_KO = {
  '갑':'甲','을':'乙','병':'丙','정':'丁','무':'戊',
  '기':'己','경':'庚','신':'辛','임':'壬','계':'癸'
};
const CHEONGAN_OHANG = {
  '갑':'목','을':'목','병':'화','정':'화','무':'토',
  '기':'토','경':'금','신':'금','임':'수','계':'수'
};
const JIJI_OHANG = {
  '자':'수','축':'토','인':'목','묘':'목','진':'토','사':'화',
  '오':'화','미':'토','신':'금','유':'금','술':'토','해':'수'
};
const OHANG_ELEMENT = { '목':'wood','화':'fire','토':'earth','금':'metal','수':'water' };
const OHANG_KO = { '목':'목(木)','화':'화(火)','토':'토(土)','금':'금(金)','수':'수(水)' };

// ========================
// 사주 계산 로직
// ========================

function calcYearPillar(year) {
  const base = 1984; // 갑자년 기준
  const diff = year - base;
  const gan = CHEONGAN[((diff % 10) + 10) % 10];
  const ji  = JIJI[((diff % 12) + 12) % 12];
  return { gan, ji };
}

function calcMonthPillar(year, month) {
  // 월간은 연간 기준 계산 (절기 간소화)
  const yearGanIdx = ((year - 1984) % 10 + 10) % 10;
  const monthGanBase = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][yearGanIdx % 10] || 0;
  const ganIdx = (monthGanBase + (month - 1)) % 10;
  const jiIdx  = (month + 1) % 12;
  return { gan: CHEONGAN[ganIdx], ji: JIJI[jiIdx] };
}

function calcDayPillar(year, month, day) {
  // 율리우스 날짜 기반 일주 계산
  const a = Math.floor((14 - month) / 12);
  const y = year - a;
  const m = month + 12 * a - 3;
  const jd = day + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) + 1721119;
  const ganIdx = ((jd - 11) % 10 + 10) % 10;
  const jiIdx  = ((jd - 11) % 12 + 12) % 12;
  return { gan: CHEONGAN[ganIdx], ji: JIJI[jiIdx] };
}

function calcHourPillar(dayGan, hourName) {
  if (!hourName) return null;
  const jiIdx = JIJI.indexOf(hourName.replace('시',''));
  const dayGanIdx = CHEONGAN.indexOf(dayGan);
  const ganBase = [0,2,4,6,8,0,2,4,6,8][dayGanIdx];
  const ganIdx = (ganBase + jiIdx) % 10;
  return { gan: CHEONGAN[ganIdx], ji: JIJI[jiIdx] };
}

function getSaju(year, month, day, hourName) {
  const year_p  = calcYearPillar(year);
  const month_p = calcMonthPillar(year, month);
  const day_p   = calcDayPillar(year, month, day);
  const hour_p  = hourName ? calcHourPillar(day_p.gan, hourName) : null;

  const pillars = [
    { label: '연주(年柱)', ...year_p },
    { label: '월주(月柱)', ...month_p },
    { label: '일주(日柱)', ...day_p },
    { label: '시주(時柱)', ...(hour_p || { gan: '?', ji: '?' }) },
  ];

  // 오행 카운트
  const ohangCount = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  [year_p, month_p, day_p, ...(hour_p ? [hour_p] : [])].forEach(p => {
    if (CHEONGAN_OHANG[p.gan]) ohangCount[CHEONGAN_OHANG[p.gan]]++;
    if (JIJI_OHANG[p.ji])     ohangCount[JIJI_OHANG[p.ji]]++;
  });

  // 일간 (본인의 기운)
  const ilgan = day_p.gan;
  const ilganOhang = CHEONGAN_OHANG[ilgan];

  // 띠
  const yearJiIdx = JIJI.indexOf(year_p.ji);
  const ddi = JIJI_ANIMAL[yearJiIdx];

  return { pillars, ohangCount, ilgan, ilganOhang, ddi, year_p, month_p, day_p, hour_p };
}

// ========================
// 행운 번호 생성
// ========================

function generateLuckyNumbers(saju, gender) {
  const today = new Date();
  const todayNum = today.getFullYear() * 10000 + (today.getMonth()+1) * 100 + today.getDate();
  const seed = (saju.ohangCount.목 * 7 + saju.ohangCount.화 * 11 + saju.ohangCount.토 * 13
              + saju.ohangCount.금 * 17 + saju.ohangCount.수 * 19 + todayNum
              + (gender === 'male' ? 3 : 7)) % 10000;

  function seededRandom(s, n) {
    let x = Math.sin(s + n) * 10000;
    return x - Math.floor(x);
  }

  const sets = [];
  for (let s = 0; s < 5; s++) {
    const nums = new Set();
    let iter = 0;
    while (nums.size < 6) {
      const r = seededRandom(seed + s * 100, iter++);
      nums.add(Math.floor(r * 45) + 1);
    }
    sets.push([...nums].sort((a,b) => a-b));
  }
  return sets;
}

// ========================
// 오행 기반 운세 템플릿
// ========================

function getFortuneTemplate(saju, gender) {
  const dominant = Object.entries(saju.ohangCount).sort((a,b)=>b[1]-a[1])[0][0];
  const weak     = Object.entries(saju.ohangCount).sort((a,b)=>a[1]-b[1])[0][0];
  const today    = new Date();
  const todaySeed= (today.getMonth()+1)*100 + today.getDate();

  const templates = {
    목: [
      "오늘은 성장과 창의의 기운이 충만한 날입니다. 목(木)의 기운이 강한 당신에게 새로운 시작을 위한 에너지가 샘솟습니다. 계획했던 일을 실행에 옮기기에 좋은 타이밍이며, 창의적인 아이디어가 풍부하게 떠오를 것입니다.",
      "목(木)의 기운이 오늘 하루를 이끕니다. 인내와 끈기로 추진하던 일이 서서히 결실을 맺는 흐름입니다. 주변 사람들과의 소통에서 좋은 기회를 발견할 수 있으니 열린 마음을 유지하세요.",
    ],
    화: [
      "화(火)의 열정적인 기운이 오늘 당신과 함께합니다. 적극적인 행동과 표현이 빛을 발하는 날로, 대인관계에서 특히 좋은 에너지가 흐릅니다. 중요한 만남이나 발표가 있다면 오늘이 최적의 날입니다.",
      "오늘은 화(火)의 기운으로 활력이 넘칩니다. 열정을 가지고 있는 분야에 집중할수록 성과가 돋보이는 날입니다. 다만 조급함은 금물, 차근차근 나아가는 지혜가 필요합니다.",
    ],
    토: [
      "토(土)의 안정된 기운이 오늘 하루를 감싸고 있습니다. 실속 있는 결정을 내리기에 좋은 날로, 재물운과 생활 안정에 긍정적인 흐름이 보입니다. 신뢰를 바탕으로 한 인간관계가 빛을 발합니다.",
      "오늘은 토(土)의 기운이 바탕을 다지는 날입니다. 서두르지 않고 한 발씩 나아갈 때 가장 큰 성취를 얻을 수 있습니다. 가족이나 오랜 지인과의 교류가 마음에 위안을 가져다줍니다.",
    ],
    금: [
      "금(金)의 단단하고 결단력 있는 기운이 오늘의 흐름을 이끕니다. 중요한 결정이나 협상에서 유리한 위치에 설 수 있으며, 냉철한 판단이 강점으로 발휘됩니다. 재물과 관련된 일에서 좋은 소식이 기대됩니다.",
      "오늘은 금(金)의 기운으로 집중력과 실행력이 높아집니다. 미루어 왔던 업무나 정리가 필요한 일을 해결하기에 최적의 날입니다. 신중한 태도가 신뢰를 높여줍니다.",
    ],
    수: [
      "수(水)의 지혜롭고 유연한 기운이 오늘을 가득 채웁니다. 직감이 평소보다 예리해지는 날로, 복잡한 상황에서도 올바른 방향을 찾아낼 수 있습니다. 학업이나 지식 습득에도 탁월한 흡수력을 발휘합니다.",
      "오늘은 수(水)의 기운으로 내면의 통찰력이 강해집니다. 겉으로 드러나지 않던 상황의 본질을 꿰뚫어 보는 날입니다. 감성이 풍부해지니 예술이나 창작 활동에서도 좋은 영감을 얻을 수 있습니다.",
    ],
  };

  const advices = {
    목: ['초록 계열 색상이 오늘의 행운 색입니다. 자연을 가까이 하세요.', '동쪽 방향이 오늘 당신에게 유리합니다. 나무나 식물 옆에서 업무를 보세요.'],
    화: ['빨간색 또는 주황색이 오늘의 행운 색입니다. 적극적으로 소통하세요.', '남쪽 방향이 오늘 당신에게 좋은 기운을 가져다줍니다. 따뜻한 음식이 길합니다.'],
    토: ['노란색 또는 황토색이 오늘의 행운 색입니다. 안정을 최우선으로 하세요.', '중앙과 중심을 지키는 자세가 오늘 행운을 불러옵니다. 단것이 기운을 도와줍니다.'],
    금: ['흰색 또는 은색이 오늘의 행운 색입니다. 깔끔하고 단정한 복장이 좋습니다.', '서쪽 방향이 오늘 당신에게 유리합니다. 금속 소품을 지니는 것이 길합니다.'],
    수: ['파란색 또는 검은색이 오늘의 행운 색입니다. 직감을 믿고 유연하게 대처하세요.', '북쪽 방향이 오늘 좋은 기운을 가져다줍니다. 수분 섭취를 충분히 하세요.'],
  };

  const idx = todaySeed % 2;
  return {
    text: templates[dominant][idx],
    advice: advices[dominant][idx],
  };
}

// ========================
// 운세 점수 계산
// ========================

function getFortuneScores(saju) {
  const today = new Date();
  const seed  = (today.getMonth()+1) * 31 + today.getDate() + CHEONGAN.indexOf(saju.ilgan);
  const rand  = (n) => ((seed * (n+7) * 1234567) % 5) + 1;

  return [
    { label: '전체운', score: rand(1) },
    { label: '금전운', score: rand(2) },
    { label: '애정운', score: rand(3) },
    { label: '건강운', score: rand(4) },
    { label: '직업운', score: rand(5) },
    { label: '행운지수', score: rand(6) },
  ];
}

function starsFromScore(score) {
  return '★'.repeat(score) + '☆'.repeat(5-score);
}

function labelFromScore(score) {
  return ['','보통','보통','좋음','매우 좋음','최고'][score] || '보통';
}

// ========================
// Gemini API 호출
// ========================

async function getFortuneFromGemini(saju, gender, topicKey = 'today') {
  const prompt = `당신은 전문 사주 운세 풀이사입니다. 아래 사주 정보를 바탕으로 오늘의 운세를 한국어로 작성해주세요.

사주 정보:
- 선택한 주제: ${(TOPIC_CONFIG[topicKey] || TOPIC_CONFIG.today).label}
- 주제별 요청: ${(TOPIC_CONFIG[topicKey] || TOPIC_CONFIG.today).promptHint}
- 일간(나의 기운): ${saju.ilgan}(${CHEONGAN_KO[saju.ilgan]}) - ${CHEONGAN_OHANG[saju.ilgan]}(${OHANG_KO[CHEONGAN_OHANG[saju.ilgan]]})의 기운
- 띠: ${saju.ddi}띠
- 성별: ${gender === 'male' ? '남성' : '여성'}
- 오행 구성: 목${saju.ohangCount.목} 화${saju.ohangCount.화} 토${saju.ohangCount.토} 금${saju.ohangCount.금} 수${saju.ohangCount.수}
- 오늘 날짜: ${new Date().toLocaleDateString('ko-KR')}

중요 조건:
- 반드시 선택한 주제를 직접 언급하세요.
- fortune은 최소 280자 이상, 4~6문장으로 작성하세요.
- advice는 선택한 주제와 연결되게 작성하세요.
- 한국어로 따뜻하고 구체적으로 작성하세요.

다음 JSON 형식으로만 답하세요 (다른 텍스트 없이):
{
  "fortune": "선택한 주제가 직접 언급된 오늘의 운세 내용 (최소 280자 이상)",
  "advice": "선택한 주제와 연결된 오늘의 조언 (1문장)"
}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 900 }
    })
  });

  if (!res.ok) throw new Error('Gemini API 오류');
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ========================
// 상태 관리
// ========================

let selectedGender = null;
let currentNumbers = [];
let selectedTopic = 'today';

function selectGender(g) {
  selectedGender = g;
  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.gender === g);
  });
}

function initTopicSelection() {
  document.querySelectorAll('.topic-select-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      selectedTopic = this.dataset.topic || 'today';
      updateTopicUI();
    });
  });
  updateTopicUI();
}

function updateTopicUI() {
  document.querySelectorAll('.topic-select-btn').forEach(btn => {
    btn.classList.toggle('topic-active', btn.dataset.topic === selectedTopic);
  });
}

function hideTopicSelectionOnResult() {
  const el = document.getElementById('topicSelectSection');
  if (el) el.classList.add('hidden');
}

function showTopicSelectionOnReset() {
  const el = document.getElementById('topicSelectSection');
  if (el) el.classList.remove('hidden');
  updateTopicUI();
}

function renderFollowupCard() {
  const card = document.getElementById('followupTopicCard');
  const title = document.getElementById('followupTopicTitle');
  const desc = document.getElementById('followupTopicDesc');
  const links = document.getElementById('followupTopicLinks');
  const cfg = TOPIC_CONFIG[selectedTopic] || TOPIC_CONFIG.today;
  if (!card || !title || !desc || !links) return;

  const others = Object.entries(TOPIC_CONFIG).filter(([key]) => key !== selectedTopic);
  title.textContent = `${cfg.label}을(를) 보셨다면 다른 주제로 다시 볼 수 있습니다`;
  desc.textContent = '입력했던 생년월일, 성별, 태어난 시간은 그대로 유지한 채 첫 화면으로 돌아갑니다.';
  links.innerHTML = others.map(([key, item]) =>
    `<button type="button" class="topic-follow-link" data-topic="${key}">${item.label}으로 다시 보기</button>`
  ).join('');

  links.querySelectorAll('.topic-follow-link').forEach(btn => {
    btn.addEventListener('click', function () {
      selectedTopic = this.dataset.topic || 'today';
      updateTopicUI();
      const followCard = document.getElementById('followupTopicCard');
      if (followCard) followCard.classList.add('hidden');
      document.getElementById('resultSection').classList.add('hidden');
      document.getElementById('inputSection').classList.remove('hidden');
      document.querySelector('.hero').classList.remove('hidden');
      showTopicSelectionOnReset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  card.classList.remove('hidden');
}

function ensureLongFortuneText(text) {
  const clean = (text || '').trim();
  if (clean.length >= 260) return clean;
  const extraMap = {
    today: ' 오늘은 전체적인 흐름을 넓게 보되, 중요한 결정을 서두르기보다는 상황을 한 번 더 점검하는 태도가 도움이 됩니다. 작은 선택에서도 차분함을 유지하면 하루의 만족도가 높아질 수 있습니다.',
    love: ' 특히 연애운 관점에서는 감정 표현의 속도와 말의 분위기가 중요합니다. 상대의 반응을 조급하게 해석하기보다, 자연스러운 흐름을 유지하는 태도가 관계 안정에 도움이 됩니다.',
    money: ' 특히 금전운 관점에서는 충동적인 지출을 줄이고, 들어오는 기회와 나가는 비용을 함께 점검하는 태도가 중요합니다. 오늘은 실속 있는 선택이 더 큰 만족으로 이어질 수 있습니다.',
    career: ' 특히 직업운 관점에서는 결과보다 과정의 정돈이 중요합니다. 업무 우선순위를 분명히 하고, 작은 실수를 줄이는 데 집중하면 전체 흐름이 더 안정적으로 이어질 수 있습니다.',
    health: ' 특히 건강운 관점에서는 무리해서 끌고 가기보다 휴식과 리듬을 조절하는 것이 중요합니다. 컨디션을 세심하게 살피고 일상의 속도를 조절하면 더 안정적인 흐름을 만들 수 있습니다.',
    relationship: ' 특히 인간관계 관점에서는 말의 강도와 거리 조절이 중요합니다. 중요한 관계일수록 한 템포 여유 있게 반응하는 편이 좋습니다.'
  };
  return clean + (extraMap[selectedTopic] || extraMap.today);
}

// ========================
// 메인 실행
// ========================

async function startFortune() {
  const year  = parseInt(document.getElementById('birthYear').value);
  const month = parseInt(document.getElementById('birthMonth').value);
  const day   = parseInt(document.getElementById('birthDay').value);
  const hour  = document.getElementById('birthHour').value;

  // 유효성 검사
  if (!year) { showToast('태어난 년도를 선택해주세요'); return; }
  if (!month) { showToast('태어난 월을 선택해주세요'); return; }
  if (!day) { showToast('태어난 일을 선택해주세요'); return; }
  if (!selectedGender) { showToast('성별을 선택해주세요'); return; }

  // 섹션 전환 — 히어로/입력 숨기고 결과 바로 표시
  document.getElementById('inputSection').classList.add('hidden');
  document.querySelector('.hero').classList.add('hidden');   // ④ 히어로 숨김
  hideTopicSelectionOnResult();

  // 사주 계산
  const saju = getSaju(year, month, day, hour || null);

  // 운세 가져오기
  let fortune;
  try {
    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
      fortune = await getFortuneFromGemini(saju, selectedGender, selectedTopic);
    } else {
      // 템플릿 폴백
      const tpl = getFortuneTemplate(saju, selectedGender);
      fortune = { fortune: `${(TOPIC_CONFIG[selectedTopic] || TOPIC_CONFIG.today).label}을 중심으로 보면 ${tpl.text}`, advice: tpl.advice };
    }
  } catch (e) {
    console.warn('Gemini API 실패, 템플릿 사용:', e);
    const tpl = getFortuneTemplate(saju, selectedGender);
    fortune = { fortune: `${(TOPIC_CONFIG[selectedTopic] || TOPIC_CONFIG.today).label}을 중심으로 보면 ${tpl.text}`, advice: tpl.advice };
  }

  fortune.fortune = ensureLongFortuneText(fortune.fortune);

  // 행운번호 생성
  currentNumbers = generateLuckyNumbers(saju, selectedGender);

  // 결과 바로 표시
  document.getElementById('resultSection').classList.remove('hidden');

  renderResult(saju, fortune, currentNumbers);
  renderFollowupCard();
  document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

// ========================
// 결과 렌더링
// ========================

function renderResult(saju, fortune, numbers) {
  const cfg = TOPIC_CONFIG[selectedTopic] || TOPIC_CONFIG.today;
  // 오늘 날짜
  const today = new Date();
  document.getElementById('todayDate').textContent =
    `${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`;

  const titleEl = document.getElementById('fortuneCardTitle');
  if (titleEl) titleEl.textContent = cfg.title;

  // 사주 기둥
  const pillarsEl = document.getElementById('sajuPillars');
  pillarsEl.innerHTML = saju.pillars.map(p => `
    <div class="pillar">
      <div class="pillar-label">${p.label}</div>
      <div class="pillar-chars">
        <div class="pillar-gan">${p.gan === '?' ? '?' : CHEONGAN_KO[p.gan] || p.gan}</div>
        <div class="pillar-ji">${p.ji === '?' ? '?' : JIJI_KO[p.ji] || p.ji}</div>
        <div class="pillar-ko">${p.gan}${p.ji}</div>
      </div>
    </div>
  `).join('');

  // 오행 태그
  const ohangEl = document.getElementById('sajuElements');
  ohangEl.innerHTML = Object.entries(saju.ohangCount)
    .filter(([,v]) => v > 0)
    .sort((a,b) => b[1]-a[1])
    .map(([k,v]) => `<span class="element-tag element-${OHANG_ELEMENT[k]}">${OHANG_KO[k]} ×${v}</span>`)
    .join('');

  // 운세 점수
  const scores = getFortuneScores(saju);
  document.getElementById('fortuneScores').innerHTML = scores.map(s => `
    <div class="score-item">
      <div class="score-label">${s.label}</div>
      <div class="score-stars">${starsFromScore(s.score)}</div>
      <div class="score-value">${labelFromScore(s.score)}</div>
    </div>
  `).join('');

  // 운세 텍스트
  document.getElementById('fortuneText').textContent = `선택한 주제: ${cfg.label}\n\n${fortune.fortune}`;
  document.getElementById('fortuneAdvice').textContent = fortune.advice;

  // 행운 번호
  const ballClass = n => {
    if (n <= 10) return 'ball-1';
    if (n <= 20) return 'ball-2';
    if (n <= 30) return 'ball-3';
    if (n <= 40) return 'ball-4';
    return 'ball-5';
  };

  document.getElementById('luckyNumbers').innerHTML = numbers.map((set, i) => `
    <div class="lucky-set">
      <span class="set-label">${i+1}세트</span>
      <div class="set-numbers">
        ${set.map(n => `<div class="lucky-ball ${ballClass(n)}">${n}</div>`).join('')}
      </div>
    </div>
  `).join('');
}

// ========================
// 리셋
// ========================

function resetAll() {
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('inputSection').classList.remove('hidden');
  document.querySelector('.hero').classList.remove('hidden'); // ④ 히어로 복구
  showTopicSelectionOnReset();

  const followCard = document.getElementById('followupTopicCard');
  if (followCard) followCard.classList.add('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================
// 공유 / 복사
// ========================

function copyLink() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => showToast('링크가 복사되었습니다! 🔗'))
    .catch(() => showToast('복사에 실패했습니다'));
}

function shareKakao() {
  if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
    // SDK 미초기화 시 링크 복사로 대체
    copyLink();
    showToast('카카오 앱 키를 설정해주세요 💬');
    return;
  }
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: '🔯 오늘의 사주 운세 & 행운번호',
      description: '생년월일로 오늘의 사주 운세와 나만의 행운번호를 받아보세요!',
      imageUrl: 'https://via.placeholder.com/800x400/0a0612/e8c97a?text=%F0%9F%94%AF+%EC%82%AC%EC%A3%BC%ED%96%89%EC%9A%B4',
      link: {
        mobileWebUrl: window.location.href,
        webUrl: window.location.href,
      },
    },
    buttons: [
      {
        title: '운세 보러 가기',
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
    ],
  });
}

function copyNumbers() {
  if (!currentNumbers.length) return;
  const text = currentNumbers.map((set, i) =>
    `${i+1}세트: ${set.join(', ')}`
  ).join('\n');
  const full = `🔯 오늘의 사주 행운번호\n${new Date().toLocaleDateString('ko-KR')}\n\n${text}\n\n사주행운: ${window.location.href}`;
  navigator.clipboard.writeText(full)
    .then(() => showToast('행운번호가 복사되었습니다! 📋'))
    .catch(() => showToast('복사에 실패했습니다'));
}

// ========================
// 유틸
// ========================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}
