import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';

export const KAABA_LAT = 21.422487;
export const KAABA_LNG = 39.826206;
const DELHI_LAT = 28.6139;
const DELHI_LNG = 77.209;

export const QIBLA_CITIES: { id: string; name: string; lat: number; lng: number }[] = [
  { id: 'gps', name: 'Use my GPS', lat: 0, lng: 0 },
  { id: 'makkah', name: 'Makkah', lat: 21.4225, lng: 39.8262 },
  { id: 'madinah', name: 'Madinah', lat: 24.4672, lng: 39.6111 },
  { id: 'delhi', name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { id: 'mumbai', name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { id: 'karachi', name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { id: 'lahore', name: 'Lahore', lat: 31.5204, lng: 74.3587 },
  { id: 'istanbul', name: 'Istanbul', lat: 41.0082, lng: 28.9784 },
  { id: 'cairo', name: 'Cairo', lat: 30.0444, lng: 31.2357 },
  { id: 'jakarta', name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  { id: 'kuala', name: 'Kuala Lumpur', lat: 3.139, lng: 101.6869 },
  { id: 'london', name: 'London', lat: 51.5074, lng: -0.1278 },
  { id: 'newyork', name: 'New York', lat: 40.7128, lng: -74.006 }
];
const ADHAN_URLS = [
  'https://www.islamcan.com/audio/adhan/azan2.mp3',
  'https://www.islamcan.com/audio/adhan/azan1.mp3'
];

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface PrayerTime {
  name: PrayerName;
  arabic: string;
  clock: string;
  at: Date;
}

const ARABIC: Record<PrayerName, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء'
};

const ORDER: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

@Injectable({ providedIn: 'root' })
export class PrayerService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);
  readonly times = signal<PrayerTime[]>([]);
  readonly nextName = signal<PrayerName | ''>('');
  readonly qibla = signal(0);
  readonly heading = signal<number | null>(null);
  readonly lat = signal<number | null>(null);
  readonly lng = signal<number | null>(null);
  readonly status = signal('Loading prayer times…');
  readonly azaanOn = signal(this.readFlag());
  readonly azaanLive = signal(false);
  readonly usingFallback = signal(false);
  readonly distanceKm = signal(0);
  readonly gpsAccuracy = signal<number | null>(null);
  readonly locationLabel = signal('Finding location…');
  readonly compassLive = signal(false);
  readonly facingQibla = signal(false);
  readonly turnDegrees = signal(0);
  readonly turnSide = signal<'left' | 'right' | 'aligned'>('aligned');
  private timers: number[] = [];
  private tickId = 0;
  private adhan?: HTMLAudioElement;
  private started = false;
  private firedKeys = new Set<string>();
  private headingOn = false;
  private headingHandler?: (event: DeviceOrientationEvent) => void;
  private locationNote = '';
  private watchId = 0;
  private smoothHeading: number | null = null;
  private lastFetchKey = '';

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.azaanOn.set(this.readFlag());
    this.locate();
    this.tickId = window.setInterval(() => this.tick(), 30000);
    void this.askNotify();
    const unlock = (): void => {
      this.unlockAudio();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
  }

  toggleAzaan(): void {
    const next = !this.azaanOn();
    this.azaanOn.set(next);
    localStorage.setItem('nur-azaan', next ? '1' : '0');
    if (!next) {
      this.stopAdhan();
    } else {
      void this.askNotify();
      this.unlockAudio();
    }
    this.armAlarms();
  }

  needle(): number {
    const heading = this.heading();
    const qibla = this.qibla();
    if (heading == null) {
      return qibla;
    }
    return (qibla - heading + 360) % 360;
  }

  enableCompass(): void {
    void this.requestHeadingPermission();
    if (this.headingOn) {
      return;
    }
    this.headingOn = true;
    this.headingHandler = (event: DeviceOrientationEvent) => {
      const heading = compassFromEvent(event);
      if (heading == null) {
        return;
      }
      const smoothed = this.smooth(heading);
      this.zone.run(() => {
        this.heading.set(smoothed);
        this.compassLive.set(true);
        this.updateFacing();
      });
    };
    window.addEventListener('deviceorientationabsolute', this.headingHandler as EventListener, true);
    window.addEventListener('deviceorientation', this.headingHandler, true);
  }

  refreshLocation(): void {
    this.usingFallback.set(false);
    this.locationLabel.set('Updating location…');
    this.locate(true);
  }

  useCity(id: string): void {
    if (id === 'gps') {
      this.refreshLocation();
      return;
    }
    const city = QIBLA_CITIES.find((row) => row.id === id);
    if (!city) {
      return;
    }
    this.stopWatch();
    this.usingFallback.set(false);
    this.gpsAccuracy.set(null);
    this.applyLocation(city.lat, city.lng, '', city.name);
  }

  ngOnDestroy(): void {
    this.clearTimers();
    if (this.tickId) {
      window.clearInterval(this.tickId);
    }
    this.stopAdhan();
    this.stopWatch();
    if (this.headingHandler) {
      window.removeEventListener('deviceorientation', this.headingHandler);
      window.removeEventListener('deviceorientationabsolute', this.headingHandler as EventListener);
    }
  }

  private locate(force = false): void {
    const fallback = (): void => {
      this.usingFallback.set(true);
      this.gpsAccuracy.set(null);
      this.applyLocation(DELHI_LAT, DELHI_LNG, 'Location unavailable. Using Delhi (IST).', 'Delhi (fallback)');
    };
    if (!navigator.geolocation) {
      fallback();
      return;
    }
    this.stopWatch();
    const applyPos = (pos: GeolocationPosition): void => {
      this.usingFallback.set(false);
      this.gpsAccuracy.set(pos.coords.accuracy || null);
      this.applyLocation(pos.coords.latitude, pos.coords.longitude, '', 'GPS');
    };
    navigator.geolocation.getCurrentPosition(applyPos, () => fallback(), {
      enableHighAccuracy: true,
      timeout: force ? 20000 : 12000,
      maximumAge: force ? 0 : 15000
    });
    this.watchId = navigator.geolocation.watchPosition(applyPos, () => undefined, {
      enableHighAccuracy: true,
      maximumAge: 8000
    });
  }

  private stopWatch(): void {
    if (this.watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = 0;
    }
  }

  private applyLocation(lat: number, lng: number, note: string, label?: string): void {
    this.lat.set(lat);
    this.lng.set(lng);
    this.qibla.set(qiblaBearing(lat, lng));
    this.distanceKm.set(haversineKm(lat, lng, KAABA_LAT, KAABA_LNG));
    this.locationLabel.set(label || (note ? 'Fallback location' : 'GPS'));
    this.locationNote = note;
    this.updateFacing();
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (key !== this.lastFetchKey) {
      this.lastFetchKey = key;
      this.status.set(this.times().length ? note : (note || 'Loading prayer times…'));
      this.fetchTimes(lat, lng);
    } else {
      this.status.set(note);
    }
  }

  private updateFacing(): void {
    const rel = this.needle();
    const offset = rel > 180 ? rel - 360 : rel;
    const abs = Math.abs(offset);
    if (this.heading() == null) {
      this.facingQibla.set(false);
      this.turnDegrees.set(Math.round(this.qibla()));
      this.turnSide.set('aligned');
      return;
    }
    if (abs <= 6) {
      this.facingQibla.set(true);
      this.turnDegrees.set(0);
      this.turnSide.set('aligned');
      return;
    }
    this.facingQibla.set(false);
    this.turnDegrees.set(Math.round(abs));
    this.turnSide.set(offset > 0 ? 'right' : 'left');
  }

  private smooth(heading: number): number {
    if (this.smoothHeading == null) {
      this.smoothHeading = heading;
      return heading;
    }
    const delta = ((heading - this.smoothHeading + 540) % 360) - 180;
    this.smoothHeading = (this.smoothHeading + delta * 0.22 + 360) % 360;
    return this.smoothHeading;
  }

  private fetchTimes(lat: number, lng: number): void {
    const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=1`;
    this.http.get<{ data?: { timings?: Record<string, string> } }>(url).subscribe({
      next: (body) => {
        const raw = body.data?.timings ?? {};
        const today = new Date();
        const times = ORDER.map((name) => {
          const clock = (raw[name] || '00:00').slice(0, 5);
          return { name, arabic: ARABIC[name], clock, at: parseToday(clock, today) };
        });
        this.times.set(times);
        this.status.set(this.locationNote);
        this.armAlarms();
        this.tick();
        void this.askNotify();
      },
      error: () => this.status.set('Could not load today’s prayer times.')
    });
  }

  private pickNext(): void {
    const now = Date.now();
    const upcoming = this.times().find((row) => row.at.getTime() > now);
    this.nextName.set(upcoming?.name ?? (this.times().length ? 'Fajr' : ''));
  }

  private tick(): void {
    this.pickNext();
    if (!this.azaanOn()) {
      return;
    }
    const now = Date.now();
    for (const row of this.times()) {
      const due = row.at.getTime();
      if (due <= now && now - due < 120000) {
        this.announce(row);
      }
    }
  }

  private prayerKey(row: PrayerTime): string {
    return `${row.name}-${row.at.toDateString()}-${row.clock}`;
  }

  private armAlarms(): void {
    this.clearTimers();
    const now = Date.now();
    const midnight = new Date();
    midnight.setHours(24, 1, 0, 0);
    this.timers.push(window.setTimeout(() => {
      const lat = this.lat();
      const lng = this.lng();
      if (lat != null && lng != null) {
        this.fetchTimes(lat, lng);
      }
    }, Math.max(1000, midnight.getTime() - now)));
    if (!this.azaanOn()) {
      return;
    }
    for (const row of this.times()) {
      const wait = row.at.getTime() - now;
      if (wait <= 800) {
        continue;
      }
      const id = window.setTimeout(() => this.announce(row), wait);
      this.timers.push(id);
    }
  }

  private announce(row: PrayerTime): void {
    this.pickNext();
    if (!this.azaanOn()) {
      this.armAlarms();
      return;
    }
    const key = this.prayerKey(row);
    if (this.firedKeys.has(key)) {
      return;
    }
    this.firedKeys.add(key);
    void this.showNotice(`Noor — ${row.name}`, `Time for ${row.name} (${row.arabic}) · ${row.clock}`);
    this.playAdhan();
    this.armAlarms();
  }

  private playAdhan(index = 0): void {
    this.stopAdhan();
    const url = ADHAN_URLS[index];
    if (!url) {
      return;
    }
    const audio = new Audio(url);
    this.adhan = audio;
    this.azaanLive.set(true);
    audio.onended = () => this.azaanLive.set(false);
    audio.onerror = () => {
      this.azaanLive.set(false);
      this.playAdhan(index + 1);
    };
    void audio.play().catch(() => {
      this.azaanLive.set(false);
      this.playAdhan(index + 1);
    });
  }

  stopAdhan(): void {
    this.adhan?.pause();
    if (this.adhan) {
      this.adhan.src = '';
    }
    this.adhan = undefined;
    this.azaanLive.set(false);
  }

  private unlockAudio(): void {
    const audio = new Audio(ADHAN_URLS[0]);
    audio.volume = 0;
    void audio.play().then(() => {
      audio.pause();
      audio.src = '';
    }).catch(() => undefined);
  }

  private async requestHeadingPermission(): Promise<void> {
    const orient = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof orient.requestPermission === 'function') {
      try {
        await orient.requestPermission();
      } catch {
        /* iOS may deny; static compass still works */
      }
    }
  }

  private async showNotice(title: string, body: string): Promise<void> {
    const desktop = window.nurDesktop;
    if (desktop?.notifyPrayer) {
      try {
        const shown = await desktop.notifyPrayer(title, body);
        if (shown) {
          return;
        }
      } catch {
        /* fall through to the web Notification API */
      }
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, silent: true });
      } catch {
        /* notifications can fail in some browsers */
      }
    }
  }

  private async askNotify(): Promise<void> {
    const desktop = window.nurDesktop;
    if (desktop?.requestNotifyPermission) {
      try {
        await desktop.requestNotifyPermission();
      } catch {
        /* ignore */
      }
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') {
      return;
    }
    try {
      await Notification.requestPermission();
    } catch {
      /* ignore */
    }
  }

  private clearTimers(): void {
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers = [];
  }

  private readFlag(): boolean {
    try {
      return localStorage.getItem('nur-azaan') !== '0';
    } catch {
      return true;
    }
  }
}

function parseToday(clock: string, day: Date): Date {
  const [h, m] = clock.split(':').map((part) => Number(part));
  const at = new Date(day);
  at.setHours(h || 0, m || 0, 0, 0);
  return at;
}

function qiblaBearing(lat: number, lng: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA_LAT);
  const Δλ = toRad(KAABA_LNG - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function compassFromEvent(event: DeviceOrientationEvent): number | null {
  const webkit = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
  if (typeof webkit.webkitCompassHeading === 'number' && !Number.isNaN(webkit.webkitCompassHeading)) {
    return (webkit.webkitCompassHeading + 360) % 360;
  }
  if (typeof event.alpha !== 'number' || Number.isNaN(event.alpha)) {
    return null;
  }
  const screenAngle = currentScreenAngle();
  if (event.absolute || typeof (event as DeviceOrientationEvent).alpha === 'number') {
    return (360 - event.alpha + screenAngle + 360) % 360;
  }
  return (360 - event.alpha + 360) % 360;
}

function currentScreenAngle(): number {
  const orient = screen.orientation?.angle;
  if (typeof orient === 'number') {
    return orient;
  }
  const legacy = (window as Window & { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function toDeg(value: number): number {
  return (value * 180) / Math.PI;
}
