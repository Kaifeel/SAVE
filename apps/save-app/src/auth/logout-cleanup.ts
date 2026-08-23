type LogoutCleanup = (accessToken: string) => Promise<void>;

let cleanup: LogoutCleanup = async () => undefined;

export function setLogoutCleanup(nextCleanup: LogoutCleanup): () => void {
  cleanup = nextCleanup;
  return () => {
    if (cleanup === nextCleanup) cleanup = async () => undefined;
  };
}

export function runLogoutCleanup(accessToken: string): Promise<void> {
  return cleanup(accessToken);
}
