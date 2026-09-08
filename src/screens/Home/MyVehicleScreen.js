import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCustomerVehicles,
  addCustomerVehicle,
  updateCustomerVehicleModel,
} from '../../api';
import { C } from '../../theme';

const MyVehicleScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newModel, setNewModel] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [adding, setAdding] = useState(false);

  const loadVehicles = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const data = await getCustomerVehicles(token);
      setVehicles(data.vehicles || []);
    } catch (err) {
      console.log('LOAD VEHICLES ERR:', err);
      Alert.alert('Error', err.message || 'Could not load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const updateModel = (id, value) => {
    setVehicles((prev) =>
      prev.map((v) => (v._id === id ? { ...v, model: value } : v))
    );
  };

  const saveModel = async (vehicle) => {
    const model = (vehicle.model || '').trim();
    if (!model) {
      Alert.alert('Error', 'Please enter the car model');
      return;
    }
    setSavingId(vehicle._id);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }
      const data = await updateCustomerVehicleModel(vehicle._id, { model }, token);
      if (data.success) {
        loadVehicles();
        Alert.alert('Success', 'Vehicle model updated');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update model');
    } finally {
      setSavingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newModel.trim()) {
      Alert.alert('Error', 'Please enter the car model');
      return;
    }
    setAdding(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }
      const data = await addCustomerVehicle(
        { model: newModel.trim(), brand: newBrand.trim() || '', vehicleType: 'SUV' },
        token
      );
      if (data.success) {
        setNewModel('');
        setNewBrand('');
        setShowAdd(false);
        await loadVehicles();
        Alert.alert('Success', 'Vehicle added');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add vehicle');
    } finally {
      setAdding(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation && navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={26} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>My Vehicle</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.noteBox}>
            <MaterialIcons name="info-outline" size={16} color={C.primary} />
            <Text style={styles.note}>
              You can only update the car model. Other vehicle details are managed separately.
            </Text>
          </View>

          {vehicles.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="directions-car" size={50} color={C.borderDark} />
              <Text style={styles.emptyText}>No vehicle added yet</Text>
            </View>
          ) : (
            vehicles.map((vehicle) => (
              <View key={vehicle._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.carIcon}>
                    <MaterialIcons name="directions-car" size={22} color={C.primary} />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>
                      {vehicle.vehicleType || 'Vehicle'}
                    </Text>
                    {vehicle.registrationNumber ? (
                      <Text style={styles.regNo}>{vehicle.registrationNumber}</Text>
                    ) : null}
                  </View>
                </View>

                <Text style={styles.label}>Car Model</Text>
                <View style={styles.inputBox}>
                  <MaterialIcons name="car" size={20} color={C.primary} />
                  <TextInput
                    style={styles.input}
                    value={vehicle.model || ''}
                    onChangeText={(val) => updateModel(vehicle._id, val)}
                    placeholder="Enter car model (e.g. Creta, Dzire)"
                    placeholderTextColor={C.textMuted}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => saveModel(vehicle)}
                  disabled={savingId === vehicle._id}
                >
                  {savingId === vehicle._id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>Save Model</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Add vehicle */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAdd((s) => !s)}
          >
            <MaterialIcons name="add" size={20} color={C.primary} />
            <Text style={styles.addText}>Add Vehicle</Text>
          </TouchableOpacity>

          {showAdd && (
            <View style={styles.card}>
              <Text style={styles.label}>Car Model *</Text>
              <View style={styles.inputBox}>
                <MaterialIcons name="car" size={20} color={C.primary} />
                <TextInput
                  style={styles.input}
                  value={newModel}
                  onChangeText={setNewModel}
                  placeholder="e.g. Creta"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <Text style={styles.label}>Brand (optional)</Text>
              <View style={styles.inputBox}>
                <MaterialIcons name="local-shipping" size={20} color={C.primary} />
                <TextInput
                  style={styles.input}
                  value={newBrand}
                  onChangeText={setNewBrand}
                  placeholder="e.g. Hyundai"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAdd}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Add Vehicle</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

//////////////////////////////////////////////////////////
// 🎨 Styles
//////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  backBtn: {
    marginRight: 12,
    padding: 4,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },

  title: {
    color: C.text,
    fontSize: 22,
    fontWeight: 'bold',
  },

  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },

  note: {
    color: C.textSub,
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: C.border,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  carIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  cardTitle: {
    color: C.text,
    fontWeight: 'bold',
    fontSize: 16,
  },

  regNo: {
    color: C.textMuted,
    fontSize: 13,
  },

  label: {
    color: C.textSub,
    marginBottom: 6,
    marginTop: 8,
    fontWeight: '600',
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: 14,
    paddingHorizontal: 12,
  },

  input: {
    flex: 1,
    color: C.text,
    padding: 12,
  },

  saveBtn: {
    backgroundColor: C.accent,
    padding: 14,
    borderRadius: 26,
    alignItems: 'center',
    marginTop: 14,
    ...C.shadow,
    shadowOpacity: 0.25,
  },

  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  emptyBox: {
    alignItems: 'center',
    padding: 40,
  },

  emptyText: {
    color: C.textMuted,
    marginTop: 10,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.accent,
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
    backgroundColor: C.surface,
  },

  addText: {
    color: C.accent,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default MyVehicleScreen;