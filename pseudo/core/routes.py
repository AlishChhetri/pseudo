from flask import Blueprint, jsonify, render_template, request, current_app, send_from_directory, send_file, g
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
main_bp = Blueprint('main', __name__)
api_bp = Blueprint('api', __name__, url_prefix='/api')
settings_bp = Blueprint('settings', __name__, url_prefix='/settings')
chats_bp = Blueprint('chats', __name__, url_prefix='/chats')

# Ensure chat manager is available in app context
def get_chat_manager():
    if 'chat_manager' not in g:
        g.chat_manager = ChatManager()
    return g.chat_manager

# Main page route
@main_bp.route('/')
def index():
    return render_template('index.html')

# Media files route
@main_bp.route('/media/<path:filename>')
def media_file(filename):
    return send_from_directory(current_app.config['MEDIA_FOLDER'], filename)

# Route for accessing chat history media
@main_bp.route('/chat_history/<chat_id>/media/<path:filename>')
def chat_history_media(chat_id, filename):
    chat_manager = get_chat_manager()
    chat_media_path = chat_manager.base_dir / chat_id / "media"
    return send_from_directory(chat_media_path, filename)

# Route to download media files
@main_bp.route('/download/<path:filename>')
def download_file(filename):
    """Allow downloading media files with proper content disposition."""
    media_folder = current_app.config['MEDIA_FOLDER']
    file_path = Path(media_folder) / filename
    
    # Get file extension for MIME type
    _, ext = os.path.splitext(filename)
    mime_type = None
    
    # Set appropriate MIME type
    if ext.lower() in ['.jpg', '.jpeg', '.png']:
        mime_type = f'image/{ext[1:].lower()}'
    elif ext.lower() == '.mp3':
        mime_type = 'audio/mpeg'
    elif ext.lower() == '.mp4':
        mime_type = 'video/mp4'
    
    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        mimetype=mime_type
    )

# Route to download chat history media
@main_bp.route('/download/chat_history/<chat_id>/media/<path:filename>')
def download_chat_history_media(chat_id, filename):
    """Allow downloading chat history media files with proper content disposition."""
    chat_manager = get_chat_manager()
    chat_media_path = chat_manager.base_dir / chat_id / "media" / filename
    
    # Get file extension for MIME type
    _, ext = os.path.splitext(filename)
    mime_type = None
    
    # Set appropriate MIME type
    if ext.lower() in ['.jpg', '.jpeg', '.png']:
        mime_type = f'image/{ext[1:].lower()}'
    elif ext.lower() == '.mp3':
        mime_type = 'audio/mpeg'
    elif ext.lower() == '.mp4':
        mime_type = 'video/mp4'
    
    return send_file(
        chat_media_path,
        as_attachment=True,
        download_name=filename,
        mimetype=mime_type
    )

# API routes for chat
@api_bp.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message')
        model_selection = data.get('model', 'Auto')
        chat_id = data.get('chat_id')
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Initialize services
        router = ContentRouter()
        media_manager = MediaManager()
        chat_manager = get_chat_manager()
        
        # Initialize chat if needed
        if not chat_id or not chat_manager.get_chat(chat_id):
            chat_id = chat_manager.create_new_chat(save=False)
        
        # Save user message to chat history
        user_message = {
            'role': 'user',
            'content': message
        }
        chat_manager.add_message(chat_id, user_message)
        
        # Determine mode for message
        mode = router.select_mode(message)
        
        # Process the message based on detected mode
        response = router.process_content(mode, message)
        
        # Handle media if needed
        media_path = None
        response_obj = response  # Default is to use the original response
        
        if mode in ['image', 'audio']:
            media_path = media_manager.save_media(response, mode)
            if media_path:
                # Get filename for the URL
                filename = os.path.basename(media_path)
                
                # Create a proper URL path that will work with our routes
                url_path = f'/media/{filename}'
                
                # Create response object with media info
                response_obj = {
                    'type': mode,
                    'path': url_path,
                    'filename': filename
                }
        
        # Save assistant response to chat history
        assistant_message = {
            'role': 'assistant',
            'content': response_obj if isinstance(response_obj, str) else json.dumps(response_obj),
            'mode': mode
        }
        
        # Pass media path for saving in chat history
        chat_manager.add_message(chat_id, assistant_message, media_path)
        
        return jsonify({
            'response': response_obj,
            'selected_mode': mode,
            'chat_id': chat_id
        })
        
    except Exception as e:
        import traceback
        logger.error(f"Error in chat endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# API route to get configuration
@api_bp.route('/configs', methods=['GET'])
def get_configs():
    try:
        router = ContentRouter()
        return jsonify(router.credentials)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API routes for chat history
@api_bp.route('/chats', methods=['GET'])
def get_chats():
    try:
        chat_manager = get_chat_manager()
        chats = chat_manager.get_all_chats()
        return jsonify({'chats': chats})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/chats/<chat_id>', methods=['GET'])
def get_chat(chat_id):
    try:
        chat_manager = get_chat_manager()
        chat = chat_manager.get_chat(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        return jsonify(chat)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/chats/new', methods=['POST'])
def create_chat():
    try:
        chat_manager = get_chat_manager()
        chat_id = chat_manager.create_new_chat(save=True)
        return jsonify({'chat_id': chat_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/chats/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    try:
        chat_manager = get_chat_manager()
        if chat_manager.delete_chat(chat_id):
            return jsonify({'success': True})
        return jsonify({'error': 'Failed to delete chat'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Settings page route
@settings_bp.route('/', methods=['GET'])
def settings():
    return render_template('settings.html')

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