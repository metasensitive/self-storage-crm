/**
 * Лёгкий парсер User-Agent — без внешних зависимостей.
 * Не претендует на полноту, но достаточен для красивого отображения сессий
 * (Browser + OS + тип устройства).
 */

export type DeviceKind = 'desktop' | 'tablet' | 'mobile' | 'unknown';

export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: DeviceKind;
  /** Короткое представление: "Chrome on Windows" / "Safari on iPhone" */
  short: string;
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  if (/Yandex/i.test(ua)) return 'Yandex Browser';
  if (/MSIE|Trident/i.test(ua)) return 'Internet Explorer';
  return 'Браузер';
}

function detectOS(ua: string): string {
  if (/Windows NT 10/i.test(ua)) return 'Windows 10/11';
  if (/Windows NT 6\.3/i.test(ua)) return 'Windows 8.1';
  if (/Windows NT 6\.[12]/i.test(ua)) return 'Windows 7/8';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod|iOS/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Неизвестная ОС';
}

function detectDevice(ua: string): DeviceKind {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  if (/Windows|Macintosh|Linux/i.test(ua)) return 'desktop';
  return 'unknown';
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) {
    return {
      browser: 'Неизвестное устройство',
      os: '',
      device: 'unknown',
      short: 'Неизвестное устройство',
    };
  }
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  const device = detectDevice(ua);
  return {
    browser,
    os,
    device,
    short: `${browser} · ${os}`,
  };
}
