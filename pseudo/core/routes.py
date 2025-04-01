from flask import (
    Blueprint,
    jsonify,
    render_template,
    request,
    current_app,
    send_from_directory,
    send_file,
    g,
)
import os
import json
import uuid
import logging
from pathlib import Path
from werkzeug.utils import secure_filename

from pseudo.core.services.content_router import ContentRouter
from pseudo.core.services.media_manager import MediaManager
from pseudo.core.services.chat_history import ChatManager

# Set up logger
logger = logging.getLogger(__name__)

# Create blueprints
main_bp = Blueprint("main", __name__)
api_bp = Blueprint("api", __name__, url_prefix="/api")
settings_bp = Blueprint("settings", __name__, url_prefix="/settings")
chats_bp = Blueprint("chats", __name__, url_prefix="/chats")


def get_chat_manager():
    """Get or create chat manager instance from flask application context."""
    if "chat_manager" not in g:
        g.chat_manager = ChatManager()
    return g.chat_manager


# Main page route
@main_bp.route("/")
def index():
    return render_template("index.html")


# Route for accessing chat history media
@main_bp.route("/chat_history/<chat_id>/media/<path:filename>")
def chat_history_media(chat_id, filename):
    chat_manager = get_chat_manager()
    chat_media_path = chat_manager.base_dir / chat_id / "media"
    return send_from_directory(chat_media_path, filename)


# Route to download chat history media
@main_bp.route("/download/chat_history/<chat_id>/media/<path:filename>")
def download_chat_history_media(chat_id, filename):
    """Allow downloading chat history media files with proper content disposition."""
    chat_manager = get_chat_manager()
    chat_media_path = chat_manager.base_dir / chat_id / "media" / filename

    # Get file extension for MIME type
    _, ext = os.path.splitext(filename)
    mime_type = None

    # Set appropriate MIME type
    if ext.lower() in [".jpg", ".jpeg", ".png"]:
        mime_type = f"image/{ext[1:].lower()}"
    elif ext.lower() == ".mp3":
        mime_type = "audio/mpeg"
    elif ext.lower() == ".mp4":
        mime_type = "video/mp4"

    return send_file(
        chat_media_path, as_attachment=True, download_name=filename, mimetype=mime_type
    )


# API routes for chat
@api_bp.route("/chat", methods=["POST"])
def chat():
    """Process incoming chat message, route to appropriate AI provider, and return response."""
    try:
        data = request.json
        message = data.get("message")
        model_selection = data.get("model", "Auto")  #  Default to automatic model selection
        chat_id = data.get("chat_id")

        if not message:
            return jsonify({"error": "No message provided"}), 400

        # Initialize services
        router = ContentRouter()
        chat_manager = get_chat_manager()

        # Initialize chat if needed
        if not chat_id or not chat_manager.get_chat(chat_id):
            chat_id = chat_manager.create_new_chat(save=False)

        # Save user message to chat history
        user_message = {"role": "user", "content": message}
        chat_manager.add_message(chat_id, user_message)

        # Determine mode for message
        mode = router.select_mode(message)

        # Process the message based on detected mode
        response = router.process_content(mode, message)

        # Handle media if needed
        media_path = None
        response_obj = {"response": response, "selected_mode": mode, "chat_id": chat_id}

        if mode in ["image", "audio"]:
            # Get chat-specific media directory
            chat_media_dir = chat_manager.base_dir / chat_id / "media"
            chat_media_dir.mkdir(parents=True, exist_ok=True)

            # Save media directly to chat-specific directory only
            media_path = chat_manager.save_media(response, mode, chat_media_dir)
            if media_path:
                # Get filename for the URL
                filename = os.path.basename(media_path)

                # Create a proper URL path that will work with our routes
                url_path = f"/chat_history/{chat_id}/media/{filename}"

                # Create response object with media info
                response_obj = {
                    "type": mode,
                    "url": url_path,
                    "filename": filename,
                    "selected_mode": mode,
                    "chat_id": chat_id,
                    "response": "Generated content",  #  Just a placeholder for text display
                }

        # Save assistant response to chat history
        assistant_message = {"role": "assistant", "mode": mode}

        # Handle content based on type
        if isinstance(response, bytes):
            # Don't try to JSON serialize bytes
            assistant_message["content"] = "Generated content"
        elif isinstance(response, str):
            assistant_message["content"] = response
        else:
            # Try to serialize any other type
            try:
                assistant_message["content"] = json.dumps(response)
            except:
                assistant_message["content"] = str(response)

        # Pass media path for saving in chat history
        chat_manager.add_message(chat_id, assistant_message, media_path)

        # Return appropriate response format
        return jsonify(response_obj)

    except Exception as e:
        import traceback

        logger.error(f"Error in chat endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


# API route to get configuration
@api_bp.route("/configs", methods=["GET"])
def get_configs():
    try:
        router = ContentRouter()
        return jsonify(router.credentials)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# API route to load providers for settings page
@api_bp.route("/load_providers", methods=["GET"])
def load_providers():
    try:
        router = ContentRouter()
        providers_data = []

        # Convert credentials format to match what the settings page expects
        for mode, mode_data in router.credentials["modes"].items():
            for provider, provider_data in mode_data["providers"].items():
                # See if this provider is already in our list
                found = False
                for existing in providers_data:
                    if existing["provider"] == provider and existing[
                        "api_key"
                    ] == provider_data.get("api_key", ""):
                        if mode not in existing["modes"]:
                            existing["modes"].append(mode)
                        found = True
                        break

                if not found:
                    # Add new provider entry with all available information
                    provider_entry = {
                        "provider": provider,
                        "api_key": provider_data.get("api_key", ""),
                        "modes": [mode],
                        "models": provider_data.get("models", []),
                        "organization": provider_data.get("organization", ""),
                    }
                    providers_data.append(provider_entry)
                else:
                    # Update existing provider with additional information
                    for existing in providers_data:
                        if existing["provider"] == provider and existing[
                            "api_key"
                        ] == provider_data.get("api_key", ""):
                            # Add models if not already present
                            if "models" not in existing:
                                existing["models"] = provider_data.get("models", [])
                            # Add organization if not already present
                            if "organization" not in existing:
                                existing["organization"] = provider_data.get("organization", "")
                            break

        return jsonify({"success": True, "providers": providers_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# API route to save a provider
@api_bp.route("/save_provider", methods=["POST"])
def save_provider():
    try:
        data = request.json
        provider = data.get("provider")
        api_key = data.get("api_key")
        modes = data.get("modes")

        if not provider or not api_key or not modes:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        # Get current credentials - providers are processed in order they appear
        router = ContentRouter()
        credentials = router.credentials

        # Add or update provider in each mode
        # Note: The order of providers in credentials.json determines processing priority
        for mode in modes:
            if mode not in credentials["modes"]:
                credentials["modes"][mode] = {"providers": {}}

            if provider not in credentials["modes"][mode]["providers"]:
                credentials["modes"][mode]["providers"][provider] = {}

            # Set API key
            credentials["modes"][mode]["providers"][provider]["api_key"] = api_key

            # Set organization for OpenAI if not already set
            if (
                provider == "openai"
                and "organization" not in credentials["modes"][mode]["providers"][provider]
            ):
                credentials["modes"][mode]["providers"][provider]["organization"] = ""

            # Ensure there's a models array - preserve existing models if any
            # Note: Models are processed left to right in the order they appear in the array
            if (
                "models" not in credentials["modes"][mode]["providers"][provider]
                or not credentials["modes"][mode]["providers"][provider]["models"]
            ):
                # Set initial models based on provider and mode
                # The order here matters - first model in the list will be tried first
                if provider == "openai" and mode == "text":
                    credentials["modes"][mode]["providers"][provider]["models"] = [
                        "gpt-4",
                        "gpt-3.5-turbo",
                    ]
                elif provider == "openai" and mode == "image":
                    credentials["modes"][mode]["providers"][provider]["models"] = ["dall-e-3"]
                elif provider == "anthropic":
                    credentials["modes"][mode]["providers"][provider]["models"] = [
                        "claude-3-opus-20240229",
                        "claude-3-sonnet-20240229",
                    ]
                elif provider == "stability":
                    credentials["modes"][mode]["providers"][provider]["models"] = [
                        "stable-diffusion-xl-1024-v1-0"
                    ]
                elif provider == "elevenlabs":
                    credentials["modes"][mode]["providers"][provider]["models"] = [
                        "eleven_multilingual_v2"
                    ]
                elif provider == "ollama":
                    credentials["modes"][mode]["providers"][provider]["models"] = ["llama2"]
                else:
                    credentials["modes"][mode]["providers"][provider]["models"] = []

        # Save updated credentials - order of providers and models in file matters for processing priority
        router.save_credentials(credentials)

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# API route to update a provider's API key
@api_bp.route("/update_provider", methods=["POST"])
def update_provider():
    try:
        data = request.json
        provider = data.get("provider")
        old_api_key = data.get("old_api_key")
        new_api_key = data.get("new_api_key")
        mode = data.get("mode")
        organization = data.get("organization")
        modes = data.get("modes", [mode])  # Default to current mode if not specified

        if not provider or not old_api_key or not new_api_key or not mode:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        # Get current credentials
        router = ContentRouter()
        credentials = router.credentials

        # Update the provider in each selected mode
        for selected_mode in modes:
            if selected_mode in credentials["modes"]:
                if provider in credentials["modes"][selected_mode]["providers"]:
                    # Update API key
                    credentials["modes"][selected_mode]["providers"][provider]["api_key"] = (
                        new_api_key
                    )

                    # Update organization if provided
                    if organization is not None:
                        credentials["modes"][selected_mode]["providers"][provider][
                            "organization"
                        ] = organization

                    # Preserve existing models
                    if "models" not in credentials["modes"][selected_mode]["providers"][provider]:
                        # Set default models based on provider and mode
                        if provider == "openai" and selected_mode == "text":
                            credentials["modes"][selected_mode]["providers"][provider]["models"] = [
                                "gpt-4",
                                "gpt-3.5-turbo",
                            ]
                        elif provider == "openai" and selected_mode == "image":
                            credentials["modes"][selected_mode]["providers"][provider]["models"] = [
                                "dall-e-3"
                            ]
                        elif provider == "anthropic":
                            credentials["modes"][selected_mode]["providers"][provider]["models"] = [
                                "claude-3-opus-20240229",
                                "claude-3-sonnet-20240229",
                            ]
                        elif provider == "stability":
                            credentials["modes"][selected_mode]["providers"][provider]["models"] = [
                                "stable-diffusion-xl-1024-v1-0"
                            ]
                        elif provider == "elevenlabs":
                            credentials["modes"][selected_mode]["providers"][provider]["models"] = [
                                "eleven_multilingual_v2"
                            ]
                        elif provider == "ollama":
                            credentials["modes"][selected_mode]["providers"][provider]["models"] = [
                                "llama2"
                            ]
                        else:
                            credentials["modes"][selected_mode]["providers"][provider][
                                "models"
                            ] = []

        # Save updated credentials
        router.save_credentials(credentials)

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# API route to delete a provider
@api_bp.route("/delete_provider", methods=["POST"])
def delete_provider():
    try:
        data = request.json
        provider = data.get("provider")
        mode = data.get("mode")

        if not provider or not mode:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        # Get current credentials
        router = ContentRouter()
        credentials = router.credentials

        # Delete the provider for the specific mode
        if mode in credentials["modes"] and provider in credentials["modes"][mode]["providers"]:
            del credentials["modes"][mode]["providers"][provider]
        else:
            return jsonify(
                {"success": False, "error": f"Provider {provider} not found in {mode} mode"}
            ), 404

        # Save updated credentials
        router.save_credentials(credentials)

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# API routes for chat history
@api_bp.route("/chats", methods=["GET"])
def get_chats():
    try:
        chat_manager = get_chat_manager()
        chats = chat_manager.get_all_chats()
        return jsonify({"chats": chats})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/chats/<chat_id>", methods=["GET"])
def get_chat(chat_id):
    try:
        chat_manager = get_chat_manager()
        chat = chat_manager.get_chat(chat_id)
        if not chat:
            return jsonify({"error": "Chat not found"}), 404
        return jsonify(chat)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/chats/new", methods=["POST"])
def create_chat():
    try:
        chat_manager = get_chat_manager()
        chat_id = chat_manager.create_new_chat(save=True)
        return jsonify({"chat_id": chat_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/chats/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    try:
        chat_manager = get_chat_manager()
        if chat_manager.delete_chat(chat_id):
            return jsonify({"success": True})
        return jsonify({"error": "Failed to delete chat"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Settings page route
@settings_bp.route("/", methods=["GET"])
def settings():
    return render_template("settings.html")


# API route to update provider models
@api_bp.route("/update_provider_models", methods=["POST"])
def update_provider_models():
    try:
        data = request.json
        provider = data.get("provider")
        mode = data.get("mode")
        models = data.get("models", [])

        if not provider or not mode:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        # Get current credentials
        router = ContentRouter()
        credentials = router.credentials

        # Update models for the provider in the specified mode
        if mode in credentials["modes"] and provider in credentials["modes"][mode]["providers"]:
            credentials["modes"][mode]["providers"][provider]["models"] = models
        else:
            return jsonify(
                {"success": False, "error": f"Provider {provider} not found in {mode} mode"}
            ), 404

        # Save updated credentials
        router.save_credentials(credentials)

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def register_routes(app):
    """Register all application routes."""
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(chats_bp)

    @app.teardown_appcontext
    def teardown_chat_manager(exception):
        # No specific teardown needed for ChatManager
        pass
