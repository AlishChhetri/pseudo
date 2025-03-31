import os
from pathlib import Path
from flask import Flask

from pseudo.core.config import Config
from pseudo.core.routes import register_routes


def create_app(config_class=Config):
    """Create and configure the Flask application."""
    app = Flask(__name__, 
                static_folder=Path(__file__).parent.parent / "app" / "static",
                template_folder=Path(__file__).parent.parent / "app" / "templates")
    
    app.config.from_object(config_class)
    
    # Create required directories
    media_folder = Path(app.config['MEDIA_FOLDER'])
    media_folder.mkdir(exist_ok=True, parents=True)
    (media_folder / 'images').mkdir(exist_ok=True)
    (media_folder / 'audio').mkdir(exist_ok=True)
    
    # Create chat history directory
    chat_history_dir = Path(app.config['CHAT_HISTORY_DIR'])
    chat_history_dir.mkdir(exist_ok=True, parents=True)
    (chat_history_dir / 'history.json').touch(exist_ok=True)
    
    # Register blueprint routes
    register_routes(app)
    
    return app


def main():
    """Run the application."""
    app = create_app()
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    
    print(f"Starting Pseudo application on http://{host}:{port}")
    print(f"Media folder: {app.config['MEDIA_FOLDER']}")
    print(f"Chat history: {app.config['CHAT_HISTORY_DIR']}")
    
    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    main() 