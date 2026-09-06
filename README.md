# Kifaru APK

**Long Haul Africa** — original mobile truck simulator.

Original mobile truck simulator: **American-style conventional long-bonnet tractors**, **right-hand drive**, **left-side traffic**, set on a fictional East African corridor.

Kifaru Interactive · Kifaru Motors **Tembo 680** · East Rift Corridor (Mavuno City, Highland Junction, Kijani).

This is **not** American Truck Simulator, not an SCS product, and not a copy of any real OEM.

## Why not Unity in this tree

Unity Editor is not available in this build environment (no editor, ~4 GB RAM, no GPU). The playable product is **Three.js + cannon-es + Vite**, wrapped with **Capacitor** for a native ARM64 Android APK. Gameplay is 100% offline, free, and has no ads or paywalls.

## Play (browser)

```bash
npm install
npm run dev
```

Open the preview URL. Landscape phone is the target; keyboard works on desktop:

- **E / R** ignition · **W** throttle · **S** brake · **A/D** steer
- **C** camera (cabin RHD, chase, hood, trailer, passenger)
- **H** horn · **L** lights · **Space** park brake · **P** pause

Touch: on-screen wheel, pedals, and buttons. Settings: wheel / buttons / tilt.

## Tests

```bash
npm test
```

Covers diesel torque, gearbox, fuel, damage, and RHD / conventional-layout invariants (driver on **+X / right**).

## Android APK

Installable APK (signed, v1+v2):

- `releases/Kifaru-APK-debug.apk`
- `releases/Kifaru-APK-release.apk`

Package ID: `com.kifaruinteractive.longhaulafrica`  
Orientation: landscape · minSdk 21 · WebGL inside a native WebView.

Rebuild:

```bash
npm run apk
```

Optional Capacitor / Gradle path (needs JDK 17 + Android SDK):

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk
./scripts/build-apk.sh
```

## What exists in this build

- Kifaru Tembo 680: long bonnet, engine in front, cab behind, **steering wheel on the right**
- Box trailer, maize cargo, hitch physics
- Left-lane AI (cars, matatus, buses, bikes, trucks) with right-side overtaking
- Mavuno City, Highland Junction roundabout (clockwise / LHT), Kijani
- Career / quick job / free drive / parking
- Fuel (Jua Fuel), repairs, money, XP, local save
- Day/night, weather, GPS minimap, HUD, touch controls
- Completely free, offline

## Not yet a full continent sim

World expansion beyond the East Rift Corridor, hired-driver 3D simulation, and every trailer body as a unique high-poly mesh are sequential phases. The vertical slice is playable end-to-end: start engine → keep left → haul → reverse park → get paid → save.
