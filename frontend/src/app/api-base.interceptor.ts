import { HttpInterceptorFn } from '@angular/common/http';

const LIVE = 'https://noor-alquran.onrender.com';

function nativeApp(): boolean {
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api') || !nativeApp()) {
    return next(req);
  }
  return next(req.clone({ url: LIVE + req.url }));
};
