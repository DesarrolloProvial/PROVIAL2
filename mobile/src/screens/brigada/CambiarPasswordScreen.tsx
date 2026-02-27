import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../constants/config';
import { useAuthStore } from '../../store/authStore';

export default function CambiarPasswordScreen({ navigation }: { navigation: any }) {
  const { token } = useAuthStore();
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCambiar = async () => {
    if (!passwordActual || !nuevaPassword || !confirmar) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (nuevaPassword !== confirmar) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
      return;
    }
    if (nuevaPassword.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/auth/cambiar-password`,
        { password_actual: passwordActual, nueva_password: nuevaPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        '¡Contraseña actualizada!',
        'Tu contraseña fue cambiada exitosamente.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al cambiar la contraseña';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({
    label,
    value,
    onChangeText,
    show,
    onToggle,
  }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    show: boolean;
    onToggle: () => void;
  }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
          <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Icono */}
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={40} color="#1e40af" />
        </View>
        <Text style={styles.title}>Cambiar Contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresa tu contraseña actual y elige una nueva
        </Text>

        <PasswordField
          label="Contraseña actual"
          value={passwordActual}
          onChangeText={setPasswordActual}
          show={showActual}
          onToggle={() => setShowActual(!showActual)}
        />
        <PasswordField
          label="Nueva contraseña"
          value={nuevaPassword}
          onChangeText={setNuevaPassword}
          show={showNueva}
          onToggle={() => setShowNueva(!showNueva)}
        />
        <PasswordField
          label="Confirmar nueva contraseña"
          value={confirmar}
          onChangeText={setConfirmar}
          show={showConfirmar}
          onToggle={() => setShowConfirmar(!showConfirmar)}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCambiar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Cambiar contraseña</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f9fafb' },
  scroll:        { padding: 24, paddingTop: 40 },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#dbeafe',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title:    { fontSize: 22, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  fieldContainer: { marginBottom: 16 },
  label:    { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: '#111827',
  },
  eyeBtn: { padding: 14 },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
