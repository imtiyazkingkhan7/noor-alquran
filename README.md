# Noor — Quran teacher

Angular Mushaf + Spring Boot API. Visual Tajweed, reference audio, lessons, and a recitation teacher that compares what you read with the ayah.

This is a **practice aid**. It does not replace a qualified teacher, and automated Tajweed scoring is assistive.

## Run

Terminal 1 — API (Java 17):

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

On first start the API downloads the full Uthmani Quran and English translation from [alquran.cloud](https://alquran.cloud) and caches them in `backend/data/`. If the network is down, it serves a bundled set (Al-Fatiha, Al-Asr, Al-Kawthar, Al-Ikhlas, Al-Falaq, An-Nas).

Terminal 2 — UI (Node 18+):

```powershell
cd frontend
npm start
```

Open [http://localhost:4200](http://localhost:4200). The Angular dev server proxies `/api` to `http://localhost:8080`.

## Website (free)

The site is the same Angular app, served by Spring Boot as one website. No Play Store fee.

Build the site into the API, then run it:

```powershell
cd frontend
npm run build:site
cd ..\backend
.\mvnw.cmd -DskipTests package
java -jar target\quran-api-0.0.1-SNAPSHOT.jar
```

Open [http://localhost:8080](http://localhost:8080) on this PC. The public site is **https://www.nooralquran.com** after you buy that domain and host the Docker image.

1. Buy **nooralquran.com** (Namecheap, GoDaddy, or Google Domains). Domains ignore capital letters, so `www.noorAlquran.com` is the same as `www.nooralquran.com`.
2. Put this project on GitHub, then create a **Web Service** on [Render](https://render.com) using the root `Dockerfile`. Set the port to `8080`.
3. In the domain registrar, point **www** (CNAME) to the Render hostname, and add **nooralquran.com** as well. In Render, add both custom domains so HTTPS is issued.

Free host (one Docker service): **Render**, **Railway**, or **Fly.io**. On a phone, Chrome → **Add to Home screen** installs it like an app.

## What is in here

| Piece | Stack | Role |
|---|---|---|
| `frontend` | Angular 19 | Mushaf, Tajweed colors, audio, lessons, microphone |
| `backend` | Spring Boot 3.4 | Corpus, Tajweed engine, recitation word-check, lessons |
| Audio | islamic.network CDN | Alafasy, Husary, Minshawi ayah MP3s |

Recite works best in **Chrome**. The browser turns speech into Arabic text; Spring Boot aligns words with the ayah and returns Tajweed reminders for the letters on that ayah.

## API

- `GET /api/health`
- `GET /api/surahs`
- `GET /api/surahs/{n}`
- `GET /api/lessons`
- `POST /api/recitation/assess` `{ "surah", "ayah", "transcript", "durationSeconds" }`
