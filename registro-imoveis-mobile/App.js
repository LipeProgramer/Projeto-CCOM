import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function App() {
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CONFIGURAÇÃO DO IP (IMPORTANTE!) ---
  // Troque pelo seu IPv4 (ex: 192.168.0.15)
  // Mantenha o :5000 no final
  const API_URL = 'http://192.168.18.5:5000'; 

  useEffect(() => {
    carregarVistorias();
  }, []);

  const carregarVistorias = () => {
    axios.get(`${API_URL}/api/vistorias`)
      .then(response => {
        setVistorias(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar dados:", error);
        alert("Erro de conexão! Verifique o IP.");
        setLoading(false);
      });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.nome_projeto}</Text>
        <Text style={[styles.status, 
          { backgroundColor: item.status === 'Finalizada' ? '#d4edda' : '#fff3cd', 
            color: item.status === 'Finalizada' ? '#155724' : '#856404' 
          }]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.subtext}>Proc: {item.processo_numero}</Text>
      <Text style={styles.subtext}>📍 {item.endereco || 'Sem endereço'}</Text>
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Abrir Vistoria</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>SELOG Mobile</Text>
        <Text style={styles.headerSub}>Vistorias em Campo</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0056b3" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={vistorias}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={carregarVistorias} // Puxe para atualizar!
        />
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  header: {
    backgroundColor: '#0056b3',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#e0e0e0',
    fontSize: 14,
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Sombra no Android
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  status: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#0056b3',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});