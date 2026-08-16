export {};

declare global {
  interface Window {
    nurDesktop?: {
      isDesktop?: boolean;
    };
  }
}
