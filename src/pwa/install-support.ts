export type InstallEnvironment = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standaloneMedia?: boolean;
  navigatorStandalone?: boolean;
};

export function isIos({ userAgent, platform, maxTouchPoints = 0 }: InstallEnvironment) {
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function isSafari({ userAgent }: InstallEnvironment) {
  return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(userAgent);
}

export function isStandalone(environment: InstallEnvironment) {
  return Boolean(environment.standaloneMedia || environment.navigatorStandalone);
}

export function installationMessage(environment: InstallEnvironment) {
  if (isStandalone(environment)) return "installed" as const;
  if (isIos(environment) && isSafari(environment)) return "ios-safari" as const;
  if (isIos(environment)) return "ios-other-browser" as const;
  return "prompt-or-browser-menu" as const;
}
