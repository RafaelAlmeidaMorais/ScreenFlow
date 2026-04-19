import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, BackHandler, ToastAndroid, ScrollView, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as KeepAwake from 'expo-keep-awake';
import * as Updates from 'expo-updates';

const DEBUG_SCRIPT = `
  (function() {
    function logToApp(type, args) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, args: Array.from(args).map(String) })); } catch(e) {}
    }
    var origLog = console.log;
    var origErr = console.error;
    var origWarn = console.warn;
    console.log = function() { origLog.apply(console, arguments); logToApp('LOG', arguments); };
    console.error = function() { origErr.apply(console, arguments); logToApp('ERROR', arguments); };
    console.warn = function() { origWarn.apply(console, arguments); logToApp('WARN', arguments); };
    window.onerror = function(msg, src, line) { logToApp('WINDOW_ERROR', [msg, src, line]); return false; };
  })();
  true;
`;

export default function App() {
  const [url, setUrl] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const webviewRef = useRef<WebView>(null);

  const backPressCount = useRef(0);
  const backPressTime = useRef(0);
  const watchdogTimer = useRef<NodeJS.Timeout | null>(null);
  const lastResponseTime = useRef<number>(Date.now());
  const watchdogIntervalMs = 30000; // Check every 30s
  const watchdogTimeoutMs = 45000; // Consider unresponsive after 45s

  const appendLog = (msg: string, level: 'LOG' | 'WARN' | 'ERROR' = 'LOG') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '📋';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${msg}`].slice(-100));
  };

  // Init
  useEffect(() => {
    async function prepare() {
      try {
        // Activate keep-awake to prevent screen sleep
        await KeepAwake.activateKeepAwakeAsync();
        appendLog('Screen keep-awake ativado');
      } catch (e) {
        appendLog('Erro ao ativar keep-awake', 'WARN');
      }

      try {
        await NavigationBar.setVisibilityAsync("hidden");
        await NavigationBar.setBehaviorAsync("overlay-swipe");
      } catch (e) {}

      // Check for app updates
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          appendLog('Atualização disponível, baixando...', 'WARN');
          await Updates.fetchUpdateAsync();
          // Reload to apply update
          await Updates.reloadAsync();
        }
      } catch (e) {
        appendLog('Erro ao verificar atualizações', 'WARN');
      }

      const savedUrl = await AsyncStorage.getItem('kiosk_url');
      if (savedUrl) {
        setUrl(savedUrl);
        appendLog('URL restaurada: ' + savedUrl);
      }
      setIsLoaded(true);
    }
    prepare();
  }, []);

  // Keep navigation bar hidden
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await NavigationBar.setVisibilityAsync("hidden");
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Watchdog timer - detects unresponsive WebView
  useEffect(() => {
    if (!url) return;

    const startWatchdog = () => {
      lastResponseTime.current = Date.now();

      watchdogTimer.current = setInterval(() => {
        const timeSinceLastResponse = Date.now() - lastResponseTime.current;

        if (timeSinceLastResponse > watchdogTimeoutMs) {
          appendLog('WebView não respondendo por ' + (timeSinceLastResponse / 1000).toFixed(1) + 's, recarregando...', 'ERROR');
          if (webviewRef.current) {
            webviewRef.current.reload();
            lastResponseTime.current = Date.now();
          }
        }
      }, watchdogIntervalMs);
    };

    startWatchdog();

    return () => {
      if (watchdogTimer.current) {
        clearInterval(watchdogTimer.current);
      }
    };
  }, [url]);

  // Back button handler: 5x press to exit kiosk, 3x to toggle debug
  useEffect(() => {
    const backAction = () => {
      if (!url) return false;

      const now = Date.now();
      if (now - backPressTime.current > 3000) {
        backPressCount.current = 1;
      } else {
        backPressCount.current += 1;
      }
      backPressTime.current = now;

      if (backPressCount.current === 3) {
        setShowDebug(prev => !prev);
        ToastAndroid.show(showDebug ? 'Debug ocultado' : 'Debug ativado', ToastAndroid.SHORT);
        appendLog(showDebug ? 'Debug desativado' : 'Debug ativado');
      } else if (backPressCount.current === 5) {
        ToastAndroid.show('Saindo do modo Kiosk...', ToastAndroid.SHORT);
        appendLog('Saindo do modo Kiosk');
        AsyncStorage.removeItem('kiosk_url');
        setUrl(null);
        setLogs([]);
        setShowDebug(false);
        backPressCount.current = 0;
      } else if (backPressCount.current < 3) {
        ToastAndroid.show(`Voltar: ${backPressCount.current}/3 debug | /5 sair`, ToastAndroid.SHORT);
      }

      return true;
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [url, showDebug]);

  const handleSave = async () => {
    const finalUrl = inputUrl.trim();
    if (finalUrl.length > 0) {
      try {
        await AsyncStorage.setItem('kiosk_url', finalUrl);
        setUrl(finalUrl);
        lastResponseTime.current = Date.now();
        appendLog('Carregando: ' + finalUrl);
      } catch (e) {
        appendLog('Erro ao salvar URL: ' + String(e), 'ERROR');
      }
    }
  };

  // Loading
  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <StatusBar hidden />
        <Text style={{ color: '#fff', fontSize: 16 }}>Carregando...</Text>
      </View>
    );
  }

  // Setup screen
  if (!url) {
    return (
      <View style={styles.setupContainer}>
        <StatusBar hidden />

        <View style={styles.logoBox}>
          <Text style={styles.logoText}>Screen<Text style={{ color: '#e87b35' }}>Flow</Text></Text>
          <Text style={styles.subtitle}>Player para TV Box</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>URL do player</Text>
          <TextInput
            style={styles.input}
            placeholder="https://seusite.vercel.app/player/slug-da-tela"
            placeholderTextColor="#555"
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Copie a URL do player no dashboard do ScreenFlow
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Iniciar Player</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Player mode
  return (
    <View style={styles.playerContainer}>
      <StatusBar hidden />
      <WebView
        ref={webviewRef}
        source={{ uri: url }}
        style={showDebug ? styles.webviewWithDebug : styles.webviewFull}
        cacheEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode="always"
        injectedJavaScript={DEBUG_SCRIPT}
        onMessage={(event) => {
          // Mark that WebView is responding
          lastResponseTime.current = Date.now();
          try {
            const data = JSON.parse(event.nativeEvent.data);
            const level = data.type === 'ERROR' ? 'ERROR' : data.type === 'WARN' ? 'WARN' : 'LOG';
            appendLog(`${data.args.join(' ')}`, level);
          } catch (e) {
            appendLog(event.nativeEvent.data);
          }
        }}
        onError={(e) => {
          appendLog(`Erro WebView: ${e.nativeEvent.code} - ${e.nativeEvent.description}`, 'ERROR');
        }}
        onHttpError={(e) => {
          appendLog(`HTTP ${e.nativeEvent.statusCode}: ${e.nativeEvent.description}`, e.nativeEvent.statusCode >= 500 ? 'ERROR' : 'WARN');
        }}
        onLoadEnd={() => {
          lastResponseTime.current = Date.now();
          appendLog('Página carregada');
        }}
      />

      {showDebug && (
        <View style={styles.debugPanel}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Debug</Text>
            <TouchableOpacity onPress={() => setLogs([])} activeOpacity={0.7}>
              <Text style={styles.debugClear}>Limpar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {logs.map((log, i) => (
              <Text key={i} style={styles.logLine}>{log}</Text>
            ))}
          </ScrollView>
          <View style={styles.debugFooter}>
            <Text style={styles.debugFooterText}>URL: {url}</Text>
            <TouchableOpacity
              onPress={() => {
                lastResponseTime.current = Date.now();
                if (webviewRef.current) webviewRef.current.reload();
                appendLog('Recarregando manualmente...');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.debugReload}>Recarregar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Setup
  setupContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logoBox: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  formCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  label: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#555',
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#e87b35',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Player
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
    flexDirection: 'row',
  },
  webviewFull: {
    flex: 1,
    backgroundColor: '#000',
  },
  webviewWithDebug: {
    flex: 3,
    backgroundColor: '#000',
  },
  // Debug panel
  debugPanel: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderLeftWidth: 1,
    borderColor: '#222',
    padding: 10,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#222',
  },
  debugTitle: {
    color: '#0f0',
    fontWeight: 'bold',
    fontSize: 13,
  },
  debugClear: {
    color: '#e87b35',
    fontSize: 12,
  },
  logLine: {
    color: '#ccc',
    fontSize: 10,
    marginBottom: 3,
    fontFamily: 'monospace',
  },
  debugFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugFooterText: {
    color: '#555',
    fontSize: 10,
    flex: 1,
  },
  debugReload: {
    color: '#e87b35',
    fontSize: 12,
    fontWeight: '600',
  },
});
