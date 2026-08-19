import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// اهتزاز اللمس معطّل عبر التطبيق كلّه.
//
// كل ضغطة كانت تمرّ من PressableScale فتُطلق اهتزازاً — وهو ضجيج حسّي
// متواصل لا يضيف معلومة: المستخدم يرى الزرّ ينكمش تحت إصبعه أصلاً.
// اهتزاز النتيجة (نجاح/خطأ) يبقى عاملاً لأنه يبلّغ بما لا يُرى بالضرورة.
//
// للإعادة: اجعل القيمة true.
const TOUCH_HAPTICS_ENABLED = false;

function run(effect) {
  if (Platform.OS === "web") return;
  Promise.resolve(effect()).catch(() => {});
}

export function selectionFeedback() {
  if (!TOUCH_HAPTICS_ENABLED) return;
  run(() => Haptics.selectionAsync());
}

export function actionFeedback() {
  if (!TOUCH_HAPTICS_ENABLED) return;
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function successFeedback() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function errorFeedback() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
