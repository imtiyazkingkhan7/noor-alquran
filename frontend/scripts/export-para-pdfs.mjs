import { spawn } from 'node:child_process';
import { mkdir, writeFile, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT = path.join(ROOT, 'frontend', 'public', 'fonts', 'AlMajeedQuranic.ttf');
const OUT = path.join(process.env.USERPROFILE || ROOT, 'Documents', 'Noor-Al-Quran-Paras');
const HTML_DIR = path.join(ROOT, 'pdfs', 'html');
const API = 'http://127.0.0.1:8080/api/juz';
const BASMALA = 'بِسۡمِ اللهِ الرَّحۡمٰنِ الرَّحِيۡمِ';
const EASTERN = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PARA_NAMES = [
  ['Alif Lam Meem', 'الم'],
  ['Sayaqool', 'سَيَقُولُ'],
  ['Tilkar Rusul', 'تِلْكَ الرُّسُلُ'],
  ['Lan Tanaalu', 'لَن تَنَالُوا'],
  ['Wal Muhsanat', 'وَالْمُحْصَنَاتُ'],
  ['La Yuhibbullah', 'لَا يُحِبُّ اللَّهُ'],
  ['Wa Iza Samiu', 'وَإِذَا سَمِعُوا'],
  ['Wa Lau Annana', 'وَلَوْ أَنَّنَا'],
  ['Qalal Malao', 'قَالَ الْمَلَأُ'],
  ['Wa Alamoo', 'وَاعْلَمُوا'],
  ['Yatazirun', 'يَعْتَذِرُونَ'],
  ['Wa Ma Min Dabbah', 'وَمَا مِن دَابَّةٍ'],
  ['Wa Ma Ubarri', 'وَمَا أُبَرِّئُ'],
  ['Rubama', 'رُبَمَا'],
  ['Subhanallazi', 'سُبْحَانَ الَّذِي'],
  ['Qal Alam', 'قَالَ أَلَمْ'],
  ['Iqtaraba', 'اقْتَرَبَ'],
  ['Qad Aflaha', 'قَدْ أَفْلَحَ'],
  ['Wa Qalallazina', 'وَقَالَ الَّذِينَ'],
  ['Amman Khalaq', 'أَمَّنْ خَلَقَ'],
  ['Utlu Ma Oohi', 'اتْلُ مَا أُوحِيَ'],
  ['Wa Man Yaqnut', 'وَمَن يَقْنُتْ'],
  ['Wa Mali', 'وَمَا لِيَ'],
  ['Faman Azlam', 'فَمَنْ أَظْلَمُ'],
  ['Ilayhi Yuraddu', 'إِلَيْهِ يُرَدُّ'],
  ['Ha Meem', 'حم'],
  ['Qala Fama Khatbukum', 'قَالَ فَمَا خَطْبُكُم'],
  ['Qad Sami Allah', 'قَدْ سَمِعَ اللَّهُ'],
  ['Tabarakallazi', 'تَبَارَكَ الَّذِي'],
  ['Amma Yatasaaloon', 'عَمَّ']
];

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((file) => existsSync(file));

function eastern(value) {
  return String(value).replace(/[0-9]/g, (digit) => EASTERN[Number(digit)]);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeMushaf(text) {
  return text
    .replace(/[\u200B\uFEFF\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069]/g, '')
    .replace(/\u2002/g, ' ')
    .replace(/([\u0615\u06D6-\u06DC\u06DE\uE000-\uF8FF])(?=[\u0621-\u064A\u0671\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06CC\u06D2])/g, '$1 ')
    .replace(/ +/g, ' ')
    .trim();
}

function slug(name) {
  return name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderPara(detail) {
  const names = PARA_NAMES[detail.num - 1];
  const blocks = [];
  let currentSurah = 0;
  for (const ayah of detail.ayahs) {
    if (ayah.surah !== currentSurah) {
      currentSurah = ayah.surah;
      blocks.push(`<h2 class="surah">${escapeHtml(ayah.surahAr || '')}<small>${escapeHtml(ayah.surahEn || '')}</small></h2>`);
      if (ayah.surah !== 1 && ayah.surah !== 9) {
        blocks.push(`<p class="basmala">${BASMALA}</p>`);
      }
    }
    const text = escapeHtml(normalizeMushaf(ayah.ar || ''));
    const ruku = ayah.rukuEnds ? '<span class="ruku">ع</span>' : '';
    blocks.push(`<span class="ayah">${text}<span class="ayah-end">${eastern(ayah.n)}</span>${ruku}</span>`);
  }
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>Para ${detail.num} · ${names[0]}</title>
  <style>
    @font-face {
      font-family: "Al Majeed Quranic";
      src: url("./AlMajeedQuranic.ttf") format("truetype");
      font-display: block;
    }
    @page { size: A4; margin: 16mm 14mm 18mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      background: #f7f1de;
      color: #100c08;
    }
    body {
      font-family: "Al Majeed Quranic", serif;
      padding: 8px 4px 24px;
    }
    header {
      text-align: center;
      margin: 0 0 18px;
      padding-bottom: 10px;
      border-bottom: 1px solid #5a4630;
    }
    header h1 {
      margin: 0;
      font-size: 34px;
      font-weight: normal;
    }
    header p {
      margin: 6px 0 0;
      font-family: Georgia, serif;
      font-size: 13px;
      letter-spacing: 0.04em;
    }
    .surah {
      page-break-after: avoid;
      text-align: center;
      font-size: 30px;
      font-weight: normal;
      margin: 22px 0 8px;
    }
    .surah small {
      display: block;
      margin-top: 4px;
      font-family: Georgia, serif;
      font-size: 12px;
    }
    .basmala {
      text-align: center;
      font-size: 28px;
      margin: 0 0 12px;
    }
    .page-body {
      font-size: 26px;
      line-height: 2.15;
      text-align: justify;
      text-justify: inter-word;
    }
    .ayah { white-space: normal; }
    .ayah-end {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.15em;
      height: 1.15em;
      margin: 0 0.18em;
      border: 1.6px solid #1c140c;
      border-radius: 50%;
      font-family: "Noto Naskh Arabic", "Traditional Arabic", serif;
      font-size: 0.55em;
      font-weight: 700;
      line-height: 1;
      vertical-align: middle;
    }
    .ruku {
      display: inline-block;
      margin: 0 0.12em;
      font-size: 0.72em;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <header>
    <h1>پارہ ${eastern(detail.num)} · ${escapeHtml(names[1])}</h1>
    <p>Noor · Al-Quran · Para ${detail.num} · ${escapeHtml(names[0])}</p>
  </header>
  <div class="page-body">${blocks.join('')}</div>
</body>
</html>`;
}

function fileUrl(filePath) {
  return 'file:///' + encodeURI(path.resolve(filePath).replace(/\\/g, '/'));
}

function runChrome(htmlPath, pdfPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-pdf-header-footer',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=12000',
      `--print-to-pdf=${pdfPath}`,
      fileUrl(htmlPath)
    ];
    const child = spawn(CHROME, args, { windowsHide: true });
    let err = '';
    child.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });
    child.stdout.on('data', (chunk) => {
      err += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0 && existsSync(pdfPath)) {
        resolve();
      } else {
        reject(new Error(`Chrome exited ${code} for ${pdfPath}${err ? `\n${err}` : ''}`));
      }
    });
  });
}

async function main() {
  if (!CHROME) {
    throw new Error('Chrome or Edge was not found.');
  }
  await mkdir(OUT, { recursive: true });
  await mkdir(HTML_DIR, { recursive: true });
  await copyFile(FONT, path.join(HTML_DIR, 'AlMajeedQuranic.ttf'));

  for (let num = 1; num <= 30; num += 1) {
    const res = await fetch(`${API}/${num}`);
    if (!res.ok) {
      throw new Error(`API juz ${num} failed: ${res.status}`);
    }
    const detail = await res.json();
    const names = PARA_NAMES[num - 1];
    const htmlName = `para-${String(num).padStart(2, '0')}.html`;
    const pdfName = `${String(num).padStart(2, '0')}-${slug(names[0])}.pdf`;
    const htmlPath = path.join(HTML_DIR, htmlName);
    const pdfPath = path.join(OUT, pdfName);
    await writeFile(htmlPath, renderPara(detail), 'utf8');
    process.stdout.write(`Printing para ${num} ${names[0]}… `);
    await runChrome(htmlPath, pdfPath);
    process.stdout.write('done\n');
  }

  const files = (await readdir(OUT)).filter((name) => name.endsWith('.pdf')).sort();
  console.log(`Wrote ${files.length} PDFs to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
