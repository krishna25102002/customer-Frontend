import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

// Device GPS wrapper for the customer app. Only watches while `enabled` is true;
// uses high accuracy + a 10m distance filter + 5s Android interval. Everything
// the caller needs to show permission/GPS/quality states is exposed.

// status values: idle | searching | ready | denied | gps_disabled | error | stopped
export const LOC_PERM_UNKNOWN = 'unknown';
export const LOC_PERM_GRANTED = 'granted';
export const LOC_PERM_DENIED = 'denied';

let rnConfigSet = false;
const applyRnConfig = () => {
  if (rnConfigSet) return;
  rnConfigSet = true;
  try {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      enableBackgroundLocationUpdates: false,
    });
  } catch (err) {
    // iOS-only method on some versions — safe to ignore.
  }
};

const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const result = await PermissionsAndroid.request(
        'android.permission.ACCESS_FINE_LOCATION',
        {
          title: 'Share your location',
          message:
            'We use your location to show your pickup and help the driver find you during a trip.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  }

  return new Promise((resolve) => {
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false)
    );
  });
};

export default function useCustomerLocation({ enabled = false, onPosition = null } = {}) {
  const [permission, setPermission] = useState(LOC_PERM_UNKNOWN);
  const [gpsStatus, setGpsStatus] = useState('unknown'); // enabled | disabled | unknown
  const [status, setStatus] = useState('idle'); // see module doc
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);

  const watchId = useRef(null);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  const stop = useCallback(() => {
    if (watchId.current != null) {
      try {
        Geolocation.clearWatch(watchId.current);
      } catch (err) {
        // already cleared
      }
      watchId.current = null;
    }
    setPosition(null);
    setStatus('stopped');
  }, []);

  const start = useCallback(async () => {
    const granted = await requestLocationPermission();
    if (!granted) {
      setPermission(LOC_PERM_DENIED);
      setStatus('denied');
      setError('Location permission denied. Enable it in app settings to share your location.');
      return;
    }
    setPermission(LOC_PERM_GRANTED);
    setStatus('searching');
    setError(null);

    watchId.current = Geolocation.watchPosition(
      pos => {
        const p = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy != null ? pos.coords.accuracy : null,
          heading: pos.coords.heading != null ? pos.coords.heading : null,
          speed: pos.coords.speed != null ? pos.coords.speed : null,
          timestamp: new Date(pos.timestamp).toISOString(),
        };
        setPosition(p);
        setGpsStatus('enabled');
        setStatus('ready');
        setError(null);
        if (onPositionRef.current) onPositionRef.current(p);
      },
      err => {
        if (err && err.code === 1) {
          setPermission(LOC_PERM_DENIED);
          setStatus('denied');
          setError('Location permission denied.');
        } else if (err && err.code === 2) {
          setGpsStatus('disabled');
          setStatus('gps_disabled');
          setError('GPS is disabled. Turn on location services.');
        } else {
          setStatus('error');
          setError((err && err.message) || 'Location unavailable right now.');
        }
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // ~10m before the next callback
        interval: 5000, // Android only
        fastestInterval: 3000,
        accuracy: { android: 'high' },
        maximumAge: 10000,
        timeout: 10000,
      }
    );
  }, []);

  useEffect(() => {
    applyRnConfig();
    if (!enabled) {
      stop();
      return;
    }
    start();
    return () => stop();
  }, [enabled, start, stop]);

  return { permission, gpsStatus, status, position, error, start, stop };
}