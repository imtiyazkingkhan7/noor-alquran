import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PrayerService } from './prayer.service';

@Component({
  selector: 'app-qibla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qibla-app">
      <h1>Qibla</h1>
      <p class="lede">Turn until the Kaaba sits at the top. The red needle points to Masjid al-Haram.</p>

      <section class="stage" [class.aligned]="prayer.facingQibla() && prayer.compassLive()">
        <div class="compass">
          <div class="rim"></div>
          <div class="glass" [style.transform]="'rotate(' + roseTurn() + 'deg)'">
            <span class="card n"><i></i>N</span>
            <span class="card e"><i></i>E</span>
            <span class="card s"><i></i>S</span>
            <span class="card w"><i></i>W</span>
            <div class="qibla" [style.transform]="'rotate(' + prayer.qibla() + 'deg)'">
              <span class="kaaba" title="Kaaba" [style.transform]="'translate(-50%, -8%) rotate(' + kaabaUpright() + 'deg)'">
                <span class="kiswah"></span>
                <span class="band"></span>
              </span>
              <svg class="needle" viewBox="0 0 40 220" aria-hidden="true">
                <polygon points="20,4 34,110 20,110 6,110" fill="#e53935" />
                <polygon points="20,216 34,110 20,110 6,110" fill="#f4f4f4" />
                <circle cx="20" cy="110" r="7" fill="#cfd3d6" stroke="#8a8f94" stroke-width="1.5" />
              </svg>
            </div>
          </div>
        </div>
        <p class="deg">{{ degrees(prayer.qibla()) }}° {{ cardinal(prayer.qibla()) }}</p>
        <p class="hint">{{ hint() }}</p>
      </section>

      <div class="actions">
        <button type="button" class="btn btn-gold" (click)="prayer.enableCompass()">
          {{ prayer.compassLive() ? 'Compass on' : 'Turn on compass' }}
        </button>
        <button type="button" class="btn" (click)="prayer.refreshLocation()">Use my location</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .qibla-app { padding: 20px 20px 28px; max-width: 520px; margin: 0 auto; text-align: center; }
    h1 { font-family: var(--display); font-weight: 600; font-size: 36px; margin: 0 0 8px; }
    .lede { color: var(--ink-dim); line-height: 1.5; margin: 0 auto 16px; max-width: 40ch; }
    @media (max-width: 900px) {
      .qibla-app { padding: 8px 14px 16px; }
      h1 { font-size: 24px; margin-bottom: 4px; }
      .lede { font-size: 13px; margin-bottom: 10px; }
      .stage { padding: 16px 12px 14px; }
      .compass { width: min(260px, 70vw); height: min(260px, 70vw); }
      .deg { font-size: 28px; margin: 12px 0 4px; }
    }
    .stage {
      padding: 28px 16px 22px;
      border-radius: 28px;
      background: #050505;
      border: 1px solid #222;
    }
    .stage.aligned { box-shadow: 0 0 0 1px #c0392b, 0 0 28px rgba(192, 57, 43, 0.35); }
    .compass {
      position: relative;
      width: min(320px, 78vw);
      height: min(320px, 78vw);
      margin: 0 auto;
    }
    .rim {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background:
        radial-gradient(circle at 32% 22%, #f4f4f4, #b8b8b8 38%, #6d6d6d 70%, #d9d9d9);
      box-shadow: 0 18px 28px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.5);
    }
    .glass {
      position: absolute;
      inset: 18px;
      border-radius: 50%;
      background:
        radial-gradient(circle at 30% 22%, #7ec8ff 0%, #1e6fd6 42%, #0b4aa8 78%);
      box-shadow: inset 0 0 0 4px #0a3a86, inset 0 -18px 24px rgba(0,0,0,.18);
      overflow: visible;
      transition: transform 0.12s linear;
    }
    .glass::after {
      content: '';
      position: absolute;
      inset: 8%;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255,255,255,.38), transparent 42%);
      pointer-events: none;
    }
    .card {
      position: absolute;
      color: #fff;
      font-weight: 800;
      font-size: 16px;
      letter-spacing: 0.04em;
      z-index: 2;
    }
    .card i {
      display: block;
      width: 0;
      height: 0;
      margin: 0 auto 2px;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-bottom: 10px solid #fff;
    }
    .n { top: 10px; left: 50%; transform: translateX(-50%); }
    .s { bottom: 10px; left: 50%; transform: translateX(-50%) rotate(180deg); }
    .e { right: 10px; top: 50%; transform: translateY(-50%) rotate(90deg); }
    .w { left: 10px; top: 50%; transform: translateY(-50%) rotate(-90deg); }
    .qibla {
      position: absolute;
      inset: 0;
      transform-origin: 50% 50%;
    }
    .kaaba {
      position: absolute;
      left: 50%;
      top: -6px;
      width: 34px;
      height: 38px;
      background: #1a1a1a;
      clip-path: polygon(50% 0, 100% 22%, 100% 100%, 0 100%, 0 22%);
      box-shadow: 0 4px 10px rgba(0,0,0,.4);
      z-index: 4;
    }
    .kaaba .band {
      position: absolute;
      left: 0;
      right: 0;
      top: 28%;
      height: 22%;
      background: linear-gradient(180deg, #d7b56a, #a8873d);
    }
    .kaaba .kiswah {
      position: absolute;
      left: 10%;
      right: 10%;
      bottom: 8%;
      height: 22%;
      background:
        repeating-linear-gradient(90deg, #ececec 0 3px, transparent 3px 7px);
      opacity: 0.85;
    }
    .needle {
      position: absolute;
      left: 50%;
      top: 16%;
      height: 68%;
      width: 28px;
      margin-left: -14px;
      z-index: 3;
      overflow: visible;
    }
    .pivot { display: none; }
    .deg {
      margin: 18px 0 6px;
      font-family: var(--display);
      font-size: 40px;
      color: #fff;
    }
    .hint { margin: 0; color: #d0d0d0; line-height: 1.5; min-height: 2.4em; }
    .actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 18px; }
    .actions a { text-decoration: none; }
  `]
})
export class QiblaComponent {
  readonly prayer = inject(PrayerService);

  constructor() {
    this.prayer.start();
    this.prayer.enableCompass();
  }

  roseTurn(): number {
    const heading = this.prayer.heading();
    return heading == null ? 0 : -heading;
  }

  degrees(value: number): number {
    return Math.round(((value % 360) + 360) % 360);
  }

  kaabaUpright(): number {
    return (this.prayer.heading() ?? 0) - this.prayer.qibla();
  }

  cardinal(deg: number): string {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(this.degrees(deg) / 22.5) % 16];
  }

  hint(): string {
    const qibla = this.degrees(this.prayer.qibla());
    const name = this.cardinal(qibla);
    if (!this.prayer.compassLive()) {
      return `Kaaba is ${qibla}° ${name} from North. The red needle points there. Turn on compass on a phone to follow it live.`;
    }
    if (this.prayer.facingQibla()) {
      return 'You are facing the Kaaba.';
    }
    const side = this.prayer.turnSide() === 'right' ? 'right' : 'left';
    return `Kaaba is ${qibla}° ${name}. Turn ${this.prayer.turnDegrees()}° ${side} until the Kaaba is at the top.`;
  }
}
