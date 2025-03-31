import os
import uuid
import logging
import requests
from pathlib import Path
from flask import current_app

logger = logging.getLogger(__name__)

class MediaManager:
    """Handles saving and retrieving media files."""
    
    def __init__(self):
        """Initialize the media manager."""
        self.media_folder = Path(current_app.config['MEDIA_FOLDER'])
        self.image_folder = self.media_folder / 'images'
        self.audio_folder = self.media_folder / 'audio'
        
        # Create folders if they don't exist
        self.media_folder.mkdir(exist_ok=True, parents=True)
        self.image_folder.mkdir(exist_ok=True)
        self.audio_folder.mkdir(exist_ok=True)
    
    def save_media(self, content, media_type):
        """
        Save media content to appropriate folder.
        
        Args:
            content: Media content (URL string or bytes)
            media_type: Type of media ('image' or 'audio')
            
        Returns:
            Path to saved file or None if failed
        """
        try:
            if media_type not in ['image', 'audio']:
                raise ValueError(f"Unsupported media type: {media_type}")
            
            # Generate a unique filename
            unique_id = uuid.uuid4()
            filename = f"{unique_id}"
            
            # Determine target directory and file extension
            if media_type == 'image':
                target_dir = self.image_folder
                filename += '.png'
                content_type = 'image/png'
            else:  # audio
                target_dir = self.audio_folder
                filename += '.mp3'
                content_type = 'audio/mpeg'
            
            # Save directly to media root for immediate URL access
            target_path = self.media_folder / filename
            
            # Handle different content types
            if isinstance(content, str) and content.startswith('http'):
                # Content is a URL, download it
                response = requests.get(content, timeout=30)
                response.raise_for_status()
                with open(target_path, 'wb') as f:
                    f.write(response.content)
            elif isinstance(content, bytes):
                # Content is already in bytes
                with open(target_path, 'wb') as f:
                    f.write(content)
            elif isinstance(content, dict) and 'url' in content:
                # Handle case where content is a dict with URL
                response = requests.get(content['url'], timeout=30)
                response.raise_for_status()
                with open(target_path, 'wb') as f:
                    f.write(response.content)
            elif isinstance(content, dict) and 'base64' in content:
                # Handle base64 encoded content
                import base64
                imgdata = base64.b64decode(content['base64'])
                with open(target_path, 'wb') as f:
                    f.write(imgdata)
            else:
                logger.error(f"Unsupported content format: {type(content)} - {content}")
                return None
            
            logger.info(f"Media saved to {target_path}")
            return target_path
            
        except Exception as e:
            logger.error(f"Error saving media: {e}")
            return None 