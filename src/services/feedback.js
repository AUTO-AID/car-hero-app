import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

function run(effect) {
  if (Platform.OS === "web") return;
  Promise.resolve(effect()).catch(() => {});
}

export function selectionFeedback() {
  run(() => Haptics.selectionAsync());
}

export function actionFeedback() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function successFeedback() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function errorFeedback() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
