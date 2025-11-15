import { DEFAULT_API_HOST, DEFAULT_MODELS, StoreKey } from "../constant";
import { getHeaders } from "../client/api";
import { getClientConfig } from "../config/client";
import { createPersistStore } from "../utils/store";

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

const DEFAULT_OPENAI_URL =
  getClientConfig()?.buildMode === "export" ? DEFAULT_API_HOST : "/api/openai/";
console.log("[API] default openai url", DEFAULT_OPENAI_URL);

const DEFAULT_ACCESS_STATE = {
  token: "",
  accessCode: "",
  needCode: true,
  hideUserApiKey: false,
  hideBalanceQuery: false,
  disableGPT4: false,

  openaiUrl: DEFAULT_OPENAI_URL,
  cozeApiKey: "",
  cozeUrl: "",
  cozeBotId: "",
};

export const useAccessStore = createPersistStore(
  { ...DEFAULT_ACCESS_STATE },

  (set, get) => ({
    enabledAccessControl() {
      this.fetch();

      return get().needCode;
    },
    updateCode(code: string) {
      // ASCII字符验证函数
      const isAsciiOnly = (str: string) => {
        if (!str || typeof str !== "string") return false;
        for (let i = 0; i < str.length; i++) {
          if (str.charCodeAt(i) > 127) {
            console.warn(
              `[AccessStore] Non-ASCII character detected in access code at position ${i}: "${str[i]}", rejecting code`,
            );
            return false;
          }
        }
        return true;
      };

      const trimmedCode = code?.trim() || "";
      if (trimmedCode && !isAsciiOnly(trimmedCode)) {
        console.error(
          "[AccessStore] Access code contains non-ASCII characters, not saving",
        );
        return;
      }
      set(() => ({ accessCode: trimmedCode }));
    },
    updateToken(token: string) {
      // ASCII字符验证函数
      const isAsciiOnly = (str: string) => {
        if (!str || typeof str !== "string") return false;
        for (let i = 0; i < str.length; i++) {
          if (str.charCodeAt(i) > 127) {
            console.warn(
              `[AccessStore] Non-ASCII character detected in token at position ${i}: "${str[i]}", rejecting token`,
            );
            return false;
          }
        }
        return true;
      };

      const trimmedToken = token?.trim() || "";
      if (trimmedToken && !isAsciiOnly(trimmedToken)) {
        console.error(
          "[AccessStore] Token contains non-ASCII characters, not saving",
        );
        return;
      }
      set(() => ({ token: trimmedToken }));
    },
    updateOpenAiUrl(url: string) {
      set(() => ({ openaiUrl: url?.trim() }));
    },
    updateCozeApiKey(key: string) {
      // ASCII字符验证函数
      const isAsciiOnly = (str: string) => {
        if (!str || typeof str !== "string") return false;
        for (let i = 0; i < str.length; i++) {
          if (str.charCodeAt(i) > 127) {
            console.warn(
              `[AccessStore] Non-ASCII character detected in Coze API key at position ${i}: "${str[i]}", rejecting key`,
            );
            return false;
          }
        }
        return true;
      };

      const trimmedKey = key?.trim() || "";
      if (trimmedKey && !isAsciiOnly(trimmedKey)) {
        console.error(
          "[AccessStore] Coze API key contains non-ASCII characters, not saving",
        );
        return;
      }
      set(() => ({ cozeApiKey: trimmedKey }));
    },
    updateCozeUrl(url: string) {
      set(() => ({ cozeUrl: url?.trim() }));
    },
    updateCozeBotId(botId: string) {
      set(() => ({ cozeBotId: botId?.trim() }));
    },
    isAuthorized() {
      this.fetch();

      // has token or has code or disabled access control
      return (
        !!get().token || !!get().accessCode || !this.enabledAccessControl()
      );
    },
    fetch() {
      if (fetchState > 0 || getClientConfig()?.buildMode === "export") return;
      fetchState = 1;
      fetch("/api/config", {
        method: "post",
        body: null,
        headers: {
          ...getHeaders(),
        },
      })
        .then((res) => res.json())
        .then((res: DangerConfig) => {
          console.log("[Config] got config from server", res);
          set(() => ({ ...res }));

          if (res.disableGPT4) {
            DEFAULT_MODELS.forEach(
              (m: any) => (m.available = !m.name.startsWith("gpt-4")),
            );
          }
        })
        .catch(() => {
          console.error("[Config] failed to fetch config");
        })
        .finally(() => {
          fetchState = 2;
        });
    },
  }),
  {
    name: StoreKey.Access,
    version: 1,
  },
);
