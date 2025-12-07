# app.py
from flask import Flask, jsonify, request
import psycopg2
import os 
from flask_cors import CORS # Necessário para o frontend web

app = Flask(__name__)
# Habilita o CORS para que o site (frontend) possa acessar esta API
CORS(app) 

# --- CONFIGURAÇÃO DO BANCO DE DADOS (SUBSTITUA AQUI!) ---
DB_NAME = os.environ.get('DB_NAME', 'nome_do_seu_banco')
DB_USER = os.environ.get('DB_USER', 'seu_usuario')
DB_PASS = os.environ.get('DB_PASS', 'sua_senha')
DB_HOST = os.environ.get('DB_HOST', 'localhost')

def get_db_connection():
    # Esta função abre uma nova conexão com o PostgreSQL
    conn = psycopg2.connect(
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST
    )
    return conn

# --- ROTAS DA API ---

# Rota 1: Buscar todas as Vistorias (Lista de Projetos Salvos)
@app.route('/api/vistorias', methods=['GET'])
def listar_vistorias():
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT id, nome_projeto, processo_numero, data_vistoria, status FROM Vistoria ORDER BY data_vistoria DESC;")
        vistorias = cur.fetchall()
        
        resultados = []
        # Mapeia os resultados do banco para um dicionário JSON
        for v in vistorias:
            resultados.append({
                'id': v[0],
                'nome_projeto': v[1],
                'processo_numero': v[2],
                'data_vistoria': v[3].isoformat(), 
                'status': v[4]
            })
            
        return jsonify(resultados)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
    finally:
        cur.close()
        conn.close()

# Rota 2: Criar Nova Vistoria (POST)
@app.route('/api/vistorias', methods=['POST'])
def criar_vistoria():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Nota: Idealmente, você faria uma consulta para verificar se o imovel_id existe
        query = """
        INSERT INTO Vistoria (imovel_id, nome_projeto, processo_numero) 
        VALUES (%s, %s, %s) RETURNING id;
        """
        cur.execute(query, (data.get('imovel_id'), data.get('nome_projeto'), data.get('processo_numero')))
        
        vistoria_id = cur.fetchone()[0]
        conn.commit() 
        
        return jsonify({'id': vistoria_id, 'message': 'Vistoria criada com sucesso'}), 201
        
    except Exception as e:
        conn.rollback() 
        return jsonify({'error': str(e)}), 500
        
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    app.run(debug=True, port=5000)