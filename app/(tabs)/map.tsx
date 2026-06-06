import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats } from "@/lib/cats";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

const MAPBOX_ACCESS_TOKEN =
  ((Constants as any).expoConfig?.extra?.MAPBOX_ACCESS_TOKEN as string | undefined) ||
  ((Constants as any).manifest?.extra?.MAPBOX_ACCESS_TOKEN as string | undefined) ||
  "YOUR_MAPBOX_ACCESS_TOKEN";

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [location, setLocation] = useState<any | null>(null);
  const [locationResolved, setLocationResolved] = useState(false);
  const [cats, setCats] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // On web use browser geolocation, on native use expo-location
        if (Platform.OS === "web" && "geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!mounted) return;
              setLocation({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
            },
            () => {
              if (!mounted) return;
              setLocation(false);
            },
            { enableHighAccuracy: true }
          );
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (!mounted) return;
          if (status !== "granted") {
            setLocation(false);
          } else {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            if (!mounted) return;
            setLocation(loc);
          }
        }
      } catch {
        setLocation(false);
      } finally {
        if (mounted) setLocationResolved(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const rows = await fetchAllCats();
          if (mounted) setCats(rows);
        } catch (e) {
          console.warn("Failed to load cats from Supabase", e);
          if (mounted) setCats([]);
        }
      })();
      return () => { mounted = false; };
    }, [])
  );

  const centerLng = location && location !== false ? location.coords.longitude : -122.431297;
  const centerLat = location && location !== false ? location.coords.latitude : 37.773972;

  const styleUrl = colorScheme === "dark" ? "mapbox://styles/mapbox/dark-v10" : "mapbox://styles/mapbox/streets-v11";

  const html = useMemo(() => {
    const initialMarkers = JSON.stringify(cats ?? []);
    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
          <meta charset="utf-8" />
          <title>Map</title>
          <link href="https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.css" rel="stylesheet" />
          <style>
            html, body, #map { height: 100%; margin: 0; padding: 0; }
            body { background: ${colorScheme === "dark" ? "#0f1720" : "#fff"}; }
            #map, #fallback { width: 100%; height: 100%; display: block; }
            #fallback { object-fit: cover; }
            #message { position: absolute; top: 8px; left: 8px; background: rgba(255,255,255,0.9); padding: 6px 10px; border-radius: 6px; font-family: sans-serif; z-index: 10; }

            /* Marker styles */
            .cat-marker {
              width: 36px;
              height: 36px;
              border-radius: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255,255,255,0.95);
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            }
            .cat-marker.dark {
              background: rgba(167,139,250,0.2);
              box-shadow: 0 1px 6px rgba(167,139,250,0.4);
              border: 2px solid #a78bfa;
            }
            .cat-marker svg { display: block; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div id="message" style="display:none"></div>
          <script src="https://api.mapbox.com/mapbox-gl-js/v2.14.1/mapbox-gl.js"></script>
          <script>
            (function(){
              try {
                mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';

                function post(type, payload) {
                  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
                }

                if (!mapboxgl.supported()) {
                  post('webgl_unsupported');

                  var fallbackUrl = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/' +
                    '${centerLng},${centerLat},12/1024x1024?access_token=${MAPBOX_ACCESS_TOKEN}';

                  var img = document.createElement('img');
                  img.id = 'fallback';
                  img.src = fallbackUrl;
                  img.alt = 'Map fallback image';

                  var mapEl = document.getElementById('map');
                  mapEl.innerHTML = '';
                  mapEl.appendChild(img);

                  var msg = document.getElementById('message');
                  msg.style.display = 'block';
                  msg.innerText = 'Map rendering fallback (no WebGL available)';

                  return;
                }

                var map = new mapboxgl.Map({
                  container: 'map',
                  style: '${styleUrl}',
                  center: [${centerLng}, ${centerLat}],
                  zoom: 12
                });

                map.addControl(new mapboxgl.NavigationControl());

                // Keep a reference to the last marker so clicks replace it
                window._lastCatMarker = null;

                var PAW_COLOR = '${colorScheme === "dark" ? "#a78bfa" : "#374151"}';
                var PAW_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100"><ellipse cx="50" cy="72" rx="22" ry="18" fill="' + PAW_COLOR + '"/><ellipse cx="22" cy="46" rx="11" ry="13" fill="' + PAW_COLOR + '"/><ellipse cx="40" cy="35" rx="11" ry="13" fill="' + PAW_COLOR + '"/><ellipse cx="60" cy="35" rx="11" ry="13" fill="' + PAW_COLOR + '"/><ellipse cx="78" cy="46" rx="11" ry="13" fill="' + PAW_COLOR + '"/></svg>';

                function createCatMarker(lngLat, opts) {
                  // remove existing
                  try {
                    if (opts && opts.replace && window._lastCatMarker) {
                      window._lastCatMarker.remove();
                    }
                  } catch (e) {}

                  var el = document.createElement('div');
                  el.className = 'cat-marker' + (${colorScheme === "dark" ? "' dark'" : "''"});
                  el.innerHTML = PAW_SVG;

                  var marker = new mapboxgl.Marker(el)
                    .setLngLat([lngLat.lng || lngLat[0], lngLat.lat || lngLat[1]])
                    .addTo(map);

                  if (opts && opts.popupText) {
                    var popup = new mapboxgl.Popup({ offset: 10 }).setText(opts.popupText);
                    marker.setPopup(popup);
                  }

                  if (opts && opts.trackAsLast) window._lastCatMarker = marker;

                  return marker;
                }

                // Add initial markers from embedded data
                try {
                  var initial = ${initialMarkers};
                  if (Array.isArray(initial)) {
                    initial.forEach(function(item) {
                      if (item && (item.lng !== undefined || item.lng === 0) && (item.lat !== undefined || item.lat === 0)) {
                        // create marker element with click handler to open view
                        var el = document.createElement('div');
                        el.className = 'cat-marker' + (${colorScheme === "dark" ? "' dark'" : "''"});
                        el.innerHTML = PAW_SVG;
                        // attach click handler to notify React Native to open view for this cat
                        (function(id){
                          el.addEventListener('click', function(e){
                            e.stopPropagation && e.stopPropagation();
                            post('view', { id: id });
                          });
                        })(item.id);

                        var marker = new mapboxgl.Marker(el)
                          .setLngLat([item.lng, item.lat])
                          .addTo(map);

                        if (item.name) {
                          var popup = new mapboxgl.Popup({ offset: 10 }).setText(item.name);
                          marker.setPopup(popup);
                        }
                      }
                    });
                  }
                } catch (e) {
                  // ignore
                }

                map.on('load', function () {
                  post('loaded');
                });

                map.on('click', function (e) {
                  post('click', { coords: e.lngLat });
                });

                map.on('error', function(err) {
                  post('map_error', { error: err && err.error ? err.error.message || String(err.error) : String(err) });
                });

              } catch (err) {
                try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'html_error', message: String(err) })); } catch{}
                var mapEl = document.getElementById('map');
                mapEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;">Map failed to initialize</div>';
              }
            })();
          </script>
        </body>
      </html>
    `;
  }, [colorScheme, styleUrl, centerLng, centerLat, cats]);

  if (!locationResolved) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === "loaded") setLoading(false);
            if (data?.type === "webgl_unsupported") console.warn("Map WebGL unsupported in WebView — using static fallback.");
            if (data?.type === "map_error") console.warn("Map error:", data.error);
            if (data?.type === "html_error") console.warn("Map HTML error:", data.message);
            if (data?.type === "click") {
              // Navigate to create screen with coords
              const coords = data.coords;
              const lng = coords?.lng ?? coords?.longitude ?? (Array.isArray(coords) ? coords[0] : undefined);
              const lat = coords?.lat ?? coords?.latitude ?? (Array.isArray(coords) ? coords[1] : undefined);
              if (typeof lng === "number" && typeof lat === "number") {
                router.push(`/cats/create?lng=${lng}&lat=${lat}`);
              } else {
                console.log("Map click coords unknown format", coords);
              }
            }
            if (data?.type === "view") {
              const id = data?.id;
              if (id) router.push(`/cats/${id}`);
            }
          } catch {
            // ignore
          }
        }}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 2 },
});
