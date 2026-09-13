import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  accountId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => Promise<T>): Promise<T> {
  return asyncLocalStorage.run(context, fn);
}

export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

export function getAccountId(): string {
  const store = asyncLocalStorage.getStore();
  if (!store || !store.accountId) {
    // Giá trị default cho môi trường dev/local nếu chưa cấu hình header
    return process.env.DEFAULT_ACCOUNT_ID || 'default-account';
  }
  return store.accountId;
}
