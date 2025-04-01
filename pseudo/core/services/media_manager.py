"""Handles saving and retrieving media files like images and audio."""

import os
import uuid
import logging
import requests
from pathlib import Path
from typing import Union, Dict, Any, Optional

# Set up logger
logger = logging.getLogger(__name__)


class MediaManager:
    """Manages media file operations for different content types."""

    def __init__(self) -> None:
        """Initialize the media manager with default settings."""
        pass

    def save_media(
        self,
        content: Union[str, bytes, Dict[str, Any]],
        media_type: str,
        target_dir: Union[str, Path],
    ) -> Optional[Path]:
        """Save media content to file and return the path if successful."""
        try:
            # Validate media type
            if media_type not in ["image", "audio"]:
                raise ValueError(f"Unsupported media type: {media_type}")

            # Generate a unique filename with UUID
            unique_id = uuid.uuid4()

            # Determine appropriate file extension based on media type
            if media_type == "image":
                extension = ".png"  #  Default format for images
            else:  #  audio
                extension = ".mp3"  #  Default format for audio

            filename = f"{unique_id}{extension}"

            # Create full path for the media file
            target_path = Path(target_dir) / filename

            # Ensure target directory exists
            Path(target_dir).mkdir(exist_ok=True, parents=True)

            # Handle different content types for storage
            if isinstance(content, str) and content.startswith("http"):
                # Content is a URL - download it
                response = requests.get(content, timeout=30)
                response.raise_for_status()
                with open(target_path, "wb") as f:
                    f.write(response.content)
            elif isinstance(content, bytes):
                # Content is already in bytes - write directly
                with open(target_path, "wb") as f:
                    f.write(content)
            elif isinstance(content, dict) and "url" in content:
                # Content is a dict with URL - download from the URL
                response = requests.get(content["url"], timeout=30)
                response.raise_for_status()
                with open(target_path, "wb") as f:
                    f.write(response.content)
            elif isinstance(content, dict) and "base64" in content:
                # Content is base64 encoded - decode and save
                import base64

                img_data = base64.b64decode(content["base64"])
                with open(target_path, "wb") as f:
                    f.write(img_data)
            else:
                # Unsupported content format
                logger.error(f"Unsupported content format: {type(content)}")
                return None

            logger.info(f"Media saved to {target_path}")
            return target_path

        except Exception as e:
            logger.error(f"Error saving media: {e}")
            return None
