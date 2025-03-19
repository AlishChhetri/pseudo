import os
import base64
from datetime import datetime


class MediaManager:
    def __init__(self, base_path="media"):
        """Initialize media storage"""
        self.base_path = base_path
        self.init_directories()

    def init_directories(self):
        """Create media directories"""
        os.makedirs(self.base_path, exist_ok=True)
        os.makedirs(os.path.join(self.base_path, "images"), exist_ok=True)
        os.makedirs(os.path.join(self.base_path, "audio"), exist_ok=True)

    def save_media(self, content, mode):
        """Save media file and return path"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if mode == "image":
            if content.startswith("data:image"):
                image_data = base64.b64decode(content.split(",")[1])
                filename = f"image_{timestamp}.png"
                filepath = os.path.join(self.base_path, "images", filename)
                with open(filepath, "wb") as f:
                    f.write(image_data)
                return f"media/images/{filename}"

        elif mode == "audio":
            filename = f"audio_{timestamp}.mp3"
            filepath = os.path.join(self.base_path, "audio", filename)
            with open(filepath, "wb") as f:
                f.write(content)
            return f"media/audio/{filename}"

        return None
