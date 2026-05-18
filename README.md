# SDGs 마스터 (SDGs Master)

초등학생을 위한 **집단지성형 SDGs 큐레이션 웹앱**

## ✨ 주요 기능

- **3단계 학습 흐름**: 사례 발견 → SDGs 연결 → 큐레이션
- **17개 SDG 목표** 아이콘 + 초등 수준 툴팁
- **인사이트 카드 생성** + 클립보드 복사 (html2canvas)
- **패들렛 임베드** — Ctrl+V로 바로 전시
- **4개국어 지원**: 한국어 · English · 日本語 · Bahasa Indonesia
- **관리자 모드**: 푸터 3번 클릭 → 패들렛 URL 변경

## 🛠️ 기술 스택

- HTML + CSS + Vanilla JS (ES Modules)
- Vite 개발 서버
- html2canvas (카드 이미지 생성)
- Google Fonts (Noto Sans KR)

## 🚀 실행 방법

```bash
npm install
npm run dev
# 또는
pnpm install
pnpm dev
```

## 📁 파일 구조

```
index.html        ← 앱 진입점
src/
  main.js         ← 앱 로직 (언어·카테고리·카드·관리자모드)
  i18n.js         ← 4개국어 번역 데이터
  sdg-data.js     ← 17개 SDG 목표 데이터 (다국어)
  style.css       ← 전체 스타일
public/
  favicon.svg
```

## 📄 Made by

[교육뮤지컬 꿈꾸는 치수쌤](https://litt.ly/chichiboo)
