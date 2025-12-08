import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView, Alert, Modal, TextInput, ImageBackground, Dimensions, Linking, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset'; // Importante para ler o arquivo local

// --- ASSETS ---
const logoWhite = require('./assets/logo_white.png'); 
const bgTop = require('./assets/bg-top.png');
const logoRodape = require('./assets/logo_rodape.png'); // AGORA ESTÁ AQUI!

const { width } = Dimensions.get('window');

export default function App() {
  const [tela, setTela] = useState('dashboard');
  const [vistorias, setVistorias] = useState([]);
  const [dashboardData, setDashboardData] = useState({ total: 0, andamento: 0, finalizadas: 0 });
  const [vistoriaAtual, setVistoriaAtual] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

  // Forms
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAmbiente, setModalAmbiente] = useState(false);
  
  const [novoNome, setNovoNome] = useState('');
  const [novoProcesso, setNovoProcesso] = useState('');
  const [novoDepto, setNovoDepto] = useState('SELOG');
  const [novoEndereco, setNovoEndereco] = useState('');
  const [novoAmbienteNome, setNovoAmbienteNome] = useState('');

  // --- IP CONFIG ---
  const API_URL = 'http://192.168.18.5:5000'; 

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = () => {
    setLoading(true);
    axios.get(`${API_URL}/api/vistorias`).then(res => {
      setVistorias(res.data);
      const total = res.data.length;
      const andamento = res.data.filter(v => v.status === 'Em Andamento').length;
      const finalizadas = res.data.filter(v => v.status === 'Finalizada').length;
      setDashboardData({ total, andamento, finalizadas });
      setLoading(false);
      setRefreshing(false);
    }).catch(err => { console.error(err); setLoading(false); setRefreshing(false); });
  };

  const onRefresh = () => { setRefreshing(true); carregarDados(); };

  const abrirVistoria = (id) => {
    setLoading(true);
    axios.get(`${API_URL}/api/vistorias/${id}/detalhes`).then(res => {
      setVistoriaAtual(res.data);
      setTela('detalhes');
      setLoading(false);
    });
  };

  const criarVistoria = () => {
    axios.post(`${API_URL}/api/vistorias`, {
      nome_projeto: novoNome, processo_numero: novoProcesso, departamento: novoDepto, endereco: novoEndereco
    }).then(() => {
      Alert.alert("Sucesso", "Vistoria criada!");
      setModalVisible(false); carregarDados();
      setNovoNome(''); setNovoProcesso(''); setNovoEndereco('');
    }).catch(() => Alert.alert("Erro", "Falha ao criar"));
  };

  const adicionarAmbiente = () => {
    axios.post(`${API_URL}/api/ambientes`, { vistoria_id: vistoriaAtual.id, nome_ambiente: novoAmbienteNome })
      .then(() => { setModalAmbiente(false); setNovoAmbienteNome(''); abrirVistoria(vistoriaAtual.id); })
  };

  const tirarFoto = async (ambienteId) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permissão negada");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) enviarFoto(result.assets[0].uri, ambienteId);
  };

  const enviarFoto = (uri, ambienteId) => {
    const formData = new FormData();
    formData.append('file', { uri: uri, name: 'foto.jpg', type: 'image/jpeg' });
    formData.append('ambiente_id', ambienteId);
    formData.append('descricao', 'Foto Mobile'); 
    axios.post(`${API_URL}/api/fotos/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(() => abrirVistoria(vistoriaAtual.id));
  };

  const excluirFoto = (idFoto) => {
    Alert.alert("Excluir Foto", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => axios.delete(`${API_URL}/api/fotos/${idFoto}`).then(() => abrirVistoria(vistoriaAtual.id)) }
    ]);
  };

  const finalizarVistoria = () => {
    Alert.alert("Finalizar", "Deseja encerrar este processo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: () => axios.post(`${API_URL}/api/vistorias/${vistoriaAtual.id}/finalizar`).then(() => abrirVistoria(vistoriaAtual.id)) }
    ]);
  };

  const abrirMapa = (endereco) => {
    if(!endereco) return Alert.alert("Atenção", "Endereço não cadastrado.");
    const url = Platform.select({ ios: `maps:0,0?q=${endereco} Maringá`, android: `geo:0,0?q=${endereco} Maringá` });
    Linking.openURL(url);
  };

  // --- FUNÇÃO AUXILIAR: Converte qualquer URI (http ou local) para Base64 ---
  const convertUriToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch(e) { return null; }
  };

  // --- FUNÇÃO ESPECIAL: Prepara o LOGO LOCAL para o PDF ---
  const getLogoBase64 = async () => {
    try {
      // 1. Carrega o asset do projeto
      const asset = Asset.fromModule(logoRodape);
      await asset.downloadAsync(); // Garante que está disponível
      // 2. Converte o arquivo local para Base64 usando a mesma lógica
      return await convertUriToBase64(asset.localUri || asset.uri);
    } catch (error) {
      console.log("Erro logo:", error);
      return null;
    }
  };

  // --- GERAR PDF ---
  const gerarRelatorioPDF = async () => {
    if(!vistoriaAtual) return;
    
    Alert.alert("Gerando PDF", "Aguarde, processando...");

    try {
      // 1. Pega o Logo Convertido (Base64)
      const logoB64 = await getLogoBase64();
      const logoSrc = logoB64 || "https://www.maringa.pr.gov.br/cdn/imagens/brasao.png"; // Fallback se falhar

      // 2. Processa Fotos da Vistoria (Base64)
      const ambientesProcessados = await Promise.all(vistoriaAtual.ambientes.map(async (amb) => {
        const fotosProcessadas = await Promise.all(amb.fotos.map(async (foto) => {
          const b64 = await convertUriToBase64(foto.url);
          return { ...foto, url: b64 || foto.url };
        }));
        return { ...amb, fotos: fotosProcessadas };
      }));

      // 3. HTML
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .logo { height: 90px; margin-bottom: 10px; }
              h1 { font-size: 16px; text-transform: uppercase; margin: 5px 0; font-weight: bold; }
              h2 { font-size: 14px; margin: 0; font-weight: bold; }
              h3 { font-size: 14px; margin: 0; font-weight: normal; }
              .info-box { background: #f8f9fa; padding: 15px; border: 1px solid #ccc; margin-bottom: 20px; font-size: 12px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .amb-title { background: #003366; color: white; padding: 5px 10px; font-size: 14px; margin-top: 20px; font-weight: bold; }
              .photos { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
              .photo-card { width: 48%; border: 1px solid #eee; padding: 5px; box-sizing: border-box; background: #fff; }
              img.photo { width: 100%; height: 180px; object-fit: cover; border: 1px solid #ccc; }
              .obs { font-size: 10px; color: #555; margin-top: 5px; font-style: italic; }
              .footer { margin-top: 50px; text-align: center; font-size: 10px; border-top: 1px solid #ccc; padding-top: 10px; color: #777; }
              .address { font-size: 11px; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${logoSrc}" class="logo" />
              <h1>Prefeitura do Município de Maringá</h1>
              <h2>Secretaria Municipal de Logística e Patrimônio (SELOG)</h2>
              <h3>Diretoria de Patrimônio Imobiliário</h3>
              <p class="address">
                Av. Centenário, 400 - Maringá PR | CEP 87050-040 | Telefone: (44) 3309-8250<br/>
                selog_expediente@maringa.pr.gov.br
              </p>
            </div>

            <div class="info-box">
              <div class="row"><strong>Objeto:</strong> <span>${vistoriaAtual.nome_projeto}</span></div>
              <div class="row"><strong>Processo:</strong> <span>${vistoriaAtual.processo_numero}</span></div>
              <div class="row"><strong>Solicitante:</strong> <span>${vistoriaAtual.departamento}</span></div>
              <div class="row"><strong>Endereço:</strong> <span>${vistoriaAtual.endereco}</span></div>
              <div class="row"><strong>Status:</strong> <span>${vistoriaAtual.status}</span></div>
            </div>

            ${ambientesProcessados.length === 0 ? '<p style="text-align:center">Nenhuma foto.</p>' : ''}

            ${ambientesProcessados.map(amb => `
              <div>
                <div class="amb-title">📍 ${amb.nome}</div>
                <div class="photos">
                  ${amb.fotos.map(foto => `
                    <div class="photo-card">
                      <img src="${foto.url}" class="photo" />
                      <div class="obs">Obs: ${foto.descricao || 'Sem observações.'}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}

            <div style="margin-top: 80px; display: flex; justify-content: space-around;">
               <div style="text-align: center; font-size: 12px; border-top: 1px solid #000; width: 40%; padding-top: 5px;">
                 Técnico Responsável
               </div>
               <div style="text-align: center; font-size: 12px; border-top: 1px solid #000; width: 40%; padding-top: 5px;">
                 Diretor de Patrimônio
               </div>
            </div>

            <div class="footer">
              Relatório gerado via App Mobile SELOG em ${new Date().toLocaleDateString()}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
      Alert.alert("Erro", "Erro ao gerar PDF: " + error.message);
    }
  };

  const handleSearch = (text) => {
    setTermoBusca(text);
    if (tela !== 'lista' && text.length > 0) setTela('lista');
  };

  const vistoriasFiltradas = vistorias.filter(v => v.nome_projeto.toLowerCase().includes(termoBusca.toLowerCase()) || v.processo_numero.includes(termoBusca));

  const renderDashboard = () => (
    <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.pageTitle}>Visão Geral</Text>
      <View style={styles.dashGrid}>
        <LinearGradient colors={['#005c9e', '#003366']} style={styles.dashCard}><Text style={styles.dashLabel}>Total</Text><Text style={styles.dashValue}>{dashboardData.total}</Text></LinearGradient>
        <LinearGradient colors={['#f39c12', '#d35400']} style={styles.dashCard}><Text style={styles.dashLabel}>Andamento</Text><Text style={styles.dashValue}>{dashboardData.andamento}</Text></LinearGradient>
        <LinearGradient colors={['#2ecc71', '#27ae60']} style={styles.dashCard}><Text style={styles.dashLabel}>Finalizadas</Text><Text style={styles.dashValue}>{dashboardData.finalizadas}</Text></LinearGradient>
      </View>
      <TouchableOpacity style={styles.bigButton} onPress={() => setTela('lista')}><Text style={styles.bigButtonText}>Ir para Vistorias →</Text></TouchableOpacity>
    </ScrollView>
  );

  const renderLista = () => (
    <View style={{flex:1}}>
      <View style={styles.listHeader}>
        <Text style={styles.pageTitle}>Processos</Text>
        <TouchableOpacity style={styles.btnAddSmall} onPress={() => setModalVisible(true)}><Text style={{color:'white', fontWeight:'bold'}}>+ Novo</Text></TouchableOpacity>
      </View>
      <FlatList
        data={vistoriasFiltradas} keyExtractor={item => item.id.toString()} contentContainerStyle={{padding: 15, paddingTop: 0}} refreshing={refreshing} onRefresh={onRefresh}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderLeftColor: item.status === 'Finalizada' ? '#27ae60' : '#f39c12', borderLeftWidth: 5 }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.nome_projeto}</Text>
              <View style={[styles.badge, { backgroundColor: item.status === 'Finalizada' ? '#e8f5e9' : '#fff3cd' }]}><Text style={{ fontSize: 10, color: item.status === 'Finalizada' ? '#155724' : '#856404', fontWeight:'bold' }}>{item.status}</Text></View>
            </View>
            <Text style={styles.cardText}>📄 {item.processo_numero}</Text>
            <TouchableOpacity onPress={() => abrirMapa(item.endereco)}><Text style={[styles.cardText, {color: '#0056b3', textDecorationLine:'underline'}]}>📍 {item.endereco || 'Sem endereço'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnOutline} onPress={() => abrirVistoria(item.id)}><Text style={{color:'#0056b3', fontWeight:'bold'}}>Abrir Painel</Text></TouchableOpacity>
          </View>
        )}
      />
    </View>
  );

  const renderDetalhes = () => (
    <View style={{flex:1}}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={() => setTela('lista')}><Text style={{color:'white', fontWeight:'bold'}}>← Voltar</Text></TouchableOpacity>
        <Text style={{color:'white', fontWeight:'bold', fontSize:16, flex:1, textAlign:'center'}} numberOfLines={1}>{vistoriaAtual.nome_projeto}</Text>
      </View>
      <ScrollView style={{flex:1, padding:15}}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Processo: <Text style={styles.infoVal}>{vistoriaAtual.processo_numero}</Text></Text>
          <TouchableOpacity onPress={() => abrirMapa(vistoriaAtual.endereco)}><Text style={styles.infoLabel}>Endereço: <Text style={[styles.infoVal, {color: '#0056b3', textDecorationLine: 'underline'}]}>{vistoriaAtual.endereco} 🗺️</Text></Text></TouchableOpacity>
        </View>

        <View style={{flexDirection:'row', flexWrap:'wrap', gap: 10, marginBottom: 20}}>
          {vistoriaAtual.status !== 'Finalizada' && (
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#e3f2fd', borderColor:'#0056b3'}]} onPress={() => setModalAmbiente(true)}>
              <Text style={{color:'#0056b3', fontWeight:'bold'}}>+ Ambiente</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#f3e5f5', borderColor:'#6a1b9a', flex: 1}]} onPress={gerarRelatorioPDF}>
            <Text style={{color:'#6a1b9a', fontWeight:'bold'}}>📄 PDF / Compartilhar</Text>
          </TouchableOpacity>

          {vistoriaAtual.status !== 'Finalizada' && (
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor:'#d4edda', borderColor:'#28a745'}]} onPress={finalizarVistoria}>
              <Text style={{color:'#155724', fontWeight:'bold'}}>✅ Fim</Text>
            </TouchableOpacity>
          )}
        </View>

        {vistoriaAtual.ambientes.map(amb => (
          <View key={amb.id} style={styles.envCard}>
            <Text style={styles.envTitle}>📍 {amb.nome}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:10}}>
              {amb.fotos.map(foto => (
                <TouchableOpacity key={foto.id} onLongPress={() => excluirFoto(foto.id)} delayLongPress={500}>
                  <Image source={{ uri: foto.url }} style={styles.thumb} />
                </TouchableOpacity>
              ))}
              {vistoriaAtual.status !== 'Finalizada' && (
                <TouchableOpacity style={styles.camBtn} onPress={() => tirarFoto(amb.id)}>
                  <Text style={{fontSize:24}}>📷</Text>
                  <Text style={{fontSize:10, color:'#666'}}>FOTO</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <Text style={{fontSize:10, color:'#999', marginTop:5, fontStyle:'italic'}}>Segure a foto para excluir</Text>
          </View>
        ))}
        <View style={{height:50}}/>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <ImageBackground source={bgTop} style={[styles.header, { width: width }]} imageStyle={{ resizeMode: 'cover' }}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLogoArea}>
            <Image source={logoWhite} style={styles.logo} resizeMode="contain" />
            <View><Text style={styles.headerSub}>Prefeitura de</Text><Text style={styles.headerMain}>Maringá</Text></View>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <Text style={{fontSize: 16, marginRight: 10, color:'white'}}>🔍</Text>
          <TextInput style={styles.searchInputText} placeholder="Pesquisar processo..." placeholderTextColor="rgba(255,255,255,0.7)" value={termoBusca} onChangeText={handleSearch} />
        </View>
      </ImageBackground>

      <View style={styles.main}>
        {loading && <ActivityIndicator size="large" color="#0056b3" style={{position:'absolute', zIndex:99, alignSelf:'center', top:50}} />}
        {tela === 'dashboard' && renderDashboard()}
        {tela === 'lista' && renderLista()}
        {tela === 'detalhes' && vistoriaAtual && renderDetalhes()}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setTela('dashboard')}><Text style={[styles.navText, tela==='dashboard' && styles.navActive]}>📊 Início</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { setTela('lista'); carregarDados(); }}><Text style={[styles.navText, tela==='lista' && styles.navActive]}>📂 Vistorias</Text></TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Vistoria</Text>
            <TextInput placeholder="Nome" style={styles.input} value={novoNome} onChangeText={setNovoNome} />
            <TextInput placeholder="Processo" style={styles.input} value={novoProcesso} onChangeText={setNovoProcesso} />
            <TextInput placeholder="Endereço" style={styles.input} value={novoEndereco} onChangeText={setNovoEndereco} />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={criarVistoria} style={styles.btnSave}><Text style={{color:'white'}}>Salvar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalAmbiente} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Ambiente</Text>
            <TextInput placeholder="Ex: Cozinha" style={styles.input} value={novoAmbienteNome} onChangeText={setNovoAmbienteNome} />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalAmbiente(false)} style={styles.btnCancel}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={adicionarAmbiente} style={styles.btnSave}><Text style={{color:'white'}}>Criar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f9' },
  header: { height: 160, paddingTop: 45, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: '#0056b3' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  headerLogoArea: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 45, height: 45, marginRight: 12 },
  headerSub: { color: 'white', fontSize: 12, opacity: 0.9, fontWeight:'bold' },
  headerMain: { color: 'white', fontSize: 20, fontWeight: 'bold', lineHeight: 22 },
  searchContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  searchInputText: { color: 'white', flex: 1, fontSize: 16 },
  main: { flex: 1 },
  content: { padding: 20 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingBottom: 10 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#444' },
  btnAddSmall: { backgroundColor: '#009639', padding: 8, paddingHorizontal: 15, borderRadius: 20 },
  dashGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dashCard: { width: '31%', padding: 10, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  dashLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, marginBottom: 2 },
  dashValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  bigButton: { backgroundColor: '#0056b3', padding: 15, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  bigButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0056b3', flex:1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  cardText: { color: '#666', fontSize: 13, marginBottom: 4 },
  btnOutline: { borderWidth: 1, borderColor: '#0056b3', padding: 8, borderRadius: 4, alignItems: 'center', marginTop: 10 },
  detailHeader: { flexDirection: 'row', padding: 15, backgroundColor: '#004080', alignItems: 'center' },
  infoBox: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
  infoLabel: { fontWeight: 'bold', color: '#555', marginBottom: 5 },
  infoVal: { fontWeight: 'normal', color: '#333' },
  actionBtn: { padding: 10, borderRadius: 6, alignItems: 'center', borderWidth:1, marginBottom: 0 },
  btnAddEnv: { backgroundColor: '#e3f2fd', padding: 12, borderRadius: 6, alignItems: 'center', marginBottom: 20, borderStyle:'dashed', borderWidth:1, borderColor:'#0056b3' },
  envCard: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
  envTitle: { fontWeight: 'bold', fontSize: 16, color: '#333', borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 5 },
  thumb: { width: 90, height: 90, borderRadius: 6, marginRight: 10, backgroundColor: '#eee' },
  camBtn: { width: 90, height: 90, borderRadius: 6, borderColor: '#ccc', borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  bottomNav: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderColor: '#ddd', paddingBottom: 20, paddingTop: 10 },
  navItem: { flex: 1, alignItems: 'center' },
  navText: { color: '#999', fontWeight: 'bold' },
  navActive: { color: '#0056b3' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 25, borderRadius: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6, marginBottom: 15, fontSize: 16 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 10 },
  btnCancel: { padding: 10 },
  btnSave: { backgroundColor: '#009639', padding: 10, paddingHorizontal: 20, borderRadius: 6 }
});