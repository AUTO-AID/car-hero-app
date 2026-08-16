// ============================================================
//  config — تحديد عنوان الـ Backend حسب المنصّة والبيئة
//  محصّن ضد أي قيمة غير متوقّعة حتى لا ينهار عند الإقلاع.
// ============================================================
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PREFIX = 'api/v1';
const DEV_PORT = 3001;

// عنوان صريح للـ backend (لبيئة الإنتاج) — يجب أن يكون نصّاً وإلا يُتجاهَل
function getExplicitBaseUrl() {
  try {
    const v =
      Constants?.expoConfig?.extra?.apiBaseUrl ??
      Constants?.manifest2?.extra?.expoClient?.extra?.apiBaseUrl ??
      Constants?.manifest?.extra?.apiBaseUrl;
    if (typeof v === 'string' && v.trim()) {
      return v.trim().replace(/\/+$/, '');
    }
    return null;
  } catch {
    return null;
  }
}

// استخراج IP جهاز التطوير من عنوان Metro (يعمل على الجهاز الحقيقي عبر شبكة LAN)
function getDevHost() {
  try {
    const raw =
      Constants?.expoConfig?.hostUri ||
      Constants?.expoGoConfig?.debuggerHost ||
      Constants?.manifest2?.extra?.expoClient?.hostUri ||
      Constants?.manifest?.debuggerHost ||
      '';
    const host = String(raw).split(':')[0];
    return host || null;
  } catch {
    return null;
  }
}

function resolveBaseUrl() {
  const explicit = getExplicitBaseUrl();
  if (explicit) return explicit;

  // محاكي أندرويد يصل لمضيف التطوير عبر 10.0.2.2، وإلا localhost لـ iOS
  const fallback = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  const host = getDevHost() || fallback;
  return `http://${host}:${DEV_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();
export const API_URL = `${API_BASE_URL}/${API_PREFIX}`;
