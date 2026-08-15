export const PARA_NAMES: { en: string; ar: string }[] = [
  { en: 'Alif Lam Meem', ar: 'الم' },
  { en: 'Sayaqool', ar: 'سَيَقُولُ' },
  { en: 'Tilkar Rusul', ar: 'تِلْكَ الرُّسُلُ' },
  { en: 'Lan Tanaalu', ar: 'لَن تَنَالُوا' },
  { en: 'Wal Muhsanat', ar: 'وَالْمُحْصَنَاتُ' },
  { en: 'La Yuhibbullah', ar: 'لَا يُحِبُّ اللَّهُ' },
  { en: 'Wa Iza Samiu', ar: 'وَإِذَا سَمِعُوا' },
  { en: 'Wa Lau Annana', ar: 'وَلَوْ أَنَّنَا' },
  { en: 'Qalal Malao', ar: 'قَالَ الْمَلَأُ' },
  { en: 'Wa Alamoo', ar: 'وَاعْلَمُوا' },
  { en: 'Yatazirun', ar: 'يَعْتَذِرُونَ' },
  { en: 'Wa Ma Min Dabbah', ar: 'وَمَا مِن دَابَّةٍ' },
  { en: 'Wa Ma Ubarri', ar: 'وَمَا أُبَرِّئُ' },
  { en: 'Rubama', ar: 'رُبَمَا' },
  { en: 'Subhanallazi', ar: 'سُبْحَانَ الَّذِي' },
  { en: 'Qal Alam', ar: 'قَالَ أَلَمْ' },
  { en: 'Iqtaraba', ar: 'اقْتَرَبَ' },
  { en: 'Qad Aflaha', ar: 'قَدْ أَفْلَحَ' },
  { en: 'Wa Qalallazina', ar: 'وَقَالَ الَّذِينَ' },
  { en: 'Amman Khalaq', ar: 'أَمَّنْ خَلَقَ' },
  { en: 'Utlu Ma Oohi', ar: 'اتْلُ مَا أُوحِيَ' },
  { en: 'Wa Man Yaqnut', ar: 'وَمَن يَقْنُتْ' },
  { en: 'Wa Mali', ar: 'وَمَا لِيَ' },
  { en: 'Faman Azlam', ar: 'فَمَنْ أَظْلَمُ' },
  { en: 'Ilayhi Yuraddu', ar: 'إِلَيْهِ يُرَدُّ' },
  { en: 'Ha Meem', ar: 'حم' },
  { en: 'Qala Fama Khatbukum', ar: 'قَالَ فَمَا خَطْبُكُم' },
  { en: 'Qad Sami Allah', ar: 'قَدْ سَمِعَ اللَّهُ' },
  { en: 'Tabarakallazi', ar: 'تَبَارَكَ الَّذِي' },
  { en: 'Amma Yatasaaloon', ar: 'عَمَّ' }
];

export function paraName(number: number): { en: string; ar: string } {
  return PARA_NAMES[number - 1] ?? { en: `Para ${number}`, ar: `پارہ ${number}` };
}

export function namedParas(rows: { number: number; startSurah: number; startAyah: number; startPage: number; englishName: string; arabicName?: string }[]) {
  const byNum = new Map(rows.map((row) => [row.number, row]));
  return Array.from({ length: 30 }, (_, index) => {
    const number = index + 1;
    const row = byNum.get(number);
    const names = paraName(number);
    return {
      number,
      startSurah: row?.startSurah ?? 1,
      startAyah: row?.startAyah ?? 1,
      startPage: row?.startPage ?? 1,
      englishName: names.en,
      arabicName: names.ar
    };
  });
}
