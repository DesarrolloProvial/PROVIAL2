import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { passwordResetService } from '../../services/passwordReset.service';
import { RootStackParamList } from '../../types/navigation';
import axios from 'axios';
import { API_URL } from '../../constants/config';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();
  const [isCheckingReset, setIsCheckingReset] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    try {
      // Primero verificar si necesita reset de contraseña
      setIsCheckingReset(true);
      const resetCheck = await passwordResetService.verificarNecesitaReset(username);
      setIsCheckingReset(false);

      if (resetCheck.necesita_reset) {
        // Redirigir a pantalla de reset
        navigation.navigate('ResetPassword', {
          username,
          tieneChapa: resetCheck.tiene_chapa,
        });
        return;
      }
    } catch (error) {
      // Si falla la verificación, continuar con login normal
      setIsCheckingReset(false);
    }

    // Login normal
    const result = await login(username, password);

    if (!result.success) {
      Alert.alert(
        'Error de Login',
        result.error || 'Usuario o contraseña incorrectos'
      );
    }
  };

  // ... (inside component)

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo_login.jpeg')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.title}>PROVIAL</Text>
        <Text style={styles.subtitle}>Proteger y Servir</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Usuario</Text>
        <TextInput
          style={styles.input}
          placeholder="usuario123"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!isLoading}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, (isLoading || isCheckingReset) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading || isCheckingReset}
        >
          {isLoading || isCheckingReset ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e40af',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  logoContainer: {
    width: 140,
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    padding: 10,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#93c5fd',
  },
  form: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoUsers: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  demoTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
});
