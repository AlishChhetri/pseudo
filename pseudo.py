from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

CONFIG_FILE = 'configs.json'

def read_configs():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as file:
            return json.load(file)
    else:
        initial_config = {
            "modes": {
                "llm": {"providers": {}},
                "vision": {"providers": {}},
                "speech": {"providers": {}},
                "translation": {"providers": {}},
                "image": {"providers": {}}
            }
        }
        write_configs(initial_config)
        return initial_config

def write_configs(configs):
    with open(CONFIG_FILE, 'w') as file:
        json.dump(configs, file, indent=4)

@app.route('/save-config', methods=['POST'])
def save_config():
    try:
        data = request.json
        configs = read_configs()
        
        provider_name = data.get('provider')
        api_key = data.get('apiKey')
        modes = data.get('modes', [])
        
        # Validate required fields
        if not all([provider_name, api_key, modes]):
            return jsonify({
                'error': 'Missing required fields'
            }), 400
        
        # Add provider to each selected mode
        for mode in modes:
            if mode in configs['modes']:
                configs['modes'][mode]['providers'][provider_name] = {
                    'api_key': api_key,
                }
        
        write_configs(configs)
        return jsonify({'success': True}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/delete-provider', methods=['POST'])
def delete_provider():
    try:
        data = request.json
        configs = read_configs()
        
        mode = data.get('mode')
        provider = data.get('provider')
        
        if mode in configs['modes'] and provider in configs['modes'][mode]['providers']:
            del configs['modes'][mode]['providers'][provider]
            write_configs(configs)
            return jsonify({'success': True}), 200
        
        return jsonify({'error': 'Provider not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/update-api-key', methods=['POST'])
def update_api_key():
    try:
        data = request.json
        configs = read_configs()
        
        mode = data.get('mode')
        provider = data.get('provider')
        new_key = data.get('apiKey')
        
        if not all([mode, provider, new_key]):
            return jsonify({'error': 'Missing required fields'}), 400
            
        if mode in configs['modes'] and provider in configs['modes'][mode]['providers']:
            configs['modes'][mode]['providers'][provider]['api_key'] = new_key
            write_configs(configs)
            return jsonify({'success': True}), 200
            
        return jsonify({'error': 'Provider not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/api/credentials', methods=['GET', 'POST'])
def api_credentials():
    if request.method == 'POST':
        new_credential = request.json
        configs = read_configs()
        mode = new_credential.get('mode')
        provider = new_credential.get('provider')
        if mode and provider:
            if mode not in configs['modes']:
                configs['modes'][mode] = {'providers': {}}
            if provider not in configs['modes'][mode]['providers']:
                configs['modes'][mode]['providers'][provider] = {'api_credentials': {}}
            configs['modes'][mode]['providers'][provider]['api_credentials'] = new_credential['credentials']
            write_configs(configs)
            return jsonify({'status': 'success'}), 201
        return jsonify({'status': 'error', 'message': 'Invalid data'}), 400
    else:
        configs = read_configs()
        return jsonify(configs)

@app.route('/get-configs', methods=['GET'])
def get_configs():
    try:
        configs = read_configs()
        return jsonify(configs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message')
        model = data.get('model', 'Auto')
        
        # Mock response without "Using model: " prefix
        response = {
            "response": f"{message}"  # Remove model info from response
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
