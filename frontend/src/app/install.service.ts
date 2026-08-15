import { Injectable, NgZone, inject, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class InstallService {
  readonly canInstall = signal(false);
  readonly installed = signal(false);
  readonly hint = signal('');
  private deferred?: BeforeInstallPromptEvent;
  private readonly zone = inject(NgZone);

  start(): void {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      this.installed.set(true);
      this.hint.set('Noor is installed on this device. Open it from your home screen or app list.');
      return;
    }
    const electron = !!(window as Window & { nurDesktop?: unknown }).nurDesktop;
    this.hint.set(this.defaultHint());
    if (electron) {
      return;
    }
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.zone.run(() => {
        this.deferred = event as BeforeInstallPromptEvent;
        this.canInstall.set(true);
        this.hint.set('Tap Install Noor. Chrome will ask you to confirm.');
      });
    });
    window.addEventListener('appinstalled', () => {
      this.zone.run(() => {
        this.installed.set(true);
        this.canInstall.set(false);
        this.hint.set('Noor is installed. Open it from your home screen or app list.');
      });
    });
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready);
    }
  }

  async install(): Promise<void> {
    if (this.deferred) {
      await this.deferred.prompt();
      await this.deferred.userChoice;
      this.deferred = undefined;
      this.canInstall.set(false);
      return;
    }
    this.hint.set(this.defaultHint());
  }

  private defaultHint(): string {
    if ((window as Window & { nurDesktop?: unknown }).nurDesktop) {
      return 'Open https://noor-alquran.onrender.com in Google Chrome to install.';
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      return 'iPhone: tap Share, then Add to Home Screen.';
    }
    if (/android/i.test(navigator.userAgent)) {
      return 'Android Chrome: tap the ⋮ menu, then Install app.';
    }
    return 'Chrome: click the ⋮ menu (top right) → Cast, save and share → Install page as app. Or use the computer icon in the address bar.';
  }
}
