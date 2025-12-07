# 📸 Sistema de Registro Fotográfico de Imóveis (Prefeitura)

## 🎯 Objetivo do Projeto

Este projeto visa modernizar e centralizar o processo de fiscalização e documentação de **concessões de imóveis municipais** e vistorias logísticas. O sistema substitui métodos manuais por uma solução digital multiplataforma, garantindo a **integridade dos dados**, a **validade dos relatórios** e a **rastreabilidade geográfica** das vistorias em campo.

## ✨ Funcionalidades Principais

* **Registro Multimídia:** Criação de projetos de vistoria organizados por **Ambientes** com registro fotográfico.
* **Captura de Dados:** Interface amigável (baseada no protótipo `index.html`) para registro de número de Processo, Imóvel e Secretaria Solicitante.
* **Rastreabilidade Geográfica (App Mobile):** Captura automática de **Latitude e Longitude** no momento da foto, essencial para comprovar a presença do fiscal no local.
* **Gerador de Relatórios:** Exportação padronizada e automática dos dados e fotos em formato **PDF** (replicando o layout da Prefeitura).
* **Gerenciamento Centralizado:** Todos os projetos são salvos em um banco de dados centralizado, permitindo o acompanhamento em tempo real pela área de Logística/Patrimônio.
* **Persistência de Dados:** Funções de Salvar/Carregar Projeto (via API) e backup local (`.json`).

## 💻 Arquitetura e Tecnologias Sugeridas

O sistema será construído sob o modelo de **Arquitetura de Três Camadas (3-Tier)** para garantir modularidade, escalabilidade e segurança.

### 1. Camada de Apresentação (Frontend)

Responsável pela interface do usuário e interação com o servidor.

| Componente | Tecnologia Sugerida | Propósito |
| :--- | :--- | :--- |
| **Aplicativo Móvel** | **React Native** ou **Flutter** | Coleta de dados em campo, acesso à câmera e GPS. |
| **Site Web** | **React / Vue.js** | Visualização de relatórios, acompanhamento e administração (uso interno no escritório). |

### 2. Camada de Aplicação (Backend / API)

O "cérebro" do sistema que hospeda a lógica de negócio e gera o PDF final.

| Tecnologia Sugerida | Funcionalidade Principal |
| :--- | :--- |
| **Linguagem/Framework** | **Python (Django/Flask)** ou **Node.js (Express)** | Criação de APIs REST para gerenciamento de Vistorias, Ambientes e Fotos. |
| **Geração de Relatórios** | Biblioteca dedicada para renderizar o PDF no servidor com as fotos. |

### 3. Camada de Dados

Armazenamento seguro e centralizado.

| Tecnologia Sugerida | Propósito |
| :--- | :--- |
| **Banco de Dados** | **PostgreSQL** | Garantia de integridade e transação para dados estruturados (cadastros, processos). |
| **Armazenamento de Arquivos** | **AWS S3 / GCP Storage** | Armazenamento escalável e seguro para as imagens de alta resolução. |

## 📁 Estrutura do Repositório (Sugestão)