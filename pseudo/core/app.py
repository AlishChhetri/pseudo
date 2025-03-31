import os
from pathlib import Path
from flask import Flask

from pseudo.core.config import Config
from pseudo.core.routes import register_routes


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__,
                static_folder=Path(__file__).parent.parent / "app" / "static",
                template_folder=Path(__file__).parent.parent / "app" / "templates")
    
    # Load configuration
    app.config.from_object('pseudo.core.config')
    
    # Ensure required directories exist
    chat_history_dir = Path(app.config['CHAT_HISTORY_DIR'])
    chat_history_dir.mkdir(exist_ok=True, parents=True)
    
    # Register routes
    register_routes(app)
    
    # Print configuration for debugging
    if app.debug:
        print("\nConfiguration:")
        print(f"Chat history directory: {app.config['CHAT_HISTORY_DIR']}")
        print(f"Template folder: {app.template_folder}")
        print(f"Static folder: {app.static_folder}")
    
    return app


def main():
    """Run the application."""
    app = create_app()
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    
    print(f"Starting Pseudo application on http://{host}:{port}")
    print(f"Chat history: {app.config['CHAT_HISTORY_DIR']}")
    
    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    main() 