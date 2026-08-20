import React from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import { useRouter } from 'expo-router';
import { SAMPLE_LISTINGS } from '@/constants/data';
import { useColors } from '@/hooks/useColors';

interface MapColors {
  markerColor: string;
  btnBg: string;
  btnText: string;
  popupNameColor: string;
  popupMetaColor: string;
  popupScoreColor: string;
  popupReviewsColor: string;
  mapBg: string;
}

function buildAllListingsHtml(listings: typeof SAMPLE_LISTINGS, c: MapColors): string {
  const markersJs = listings
    .map((l) => {
      const safe = JSON.stringify({ id: l.id, name: l.name, rating: l.rating, neighborhood: l.neighborhood, priceRange: l.priceRange });
      return `addMarker(${l.lat}, ${l.lng}, ${safe});`;
    })
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: ${c.mapBg}; }
    .popup-card { font-family: -apple-system, sans-serif; min-width: 160px; }
    .popup-name { font-weight: 700; font-size: 14px; color: ${c.popupNameColor}; margin-bottom: 3px; }
    .popup-meta { font-size: 12px; color: ${c.popupMetaColor}; margin-bottom: 6px; }
    .popup-rating { display: flex; align-items: center; gap: 4px; margin-bottom: 10px; }
    .popup-star { color: ${c.markerColor}; font-size: 13px; }
    .popup-score { font-weight: 600; font-size: 13px; color: ${c.popupScoreColor}; }
    .popup-reviews { color: ${c.popupReviewsColor}; font-size: 12px; }
    .popup-btn {
      display: block; background: ${c.btnBg}; color: ${c.btnText};
      padding: 6px 14px; border-radius: 7px; font-size: 12px;
      font-weight: 600; text-align: center; cursor: pointer;
      border: none; width: 100%;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false })
              .setView([37.7749, -122.4194], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    var markerIcon = L.divIcon({
      html: '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.5 12.5 28.5S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z" fill="${c.markerColor}"/><circle cx="12.5" cy="12.5" r="5" fill="white"/></svg>',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      className: ''
    });

    function addMarker(lat, lng, info) {
      var popupHtml =
        '<div class="popup-card">' +
          '<div class="popup-name">' + info.name + '</div>' +
          '<div class="popup-meta">' + info.neighborhood + ' &middot; ' + info.priceRange + '</div>' +
          '<div class="popup-rating">' +
            '<span class="popup-star">&#9733;</span>' +
            '<span class="popup-score">' + info.rating + '</span>' +
          '</div>' +
          '<button class="popup-btn" onclick="openListing(' + JSON.stringify(info.id) + ')">View details &rarr;</button>' +
        '</div>';
      L.marker([lat, lng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(popupHtml, { maxWidth: 220 });
    }

    function openListing(id) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigate', id: id }));
    }

    ${markersJs}
  </script>
</body>
</html>`;
}

export function AllListingsMapWebView() {
  const router = useRouter();
  const colors = useColors();

  const mapColors: MapColors = {
    markerColor:      colors.accent,
    btnBg:            colors.accent,
    btnText:          colors.accentForeground,
    popupNameColor:   colors.foreground,
    popupMetaColor:   colors.mutedForeground,
    popupScoreColor:  colors.foreground,
    popupReviewsColor: colors.mutedForeground,
    mapBg:            colors.background,
  };

  const html = buildAllListingsHtml(SAMPLE_LISTINGS, mapColors);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'navigate' && msg.id) {
        router.push(`/listing/${msg.id}`);
      }
    } catch {}
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
