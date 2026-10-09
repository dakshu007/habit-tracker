import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker, type LngLat, type ViewPadding } from '@maplibre/maplibre-react-native';

import { Txt } from '@/components/ui/Txt';
import { Flag } from '@/components/ui/lucide';
import { useTheme } from '@/theme/ThemeContext';
import { bounds, kmMarkers, routeGeoJSON } from '@/logic/run';
import type { RunPoint } from '@/data/types';

/** Free OpenFreeMap styles (OpenStreetMap data) — no API key, no usage limits. */
const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

export const RUN_BLUE = '#4C8DF6';
/** Slow → fast, relative to the run's own average. */
const PACE_STOPS = ['#4C8DF6', '#8E7CF5', '#FF8A3D', '#FF5470'];

interface Props {
  points: RunPoint[];
  gaps: number[];
  /** live: follows the runner; summary: frames the whole route. */
  mode: 'live' | 'summary';
  /** Current position (live), even before the route has points. */
  here?: LngLat | null;
  /** Keep the camera on the runner (live mode). */
  follow?: boolean;
  /** The user dragged the map — stop following. */
  onUserMove?: () => void;
  /** Space covered by floating UI, so the route isn't hidden under it. */
  padding?: ViewPadding;
  interactive?: boolean;
}

/**
 * Run map: OpenStreetMap tiles with the route drawn as a thick line coloured
 * by pace, kilometre badges, start/finish flags and a glowing runner dot.
 */
export const RunMap = memo(function RunMap({ points, gaps, mode, here, follow = true, onUserMove, padding, interactive = true }: Props) {
  const { isDark } = useTheme();
  const route = useMemo(() => routeGeoJSON(points, gaps), [points, gaps]);
  const kms = useMemo(() => kmMarkers(points, gaps), [points, gaps]);
  const box = useMemo(() => (mode === 'summary' ? bounds(points) : null), [mode, points]);

  const last = points[points.length - 1];
  const runner: LngLat | null = here ?? (last ? [last[0], last[1]] : null);
  const start = points[0];

  return (
    <Map
      style={{ flex: 1 }}
      mapStyle={isDark ? STYLE_DARK : STYLE_LIGHT}
      logo={false}
      compass={false}
      scaleBar={false}
      attribution
      attributionPosition={{ bottom: (padding?.bottom ?? 0) + 6, right: 8 }}
      tintColor={RUN_BLUE}
      touchPitch={false}
      dragPan={interactive}
      touchZoom={interactive}
      touchRotate={false}
      doubleTapZoom={interactive}
      onRegionWillChange={(e) => {
        if (e.nativeEvent.userInteraction) onUserMove?.();
      }}
    >
      {box ? (
        <Camera bounds={box} padding={{ top: 60, right: 40, bottom: 60, left: 40, ...padding }} duration={0} />
      ) : follow && runner ? (
        <Camera center={runner} zoom={16.3} padding={padding} duration={900} easing="ease" />
      ) : (
        <Camera initialViewState={runner ? { center: runner, zoom: 16 } : { center: [78.96, 22.6], zoom: 3.4 }} />
      )}

      <GeoJSONSource id="route" data={route}>
        <Layer
          id="route-casing"
          type="line"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{ 'line-color': isDark ? '#0D0E1A' : '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 6, 17, 13], 'line-opacity': 0.95 }}
        />
        <Layer
          id="route-line"
          type="line"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': ['interpolate', ['linear'], ['get', 'rel'], 0.75, PACE_STOPS[0], 0.95, PACE_STOPS[1], 1.1, PACE_STOPS[2], 1.3, PACE_STOPS[3]],
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3.5, 17, 8],
          }}
        />
      </GeoJSONSource>

      {kms.map((k) => (
        <Marker key={`km-${k.km}`} id={`km-${k.km}`} lngLat={k.at} anchor="center">
          <View
            style={{
              minWidth: 26,
              height: 26,
              paddingHorizontal: 6,
              borderRadius: 13,
              backgroundColor: isDark ? '#1E2030' : '#FFFFFF',
              borderWidth: 2,
              borderColor: RUN_BLUE,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0px 3px 8px rgba(0,0,0,0.18)',
            }}
          >
            <Txt variant="label" color={isDark ? '#FFFFFF' : '#1C1B22'} style={{ fontSize: 12, lineHeight: 15 }}>
              {k.km}
            </Txt>
          </View>
        </Marker>
      ))}

      {start ? (
        <Marker id="start" lngLat={[start[0], start[1]]} anchor="center">
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#34C759', borderWidth: 3, borderColor: '#FFFFFF', boxShadow: '0px 2px 6px rgba(0,0,0,0.25)' }} />
        </Marker>
      ) : null}

      {mode === 'summary' && last ? (
        <Marker id="finish" lngLat={[last[0], last[1]]} anchor="bottom-left">
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1C1B22', borderWidth: 2.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Flag size={15} color="#FFFFFF" strokeWidth={2.4} />
          </View>
        </Marker>
      ) : null}

      {mode === 'live' && runner ? (
        <Marker id="runner" lngLat={runner} anchor="center">
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(76,141,246,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: RUN_BLUE, borderWidth: 4, borderColor: '#FFFFFF', boxShadow: '0px 2px 8px rgba(0,0,0,0.3)' }} />
          </View>
        </Marker>
      ) : null}
    </Map>
  );
});
