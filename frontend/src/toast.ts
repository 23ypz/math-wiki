import { reactive } from 'vue';

export type ToastKind = 'success' | 'error' | 'info';
export const toasts = reactive<{ id: number; message: string; kind: ToastKind }[]>([]);
let seed = 0;

export function showToast(message: string, kind: ToastKind = 'success') {
  const id = ++seed;
  toasts.push({ id, message, kind });
  window.setTimeout(() => {
    const index = toasts.findIndex((item) => item.id === id);
    if (index >= 0) toasts.splice(index, 1);
  }, 2600);
}
