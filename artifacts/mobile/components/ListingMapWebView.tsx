import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

interface ListingMapWebViewProps {
  lat: number;
  lng: number;
  name: string;
  accentColor?: string;
}

function buildMapHtml(lat: number, lng: number, name: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    var icon = L.divIcon({
      html: '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.5 12.5 28.5S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z" fill="#F59E0B"/><circle cx="12.5" cy="12.5" r="5" fill="white"/></svg>',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      className: ''
    });
    L.marker([${lat}, ${lng}], { icon: icon }).addTo(map).bindPopup(${JSON.stringify(name)});
  </script>
</body>
</html>`;
}

export function ListingMapWebView({ lat, lng, name, accentColor = '#F59E0B' }: ListingMapWebViewProps) {
  const html = buildMapHtml(lat, lng, name);

  const handleOpenMaps = () => {
    const url =
      Platform.OS === 'ios'
        ? `maps://?q=${lat},${lng}`
        : `https://maps.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  return (
    <View>
      <View style={styles.mapContainer}>
        <WebView
          source={{ html }}
          style={styles.map}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled
        />
      </View>
      <Pressable
        style={({ pressed }) => [styles.openMapsBtn, { opacity: pressed ? 0.75 : 1 }]}
        onPress={handleOpenMaps}
      >
        <Ionicons name="navigate-outline" size={15} color="#6b7280" />
        <Text style={styles.openMapsTxt}>Open in Maps</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  openMapsTxt: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
});
