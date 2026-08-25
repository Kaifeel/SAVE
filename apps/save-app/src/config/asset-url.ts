import { runtime } from './runtime';

export function resolveAssetUrl(
  value: string,
  apiBaseUrl = runtime.apiBaseUrl,
): string {
  if (!value || /^(data:|blob:|file:|content:)/i.test(value)) {
    return value;
  }
  if (!apiBaseUrl) {
    return value;
  }

  try {
    if (/^https?:/i.test(value)) {
      const asset = new URL(value);
      const api = new URL(apiBaseUrl);
      if (['localhost', '127.0.0.1', '10.0.2.2'].includes(asset.hostname)) {
        asset.protocol = api.protocol;
        asset.host = api.host;
        return asset.toString();
      }
      return value;
    }
    return new URL(value.startsWith('/') ? value : `/${value}`, new URL(apiBaseUrl).origin)
      .toString();
  } catch {
    return value;
  }
}
