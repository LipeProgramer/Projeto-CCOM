import os
import uuid
import psycopg2
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from supabase import create_client, Client

app = Flask(__name__)
CORS(app)

SUPABASE_URL = "https://ruiggbmojudehosevmuu.supabase.co" 
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1aWdnYm1vanVkZWhvc2V2bXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTIyMzcwOSwiZXhwIjoyMDgwNzk5NzA5fQ.dJvPFchOTyz6mF0DKOI3f38aoulJbRZpIJyuEyoV7kA" # A chave longa 'service_role'
DB_CONNECTION_STRING = "postgresql://postgres.ruiggbmojudehosevmuu:supabase@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET_NAME = 'vistorias'

def get_db_connection():
    # Conecta direto na string do Supabase
    return psycopg2.connect(DB_CONNECTION_STRING)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif'}

# --- ROTAS ---

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

@app.route('/api/vistorias', methods=['GET'])
def listar_vistorias():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, nome_projeto, processo_numero, data_vistoria, status, departamento, endereco FROM Vistoria ORDER BY id DESC;")
        rows = cur.fetchall()
        vistorias = [{
            'id': r[0], 'nome_projeto': r[1], 'processo_numero': r[2], 
            'data_vistoria': r[3].strftime('%d/%m/%Y') if r[3] else None, 'status': r[4],
            'departamento': r[5], 'endereco': r[6]
        } for r in rows]
        return jsonify(vistorias)
    finally:
        cur.close(); conn.close()

@app.route('/api/vistorias', methods=['POST'])
def criar_vistoria():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Pega o ID do primeiro imóvel que encontrar (padrão) ou 1
        cur.execute("SELECT id FROM Imovel LIMIT 1")
        res_imovel = cur.fetchone()
        imovel_id = res_imovel[0] if res_imovel else 1

        cur.execute("""
            INSERT INTO Vistoria (imovel_id, nome_projeto, processo_numero, departamento, endereco) 
            VALUES (%s, %s, %s, %s, %s) RETURNING id;
        """, (imovel_id, data.get('nome_projeto'), data.get('processo_numero'), data.get('departamento'), data.get('endereco')))
        novo_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({'id': novo_id}), 201
    except Exception as e:
        conn.rollback(); return jsonify({'error': str(e)}), 500
    finally:
        cur.close(); conn.close()

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
            'status': v_row[3], 'data_vistoria': v_row[4].strftime('%d/%m/%Y') if v_row[4] else None,
            'departamento': v_row[5], 'endereco': v_row[6],
            'ambientes': []
        }

        cur.execute("SELECT id, nome_ambiente FROM Ambiente WHERE vistoria_id = %s ORDER BY id", (id_vistoria,))
        ambientes = cur.fetchall()

        for amb in ambientes:
            cur.execute("SELECT id, caminho_arquivo, descricao FROM Foto WHERE ambiente_id = %s", (amb[0],))
            # caminho_arquivo agora será a URL completa do Supabase
            fotos = [{'id': f[0], 'url': f[1], 'descricao': f[2] or ''} for f in cur.fetchall()]
            vistoria['ambientes'].append({'id': amb[0], 'nome': amb[1], 'fotos': fotos})

        return jsonify(vistoria)
    finally:
        cur.close(); conn.close()

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

# UPLOAD MODIFICADO PARA SUPABASE
@app.route('/api/fotos/upload', methods=['POST'])
def upload_foto():
    file = request.files.get('file')
    ambiente_id = request.form.get('ambiente_id')
    descricao = request.form.get('descricao', '')

    if file and allowed_file(file.filename):
        # 1. Lê os bytes do arquivo
        file_bytes = file.read()
        
        # 2. Gera nome único
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        path_on_supa = f"{ambiente_id}/{filename}" # Organiza por ambiente

        # 3. Envia para o Supabase Storage
        try:
            res = supabase.storage.from_(BUCKET_NAME).upload(
                path=path_on_supa,
                file=file_bytes,
                file_options={"content-type": file.content_type}
            )
            
            # 4. Pega a URL Pública
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(path_on_supa)

            # 5. Salva no Banco com a URL do Supabase
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("INSERT INTO Foto (ambiente_id, caminho_arquivo, descricao) VALUES (%s, %s, %s) RETURNING id;", 
                        (ambiente_id, public_url, descricao))
            conn.commit()
            cur.close(); conn.close()
            
            return jsonify({'message': 'Salvo', 'url': public_url}), 201

        except Exception as e:
            return jsonify({'error': f"Erro Supabase: {str(e)}"}), 500

    return jsonify({'error': 'Erro arquivo'}), 400

@app.route('/api/fotos/<int:id_foto>', methods=['DELETE'])
def delete_foto(id_foto):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Primeiro pega a URL para tentar apagar do Storage (opcional/avançado)
        # Por enquanto, apenas deletamos do banco para simplificar
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

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')