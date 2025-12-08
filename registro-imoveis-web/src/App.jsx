import { useState, useEffect } from "react";
import axios from "axios";

// --- IMPORTAÇÃO DOS ASSETS ---
import logoWhite from "./assets/logo_white.png"; // Logo Branco (Cabeçalho do Site)
import logoColor from "./assets/logo_rodape.png"; // Logo Colorido (Relatório de Impressão)
import headerBg from "./assets/bg-top.png"; // Fundo do site da prefeitura

function App() {
  const [menu, setMenu] = useState("dashboard");
  const [vistorias, setVistorias] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    total: 0,
    andamento: 0,
    finalizadas: 0,
  });
  const [vistoriaAtual, setVistoriaAtual] = useState(null);
  const [termoBusca, setTermoBusca] = useState("");

  // --- DADOS DE VALIDAÇÃO DO PROCESSO (Códigos e Nomes) ---
  const orgaosValidos = {
    "01": "PMM - Prefeitura Municipal de Maringá",
    "03": "MGAPREV - Maringá Previdência",
    16: "IAM - Instituto Ambiental de Maringá",
  };

  const secretariasValidas = {
    "02": "GAPRE - Gabinete do Prefeito",
    "03": "PROGE - Procuradoria Geral",
    "04": "SEGOV - Secretaria de Governo",
    "05": "SELOG - Logística e Compras",
    "06": "SEFAZ - Fazenda",
    "07": "SEURBH - Urbanismo e Habitação",
    "08": "SAUDE - Saúde",
    "09": "SEDUC - Educação",
    10: "SEBEA - Bem-Estar Animal",
    11: "SEMOB - Mobilidade Urbana",
    12: "SAET - Secretaria de Aceleração Econômica e Turismo",
    13: "SAS - Assistência Social",
    14: "SEMUC - Cultura",
    15: "SESP - Esportes e Lazer",
    16: "SEMULHER - Mulher",
    17: "COMPLIANCE - Secretaria Municipal de Compliance e Controle",
    19: "SEINFRA - Infraestrutura",
    20: "SEMOP - Obras Públicas",
    22: "SEGEP - Gestão de Pessoas",
    26: "SSM - Secretaria de Segurança", // ATUALIZADO
    27: "SELURB - Limpeza Urbana",
    28: "AMETRO - Secretaria de Assuntos Metropolitanos e Institucionais", // ATUALIZADO
    29: "SETRAB - Secretaria de Trabalho e Renda", // ATUALIZADO
    31: "SEJUC - Juventude",
    33: "SECOM - Comunicação",
    34: "SECRIANCA - Criança e Adolescente",
    35: "AMETECH - Tecnologia",
    39: "SEPED - Pessoa com Deficiência",
    99: "Comissões e Conselhos",
  };

  // LISTA DE SECRETARIAS PARA O DROPDOWN (Seleção Manual)
  const listaSecretariasDropdown = [
    "SEPAT - Secretaria Municipal de Patrimônio, Compras e Logística",
    "SELOG - Logística e Compras (05)",
    "SASC - Secretaria Municipal de Assistência Social e Cidadania",
    "CGM - Controladoria Geral do Município",
    "SEMUC - Secretaria Municipal de Cultura",
    "SEDUC - Secretaria Municipal de Educação",
    "SESP - Secretaria Municipal de Esportes e Lazer",
    "SEFAZ - Secretaria Municipal de Fazenda",
    "GAPRE - Chefia de Gabinete do Prefeito",
    "SEGE - Secretaria Municipal de Gestão",
    "SEIDE - Secretaria Municipal de Inovação e Desenvolvimento Econômico",
    "SEMA - Secretaria Municipal de Meio Ambiente e Bem-Estar Animal",
    "SEMOB - Secretaria Municipal de Mobilidade Urbana",
    "SAET - Secretaria de Aceleração Econômica e Turismo",
    "SEMULHER - Secretaria Municipal da Mulher, Igualdade Racial e Pessoa Idosa",
    "COMPLIANCE - Secretaria Municipal de Compliance e Controle",
    "SEMOP - Secretaria de Obras Públicas",
    "SEPLAN - Secretaria Municipal de Planejamento e Urbanismo",
    "PROCON - Coordenadoria Municipal de Proteção e Defesa do Consumidor",
    "SERH - Secretaria Municipal de Recursos Humanos",
    "SAÚDE - Secretaria Municipal de Saúde",
    "SEMUSP - Secretaria Municipal de Serviços Públicos",
    "SSM - Secretaria de Segurança", // ATUALIZADO
    "AMETRO - Secretaria de Assuntos Metropolitanos e Institucionais", // ATUALIZADO
    "SETRAB - Secretaria de Trabalho e Renda", // ATUALIZADO
    "Comissões e Conselhos (Geral)",
  ];

  // Formulários
  const [novoNome, setNovoNome] = useState("");
  const [novoProcesso, setNovoProcesso] = useState("");
  const [novoDepto, setNovoDepto] = useState(listaSecretariasDropdown[0]);
  const [novoEndereco, setNovoEndereco] = useState("");
  const [novoAmbiente, setNovoAmbiente] = useState("");
  const [mostraForm, setMostraForm] = useState(false);

  // Estado da Validação
  const [msgProcesso, setMsgProcesso] = useState({ text: "", color: "" });

  const API_URL = "https://projeto-ccom.onrender.com";

  // --- LOADS ---
  const carregarDados = () => {
    axios.get(`${API_URL}/api/vistorias`).then((res) => setVistorias(res.data));
    axios
      .get(`${API_URL}/api/dashboard`)
      .then((res) => setDashboardData(res.data));
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // --- ACTIONS ---
  const abrirVistoria = (id) => {
    axios.get(`${API_URL}/api/vistorias/${id}/detalhes`).then((res) => {
      setVistoriaAtual(res.data);
      setMenu("detalhes");
    });
  };

  // VALIDAÇÃO E MÁSCARA DO PROCESSO
  const handleProcessoChange = (e) => {
    let valor = e.target.value.replace(/\D/g, "");

    // Máscara: 00.00.00000000/0000.00
    if (valor.length > 2) valor = valor.replace(/^(\d{2})(\d)/, "$1.$2");
    if (valor.length > 5)
      valor = valor.replace(/^(\d{2})\.(\d{2})(\d)/, "$1.$2.$3");
    if (valor.length > 13) valor = valor.replace(/\.(\d{8})(\d)/, ".$1/$2");
    if (valor.length > 17) valor = valor.replace(/\/(\d{4})(\d)/, "/$1.$2");

    if (valor.length > 21) valor = valor.substring(0, 21);

    setNovoProcesso(valor);

    // Validação Lógica
    if (valor.length >= 5) {
      const partes = valor.split(".");
      const orgao = partes[0];
      const secretaria = partes[1];

      if (!orgaosValidos[orgao]) {
        setMsgProcesso({
          text: `❌ Órgão ${orgao} inválido`,
          color: "#d9534f",
        });
      } else if (!secretariasValidas[secretaria]) {
        setMsgProcesso({
          text: `❌ Secretaria ${secretaria} desconhecida`,
          color: "#d9534f",
        });
      } else {
        // Sucesso
        const nomeSec = secretariasValidas[secretaria];
        setMsgProcesso({
          text: `✅ ${orgaosValidos[orgao]} -> ${nomeSec}`,
          color: "#009639",
        });
      }
    } else {
      setMsgProcesso({ text: "", color: "" });
    }
  };

  const criarVistoria = (e) => {
    e.preventDefault();
    axios
      .post(`${API_URL}/api/vistorias`, {
        nome_projeto: novoNome,
        processo_numero: novoProcesso,
        departamento: novoDepto,
        endereco: novoEndereco,
      })
      .then(() => {
        alert("Vistoria criada com sucesso!");
        setNovoNome("");
        setNovoProcesso("");
        setNovoEndereco("");
        setMsgProcesso({ text: "", color: "" });
        setMostraForm(false);
        carregarDados();
      });
  };

  const adicionarAmbiente = () => {
    if (!novoAmbiente) return;
    axios
      .post(`${API_URL}/api/ambientes`, {
        vistoria_id: vistoriaAtual.id,
        nome_ambiente: novoAmbiente,
      })
      .then(() => {
        setNovoAmbiente("");
        abrirVistoria(vistoriaAtual.id);
      });
  };

  const uploadFoto = (e, ambienteId) => {
    const file = e.target.files[0];
    if (!file) return;
    const descricao = prompt("Descrição da foto (Opcional):") || "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("ambiente_id", ambienteId);
    formData.append("descricao", descricao);
    axios
      .post(`${API_URL}/api/fotos/upload`, formData)
      .then(() => abrirVistoria(vistoriaAtual.id));
  };

  const excluirFoto = (id) => {
    if (confirm("Deseja realmente apagar esta foto?"))
      axios
        .delete(`${API_URL}/api/fotos/${id}`)
        .then(() => abrirVistoria(vistoriaAtual.id));
  };

  const finalizarVistoria = () => {
    if (
      confirm("Confirmar finalização do processo? A vistoria será arquivada.")
    )
      axios
        .post(`${API_URL}/api/vistorias/${vistoriaAtual.id}/finalizar`)
        .then(() => abrirVistoria(vistoriaAtual.id));
  };

  const handleSearch = (e) => {
    setTermoBusca(e.target.value);
    if (menu !== "lista") setMenu("lista");
  };

  // --- ESTILOS VISUAIS ---
  const s = {
    // HEADER AZUL (SVG)
    headerBlue: {
      backgroundImage: `url(${headerBg})`,
      backgroundSize: "cover",
      backgroundPosition: "center center",
      backgroundColor: "#00569d",
      height: "100px",
      padding: "0 40px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      color: "white",
      boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    },
    headerLeft: { display: "flex", alignItems: "center", gap: "20px" },
    logoWhite: {
      height: "60px",
      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
    },
    headerTitles: {
      display: "flex",
      flexDirection: "column",
      fontFamily: '"Segoe UI", Roboto, sans-serif',
      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    },
    headerMainTitle: {
      fontSize: "28px",
      fontWeight: "bold",
      lineHeight: "1",
      margin: 0,
    },
    headerSubTitle: {
      fontSize: "16px",
      fontWeight: "normal",
      opacity: 0.95,
      margin: 0,
    },

    // Barra de Busca
    searchWrapper: { position: "relative", width: "350px" },
    searchInput: {
      width: "100%",
      padding: "12px 20px 12px 50px",
      borderRadius: "50px",
      border: "1px solid rgba(255,255,255,0.6)",
      background: "rgba(0,50,100,0.3)",
      color: "white",
      fontSize: "15px",
      outline: "none",
      backdropFilter: "blur(5px)",
    },
    searchIcon: {
      position: "absolute",
      left: "15px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "white",
      width: "20px",
    },

    // Layout
    layout: {
      display: "flex",
      minHeight: "calc(100vh - 100px)",
      fontFamily: "Segoe UI, sans-serif",
      background: "#f4f7f9",
    },
    sidebar: {
      width: "260px",
      background: "#fff",
      borderRight: "1px solid #e0e0e0",
      padding: "30px 0",
    },
    main: { flex: 1, padding: "30px" },

    menuItem: {
      padding: "12px 25px",
      cursor: "pointer",
      color: "#555",
      fontSize: "15px",
      borderLeft: "4px solid transparent",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      transition: "0.2s",
    },
    menuActive: {
      background: "#e8f5e9",
      color: "#009639",
      borderLeft: "4px solid #009639",
      fontWeight: "600",
    },

    card: {
      background: "white",
      padding: "25px",
      borderRadius: "8px",
      boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
      border: "1px solid #e0e0e0",
      marginBottom: "20px",
    },
    btn: {
      padding: "10px 20px",
      borderRadius: "4px",
      border: "none",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "0.2s",
    },
    input: {
      padding: "12px",
      borderRadius: "4px",
      border: "1px solid #ccc",
      width: "100%",
      boxSizing: "border-box",
      fontSize: "14px",
    },
    footer: {
      backgroundImage: "linear-gradient(to bottom, #00569d, #003366)", // Degradê azul de cima para baixo
      color: "#ecf0f1",
      padding: "30px",
      textAlign: "center",
      fontSize: "13px",
      // borderTop: '5px solid #c0392b', // Removida a borda vermelha
      boxShadow: "0 -4px 10px rgba(0,0,0,0.15)", // Sombra suave na parte superior
    },
    // RELATÓRIO DE IMPRESSÃO
    reportHeader: {
      textAlign: "center",
      marginBottom: "30px",
      fontFamily: "Arial, sans-serif",
      color: "#000",
    },
    reportLogo: { height: "100px", marginBottom: "15px" },
    reportTitle: {
      margin: "0 0 5px 0",
      fontSize: "18px",
      fontWeight: "bold",
      textTransform: "uppercase",
    },
    reportSub: { margin: "0 0 5px 0", fontSize: "16px", fontWeight: "bold" },
    reportSub2: { margin: 0, fontSize: "15px" },
    reportAddress: {
      margin: "15px 0 0",
      fontSize: "12px",
      color: "#333",
      lineHeight: "1.5",
    },
  };

  const vistoriasFiltradas = vistorias.filter(
    (v) =>
      v.nome_projeto.toLowerCase().includes(termoBusca.toLowerCase()) ||
      v.processo_numero.includes(termoBusca)
  );

  return (
    <div
      className="app-container"
      style={{ fontFamily: "Segoe UI, sans-serif" }}
    >
      {/* --- CABEÇALHO DO SITE (LOGO BRANCO + BG SVG) --- */}
      <header className="no-print" style={s.headerBlue}>
        <div style={s.headerLeft}>
          <img src={logoWhite} alt="Logo Branco" style={s.logoWhite} />
          <div style={s.headerTitles}>
            <span style={s.headerSubTitle}>Prefeitura de</span>
            <span style={s.headerMainTitle}>Maringá</span>
          </div>
        </div>

        <div style={s.searchWrapper}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            style={s.searchIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Pesquisar..."
            value={termoBusca}
            onChange={handleSearch}
            style={s.searchInput}
          />
        </div>
      </header>

      <div style={s.layout} className="main-layout">
        {/* SIDEBAR */}
        <div className="no-print" style={s.sidebar}>
          <div
            style={{
              padding: "0 30px 20px",
              fontSize: "12px",
              color: "#999",
              fontWeight: "bold",
              letterSpacing: "1px",
            }}
          >
            NAVEGAÇÃO
          </div>
          <div
            style={{
              ...s.menuItem,
              ...(menu === "dashboard" ? s.menuActive : {}),
            }}
            onClick={() => setMenu("dashboard")}
          >
            📊 Visão Geral
          </div>
          <div
            style={{ ...s.menuItem, ...(menu === "lista" ? s.menuActive : {}) }}
            onClick={() => {
              setMenu("lista");
              carregarDados();
            }}
          >
            📂 Vistorias
          </div>
          <div
            style={{
              marginTop: "30px",
              padding: "0 30px 20px",
              fontSize: "12px",
              color: "#999",
              fontWeight: "bold",
              letterSpacing: "1px",
            }}
          >
            SISTEMA
          </div>
          <div
            style={{ ...s.menuItem, color: "#d9534f" }}
            onClick={() => alert("Logout")}
          >
            🚪 Sair
          </div>
        </div>

        {/* CONTEÚDO */}
        <div style={s.main} className="main-content">
          {/* DASHBOARD */}
          {menu === "dashboard" && (
            <div>
              <h2 style={{ color: "#444", marginBottom: "25px" }}>
                Painel de Controle SELOG
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "25px",
                }}
              >
                <div
                  style={{
                    ...s.card,
                    borderTop: "4px solid #005c9e",
                    background:
                      "linear-gradient(to bottom right, #fff, #f0f8ff)",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 10px 0",
                      color: "#666",
                      fontSize: "15px",
                    }}
                  >
                    Total de Processos
                  </h3>
                  <div
                    style={{
                      fontSize: "42px",
                      fontWeight: "bold",
                      color: "#005c9e",
                    }}
                  >
                    {dashboardData.total}
                  </div>
                </div>
                <div
                  style={{
                    ...s.card,
                    borderTop: "4px solid #f39c12",
                    background:
                      "linear-gradient(to bottom right, #fff, #fffaf0)",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 10px 0",
                      color: "#666",
                      fontSize: "15px",
                    }}
                  >
                    Em Andamento
                  </h3>
                  <div
                    style={{
                      fontSize: "42px",
                      fontWeight: "bold",
                      color: "#f39c12",
                    }}
                  >
                    {dashboardData.andamento}
                  </div>
                </div>
                <div
                  style={{
                    ...s.card,
                    borderTop: "4px solid #009639",
                    background:
                      "linear-gradient(to bottom right, #fff, #f0fff0)",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 10px 0",
                      color: "#666",
                      fontSize: "15px",
                    }}
                  >
                    Finalizados
                  </h3>
                  <div
                    style={{
                      fontSize: "42px",
                      fontWeight: "bold",
                      color: "#009639",
                    }}
                  >
                    {dashboardData.finalizadas}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LISTA E CADASTRO */}
          {menu === "lista" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "25px",
                }}
              >
                <div>
                  <h2 style={{ color: "#444", margin: "0 0 5px 0" }}>
                    Processos e Vistorias
                  </h2>
                  {termoBusca && (
                    <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                      Exibindo resultados para: <strong>{termoBusca}</strong>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setMostraForm(!mostraForm)}
                  style={{
                    ...s.btn,
                    background: "#009639",
                    color: "white",
                    padding: "12px 25px",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>+</span> Novo Processo
                </button>
              </div>

              {mostraForm && (
                <div
                  style={{
                    ...s.card,
                    borderLeft: "5px solid #009639",
                    background: "#f9fff9",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      fontSize: "18px",
                      color: "#009639",
                      marginBottom: "20px",
                    }}
                  >
                    Cadastro de Nova Vistoria
                  </h3>
                  <form
                    onSubmit={criarVistoria}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: "20px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontWeight: "bold",
                          fontSize: "13px",
                          color: "#555",
                        }}
                      >
                        NOME DO LOCAL / PROJETO
                      </label>
                      <input
                        placeholder="Ex: Reforma da Escola Municipal..."
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        required
                        style={s.input}
                      />
                    </div>

                    {/* CAMPO DE PROCESSO COM VALIDAÇÃO */}
                    <div>
                      <label
                        style={{
                          fontWeight: "bold",
                          fontSize: "13px",
                          color: "#555",
                        }}
                      >
                        Nº PROCESSO
                      </label>
                      <input
                        placeholder="00.00.00000000/0000.00"
                        value={novoProcesso}
                        onChange={handleProcessoChange}
                        required
                        maxLength={21}
                        style={{
                          ...s.input,
                          borderColor: msgProcesso.color || "#ccc",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "12px",
                          marginTop: "5px",
                          color: msgProcesso.color,
                          fontWeight: "bold",
                          minHeight: "18px",
                        }}
                      >
                        {msgProcesso.text}
                      </div>
                    </div>

                    {/* SELEÇÃO DE SECRETARIAS (Lista Completa e Atualizada) */}
                    <div>
                      <label
                        style={{
                          fontWeight: "bold",
                          fontSize: "13px",
                          color: "#555",
                        }}
                      >
                        SECRETARIA SOLICITANTE
                      </label>
                      <select
                        value={novoDepto}
                        onChange={(e) => setNovoDepto(e.target.value)}
                        style={s.input}
                      >
                        {listaSecretariasDropdown.map((sec, index) => (
                          <option key={index} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        style={{
                          fontWeight: "bold",
                          fontSize: "13px",
                          color: "#555",
                        }}
                      >
                        ENDEREÇO COMPLETO
                      </label>
                      <input
                        placeholder="Rua, Número, Bairro"
                        value={novoEndereco}
                        onChange={(e) => setNovoEndereco(e.target.value)}
                        style={s.input}
                      />
                    </div>
                    <div
                      style={{
                        gridColumn: "span 2",
                        marginTop: "10px",
                        display: "flex",
                        gap: "15px",
                      }}
                    >
                      <button
                        type="submit"
                        style={{
                          ...s.btn,
                          background: "#009639",
                          color: "white",
                          padding: "12px 30px",
                        }}
                      >
                        Salvar Vistoria
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostraForm(false)}
                        style={{
                          ...s.btn,
                          background: "transparent",
                          color: "#888",
                          border: "1px solid #ccc",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div style={{ display: "grid", gap: "15px" }}>
                {vistoriasFiltradas.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#888",
                      padding: "20px",
                    }}
                  >
                    Nenhum processo encontrado.
                  </p>
                ) : (
                  vistoriasFiltradas.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        ...s.card,
                        padding: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "0.2s",
                        borderLeft:
                          v.status === "Finalizada"
                            ? "4px solid #009639"
                            : "4px solid #f39c12",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "15px",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              color: "#005c9e",
                              fontSize: "20px",
                            }}
                          >
                            {v.nome_projeto}
                          </h3>
                          <span
                            style={{
                              fontSize: "12px",
                              background:
                                v.status === "Finalizada"
                                  ? "#e8f5e9"
                                  : "#fffaf0",
                              color:
                                v.status === "Finalizada"
                                  ? "#009639"
                                  : "#d35400",
                              padding: "4px 12px",
                              borderRadius: "20px",
                              fontWeight: "bold",
                              textTransform: "uppercase",
                            }}
                          >
                            {v.status}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "25px",
                            color: "#666",
                            fontSize: "14px",
                          }}
                        >
                          <span>
                            🏛️{" "}
                            <strong title={v.departamento}>
                              {v.departamento.split("-")[0]}
                            </strong>
                          </span>
                          <span>
                            📄 Proc: <strong>{v.processo_numero}</strong>
                          </span>
                          <span>📅 {v.data_vistoria}</span>
                        </div>
                        <p
                          style={{
                            margin: "8px 0 0 0",
                            color: "#888",
                            fontSize: "13px",
                          }}
                        >
                          📍 {v.endereco || "Endereço não cadastrado"}
                        </p>
                      </div>
                      <div style={{ marginLeft: "20px" }}>
                        <button
                          onClick={() => abrirVistoria(v.id)}
                          style={{
                            ...s.btn,
                            background: "#005c9e",
                            color: "white",
                          }}
                        >
                          Abrir Painel →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* RELATÓRIO DE IMPRESSÃO */}
          {menu === "detalhes" && vistoriaAtual && (
            <div>
              <div
                className="no-print"
                style={{
                  marginBottom: "25px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "white",
                  padding: "15px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <button
                  onClick={() => setMenu("lista")}
                  style={{
                    ...s.btn,
                    background: "transparent",
                    color: "#666",
                    border: "1px solid #ccc",
                  }}
                >
                  ← Voltar para Lista
                </button>
                <div style={{ display: "flex", gap: "15px" }}>
                  {vistoriaAtual.status !== "Finalizada" && (
                    <button
                      onClick={finalizarVistoria}
                      style={{
                        ...s.btn,
                        background: "#009639",
                        color: "white",
                      }}
                    >
                      ✅ Finalizar e Arquivar
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    style={{ ...s.btn, background: "#003366", color: "white" }}
                  >
                    🖨️ Imprimir Relatório Oficial
                  </button>
                </div>
              </div>

              {/* ÁREA DE IMPRESSÃO */}
              <div
                style={{
                  background: "white",
                  padding: "50px",
                  border: "1px solid #ddd",
                  minHeight: "900px",
                }}
              >
                {/* CABEÇALHO DO RELATÓRIO (LOGO COLORIDO) */}
                <div style={s.reportHeader}>
                  <img
                    src={logoColor}
                    style={s.reportLogo}
                    alt="Brasão Colorido"
                  />
                  <h2 style={s.reportTitle}>
                    PREFEITURA DO MUNICÍPIO DE MARINGÁ
                  </h2>
                  <h3 style={s.reportSub}>
                    Secretaria Municipal de Logística e Patrimônio (SELOG)
                  </h3>
                  <h3 style={s.reportSub2}>
                    Diretoria de Patrimônio Imobiliário
                  </h3>
                  <p style={s.reportAddress}>
                    Av. Centenário, 400 - Maringá PR | CEP 87050-040 | Telefone:
                    (44) 3309-8250
                    <br />
                    selog_expediente@maringa.pr.gov.br - www.maringa.pr.gov.br
                  </p>
                  <hr
                    style={{ borderTop: "2px solid #000", marginTop: "20px" }}
                  />
                </div>

                {/* DADOS */}
                <div
                  style={{
                    background: "#f4f7f9",
                    padding: "20px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                    marginBottom: "30px",
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr",
                    gap: "15px",
                    fontSize: "13px",
                    color: "#333",
                  }}
                >
                  <div>
                    <strong style={{ color: "#003366" }}>
                      Objeto da Vistoria:
                    </strong>
                    <br />
                    {vistoriaAtual.nome_projeto}
                  </div>
                  <div>
                    <strong style={{ color: "#003366" }}>Nº Processo:</strong>
                    <br />
                    {vistoriaAtual.processo_numero}
                  </div>
                  <div>
                    <strong style={{ color: "#003366" }}>Status:</strong>
                    <br />
                    {vistoriaAtual.status.toUpperCase()}
                  </div>
                  <div
                    style={{
                      gridColumn: "span 3",
                      borderTop: "1px solid #e0e0e0",
                      paddingTop: "10px",
                    }}
                  >
                    <strong>Localização:</strong>{" "}
                    {vistoriaAtual.endereco || "Não informado"}
                  </div>
                  <div style={{ gridColumn: "span 3" }}>
                    <strong>Solicitante:</strong> {vistoriaAtual.departamento}
                  </div>
                </div>

                <h3
                  style={{
                    textAlign: "center",
                    textTransform: "uppercase",
                    color: "#003366",
                    textDecoration: "underline",
                    marginBottom: "30px",
                  }}
                >
                  Registro Fotográfico
                </h3>

                {vistoriaAtual.ambientes.map((amb) => (
                  <div
                    key={amb.id}
                    style={{ marginBottom: "30px", pageBreakInside: "avoid" }}
                  >
                    <h4
                      style={{
                        background: "#003366",
                        color: "white",
                        padding: "8px 15px",
                        margin: "0 0 15px",
                        borderRadius: "4px",
                      }}
                    >
                      📍 {amb.nome}
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "20px",
                      }}
                    >
                      {amb.fotos.map((foto) => (
                        <div
                          key={foto.id}
                          style={{
                            border: "1px solid #eee",
                            padding: "10px",
                            background: "white",
                          }}
                        >
                          <img
                            src={foto.url}
                            style={{
                              width: "100%",
                              height: "220px",
                              objectFit: "cover",
                              border: "1px solid #ccc",
                            }}
                          />
                          <div
                            style={{
                              padding: "10px 0 0 0",
                              fontSize: "13px",
                              fontStyle: "italic",
                              color: "#555",
                              borderTop: "1px solid #eee",
                              marginTop: "10px",
                            }}
                          >
                            {foto.descricao || "Sem observações."}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Assinaturas */}
                <div
                  style={{
                    marginTop: "100px",
                    borderTop: "2px solid #333",
                    paddingTop: "30px",
                    display: "flex",
                    justifyContent: "space-around",
                    pageBreakInside: "avoid",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <div style={{ textAlign: "center", fontSize: "13px" }}>
                    __________________________
                    <br />
                    <strong>Técnico Responsável</strong>
                    <br />
                    SELOG / Matrícula: _________
                  </div>
                  <div style={{ textAlign: "center", fontSize: "13px" }}>
                    __________________________
                    <br />
                    <strong>Diretor de Patrimônio</strong>
                    <br />
                    De acordo
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="no-print" style={s.footer}>
        <div
          style={{
            fontWeight: "bold",
            marginBottom: "5px",
            fontSize: "14px",
            textTransform: "uppercase",
          }}
        >
          Prefeitura do Município de Maringá
        </div>
        <div>Av. Centenário, 400 - Maringá PR, 87050-040</div>
        <div style={{ marginTop: "10px", color: "#bdc3c7", fontSize: "12px" }}>
          Desenvolvido para a SELOG
        </div>
      </footer>

      <style>{`
        body { background: #f0f2f5; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          .app-container { background: white !important; }
          .main-content { margin: 0 !important; padding: 0 !important; }
          .main-layout { display: block !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

export default App;
