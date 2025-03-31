import os
import uuid
import logging
import requests
from pathlib import Path

logger = logging.getLogger(__name__)

class MediaManager:
    """Handles saving and retrieving media files."""
    
    def __init__(self):
        """Initialize the media manager."""
        pass
    
    def save_media(self, content, media_type, target_dir):
        """
        Save media content to the specified directory.
        
        Args:
            content: Media content (URL string, bytes, or dict with url/base64)
            media_type: Type of media ('image' or 'audio')
            target_dir: Directory to save the media to
            
        Returns:
            Path to saved file or None if failed
        """
        try:
            if media_type not in ['image', 'audio']:
                raise ValueError(f"Unsupported media type: {media_type}")
            
            # Generate a unique filename
            unique_id = uuid.uuid4()
            
            # Determine file extension
            if media_type == 'image':
                extension = '.png'
            else:  # audio
                extension = '.mp3'
                
            filename = f"{unique_id}{extension}"
            
            # Full path for the media file
            target_path = Path(target_dir) / filename
            
            # Create target directory if it doesn't exist
            Path(target_dir).mkdir(exist_ok=True, parents=True)
            
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
                logger.error(f"Unsupported content format: {type(content)}")
                return None
            
            logger.info(f"Media saved to {target_path}")
            return target_path
            
        except Exception as e:
            logger.error(f"Error saving media: {e}")
            return None 