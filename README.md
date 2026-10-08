# 철거반 (Demolition Crew)

함께 건물을 부수고, 잔해를 트럭에 던져 넣어 돈을 버는 협동 철거 게임. 한 방에 6명까지.

- `index.html` — 게임 (Three.js 포함, 파일 하나)
- `server.js` — 중계 서버. 같은 방 사람끼리 메시지를 전달만 하고, 판정은 방장 브라우저가 한다

## 내 컴퓨터에서 실행

```bash
npm install
PORT=3129 npm start
```

`http://localhost:3129` 로 열면 이 서버에 접속한다.

## Render 배포

- 새 Web Service → 이 저장소 연결, 지역 Singapore
- Build Command `npm install`, Start Command `npm start`
- 주소 `https://demoltion-man.onrender.com` (게임의 `RELAY_URL`과 같아야 한다)
- 무료 요금제는 15분 동안 접속이 없으면 잠들고, 첫 접속 때 깨어나는 데 1분쯤 걸린다

## 게시 사이트

`index.html` 한 파일을 올린다. 항목 ID `eadb23e0-351e-421b-be42-ea8b97ccb495`, `--screen free`.
