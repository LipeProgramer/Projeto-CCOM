import os
import uuid
import psycopg2
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app) # Habilita comunicação com o site (Frontend)

# --- CONFIGURAÇÕES ---

# Pasta onde as fotos serão salvas
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Cria a pasta uploads se ela não existir
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- CREDENCIAIS DO BANCO DE DADOS (ATENÇÃO: Substitua pelos seus dados) ---
DB_NAME = os.environ.get('DB_NAME', 'postgres') # Nome padrão geralmente é postgres
DB_USER = os.environ.get('DB_USER', 'postgres') # Seu usuário
DB_PASS = os.environ.get('DB_PASS', 'postgres') # <--- COLQUE SUA SENHA AQUI
DB_HOST = os.environ.get('DB_HOST', 'localhost')

# --- FUNÇÕES AUXILIARES ---

def get_db_connection():
    """Abre conexão com o PostgreSQL"""
    conn = psycopg2.connect(
        database="postgres",
        user="postgres",
        password="postgres",
        host="localhost",
        port=5433
    )
    return conn

def allowed_file(filename):
    """Verifica se a extensão do arquivo é permitida"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- ROTAS DA API ---

# 1. Listar todas as Vistorias
@app.route('/api/vistorias', methods=['GET'])
def listar_vistorias():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, nome_projeto, processo_numero, data_vistoria, status FROM Vistoria ORDER BY data_vistoria DESC;")
        rows = cur.fetchall()
        vistorias = []
        for row in rows:
            vistorias.append({
                'id': row[0],
                'nome_projeto': row[1],
                'processo_numero': row[2],
                'data_vistoria': row[3].isoformat(),
                'status': row[4]
            })
        return jsonify(vistorias)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

# 2. Criar Nova Vistoria
@app.route('/api/vistorias', methods=['POST'])
def criar_vistoria():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        query = """
        INSERT INTO Vistoria (imovel_id, nome_projeto, processo_numero) 
        VALUES (%s, %s, %s) RETURNING id;
        """
        # Atenção: O imovel_id deve existir na tabela Imovel
        cur.execute(query, (data.get('imovel_id'), data.get('nome_projeto'), data.get('processo_numero')))
        novo_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({'id': novo_id, 'message': 'Vistoria criada!'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

# 3. Criar Ambiente (Necessário antes de enviar foto)
@app.route('/api/ambientes', methods=['POST'])
def criar_ambiente():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        query = "INSERT INTO Ambiente (vistoria_id, nome_ambiente) VALUES (%s, %s) RETURNING id;"
        cur.execute(query, (data.get('vistoria_id'), data.get('nome_ambiente')))
        novo_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({'id': novo_id, 'message': 'Ambiente criado!'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()

# 4. Upload de Foto
@app.route('/api/fotos/upload', methods=['POST'])
def upload_foto():
    # Verifica se a parte do arquivo está presente
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    ambiente_id = request.form.get('ambiente_id') # Recebe via form-data

    if file.filename == '' or not ambiente_id:
        return jsonify({'error': 'Dados incompletos'}), 400

    if file and allowed_file(file.filename):
        # Gera nome seguro e único
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        
        # Salva na pasta uploads
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        
        # Gera a URL para acesso
        file_url = f"/uploads/{filename}"

        # Salva no Banco de Dados
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            query = "INSERT INTO Foto (ambiente_id, caminho_arquivo) VALUES (%s, %s) RETURNING id;"
            cur.execute(query, (ambiente_id, file_url))
            foto_id = cur.fetchone()[0]
            conn.commit()
            return jsonify({'id': foto_id, 'url': file_url}), 201
        except Exception as e:
            conn.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            cur.close()
            conn.close()
    
    return jsonify({'error': 'Arquivo inválido'}), 400

# 5. Servir Arquivos de Imagem (Para ver a foto no navegador)
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)