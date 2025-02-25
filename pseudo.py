from flask import Flask, render_template, request, jsonify
import json
import os

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
                "translation": {"providers": {}}
            }
        }
        write_configs(initial_config)
        return initial_config

def write_configs(configs):
    with open(CONFIG_FILE, 'w') as file:
        json.dump(configs, file, indent=4)

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

if __name__ == '__main__':
    app.run(debug=True)
