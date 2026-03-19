# 사주행운 🔯

사주팔자 기반 오늘의 운세 + 행운번호 서비스

## 파일 구조

```
saju-fortune/
├── index.html      ← 메인 페이지
├── style.css       ← 스타일
├── app.js          ← 핵심 로직 (사주계산 + Gemini API + 행운번호)
├── guide.html      ← 이용안내
├── about.html      ← 서비스 소개
├── privacy.html    ← 개인정보처리방침
├── terms.html      ← 이용약관
└── vercel.json     ← Vercel 배포 설정
```

## 🔑 Gemini API 키 설정 (필수)

1. https://aistudio.google.com 접속
2. "Get API Key" → "Create API key" 클릭
3. 발급된 키를 `app.js` 상단에 입력:

```js
const GEMINI_API_KEY = '여기에_API_키_입력';
```

> **무료 한도**: 분당 15회, 일 1,500회 (개인 서비스 초기엔 충분)

## ⚠️ API 키 없을 때

`GEMINI_API_KEY`가 기본값이면 자동으로 **템플릿 기반 운세**로 대체됩니다.
서비스는 정상 작동하지만 운세 텍스트가 고정 패턴이 됩니다.

## 🚀 Vercel 배포

```bash
# GitHub에 올리고 Vercel에서 Import
# 또는 Vercel CLI 사용:
npx vercel --prod
```

## 기존 사이트 연결 (꿈해몽 행운)

기존 사이트 `index.html`에 아래 배너 추가 권장:

```html
<a href="https://새사이트URL.vercel.app" style="...">
  🔯 사주 기반 행운번호도 받아보세요 →
</a>
```
