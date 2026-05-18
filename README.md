# SDGs 마스터 (SDGs Master)

> 초등학생을 위한 **집단지성형 SDGs 큐레이션 웹앱**
> SDGs 카드를 마스터하고, 일상 속 사례를 발견해, 마스터 카드를 만들어 패들렛에 함께 전시합니다.

🌐 **Live**: <https://chichiboo123.github.io/sdgsmaster/>

---

## ✨ 주요 기능

- **3단계 마스터 흐름** — SDGs 선택(Select) → 사례 발견(Discover) → 마스터 카드(Master Card)
- **17개 SDG 목표** 컬러 아이콘 + 초등 눈높이 한 줄 해설(툴팁)
  - 첫 클릭 = 메인 목표(★), 추가 클릭 = 서브 목표(+), 다시 클릭 = 해제
- **통합 카드 워크스페이스** — 미리보기와 내보내기를 한 컨테이너로 묶어 카드가 완성된 순간 자연스럽게 내보내기 UI가 펼쳐집니다.
- **내보내기 단축 UX** — TXT · JPG 버튼을 클릭하면 *클립보드 복사 / 다운로드*를 선택할 수 있는 드롭다운이 펼쳐집니다.
- **패들렛 임베드** — 카드를 만든 즉시 `Ctrl+V`로 우리 반 전시 공간에 추가
- **출처표기 도우미** — 책 · 웹사이트 · 신문기사 출처를 간편하게 만들어 본문에 붙여넣기
- **4개국어 지원** — 한국어 · English · 日本語 · Bahasa Indonesia
- **반응형 UI** — 데스크탑/태블릿/스마트폰 모두 대응, 좌·우 패널 너비 드래그 조절 가능

## 🧭 사용자 흐름

```
1단계  🎯 SDGs 선택      ← 마스터할 SDGs 카드를 고른다 (메인 + 서브)
   ↓
2단계  🔍 사례 발견      ← 이름·발견 장소·상황·(선택) 출처 입력
   ↓
3단계  ✨ 마스터 카드     ← 나의 생각·실천을 정리 → 카드 생성 → TXT/JPG 내보내기
```

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
index.html                ← 앱 진입점 (3단계 카드 + 패들렛 패널)
src/
  main.js                 ← 앱 로직 (언어·SDG 선택·카드 생성·내보내기 드롭다운)
  i18n.js                 ← 4개국어 번역 데이터
  sdg-data.js             ← 17개 SDG 목표 데이터 (다국어)
  style.css               ← 전체 스타일 (카드 워크스페이스·드롭다운 포함)
public/
  favicon.svg
.github/workflows/
  deploy.yml              ← GitHub Pages 자동 배포
vite.config.ts            ← Vite 설정 (base path / 포트)
```

## 🔐 관리자 모드

- 푸터의 크레딧을 **2초 안에 3번 클릭** → 관리자 비밀번호 입력 모달
- 패들렛 주소를 임의로 교체하거나 기본값으로 초기화할 수 있습니다.
- 비밀번호는 소스에 저장되므로 완벽한 보안 목적이 아닌 *실수 방지* 용도입니다.

---

## 👤 개발자

- **교육뮤지컬 꿈꾸는 치수쌤**
- 문의 · 다른 작업물 보기: <https://litt.ly/chichiboo>

## 💛 아이디어 존중 요청

이 프로젝트는 교육 현장을 위해 정성껏 만든 결과물입니다.
아이디어나 콘텐츠를 활용하실 때는 출처(교육뮤지컬 꿈꾸는 치수쌤 · litt.ly/chichiboo)를 밝혀 주시면 감사하겠습니다. 🙏

수업·연수·개선 제안 등 언제든 환영합니다 — 위 링크로 연락 주세요.
