// ============================================================
//  location — إحداثيات الجهاز عبر expo-location
//  يعيد { longitude, latitude } لترسل في coordinates:[lng,lat]
// ============================================================

import * as Location from 'expo-location';

export async function getDeviceCoords() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    const e = new Error('يرجى السماح بالوصول إلى الموقع لعرض الفنيين القريبين منك');
    e.code = 'LOCATION_DENIED';
    throw e;
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { longitude: pos.coords.longitude, latitude: pos.coords.latitude };
}
