// Cloudflare Pages 环境绑定类型

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ADMIN_INIT_KEY: string;
}

export type AppContext = {
  Bindings: Env;
  Variables: {
    userId?: number;
    userRole?: string;
    userStatus?: string;
  };
};
