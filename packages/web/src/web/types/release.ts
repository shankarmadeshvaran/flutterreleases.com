export type Channel = "stable" | "beta" | "main" | "dev" | "hotfix";

export interface Release {
  version: string;
  dartVersion: string;
  channel: Channel;
  releaseType: string;
  releasedAt: string;
  requires: {
    macos: string;
    xcode: string;
    windows: string;
    visual_studio: string;
    linux: string;
  };
  downloads: {
    macosArm64: string | null;
    macosX64: string | null;
    windowsX64: string | null;
    linuxX64: string | null;
  };
  releaseNotes: {
    full: string | null;
    framework: string | null;
    material: string | null;
    ios: string | null;
    android: string | null;
    windows: string | null;
    linux: string | null;
    web: string | null;
  };
}
