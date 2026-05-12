const DEFAULT_ACCESS_TOKEN_BUFFER_SECONDS = 30;

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      return null;
    }

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    const payload: unknown = JSON.parse(decoded);
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const getAccessTokenExp = (accessToken: string): number | null => {
  const payload = decodeJwtPayload(accessToken);
  const exp = payload?.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) {
    return null;
  }
  return exp;
};

export const isAccessTokenExpiredOrExpiring = (
  accessToken: string,
  bufferSeconds: number = DEFAULT_ACCESS_TOKEN_BUFFER_SECONDS
): boolean => {
  const exp = getAccessTokenExp(accessToken);
  if (exp === null) {
    return false;
  }

  const safeBuffer = Math.max(0, Math.floor(bufferSeconds));
  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowSeconds + safeBuffer;
};
