// 鉴权 Zustand store：token / user / roles / permissions
// persist 到 localStorage，并额外写入 sso_token 作为 SSO 共享令牌。

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  loginApi,
  registerApi,
  sendVerifyCodeApi,
  resetPasswordApi,
  logoutApi,
} from "@/services/auth";
import { setRawStorage, removeStorage } from "@/utils/storage";
import type { AuthState } from "@/types/api";

const SSO_TOKEN_KEY = "sso_token";

export interface LoginOutcome {
  success: boolean;
  message: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      roles: [],
      permissions: [],
      rememberMe: false,

      login: async (username, password, remember) => {
        try {
          const res = await loginApi(username, password);
          if (!res.success || !res.user || !res.token) {
            return { success: false, message: res.message };
          }
          set({
            token: res.token,
            user: res.user,
            roles: res.user.roles,
            permissions: res.user.permissions,
            rememberMe: remember,
          });
          setRawStorage(SSO_TOKEN_KEY, res.token);
          return { success: true, message: res.message };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "登录失败，请检查后端服务";
          return { success: false, message: msg };
        }
      },

      register: async (form) => {
        try {
          const res = await registerApi(form);
          return { success: res.success, message: res.message };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "注册失败，请检查后端服务";
          return { success: false, message: msg };
        }
      },

      sendVerifyCode: async (email) => {
        try {
          const res = await sendVerifyCodeApi(email);
          return { success: res.success, message: res.message };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "验证码发送失败";
          return { success: false, message: msg };
        }
      },

      resetPassword: async (email, code, newPassword) => {
        try {
          const res = await resetPasswordApi(email, code, newPassword);
          return { success: res.success, message: res.message };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "密码重置失败";
          return { success: false, message: msg };
        }
      },

      logout: async () => {
        await logoutApi();
        set({
          token: null,
          user: null,
          roles: [],
          permissions: [],
          rememberMe: false,
        });
        removeStorage(SSO_TOKEN_KEY);
      },

      isAuthenticated: () => !!get().token,
      hasRole: (role) => get().roles.includes(role),
      hasPermission: (perm) => get().permissions.includes(perm),
    }),
    {
      name: "sso_auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        roles: s.roles,
        permissions: s.permissions,
        rememberMe: s.rememberMe,
      }),
    },
  ),
);
