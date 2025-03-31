"""
Pseudo - Smart content router for AI models

This package provides a universal interface to route user prompts to the appropriate
AI content generation mode (text, image, or audio) using the APICenter library.
"""

__version__ = "0.1.0"

# Entry point for poetry script
def main():
    """Entry point for the application."""
    from pseudo.core.app import main as app_main
    app_main() 