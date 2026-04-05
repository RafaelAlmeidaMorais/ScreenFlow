import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Button, BackHandler, ToastAndroid, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';

// Script injetado dentro da WebView para roubar os logs da página e mandar pro RN
const DEBUG_SCRIPT = `
  (function() {
    function logToApp(type, args) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, args: Array.from(args).map(String) }));
    }
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = function() { originalLog.apply(console, arguments); logToApp('LOG', arguments); };
    console.error = function() { originalError.apply(console, arguments); logToApp('ERROR', arguments); };
    console.warn = function() { originalWarn.apply(console, arguments); logToApp('WARN', arguments); };
    
    window.onerror = function(message, source, lineno, colno, error) {
      logToApp('WINDOW_ERROR', [message, source, lineno]);
      return false;
    };
  })();
  true; // requirement
`;

export default function App() {
  const [url, setUrl] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('http://10.0.2.2:3003/player/recepcao');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Painel de Logs
  const [logs, setLogs] = useState<string[]>([]);

  // Ref para contar cliques do controle remoto
  const backPressCount = useRef(0);
  const backPressTime = useRef(0);

  const appendLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-30)); // Mostra os ultimos 30 logs
  };

  useEffect(() => {
    async function prepare() {
      try {
        await NavigationBar.setVisibilityAsync("hidden");
        await NavigationBar.setBehaviorAsync("overlay-swipe");
      } catch (e) {}
      
      const savedUrl = await AsyncStorage.getItem('kiosk_url');
      if (savedUrl) {
        setUrl(savedUrl);
      }
      setIsLoaded(true);
    }
    prepare();
  }, []);

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

      // Se clicar 5x seguidas
      if (backPressCount.current === 5) {
        ToastAndroid.show('Saindo do modo Kiosk...', ToastAndroid.SHORT);
        AsyncStorage.removeItem('kiosk_url');
        setUrl(null);
        setLogs([]);
        backPressCount.current = 0;
      } else {
        ToastAndroid.show(`Aperte voltar mais ${5 - backPressCount.current} vezes para sair`, ToastAndroid.SHORT);
      }
      
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [url]);

  const handleSave = async () => {
    const finalUrl = inputUrl.trim();
    if (finalUrl.length > 0) {
      await AsyncStorage.setItem('kiosk_url', finalUrl);
      setUrl(finalUrl);
      appendLog('Carregando URL: ' + finalUrl);
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Text style={{color: '#fff'}}>Carregando App...</Text>
      </View>
    );
  }

  // TELA DE SETUP (AGORA PEDE A URL INTEIRA)
  if (!url) {
    return (
      <View style={styles.setupContainer}>
        <StatusBar hidden />
        <Text style={styles.title}>Modo de Depuração</Text>
        <Text style={styles.subtitle}>Digite a URL completa do player para testar</Text>
        <TextInput
          style={styles.input}
          placeholder="http://...:3003..."
          placeholderTextColor="#666"
          value={inputUrl}
          onChangeText={setInputUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button title="Salvar e Iniciar Kiosk" onPress={handleSave} color="#e87b35" />
      </View>
    );
  }

  // TELA DO PLAYER (WEBVIEW) + TERMINAL
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView 
        source={{ uri: url }} 
        style={styles.webview}
        cacheEnabled={false} // Melhor para depurar código novo
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false} 
        allowsInlineMediaPlayback={true}
        injectedJavaScript={DEBUG_SCRIPT}
        onMessage={(event) => {
          try {
             // O script customizado mandou uma string JSON pra cá
             const data = JSON.parse(event.nativeEvent.data);
             appendLog(`[Browser] ${data.type}: ${data.args.join(' ')}`);
          } catch(e) {
             appendLog('[App Message]: ' + event.nativeEvent.data);
          }
        }}
        onError={(e) => {
          // Erros de falha ao conectar no host HTTP da rede
          appendLog(`[WEBVIEW ERROR] HTTP_CODE: ${e.nativeEvent.code} / ${e.nativeEvent.description}`);
        }}
        onHttpError={(e) => {
          // Erros que chegam a conectar mas dão erro na página (ex: 404, 500)
          appendLog(`[HTTP ERROR] Status: ${e.nativeEvent.statusCode} / ${e.nativeEvent.description}`);
        }}
        onLoadEnd={() => appendLog('WebView carregamento concluído')}
      />
      {/* TELA DE TERMINAL DE DEBUG FIXA NA DIREITA */}
      <View style={styles.debugPanel}>
        <Text style={{color: '#0f0', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>
          TERMINAL APP (Voltar 5x reseta) ↓
        </Text>
        <ScrollView style={{flex: 1}}>
          {logs.map((log, i) => (
            <Text key={i} style={{color: '#fff', fontSize: 11, marginBottom: 4, fontFamily: 'monospace'}}>{log}</Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    flexDirection: 'row', // Coloca lado a lado: WebView e Terminal!
  },
  webview: {
    flex: 3, // O cupa 3/4 da tela
    backgroundColor: '#000'
  },
  debugPanel: {
    flex: 1, // Ocupa 1/4 da tela, à direita
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderLeftWidth: 1,
    borderColor: '#333',
    padding: 8,
  },
  setupContainer: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 32,
    textAlign: 'center'
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    width: '100%',
    maxWidth: 600,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333'
  }
});
