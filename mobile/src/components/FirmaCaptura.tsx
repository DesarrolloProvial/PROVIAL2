import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { Ionicons } from '@expo/vector-icons';

interface FirmaCapturaProps {
  onFirmaCapturada: (firmaBase64: string) => void;
  firmaActual?: string;
  titulo?: string;
  nombreFirmante?: string;
}

export default function FirmaCaptura({
  onFirmaCapturada,
  firmaActual,
  titulo = 'Firma',
  nombreFirmante,
}: FirmaCapturaProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const signatureRef = useRef<SignatureViewRef>(null);

  const handleOK = (signature: string) => {
    // signature viene como data:image/png;base64,...
    onFirmaCapturada(signature);
    setModalVisible(false);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  const webStyle = `.m-signature-pad {
    box-shadow: none;
    border: none;
    background-color: #f9fafb;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body, html {
    background-color: #f9fafb;
  }`;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{titulo}</Text>
      {nombreFirmante && (
        <Text style={styles.nombreFirmante}>{nombreFirmante}</Text>
      )}

      {firmaActual ? (
        <View style={styles.firmaPreview}>
          <View style={styles.firmaImageContainer}>
            {/* Mostrar indicador de que hay firma */}
            <Ionicons name="checkmark-circle" size={40} color="#10b981" />
            <Text style={styles.firmaOkText}>Firma capturada</Text>
          </View>
          <TouchableOpacity
            style={styles.btnCambiar}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.btnCambiarText}>Cambiar firma</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.btnFirmar}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="pencil" size={24} color="#3b82f6" />
          <Text style={styles.btnFirmarText}>Tocar para firmar</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalBtnCancelar}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalBtnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitulo}>{titulo}</Text>
            <TouchableOpacity
              style={styles.modalBtnConfirmar}
              onPress={handleConfirm}
            >
              <Text style={styles.modalBtnConfirmarText}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signatureContainer}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleOK}
              webStyle={webStyle}
              backgroundColor="#f9fafb"
              penColor="#1e3a5f"
              minWidth={2}
              maxWidth={4}
            />
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnLimpiar} onPress={handleClear}>
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
              <Text style={styles.btnLimpiarText}>Limpiar</Text>
            </TouchableOpacity>
            <Text style={styles.instrucciones}>
              Firme en el area gris con su dedo
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  titulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  nombreFirmante: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  btnFirmar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },
  btnFirmarText: {
    fontSize: 16,
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: '500',
  },
  firmaPreview: {
    alignItems: 'center',
  },
  firmaImageContainer: {
    alignItems: 'center',
    padding: 20,
  },
  firmaOkText: {
    fontSize: 14,
    color: '#10b981',
    marginTop: 8,
    fontWeight: '500',
  },
  btnCambiar: {
    marginTop: 8,
  },
  btnCambiarText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  modalBtnCancelar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalBtnCancelarText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalBtnConfirmar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  modalBtnConfirmarText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  signatureContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  btnLimpiar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnLimpiarText: {
    fontSize: 14,
    color: '#dc2626',
    marginLeft: 4,
  },
  instrucciones: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
