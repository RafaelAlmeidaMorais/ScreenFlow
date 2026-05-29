# Phase A: APK Stability Improvements

## Summary
This phase implements critical stability enhancements to prevent the ScreenFlow player APK from sleeping, crashing, or becoming unresponsive during long-running TV playback sessions.

## Implementation Details

### 1. Screen Keep-Awake (`expo-keep-awake`)
- **Added**: `expo-keep-awake` package dependency
- **Implementation**: Activated at app startup in `App.tsx`
- **Purpose**: Prevents the device screen from sleeping/dimming during playback
- **Code**: Calls `KeepAwake.activateKeepAwakeAsync()` during initialization

### 2. Watchdog Timer (Built-in)
- **Purpose**: Detects when the WebView becomes unresponsive
- **Implementation**:
  - Monitors last message/load event from WebView
  - Checks every 30 seconds if response received in last 45 seconds
  - If unresponsive, automatically reloads the WebView
  - Resets timer on every user interaction and page load
- **Code**: `watchdogTimer` ref and detection logic in `useEffect` hook

### 3. Enhanced Logging System
- **Improvements**:
  - Added log levels: `LOG`, `WARN`, `ERROR`
  - Visual indicators in debug panel (📋 info, ⚠️ warning, ❌ error)
  - Increased log buffer from 50 to 100 entries
  - Timestamps on every log message
- **Debug Panel**: Shows colored severity indicators for quick issue diagnosis

### 4. EAS Updates Integration
- **Added**: `expo-updates` package dependency
- **Configuration**: 
  - Updates checked automatically on app launch
  - Downloads and applies updates without full rebuild
  - Configured in `app.json` and `eas.json`
- **Purpose**: Deploy hotfixes and improvements without requiring APK rebuild

### 5. Automatic Error Recovery
- **Features**:
  - HTTP errors logged with appropriate severity
  - WebView reload on critical failures
  - Error messages captured from browser console
  - Graceful handling of network timeouts

## Key Changes to Files

### `package.json`
```json
// Added dependencies:
"expo-keep-awake": "^13.0.2"
"expo-updates": "~0.25.23"
```

### `app.json`
```json
// Added configuration:
"runtimeVersion": { "policy": "appVersion" }
"updates": {
  "url": "https://updates.expo.dev/YOUR_PROJECT_ID",
  "fallbackToCacheTimeout": 0,
  "checkOnLaunch": "always"
}
// Added expo-updates plugin
```

### `App.tsx`
- Imported `KeepAwake` and `Updates`
- Added watchdog timer logic
- Enhanced logging with severity levels
- App update checking on startup
- Improved error handlers with better messaging
- Synchronized WebView response tracking across all handlers

## Testing Recommendations

1. **Keep-Awake Test**: Verify screen stays on indefinitely during playback
2. **Watchdog Test**: Pause network (airplane mode) and verify app reloads after 45s
3. **Update Test**: Trigger EAS Update to verify downloads/applies correctly
4. **Logging Test**: Check debug panel for proper log levels and formatting
5. **Recovery Test**: Kill WebView process and verify automatic reload

## Monitoring in Production

- Check `debugPanel` logs regularly for `ERROR` level messages
- Monitor EAS dashboard for successful update deliveries
- Review error patterns to identify systemic issues
- Use logs to diagnose app hang scenarios

## Future Enhancements

- Persistent log file for post-crash diagnostics
- Remote error reporting to backend
- Crash recovery analytics dashboard
- Configurable watchdog timeout based on content type
- Battery optimization for sustained playback
