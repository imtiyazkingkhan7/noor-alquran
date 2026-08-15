export {};

declare global {
  interface Window {
    nurDesktop?: {
      notifyPrayer(title: string, body: string): Promise<boolean>;
      requestNotifyPermission(): Promise<boolean>;
    };
  }
}
