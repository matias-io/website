type WidgetOptions = {
  sitekey: string;
  action: string;
  theme: 'auto';
  execution: 'execute';
  appearance: 'interaction-only';
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
};
interface TurnstileApi {
  render: (element: HTMLElement, options: WidgetOptions) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
let loading: Promise<TurnstileApi> | undefined;
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else {
        loading = undefined;
        reject(new Error('Verification unavailable'));
      }
    };
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Verification unavailable'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
