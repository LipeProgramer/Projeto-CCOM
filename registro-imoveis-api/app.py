import os
import uuid
import psycopg2
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# --- CONFIGURAÇÕES ---
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- DB CONFIG ---
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASS = "postgres"
DB_HOST = "localhost"
DB_PORT = "5433" # Ajuste para 5432 se necessário

def get_db_connection():
    return psycopg2.connect(database=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- ROTAS ---

# 1. Dashboard (Estatísticas) - NOVO!
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM Vistoria")
        total = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM Vistoria WHERE status = 'Em Andamento'")
        andamento = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM Vistoria WHERE status = 'Finalizada'")
        finalizadas = cur.fetchone()[0]
        
        return jsonify({'total': total, 'andamento': andamento, 'finalizadas': finalizadas})
    finally:
        cur.close(); conn.close()

# 2. Listar Vistorias (Com novos campos)
@app.route('/api/vistorias', methods=['GET'])
def listar_vistorias():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, nome_projeto, processo_numero, data_vistoria, status, departamento, endereco FROM Vistoria ORDER BY id DESC;")
        rows = cur.fetchall()
        vistorias = [{
            'id': r[0], 'nome_projeto': r[1], 'processo_numero': r[2], 
            'data_vistoria': r[3].strftime('%d/%m/%Y'), 'status': r[4],
            'departamento': r[5], 'endereco': r[6]
        } for r in rows]
        return jsonify(vistorias)
    finally:
        cur.close(); conn.close()

# 3. Criar Vistoria (Completa)
@app.route('/api/vistorias', methods=['POST'])
def criar_vistoria():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Usa imovel_id=1 como padrão, mas salva o endereço específico
        cur.execute("""
            INSERT INTO Vistoria (imovel_id, nome_projeto, processo_numero, departamento, endereco) 
            VALUES (1, %s, %s, %s, %s) RETURNING id;
        """, (data.get('nome_projeto'), data.get('processo_numero'), data.get('departamento'), data.get('endereco')))
        novo_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({'id': novo_id}), 201
    except Exception as e:
        conn.rollback(); return jsonify({'error': str(e)}), 500
    finally:
        cur.close(); conn.close()

# 4. Editar Vistoria - NOVO!
@app.route('/api/vistorias/<int:id>', methods=['PUT'])
def editar_vistoria(id):
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE Vistoria 
            SET nome_projeto = %s, processo_numero = %s, departamento = %s, endereco = %s
            WHERE id = %s
        """, (data.get('nome_projeto'), data.get('processo_numero'), data.get('departamento'), data.get('endereco'), id))
        conn.commit()
        return jsonify({'message': 'Atualizado'})
    finally:
        cur.close(); conn.close()

# 5. Detalhes
@app.route('/api/vistorias/<int:id_vistoria>/detalhes', methods=['GET'])
def get_vistoria_detalhes(id_vistoria):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, nome_projeto, processo_numero, status, data_vistoria, departamento, endereco FROM Vistoria WHERE id = %s", (id_vistoria,))
        v_row = cur.fetchone()
        if not v_row: return jsonify({'error': 'Nao encontrado'}), 404
        
        vistoria = {
            'id': v_row[0], 'nome_projeto': v_row[1], 'processo_numero': v_row[2], 
            'status': v_row[3], 'data_vistoria': v_row[4].strftime('%d/%m/%Y'),
            'departamento': v_row[5], 'endereco': v_row[6],
            'ambientes': []
        }

        cur.execute("SELECT id, nome_ambiente FROM Ambiente WHERE vistoria_id = %s ORDER BY id", (id_vistoria,))
        ambientes = cur.fetchall()

        for amb in ambientes:
            cur.execute("SELECT id, caminho_arquivo, descricao FROM Foto WHERE ambiente_id = %s", (amb[0],))
            fotos = [{'id': f[0], 'url': f"http://127.0.0.1:5000{f[1]}", 'descricao': f[2] or ''} for f in cur.fetchall()]
            vistoria['ambientes'].append({'id': amb[0], 'nome': amb[1], 'fotos': fotos})

        return jsonify(vistoria)
    finally:
        cur.close(); conn.close()

# 6. Rotas Auxiliares (Ambiente, Foto, Finalizar)
@app.route('/api/ambientes', methods=['POST'])
def criar_ambiente():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO Ambiente (vistoria_id, nome_ambiente) VALUES (%s, %s) RETURNING id;", (data.get('vistoria_id'), data.get('nome_ambiente')))
        conn.commit()
        return jsonify({'id': cur.fetchone()[0]}), 201
    finally:
        cur.close(); conn.close()

@app.route('/api/fotos/upload', methods=['POST'])
def upload_foto():
    file = request.files.get('file')
    ambiente_id = request.form.get('ambiente_id')
    descricao = request.form.get('descricao', '')
    if file and allowed_file(file.filename):
        filename = f"{uuid.uuid4()}.{file.filename.rsplit('.', 1)[1].lower()}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO Foto (ambiente_id, caminho_arquivo, descricao) VALUES (%s, %s, %s) RETURNING id;", (ambiente_id, f"/uploads/{filename}", descricao))
            conn.commit()
            return jsonify({'message': 'Salvo'}), 201
        finally:
            cur.close(); conn.close()
    return jsonify({'error': 'Erro arquivo'}), 400

@app.route('/api/fotos/<int:id_foto>', methods=['DELETE'])
def delete_foto(id_foto):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM Foto WHERE id = %s", (id_foto,))
        conn.commit()
        return jsonify({'message': 'Deletado'})
    finally:
        cur.close(); conn.close()

@app.route('/api/vistorias/<int:id>/finalizar', methods=['POST'])
def finalizar_vistoria(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE Vistoria SET status = 'Finalizada', data_finalizacao = NOW() WHERE id = %s", (id,))
        conn.commit()
        return jsonify({'message': 'Finalizada'})
    finally:
        cur.close(); conn.close()

@app.route('/uploads/<filename>')
def uploaded_file(filename): return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__': app.run(debug=True, port=5000)