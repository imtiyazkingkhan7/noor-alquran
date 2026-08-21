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

## Windows 32-bit

The desktop app is a **32-bit Windows** Electron 43 shell, so it runs on 32-bit Windows 10/11 and on 64-bit Windows. Electron 44 dropped `win32-ia32` binaries; this project pins Electron **43.4.0**.

### Packaged app

On any 64-bit machine with Node 18–22:

```powershell
cd frontend
npm ci
npm run dist:win32:installer
```

On Linux or macOS, `npm run dist:win32` writes a zip (NSIS needs Windows or Wine). The GitHub Action **Desktop Windows 32-bit** builds the installers.

That writes:

- `frontend/dist-desktop/NoorAlQuran-Setup-0.0.0-win-ia32.exe` — installer (choose the install folder; useful when `C:` is small)
- `frontend/dist-desktop/NoorAlQuran-0.0.0-win-ia32-portable.exe` — no-install copy
- `frontend/dist-desktop/NoorAlQuran-0.0.0-win-ia32.zip` — unzip and run `NoorAlQuran.exe`

The app opens the Mushaf. If the Angular dev server or local API is running it uses that; otherwise it loads https://noor-alquran.onrender.com.

32-bit Windows 7/8 are not supported (Electron 43 needs Windows 10 or later).

### Develop on a 32-bit PC

1. Install a **32-bit Java 17 JDK** ([Azul Zulu x86](https://www.azul.com/downloads/?version=java-17-lts&os=windows&architecture=x86-32-bit&package=jdk#zulu)) and put it on `PATH` / `JAVA_HOME`.
2. Install **Node.js 22 x86** (Node 23 dropped Windows 32-bit).
3. API:

   ```cmd
   cd backend
   run-win32.cmd
   ```

   Or `.\mvnw.cmd spring-boot:run` with a 32-bit JDK. `run-win32.cmd` keeps the heap small enough for a 32-bit process.
4. UI (in another terminal):

   ```cmd
   cd frontend
   set NODE_OPTIONS=--max-old-space-size=1024
   npm start
   ```

5. Desktop window: `npm run desktop` (from `frontend`, with the UI or API already running).

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

Open [http://localhost:8080](http://localhost:8080) on this PC. The public site is **https://noor-alquran.onrender.com** (Render free plan).

Free host (one Docker service): **Render**, **Railway**, or **Fly.io**. On a phone, Chrome → **Add to Home screen** installs it like an app.

## What is in here

| Piece | Stack | Role |
|---|---|---|
| `frontend` | Angular 19 + Electron 43 (Windows ia32) | Mushaf, Tajweed colors, audio, lessons, microphone |
| `backend` | Spring Boot 3.4 (Java 17, including 32-bit JDK) | Corpus, Tajweed engine, recitation word-check, lessons |
| Audio | islamic.network CDN | Alafasy, Husary, Minshawi ayah MP3s |

Recite works best in **Chrome**. The browser turns speech into Arabic text; Spring Boot aligns words with the ayah and returns Tajweed reminders for the letters on that ayah.

## API

- `GET /api/health`
- `GET /api/surahs`
- `GET /api/surahs/{n}`
- `GET /api/lessons`
- `POST /api/recitation/assess` `{ "surah", "ayah", "transcript", "durationSeconds" }`
