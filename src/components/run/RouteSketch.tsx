import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** The route's shape as a small drawing (see logic/run sketchPath) — no map tiles, so lists stay fast and offline. */
export function RouteSketch({ path, size = 64, stroke = 3.2 }: { path: string; size?: number; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="route" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4C8DF6" />
          <Stop offset="0.6" stopColor="#8E7CF5" />
          <Stop offset="1" stopColor="#FF8A3D" />
        </LinearGradient>
      </Defs>
      <Path d={path} stroke="url(#route)" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
