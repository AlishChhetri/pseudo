from flask import Flask, render_template, request, jsonify
from datetime import datetime
import json
import os
import sys
from static.auto import select_mode, get_provider_response, init_ollama_model
from static.save_media import MediaManager

app = Flask(__name__)
media_manager = MediaManager()

CONFIG_FILE = "credentials.json"


# Replace @app.before_first_request with proper initialization
def init_app():
    """Initialize the application"""
    if not init_ollama_model():
        print(
            "Warning: Model initialization failed. Some features may not work properly."
        )


# Create blueprint to handle initialization
from flask import Blueprint

init_blueprint = Blueprint("init", __name__)


@init_blueprint.record_once
def on_registered(state):
    init_app()


app.register_blueprint(init_blueprint)


def read_configs():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as file:
            return json.load(file)
    else:
        initial_config = {
            "modes": {
                "text": {"providers": {}},
                "image": {"providers": {}},
                "audio": {"providers": {}},
            }
        }
        write_configs(initial_config)
        return initial_config


def write_configs(configs):
    with open(CONFIG_FILE, "w") as file:
        json.dump(configs, file, indent=4)


@app.route("/save-config", methods=["POST"])
def save_config():
    try:
        data = request.json
        configs = read_configs()

        provider_name = data.get("provider")
        api_key = data.get("apiKey")
        modes = data.get("modes", [])

        # Validate required fields
        if not all([provider_name, api_key, modes]):
            return jsonify({"error": "Missing required fields"}), 400

        # Add provider to each selected mode
        for mode in modes:
            if mode in configs["modes"]:
                configs["modes"][mode]["providers"][provider_name] = {
                    "api_key": api_key,
                }

        write_configs(configs)
        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/delete-provider", methods=["POST"])
def delete_provider():
    try:
        data = request.json
        configs = read_configs()

        mode = data.get("mode")
        provider = data.get("provider")

        if mode in configs["modes"] and provider in configs["modes"][mode]["providers"]:
            del configs["modes"][mode]["providers"][provider]
            write_configs(configs)
            return jsonify({"success": True}), 200

        return jsonify({"error": "Provider not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/update-api-key", methods=["POST"])
def update_api_key():
    try:
        data = request.json
        configs = read_configs()

        mode = data.get("mode")
        provider = data.get("provider")
        new_key = data.get("apiKey")

        if not all([mode, provider, new_key]):
            return jsonify({"error": "Missing required fields"}), 400

        if mode in configs["modes"] and provider in configs["modes"][mode]["providers"]:
            configs["modes"][mode]["providers"][provider]["api_key"] = new_key
            write_configs(configs)
            return jsonify({"success": True}), 200

        return jsonify({"error": "Provider not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


@app.route("/api/credentials", methods=["GET", "POST"])
def api_credentials():
    if request.method == "POST":
        new_credential = request.json
        configs = read_configs()
        mode = new_credential.get("mode")
        provider = new_credential.get("provider")
        if mode and provider:
            if mode not in configs["modes"]:
                configs["modes"][mode] = {"providers": {}}
            if provider not in configs["modes"][mode]["providers"]:
                configs["modes"][mode]["providers"][provider] = {"api_credentials": {}}
            configs["modes"][mode]["providers"][provider]["api_credentials"] = (
                new_credential["credentials"]
            )
            write_configs(configs)
            return jsonify({"status": "success"}), 201
        return jsonify({"status": "error", "message": "Invalid data"}), 400
    else:
        configs = read_configs()
        return jsonify(configs)


@app.route("/get-configs", methods=["GET"])
def get_configs():
    try:
        configs = read_configs()
        return jsonify(configs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.json
        message = data.get("message")
        model_selection = data.get("model", "Auto")

        # Determine mode for this message
        mode = select_mode(message)
        print(f"Selected mode: {mode}")

        # Get response using detected mode
        try:
            if model_selection == "Auto":
                response = get_provider_response(mode, message)
            else:
                provider, model = model_selection.split("/")
                response = get_provider_response(mode, message, provider, model)

            if not response:
                raise Exception(f"No response received for {mode} mode")

            # Handle media if needed
            if mode in ["image", "audio"]:
                media_path = media_manager.save_media(response, mode)
                if media_path:
                    response = {"type": mode, "path": media_path}

            return jsonify({"response": response, "selected_mode": mode}), 200

        except Exception as e:
            print(f"Provider error: {e}")
            return jsonify({"error": str(e)}), 500

    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    try:
        print("Initializing Pseudo...")

        # Initialize system
        if not init_ollama_model():
            print("Error: Could not initialize required components.")
            sys.exit(1)

        print("\nStarting Pseudo server...")
        app.run(debug=True)

    except KeyboardInterrupt:
        print("\nShutting down Pseudo...")
    except Exception as e:
        print(f"Error starting Pseudo: {e}")
        sys.exit(1)
