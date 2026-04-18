export type ToastType = "error" | "info" | "success";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = () => void;

let _toasts: Toast[] = [];
const _listeners = new Set<Listener>();

function _notify() {
  _listeners.forEach((l) => l());
}

/** Show a toast notification from anywhere in the app. */
export function toast(message: string, type: ToastType = "error") {
  _toasts = [..._toasts, { id: Date.now(), message, type }];
  _notify();
}

export function dismissToast(id: number) {
  _toasts = _toasts.filter((t) => t.id !== id);
  _notify();
}

export function getToasts(): Toast[] {
  return _toasts;
}

export function subscribeToasts(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
