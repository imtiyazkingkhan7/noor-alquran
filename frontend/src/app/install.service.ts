import { Injectable, signal } from '@angular/core';

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

  start(): void {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      this.installed.set(true);
      this.hint.set('Noor is installed on this device. Open it from your home screen or app list.');
      return;
    }
    const electron = !!(window as Window & { nurDesktop?: unknown }).nurDesktop;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (electron) {
      this.hint.set('This Electron window cannot be installed. Open https://www.nooralquran.com in Google Chrome, then use Install in the address bar.');
    } else if (ios) {
      this.hint.set('iPhone / iPad: tap the Share button, then Add to Home Screen.');
    } else if (/android/i.test(navigator.userAgent)) {
      this.hint.set('Android: open this page in Chrome → menu (⋮) → Install app or Add to Home screen.');
    } else {
      this.hint.set('PC: open this page in Google Chrome. Click Install in the address bar (computer icon), or the button below when Chrome offers it.');
    }
    if (!electron) {
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        this.deferred = event as BeforeInstallPromptEvent;
        this.canInstall.set(true);
        this.hint.set('Chrome is ready. Tap Install Noor to put an icon on this PC or phone.');
      });
      window.addEventListener('appinstalled', () => {
        this.installed.set(true);
        this.canInstall.set(false);
        this.hint.set('Noor is installed. Open it from your home screen or app list.');
      });
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.register('/sw.js');
      }
    }
  }

  async install(): Promise<void> {
    if (!this.deferred) {
      return;
    }
    await this.deferred.prompt();
    await this.deferred.userChoice;
    this.deferred = undefined;
    this.canInstall.set(false);
  }
}
