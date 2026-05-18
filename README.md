# SDGs 마스터 (SDGs Master)

> 초등학생을 위한 **집단지성형 SDGs 큐레이션 웹앱**
> 일상 속 SDGs 사례를 발견 → 17개 목표와 연결 → 인사이트 카드로 큐레이션해 패들렛에 함께 전시합니다.

🌐 **Live**: <https://chichiboo123.github.io/sdgsmaster/>

---

## ✨ 주요 기능

- **3단계 학습 흐름** — 사례 발견(Discover) → SDGs 연결(Connect) → 큐레이션(Curation)
- **17개 SDG 목표** 컬러 아이콘 + 초등 눈높이 한 줄 해설(툴팁)
- **인사이트 카드 생성** — 자동 색상 매칭, 한 번의 클릭으로 클립보드에 이미지 복사 (html2canvas)
- **패들렛 임베드** — 카드를 만든 즉시 `Ctrl+V`로 우리 반 전시 공간에 추가
- **4개국어 지원** — 한국어 · English · 日本語 · Bahasa Indonesia
- **관리자 모드** — 푸터 3번 빠르게 클릭 → 비밀번호 입력 → 패들렛 URL 교체 가능
- **반응형 UI** — 데스크탑/태블릿/스마트폰 모두 대응

## 🛠️ 기술 스택

- HTML + CSS + Vanilla JS (ES Modules)
- [Vite](https://vitejs.dev) — 개발 서버 & 빌드 도구
- [html2canvas](https://html2canvas.hertzen.com/) — 카드 → 이미지 변환
- Google Fonts (Noto Sans KR)
- GitHub Actions → GitHub Pages 자동 배포

## 🚀 로컬 실행

```bash
npm install
npm run dev          # 개발 서버 (http://localhost:5173)
npm run build        # 프로덕션 빌드 → dist/
npm run preview      # 빌드 결과 미리보기
```

## 🌐 배포 (GitHub Pages)

`main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 자동으로 빌드하여 GitHub Pages에 배포합니다.

리포지토리 설정에서 **Settings → Pages → Build and deployment → Source = GitHub Actions** 로 설정해 주세요.

## 📁 파일 구조

```
index.html                ← 앱 진입점 (HTML 마크업)
src/
  main.js                 ← 앱 로직 (언어·카테고리·카드·관리자모드)
  i18n.js                 ← 4개국어 번역 데이터
  sdg-data.js             ← 17개 SDG 목표 데이터 (다국어)
  style.css               ← 전체 스타일
public/
  favicon.svg
.github/workflows/
  deploy.yml              ← GitHub Pages 자동 배포
vite.config.ts            ← Vite 설정 (base path / 포트)
```

## 🔐 관리자 모드

1. 페이지 하단 푸터(🎭 Created by...)를 **2초 안에 3번** 클릭
2. 비밀번호 입력 (`src/main.js`의 `ADMIN_PASSWORD` 상수)
3. 패들렛 URL 변경 후 저장

> ⚠️ 비밀번호는 소스코드에 평문 저장됩니다. 실수 방지용이며 본격적인 보안 수단은 아닙니다.

---

## 👤 개발자

- **교육뮤지컬 꿈꾸는 치수쌤**
- 문의 · 다른 작업물 보기: <https://litt.ly/chichiboo>

## 💛 아이디어 존중 요청

이 프로젝트는 교육 현장에서 아이들과 함께 지속가능한 미래를 그려보기 위해 시간과 마음을 들여 만든 결과물입니다.
**아이디어와 콘텐츠를 그대로 가져가 자기 작품인 양 배포하지 말아 주세요.**
참고하거나 영감을 얻은 경우, 출처(교육뮤지컬 꿈꾸는 치수쌤 · litt.ly/chichiboo)를 함께 밝혀 주시면 큰 힘이 됩니다. 🙏

수업·연수·공동작업 등 좋은 사용 사례나 개선 제안은 언제든 환영합니다 — 위 링크로 연락 주세요.
