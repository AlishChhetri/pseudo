import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union

from flask import (
    Blueprint,
    g,
    jsonify,
    render_template,
    request,
    send_file,
    send_from_directory,
)

from pseudo.core.services.chat_history import ChatManager
from pseudo.core.services.content_router import ContentRouter
from pseudo.core.services.media_manager import MediaManager

# Set up logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create blueprints
main_bp = Blueprint("main", __name__)
api_bp = Blueprint("api", __name__, url_prefix="/api")
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
        data.get("model", "Auto")  #  Default to automatic model selection
        chat_id = data.get("chat_id")

        if not message:
            return jsonify({"error": "No message provided"}), 400

        # Initialize services
        router = ContentRouter()
        chat_manager = get_chat_manager()

        # Initialize chat if needed
        if not chat_id or not chat_manager.get_chat(chat_id):
            chat_id = chat_manager.create_new_chat(save=True)

        # Save original user message to chat history
        user_message = {"role": "user", "content": message}
        chat_manager.add_message(chat_id, user_message)

        # Determine mode and clean content in one step
        mode, cleaned_content = router.select_mode_and_clean_content(message)

        # For debugging
        logger.info(f"Original input: '{message}'")
        logger.info(f"Detected mode: {mode}")
        logger.info(f"Cleaned content: '{cleaned_content}'")

        # Process the message based on detected mode and cleaned content
        response_data = router.process_content(mode, cleaned_content)
        
        # Extract response, provider and model information
        provider = None
        model = None
        
        if isinstance(response_data, dict):
            # New format with provider and model included
            provider = response_data.get("provider")
            model = response_data.get("model")
            
            # Extract the actual response content
            if "content" in response_data:
                response = response_data["content"]
            else:
                # If for some reason there's no content key, use the whole response
                response = response_data
        else:
            # Legacy format, response is directly returned
            response = response_data
            
        # Handle media if needed
        media_path = None
        response_obj = {
            "response": response if isinstance(response, str) else "Generated content",
            "selected_mode": mode,
            "chat_id": chat_id,
            "original_input": message,
            "cleaned_content": cleaned_content,
            "provider": provider,
            "model": model
        }

        if mode in ["image", "audio"]:
            # Get chat-specific media directory
            chat_media_dir = chat_manager.base_dir / chat_id / "media"
            chat_media_dir.mkdir(parents=True, exist_ok=True)

            # Save media directly to chat-specific directory only
            # Extract the actual response content for media
            media_content = response if not isinstance(response_data, dict) or "content" not in response_data else response_data["content"]
            media_path = chat_manager.save_media(media_content, mode, chat_media_dir)
            
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
                    "response": "Generated content",  # Just a placeholder for text display
                    "original_input": message,
                    "cleaned_content": cleaned_content,
                    "provider": provider,
                    "model": model
                }

        # Save assistant response to chat history
        assistant_message = {
            "role": "assistant",
            "mode": mode,
            "original_input": message,
            "cleaned_content": cleaned_content,
            "provider": provider,
            "model": model
        }

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
            except Exception:
                assistant_message["content"] = str(response)

        # Pass media path for saving in chat history
        # This will save the media filename in the message object
        chat_manager.add_message(chat_id, assistant_message, media_path)
        
        # Get the chat metadata to extract the title
        chat_data = chat_manager.get_chat(chat_id)
        if chat_data and "title" in chat_data:
            response_obj["title"] = chat_data["title"]
        
        # Update the title in the response
        if "title" not in response_obj or not response_obj["title"]:
            # Use the first few words of the user message as the title
            title = message.strip()
            if len(title) > 30:
                title = title[:30] + "..."
            response_obj["title"] = title

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


# API route to get models for dropdown
@api_bp.route("/models", methods=["GET"])
def get_models():
    try:
        router = ContentRouter()
        return jsonify({"modes": router.credentials["modes"]})
    except Exception as e:
        logger.error(f"Error fetching models: {str(e)}")
        return jsonify({"error": str(e)}), 500


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


def register_routes(app):
    """Register all application routes."""
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(chats_bp)

    @app.teardown_appcontext
    def teardown_chat_manager(exception):
        # No specific teardown needed for ChatManager
        pass
