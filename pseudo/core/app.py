"""Flask application setup and entry point."""

import os
from pathlib import Path
from flask import Flask

from pseudo.core.config import Config
from pseudo.core.routes import register_routes


def create_app() -> Flask:
    """Create and configure the Flask application instance."""
    # Create Flask app with proper static and template folders
    app = Flask(
        __name__,
        static_folder=Path(__file__).parent.parent / "app" / "static",
        template_folder=Path(__file__).parent.parent / "app" / "templates",
    )

    # Load configuration from config module
    app.config.from_object(Config)

    # Ensure required directories exist for storage
    chat_history_dir = Path(app.config["CHAT_HISTORY_DIR"])
    chat_history_dir.mkdir(exist_ok=True, parents=True)  #  Create directory if it doesn't exist

    # Register all routes from routes module
    register_routes(app)

    # Print debug information if in debug mode
    if app.debug:
        print("\nConfiguration:")
        print(f"Chat history directory: {app.config['CHAT_HISTORY_DIR']}")
        print(f"Template folder: {app.template_folder}")
        print(f"Static folder: {app.static_folder}")

    return app


def main() -> None:
    """Run the application with settings from environment variables."""
    # Create the Flask application
    app = create_app()

    # Get server configuration from environment variables
    host = os.environ.get("FLASK_HOST", "0.0.0.0")  #  Default host to all interfaces
    port = int(os.environ.get("FLASK_PORT", 5000))  #  Default port for development
    debug = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1", "t")  #  Debug mode toggle

    # Display startup information
    print(f"Starting Pseudo application on http://{host}:{port}")
    print(f"Chat history: {app.config['CHAT_HISTORY_DIR']}")

    # Start the Flask development server
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    main()
