import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Map, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

import { getMapStyle, fetchRouteOnMap } from '../api';
import { C } from '../theme';

const DEFAULT_CAMERA_ZOOM = 15;

const useSmoothCoordinate = (target) => {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const animRef = useRef(null);

  useEffect(() => {
    if (!target) return;
    const from = displayRef.current;
    const to = { latitude: target.latitude, longitude: target.longitude, heading: target.heading };
    if (!from) {
      displayRef.current = to;
      setDisplay(to);
      return;
    }

    const distKm = haversineKm(from, to);
    // Very large jumps (reconnect / book restart) should snap, not fly.
    const duration = distKm > 2 ? 0 : Math.min(1500, 700 + distKm * 900);

    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }

    if (duration === 0) {
      displayRef.current = to;
      setDisplay(to);
      return;
    }

    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const next = {
        latitude: from.latitude + (to.latitude - from.latitude) * eased,
        longitude: from.longitude + (to.longitude - from.longitude) * eased,
        heading: to.heading != null ? to.heading : from.heading,
      };
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target && target.latitude, target && target.longitude]);

  return display;
};

const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

let styleCache = null;
let styleCachePromise = null;

const loadStyle = async () => {
  if (styleCachePromise) return styleCachePromise;
  const token = await AsyncStorage.getItem('token');
  styleCachePromise = getMapStyle('osm-bright', token)
    .then(style => {
      styleCache = style;
      return style;
    })
    .finally(() => {
      styleCachePromise = null;
    });
  return styleCachePromise;
};

const LiveTrackingMap = ({
  style,
  driverLocation = null,
  customerLocation = null,
  pickup = null,
  drop = null,
  showRoute = false,
  showRecenterButton = true,
  onMapReady = null,
  children,
}) => {
  const [mapStyle, setMapStyle] = useState(styleCache);
  const [styleState, setStyleState] = useState(styleCache ? 'ready' : 'loading'); // loading|ready|error
  const [route, setRoute] = useState(null); // GeoJSON LineString
  const [loadingRoute, setLoadingRoute] = useState(false);
  const mapRef = useRef(null);
  const cameraRef = useRef(null);

  // Initial camera from the most authoritative coordinate.
  const anchor = driverLocation || customerLocation || pickup || drop;
  const smoothDriver = useSmoothCoordinate(driverLocation);

  const fetchStyle = useCallback(async () => {
    setStyleState('loading');
    try {
      const loadedStyle = await loadStyle();
      setMapStyle(loadedStyle);
      setStyleState('ready');
    } catch (err) {
      setStyleState('error');
    }
  }, []);

  useEffect(() => {
    if (styleCache) {
      setStyleState('ready');
      return;
    }
    fetchStyle();
  }, [fetchStyle]);

  // Route: pickup -> drop polyline (server-side Geoapify routing).
  const loadRoute = useCallback(async () => {
    if (!showRoute || !pickup || !drop) return;
    if (!pickup.latitude || !drop.latitude) return;
    setLoadingRoute(true);
    try {
      const from = { fromLat: pickup.latitude, fromLng: pickup.longitude };
      const to = { toLat: drop.latitude, toLng: drop.longitude };
      const token = await AsyncStorage.getItem('token');
      const res = await fetchRouteOnMap(from, to, 'drive', token);
      const coords = res?.features?.[0]?.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        setRoute({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: coords },
              properties: {},
            },
          ],
        });
      }
    } catch (err) {
      // no special handling needed on failure — pickups/drop markers remain.
    } finally {
      setLoadingRoute(false);
    }
  }, [showRoute, pickup, drop]);

  useEffect(() => {
    if (styleState === 'ready' && showRoute) {
      loadRoute();
    }
  }, [styleState, showRoute, loadRoute]);

  const recenter = useCallback(() => {
    const target = driverLocation || customerLocation || pickup;
    if (target && cameraRef.current) {
      cameraRef.current.flyTo({ center: [target.longitude, target.latitude], zoom: DEFAULT_CAMERA_ZOOM, duration: 800 });
    }
  }, [driverLocation, customerLocation, pickup]);

  if (styleState === 'loading') {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator color={C.accent} />
        <Text style={styles.placeholderText}>Loading map…</Text>
      </View>
    );
  }

  if (styleState === 'error') {
    return (
      <View style={[styles.placeholder, style]}>
        <MaterialIcons name="map" size={30} color={C.textMuted} />
        <Text style={styles.placeholderText}>
          Map style unavailable. Set GEOAPIFY_API_KEY on the server and restart it.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchStyle} activeOpacity={0.85}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasAnchor =
    !!anchor && Number.isFinite(anchor.latitude) && Number.isFinite(anchor.longitude);

  if (!hasAnchor) {
    return (
      <View style={[styles.placeholder, style]}>
        <MaterialIcons name="my-location" size={26} color={C.textMuted} />
        <Text style={styles.placeholderText}>Waiting for the driver location…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <Map
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        attributionPosition={{ bottom: 8, right: 8 }}
        scaleBar={false}
        onDidFinishLoadingMap={() => onMapReady && onMapReady()}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [anchor.longitude, anchor.latitude],
            zoom: DEFAULT_CAMERA_ZOOM,
          }}
        />

        {route && (
          <GeoJSONSource id="tracking-route" data={route}>
            <Layer
              id="tracking-route-line"
              type="line"
              paint={{
                'line-color': C.accent,
                'line-width': 4,
                'line-opacity': 0.7,
              }}
            />
          </GeoJSONSource>
        )}

        {pickup && pickup.latitude ? (
          <Marker id="pickup-marker" lngLat={[pickup.longitude, pickup.latitude]} anchor="bottom-left">
            <View style={styles.pickupWrap}>
              <View style={[styles.dot, { backgroundColor: C.success }]} />
            </View>
          </Marker>
        ) : null}

        {drop && drop.latitude ? (
          <Marker id="drop-marker" lngLat={[drop.longitude, drop.latitude]} anchor="bottom-left">
            <View style={styles.dropWrap}>
              <View style={[styles.square, { backgroundColor: C.danger }]} />
            </View>
          </Marker>
        ) : null}

        {customerLocation && customerLocation.latitude ? (
          <Marker
            id="customer-marker"
            lngLat={[customerLocation.longitude, customerLocation.latitude]}
            anchor="center"
          >
            <View style={styles.customerDotWrap}>
              <MaterialIcons name="person-pin" size={30} color={C.success} />
            </View>
          </Marker>
        ) : null}

        {driverLocation && smoothDriver && smoothDriver.latitude ? (
          <Marker
            id="driver-marker"
            lngLat={[smoothDriver.longitude, smoothDriver.latitude]}
            anchor="center"
          >
            <View style={styles.driverMarkerWrap}>
              <MaterialIcons
                name="directions-car"
                size={22}
                color="#fff"
                style={{
                  transform: [
                    {
                      rotate: `${
                        smoothDriver.heading != null ? smoothDriver.heading : 0
                      }deg`,
                    },
                  ],
                }}
              />
            </View>
          </Marker>
        ) : null}

        {children}
      </Map>

      {showRecenterButton && (
        <TouchableOpacity style={styles.recenterBtn} onPress={recenter} activeOpacity={0.85}>
          <MaterialIcons name="my-location" size={20} color={C.accent} />
        </TouchableOpacity>
      )}
      {loadingRoute ? (
        <View style={styles.routeLoading}>
          <ActivityIndicator size="small" color={C.accent} />
        </View>
      ) : null}
    </View>
  );
};

export default LiveTrackingMap;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 18,
  },

  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
  },

  placeholderText: {
    color: C.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '85%',
  },

  retryBtn: {
    marginTop: 12,
    backgroundColor: C.accent,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },

  retryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  pickupWrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: C.success,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  dropWrap: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 4,
    borderWidth: 2,
    borderColor: C.danger,
  },

  square: {
    width: 10,
    height: 10,
  },

  customerDotWrap: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 2,
    borderWidth: 2,
    borderColor: C.success,
  },

  driverMarkerWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  recenterBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  routeLoading: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    padding: 8,
  },
});