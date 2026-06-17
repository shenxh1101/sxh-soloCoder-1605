import type { ApiResponse } from '../types/index.js';

export function success<T>(data?: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export function error(msg: string): ApiResponse<never> {
  return {
    success: false,
    error: msg,
  };
}
