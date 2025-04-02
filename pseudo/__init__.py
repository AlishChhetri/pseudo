"""Pseudo - Smart content router for AI models."""

__version__ = "0.1.0"


# Entry point for poetry script
def main() -> None:
    """Run the application using the core app module."""
    from pseudo.core.app import main as app_main
    app_main()


if __name__ == "__main__":
    main()
