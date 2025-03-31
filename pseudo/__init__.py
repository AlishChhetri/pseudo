"""Pseudo - Smart content router for AI models."""

__version__ = "0.1.0"


# Entry point for poetry script
def main():
    """Entry point for the application."""
    from pseudo.core.app import main as app_main

    app_main()
