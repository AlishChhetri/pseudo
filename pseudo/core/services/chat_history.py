"""Chat history management system for Pseudo."""

import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union

from flask import current_app

logger = logging.getLogger(__name__)


class ChatManager:
    """Manages chat history storage, retrieval, and media organization.

    This class provides methods for creating, retrieving, updating, and deleting
    chat sessions, as well as saving associated media files. It maintains both a
    global index of all chats and individual metadata files for each chat.

    The chat history structure uses a directory-based approach where each chat
    has its own directory containing a metadata file and a media subdirectory.
    """

    def __init__(self, base_dir: Optional[Path] = None):
        """Initialize chat manager with base directory for storage."""
        if base_dir:
            self.base_dir = Path(base_dir)
        else:
            # Try to get the directory from Flask app config
            try:
                self.base_dir = Path(current_app.config["CHAT_HISTORY_DIR"])
            except RuntimeError:
                # We're not in a Flask context, use environment variable or default
                self.base_dir = Path(
                    os.environ.get(
                        "CHAT_HISTORY_DIR",
                        Path(__file__).parent.parent.parent.parent / "chat_history",
                    )
                )
                logger.info(f"Not in Flask context, using chat history dir: {self.base_dir}")

        # Create base directory if it doesn't exist
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Chat history directory set to: {self.base_dir}")

        # Initialize or load the global history tracker
        self.history_file = self.base_dir / "history.json"
        self.history = self._load_history()

    def _load_history(self) -> Dict:
        """Load or create the global history tracker.

        Returns:
            Dict: The history data structure with chat metadata.

        The history.json file contains a minimal representation of all chats
        for quick loading in the UI. It doesn't contain the full messages, just
        enough metadata to display in the sidebar.
        """
        if self.history_file.exists():
            try:
                with open(self.history_file, "r") as f:
                    history = json.load(f)

                    # Remove global updated_at if it exists
                    if "updated_at" in history:
                        del history["updated_at"]

                    # Remove message_count from each chat entry
                    for chat in history.get("chats", []):
                        if "message_count" in chat:
                            del chat["message_count"]

                    return history
            except Exception as e:
                logger.error(f"Error loading history: {str(e)}")

        # Create default history structure (without updated_at)
        default_history = {"chats": []}

        # Save default history
        with open(self.history_file, "w") as f:
            json.dump(default_history, f, indent=2)

        return default_history

    def _save_history(self) -> bool:
        """Save the current history to disk."""
        try:
            # Remove global updated_at if it exists
            if "updated_at" in self.history:
                del self.history["updated_at"]

            with open(self.history_file, "w") as f:
                json.dump(self.history, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving history: {str(e)}")
            return False

    def create_new_chat(self, save: bool = True) -> str:
        """Create a new chat with a unique ID.

        Args:
            save: Whether to immediately save the chat to disk.

        Returns:
            str: The unique ID of the new chat.

        This method:
        1. Generates a UUID for the chat
        2. Creates the chat directory structure
        3. Initializes metadata with default values
        4. Adds the chat to the global history index
        """
        # Generate a unique ID for the chat
        chat_id = str(uuid.uuid4())

        # Create chat directory if needed
        if save:
            chat_dir = self.base_dir / chat_id
            chat_dir.mkdir(parents=True, exist_ok=True)

            # Create media subdirectory
            media_dir = chat_dir / "media"
            media_dir.mkdir(exist_ok=True)

            # Initialize metadata
            timestamp = datetime.now().isoformat()

            metadata = {
                "id": chat_id,
                "title": "New Chat",  # Default title
                "created_at": timestamp,
                "updated_at": timestamp,
                "messages": [],
            }

            # Add to global history
            chat_summary = {
                "id": chat_id,
                "title": "New Chat",
                "created_at": timestamp,
                "updated_at": timestamp,
            }

            # Add to the beginning (most recent first)
            self.history["chats"].insert(0, chat_summary)
            self._save_history()

            # Save metadata
            with open(chat_dir / "metadata.json", "w") as f:
                json.dump(metadata, f, indent=2)

        return chat_id

    def get_chat(self, chat_id: str) -> Optional[Dict]:
        """Get chat data for a specific chat ID."""
        chat_dir = self.base_dir / chat_id
        metadata_file = chat_dir / "metadata.json"

        if not metadata_file.exists():
            return None

        try:
            with open(metadata_file, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading chat {chat_id}: {str(e)}")
            return None

    def get_all_chats(self) -> List[Dict]:
        """Get metadata for all available chats in order of most recently updated."""
        # First, check if our history file is synced with actual directories
        self._sync_history_with_filesystem()

        # Return the chats from history (already sorted)
        return self.history["chats"]

    def _sync_history_with_filesystem(self):
        """Synchronize history with actual filesystem to ensure consistency."""
        existing_chat_ids = set()
        updated = False

        # Scan actual directory structure
        for chat_dir in self.base_dir.iterdir():
            if chat_dir.is_dir() and not chat_dir.name.startswith("."):
                chat_id = chat_dir.name

                # Skip the .git directory and other hidden files
                if chat_id == ".git" or chat_id.startswith("."):
                    continue

                existing_chat_ids.add(chat_id)
                metadata_file = chat_dir / "metadata.json"

                # Check if this chat exists in history
                chat_in_history = next(
                    (chat for chat in self.history["chats"] if chat["id"] == chat_id), None
                )

                if metadata_file.exists():
                    try:
                        with open(metadata_file, "r") as f:
                            metadata = json.load(f)

                        # If chat doesn't exist in history, add it
                        if not chat_in_history:
                            chat_summary = {
                                "id": chat_id,
                                "title": metadata.get("title", "Untitled Chat"),
                                "created_at": metadata.get(
                                    "created_at", datetime.now().isoformat()
                                ),
                                "updated_at": metadata.get(
                                    "updated_at", datetime.now().isoformat()
                                ),
                            }
                            self.history["chats"].append(chat_summary)
                            updated = True
                        # If it exists but metadata is newer, update it
                        elif chat_in_history and metadata.get(
                            "updated_at", ""
                        ) > chat_in_history.get("updated_at", ""):
                            chat_in_history["title"] = metadata.get("title", "Untitled Chat")
                            chat_in_history["updated_at"] = metadata.get("updated_at")
                            updated = True
                    except Exception as e:
                        logger.error(f"Error syncing chat {chat_id}: {str(e)}")

        # Remove chats from history that no longer exist on disk
        original_length = len(self.history["chats"])
        self.history["chats"] = [
            chat for chat in self.history["chats"] if chat["id"] in existing_chat_ids
        ]

        if len(self.history["chats"]) != original_length:
            updated = True

        # Sort by updated_at, most recent first
        self.history["chats"].sort(key=lambda x: x.get("updated_at", ""), reverse=True)

        # Save changes if needed
        if updated:
            self._save_history()

    def add_message(self, chat_id: str, message: Dict, media_path: Optional[str] = None) -> bool:
        """Add a message to the chat history.

        Args:
            chat_id: The unique identifier of the chat
            message: The message data to add
            media_path: Optional path to an associated media file

        Returns:
            bool: True if successful, False otherwise

        This method:
        1. Loads or creates the chat metadata
        2. Adds a timestamp to the message
        3. If media_path is provided, stores the filename in the message
        4. Updates the chat title if needed (based on first user message)
        5. Saves the updated metadata
        6. Updates the global chat index
        """
        chat_dir = self.base_dir / chat_id
        metadata_file = chat_dir / "metadata.json"

        # Create directories if needed
        chat_dir.mkdir(parents=True, exist_ok=True)
        (chat_dir / "media").mkdir(exist_ok=True)

        # Load or create metadata
        metadata = {
            "id": chat_id,
            "title": "New Chat",
            "created_at": datetime.now().isoformat(),
            "messages": [],
        }

        if metadata_file.exists():
            try:
                with open(metadata_file, "r") as f:
                    metadata = json.load(f)
            except Exception as e:
                logger.error(f"Error loading metadata for {chat_id}: {str(e)}")

        # Add message data
        message["timestamp"] = datetime.now().isoformat()
        if media_path:
            # Store just the filename, not the full path
            message["media"] = os.path.basename(media_path)

            # If the message is image or audio, ensure mode is set
            if "mode" not in message and "media" in message:
                if message["media"].startswith("image_"):
                    message["mode"] = "image"
                elif message["media"].startswith("audio_"):
                    message["mode"] = "audio"

        metadata["messages"].append(message)
        metadata["updated_at"] = message["timestamp"]

        # Update title based on first message content if we haven't set a custom title
        if (
            metadata["title"] == "New Chat" or metadata["title"] == "Untitled Chat"
        ) and message.get("content"):
            # Use the first 30 chars of the first user message as title
            if message.get("mode") == "user" or message.get("role") == "user":
                title = message.get("content", "")
                # Clean up the title
                title = title.strip().replace("\n", " ")
                if len(title) > 30:
                    title = title[:30] + "..."
                metadata["title"] = title

        # Save updated metadata
        try:
            with open(metadata_file, "w") as f:
                json.dump(metadata, f, indent=2)

            # Update the chat in the global history
            self._update_chat_in_history(chat_id, metadata)

            return True
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
            return False

    def _update_chat_in_history(self, chat_id: str, metadata: Dict) -> None:
        """Update the chat entry in the global history."""
        # Find the chat in history
        chat_in_history = next(
            (chat for chat in self.history["chats"] if chat["id"] == chat_id), None
        )

        # If chat exists in history, update it
        if chat_in_history:
            chat_in_history["title"] = metadata.get("title", "Untitled Chat")
            chat_in_history["updated_at"] = metadata.get("updated_at", datetime.now().isoformat())
        else:
            # Otherwise, add it
            chat_summary = {
                "id": chat_id,
                "title": metadata.get("title", "Untitled Chat"),
                "created_at": metadata.get("created_at", datetime.now().isoformat()),
                "updated_at": metadata.get("updated_at", datetime.now().isoformat()),
            }
            self.history["chats"].append(chat_summary)

        # Sort by updated_at (most recent first)
        self.history["chats"].sort(key=lambda x: x.get("updated_at", ""), reverse=True)

        # Save history
        self._save_history()

    def save_media(
        self, content: Union[bytes, str, Path], media_type: str, media_dir: Path
    ) -> Optional[str]:
        """Save media content to the chat's media directory.

        Args:
            content: The media content as bytes, file path, or URL
            media_type: The type of media ('image' or 'audio')
            media_dir: The directory to save the media in

        Returns:
            Optional[str]: The path to the saved media file, or None if failed

        This method handles various input formats:
        - For bytes: Saves directly to a file
        - For URLs: Downloads and saves the content
        - For file paths: Copies the file to the media directory

        Images and audio are saved with timestamped filenames to prevent collisions.
        """
        try:
            # Create media directory if needed
            media_dir.mkdir(parents=True, exist_ok=True)

            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            if media_type == "image":
                # Handle image content (bytes or file path)
                if isinstance(content, bytes):
                    import io
                    from PIL import Image

                    # Try to open as image
                    try:
                        img = Image.open(io.BytesIO(content))
                        format_ext = img.format.lower() if img.format else "png"
                        filename = f"image_{timestamp}.{format_ext}"
                        filepath = media_dir / filename
                        img.save(filepath)
                        logger.info(f"Saved image from bytes to {filepath}")
                        return str(filepath)
                    except Exception as e:
                        logger.error(f"Error saving image from bytes: {e}")
                        # Fallback to raw bytes if PIL fails
                        filename = f"image_{timestamp}.png"
                        filepath = media_dir / filename
                        with open(filepath, "wb") as f:
                            f.write(content)
                        logger.info(f"Saved raw image bytes to {filepath}")
                        return str(filepath)

                elif isinstance(content, dict) and "url" in content:
                    # Handle image URL in a dictionary
                    import requests
                    import io
                    from PIL import Image

                    try:
                        response = requests.get(content["url"], timeout=30)
                        response.raise_for_status()

                        # Try to open as image to determine format
                        img = Image.open(io.BytesIO(response.content))
                        format_ext = img.format.lower() if img.format else "png"
                        filename = f"image_{timestamp}.{format_ext}"
                        filepath = media_dir / filename

                        # Save the image
                        img.save(filepath)
                        logger.info(f"Saved image from URL to {filepath}")
                        return str(filepath)
                    except Exception as e:
                        logger.error(f"Error saving image from URL: {e}")
                        # Fallback to raw bytes if PIL fails
                        filename = f"image_{timestamp}.png"
                        filepath = media_dir / filename
                        with open(filepath, "wb") as f:
                            f.write(response.content)
                        logger.info(f"Saved raw image bytes from URL to {filepath}")
                        return str(filepath)

                elif isinstance(content, str) and content.startswith("http"):
                    # Handle image URL as string
                    import requests
                    import io
                    from PIL import Image

                    try:
                        response = requests.get(content, timeout=30)
                        response.raise_for_status()

                        # Try to open as image to determine format
                        img = Image.open(io.BytesIO(response.content))
                        format_ext = img.format.lower() if img.format else "png"
                        filename = f"image_{timestamp}.{format_ext}"
                        filepath = media_dir / filename

                        # Save the image
                        img.save(filepath)
                        logger.info(f"Saved image from URL to {filepath}")
                        return str(filepath)
                    except Exception as e:
                        logger.error(f"Error saving image from URL: {e}")
                        # Fallback to raw bytes if PIL fails
                        filename = f"image_{timestamp}.png"
                        filepath = media_dir / filename
                        with open(filepath, "wb") as f:
                            f.write(response.content)
                        logger.info(f"Saved raw image bytes from URL to {filepath}")
                        return str(filepath)

                elif isinstance(content, (str, Path)):
                    import shutil

                    src_path = Path(content)
                    if not src_path.exists():
                        logger.error(f"Source image path does not exist: {src_path}")
                        return None

                    format_ext = src_path.suffix.lstrip(".")
                    filename = f"image_{timestamp}.{format_ext}"
                    filepath = media_dir / filename
                    shutil.copy2(src_path, filepath)
                    logger.info(f"Copied image from path to {filepath}")
                    return str(filepath)

            elif media_type == "audio":
                # Handle audio content (bytes or file path)
                if isinstance(content, bytes):
                    filename = f"audio_{timestamp}.mp3"
                    filepath = media_dir / filename
                    with open(filepath, "wb") as f:
                        f.write(content)
                    logger.info(f"Saved audio bytes to {filepath}")
                    return str(filepath)
                elif isinstance(content, (str, Path)):
                    import shutil

                    src_path = Path(content)
                    if not src_path.exists():
                        logger.error(f"Source audio path does not exist: {src_path}")
                        return None

                    format_ext = src_path.suffix.lstrip(".")
                    filename = f"audio_{timestamp}.{format_ext}"
                    filepath = media_dir / filename
                    shutil.copy2(src_path, filepath)
                    logger.info(f"Copied audio from path to {filepath}")
                    return str(filepath)

            return None

        except Exception as e:
            logger.error(f"Error saving media: {str(e)}")
            return None

    def delete_chat(self, chat_id: str) -> bool:
        """Delete a chat and all its associated data.

        Args:
            chat_id: The unique identifier of the chat to delete

        Returns:
            bool: True if deletion was successful, False otherwise

        This method:
        1. Removes all files in the chat directory (including media)
        2. Deletes the chat directory itself
        3. Removes the chat from the global history index
        4. Saves the updated history
        """
        chat_dir = self.base_dir / chat_id

        if not chat_dir.exists():
            logger.warning(f"Chat directory not found for deletion: {chat_id}")
            return False

        try:
            # Delete all files in the directory recursively
            for item in chat_dir.glob("**/*"):
                if item.is_file():
                    item.unlink()

            # Delete subdirectories
            for item in chat_dir.glob("*/"):
                if item.is_dir():
                    try:
                        item.rmdir()
                    except Exception as e:
                        logger.error(f"Error deleting subdirectory {item}: {e}")

            # Delete the chat directory
            chat_dir.rmdir()

            # Remove from history
            self.history["chats"] = [
                chat for chat in self.history["chats"] if chat["id"] != chat_id
            ]
            self._save_history()

            logger.info(f"Successfully deleted chat: {chat_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting chat {chat_id}: {e}")
            return False
