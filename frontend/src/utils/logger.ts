// Simple logger utility for frontend
export const logger = {
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  error: (message: string, data?: any) => {
    if (data?.error) {
      const errorMsg = data.error?.message || data.error?.toString() || JSON.stringify(data.error);
      console.error(`[ERROR] ${message}`, errorMsg, data);
    } else {
      console.error(`[ERROR] ${message}`, data || '');
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  },
};
