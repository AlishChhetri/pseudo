"""Pseudo AI Content Routing Package."""

import os
import importlib.metadata
import logging
import shutil
from pathlib import Path
import json

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

__version__ = importlib.metadata.version("pseudo")

def get_correct_chat_history_path(base_dir=None):
    """Get the correct chat history path from config or environment."""
    if base_dir:
        return Path(base_dir)
    
    # Get the base directory for the project
    project_root = Path(__file__).parent.parent
    
    # Try to get from environment first
    env_path = os.environ.get("CHAT_HISTORY_DIR")
    if env_path:
        return Path(env_path)
    
    # Use the default path at project root
    return project_root / "chat_history"

def migrate_chat_history(cleanup=True):
    """Migrate chat history from old location to new location if needed."""
    # The incorrect path that was being used
    old_chat_dir = Path(__file__).parent / "chat_history"
    
    # The correct path at project root
    new_chat_dir = get_correct_chat_history_path()
    
    # Check if old directory exists and has content
    if old_chat_dir.exists() and next(old_chat_dir.glob("*"), None) is not None:
        logging.info(f"Found old chat history directory at {old_chat_dir}")
        
        # Create the new directory if it doesn't exist
        new_chat_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy the history file first if it exists
        old_history_file = old_chat_dir / "history.json"
        new_history_file = new_chat_dir / "history.json"
        
        if old_history_file.exists() and not new_history_file.exists():
            shutil.copy2(old_history_file, new_history_file)
            logging.info(f"Migrated history.json to {new_history_file}")
        
        # Copy all chat directories that don't already exist in the new location
        for chat_dir in old_chat_dir.glob("*"):
            if chat_dir.is_dir() and not (new_chat_dir / chat_dir.name).exists():
                # Use copytree to copy the entire directory
                shutil.copytree(chat_dir, new_chat_dir / chat_dir.name)
                logging.info(f"Migrated chat {chat_dir.name} to {new_chat_dir}")
        
        logging.info("Chat history migration completed")
        
        # Cleanup old directory if requested
        if cleanup:
            try:
                # Remove all files in old directory
                for item in old_chat_dir.glob("**/*"):
                    if item.is_file():
                        item.unlink()
                
                # Remove all subdirectories
                for item in old_chat_dir.glob("*"):
                    if item.is_dir():
                        shutil.rmtree(item)
                
                # Remove the old history.json
                if old_history_file.exists():
                    old_history_file.unlink()
                
                # Leave the empty directory as a placeholder with a readme
                readme_path = old_chat_dir / "README.txt"
                with open(readme_path, "w") as f:
                    f.write(f"Chat history has been migrated to: {new_chat_dir}\n")
                    f.write("This directory is no longer used.\n")
                
                logging.info(f"Cleaned up old chat history directory and left README at {readme_path}")
            except Exception as e:
                logging.error(f"Error during cleanup of old directory: {e}")

def clean_history_files():
    """Clean up history.json files to remove unused fields."""
    # Get the correct chat history path
    chat_dir = get_correct_chat_history_path()
    
    # Check if history.json exists
    history_file = chat_dir / "history.json"
    if history_file.exists():
        try:
            # Load existing history
            with open(history_file, "r") as f:
                history = json.load(f)
            
            # Remove global updated_at field if it exists
            if "updated_at" in history:
                del history["updated_at"]
                logging.info("Removed global updated_at field from history.json")
            
            # Remove message_count from each chat entry
            changed = False
            for chat in history.get("chats", []):
                if "message_count" in chat:
                    del chat["message_count"]
                    changed = True
            
            if changed:
                logging.info("Removed message_count fields from chat entries")
            
            # Save the updated history
            with open(history_file, "w") as f:
                json.dump(history, f, indent=2)
            
            logging.info(f"Cleaned up history file at {history_file}")
        except Exception as e:
            logging.error(f"Error cleaning history file: {e}")
    
    # Also check all individual chat metadata files
    for chat_dir in (chat_dir).glob("*"):
        if chat_dir.is_dir() and not chat_dir.name.startswith('.'):
            metadata_file = chat_dir / "metadata.json"
            if metadata_file.exists():
                try:
                    # Load existing metadata
                    with open(metadata_file, "r") as f:
                        metadata = json.load(f)
                    
                    # Remove message_count if it exists
                    if "message_count" in metadata:
                        del metadata["message_count"]
                        
                        # Save the updated metadata
                        with open(metadata_file, "w") as f:
                            json.dump(metadata, f, indent=2)
                        
                        logging.info(f"Cleaned up metadata file at {metadata_file}")
                except Exception as e:
                    logging.error(f"Error cleaning metadata file {metadata_file}: {e}")

def main():
    """Run the Pseudo application."""
    # Migrate old chat history if needed
    migrate_chat_history()
    
    # Clean up history files to remove unused fields
    clean_history_files()
    
    # Only import app when needed to avoid circular imports
    from pseudo.core.app import main as run_app
    
    # Run the application
    run_app()

if __name__ == "__main__":
    main()
