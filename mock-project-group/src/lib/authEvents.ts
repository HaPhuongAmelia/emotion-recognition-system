// src/lib/authEvents.ts

// Tạo một Custom Event dùng để báo hiệu khi có lỗi Unauthorized (401)
const UNAUTHORIZED_EVENT = 'unauthorized';

// Hàm phát sự kiện "unauthorized" — được gọi khi server trả về mã 401
export function emitUnauthorized() {
  const event = new Event(UNAUTHORIZED_EVENT);
  window.dispatchEvent(event);
}

// Đăng ký lắng nghe sự kiện 401
export function onUnauthorized(callback: () => void) {
  window.addEventListener(UNAUTHORIZED_EVENT, callback);
}

// Hủy đăng ký lắng nghe sự kiện 401
export function offUnauthorized(callback: () => void) {
  window.removeEventListener(UNAUTHORIZED_EVENT, callback);
}
