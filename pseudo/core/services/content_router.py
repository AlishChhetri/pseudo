import logging
import json
import os
from pathlib import Path
from apicenter import APICenter

logger = logging.getLogger(__name__)

class ContentRouter:
    """Routes content to appropriate providers based on mode detection."""
    
    def __init__(self):
        """Initialize the content router."""
        self.api_center = APICenter()
        self.credentials = self._load_credentials()
    
    def _load_credentials(self):
        """Load credentials from credentials.json file."""
        try:
            # Search for credentials file in common locations
            search_paths = [
                "credentials.json",  # Current directory
                str(Path.home() / ".pseudo" / "credentials.json"),  # User home
                str(Path(__file__).parent.parent.parent.parent / "credentials.json"),  # Project root
            ]
            
            # Check if custom path is set in environment
            custom_path = os.environ.get("PSEUDO_CREDENTIALS_PATH")
            if custom_path:
                search_paths.insert(0, custom_path)
            
            # Try each path
            for path in search_paths:
                if os.path.exists(path):
                    with open(path, 'r') as f:
                        return json.load(f)
            
            logger.warning("No credentials file found. Using empty credentials.")
            return {"modes": {"text": {"providers": {}}, "image": {"providers": {}}, "audio": {"providers": {}}}}
        
        except Exception as e:
            logger.error(f"Error loading credentials: {e}")
            return {"modes": {"text": {"providers": {}}, "image": {"providers": {}}, "audio": {"providers": {}}}}
    
    def select_mode(self, user_input):
        """Use deepseek model to determine the content type (text, image, audio)."""
        try:
            # Use APICenter to call the deepseek model with a system prompt to classify the content
            system_prompt = "You are a content type classifier. Based on the user's input, respond with a single word: 'text', 'image', or 'audio'. Nothing else."
            
            # Check if we can use deepseek via a configured provider
            valid_providers = ["ollama", "openai", "anthropic"]
            provider_to_use = None
            model_to_use = None
            
            # Try to find a suitable provider and model
            for provider in valid_providers:
                if provider in self.credentials["modes"]["text"]["providers"]:
                    provider_to_use = provider
                    if "models" in self.credentials["modes"]["text"]["providers"][provider]:
                        # Use the first available model
                        if len(self.credentials["modes"]["text"]["providers"][provider]["models"]) > 0:
                            model_to_use = self.credentials["modes"]["text"]["providers"][provider]["models"][0]
                            break
            
            if provider_to_use and model_to_use:
                # Use APICenter to make the classification
                response = self.api_center.text(
                    provider=provider_to_use, 
                    model=model_to_use, 
                    prompt=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_input}
                    ],
                    temperature=0.0
                )
                
                # Extract the response content and clean it
                if isinstance(response, str):
                    mode = response.strip().lower()
                elif isinstance(response, dict) and "content" in response:
                    mode = response["content"].strip().lower()
                else:
                    logger.warning(f"Unexpected response format: {response}")
                    mode = "text"  # Default to text
                
                # Validate the mode
                if mode in ["text", "image", "audio"]:
                    logger.info(f"Selected mode: {mode}")
                    return mode
                else:
                    logger.warning(f"Invalid mode '{mode}', defaulting to 'text'")
                    return "text"
            else:
                logger.warning("No suitable provider found for mode detection, defaulting to 'text'")
                return "text"
            
        except Exception as e:
            logger.error(f"Error in mode selection: {e}")
            return "text"  # Default to text mode on error
    
    def process_content(self, mode, prompt):
        """Process content using the appropriate mode and a queue-based provider/model selection."""
        try:
            if mode not in self.credentials["modes"]:
                raise ValueError(f"No providers configured for {mode} mode")
            
            providers = self.credentials["modes"][mode]["providers"]
            if not providers:
                raise ValueError(f"No providers available for {mode} mode")
            
            errors = []
            
            # Process providers in order (queue)
            for provider_name, provider_config in providers.items():
                # Check if the provider has models defined
                if "models" not in provider_config or not provider_config["models"]:
                    logger.warning(f"No models defined for {provider_name} in {mode} mode")
                    continue
                
                # Process models in order (queue)
                for model_name in provider_config["models"]:
                    try:
                        logger.info(f"Trying {provider_name}/{model_name} for {mode} mode")
                        
                        # Call the appropriate APICenter method based on the mode
                        response = None
                        if mode == "text":
                            response = self.api_center.text(
                                provider=provider_name, 
                                model=model_name, 
                                prompt=prompt
                            )
                        elif mode == "image":
                            response = self.api_center.image(
                                provider=provider_name, 
                                model=model_name, 
                                prompt=prompt
                            )
                        elif mode == "audio":
                            response = self.api_center.audio(
                                provider=provider_name, 
                                model=model_name, 
                                prompt=prompt
                            )
                        
                        # If we got a response, return it
                        if response:
                            return response
                    except Exception as e:
                        error_msg = f"Error with {provider_name}/{model_name}: {e}"
                        logger.warning(error_msg)
                        errors.append(error_msg)
            
            # If we reach here, all attempts failed
            error_details = "\n".join(errors)
            raise Exception(f"All attempts to process {mode} content failed:\n{error_details}")
            
        except Exception as e:
            logger.error(f"Error processing content: {e}")
            raise Exception(f"Error processing {mode} content: {e}")
    
    def get_available_providers(self, mode):
        """Get list of available providers for a specific mode."""
        try:
            if mode in self.credentials["modes"]:
                return list(self.credentials["modes"][mode]["providers"].keys())
            return []
        except Exception as e:
            logger.error(f"Error getting providers: {e}")
            return []
    
    def get_available_models(self, mode, provider):
        """Get list of available models for a specific provider in a specific mode."""
        try:
            if (mode in self.credentials["modes"] and 
                provider in self.credentials["modes"][mode]["providers"] and
                "models" in self.credentials["modes"][mode]["providers"][provider]):
                return self.credentials["modes"][mode]["providers"][provider]["models"]
            return []
        except Exception as e:
            logger.error(f"Error getting models: {e}")
            return [] 