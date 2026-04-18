import { registerPlugin } from "@capacitor/core";

export interface SignixTvPlugin {
  enterImmersive(): Promise<void>;
  setKeepScreenOn(options: { on: boolean }): Promise<void>;
  /** Pinning de tela; em produção corporativa costuma exigir perfil de dispositivo ou confirmação do usuário. */
  startLockTask(): Promise<void>;
  stopLockTask(): Promise<void>;
}

export const SignixTv = registerPlugin<SignixTvPlugin>("SignixTv", {
  web: () => ({
    enterImmersive: async () => undefined,
    setKeepScreenOn: async () => undefined,
    startLockTask: async () => undefined,
    stopLockTask: async () => undefined,
  }),
});
