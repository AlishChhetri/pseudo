"""Routes user content to appropriate AI providers based on content type detection."""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Import apicenter from sibling directory
# First, get parent directory of pseudo project
parent_dir = Path(__file__).parent.parent.parent.parent.parent
# Path to apicenter directory (sibling to pseudo)
apicenter_dir = parent_dir / "apicenter"

# Check if apicenter directory exists
if not apicenter_dir.exists() or not apicenter_dir.is_dir():
    raise ImportError(
        "Could not find apicenter directory. "
        "Please ensure apicenter is cloned as a sibling directory to pseudo."
    )

# Add parent directory to sys.path so both packages are available
sys.path.append(str(parent_dir))

# Import apicenter
try:
    from apicenter import apicenter
except ImportError:
    raise ImportError(
        "Could not import apicenter. "
        "Please ensure the apicenter package is properly installed in the sibling directory."
    )

# Set up logger
logger = logging.getLogger(__name__)


class ContentRouter:
    """Routes content to appropriate providers based on detected mode."""

    def __init__(self) -> None:
        """Initialize content router with API center and credentials."""
        self.api_center = apicenter  # Use the singleton instance
        self.credentials = self._load_credentials()
        self.credentials_path = ""

    def _load_credentials(self) -> Dict[str, Any]:
        """Load credentials from available file locations and return credential dictionary."""
        try:
            # Search for credentials file in common locations
            search_paths = [
                "credentials.json",  # Current directory
                str(Path.home() / ".pseudo" / "credentials.json"),  # User home
                str(
                    Path(__file__).parent.parent.parent.parent / "credentials.json"
                ),  # Project root
            ]

            # Check if custom path is set in environment
            custom_path = os.environ.get("PSEUDO_CREDENTIALS_PATH")
            if custom_path:
                search_paths.insert(0, custom_path)

            # Try each path
            for path in search_paths:
                if os.path.exists(path):
                    with open(path, "r") as f:
                        self.credentials_path = path
                        return json.load(f)

            # No credentials found - use default empty structure
            logger.warning("No credentials file found. Using empty credentials.")
            self.credentials_path = "credentials.json"  # Default to current directory
            return {
                "modes": {
                    "text": {"providers": {}},
                    "image": {"providers": {}},
                    "audio": {"providers": {}},
                }
            }

        except Exception as e:
            logger.error(f"Error loading credentials: {e}")
            self.credentials_path = "credentials.json"  # Default to current directory
            return {
                "modes": {
                    "text": {"providers": {}},
                    "image": {"providers": {}},
                    "audio": {"providers": {}},
                }
            }

    def save_credentials(self, credentials: Dict[str, Any]) -> bool:
        """Save credentials to disk and return success status."""
        try:
            # Create directory if it doesn't exist
            directory = os.path.dirname(self.credentials_path)
            if directory and not os.path.exists(directory):
                os.makedirs(directory)

            # Write credentials to file
            with open(self.credentials_path, "w") as f:
                json.dump(credentials, f, indent=2)

            # Update the credentials in memory
            self.credentials = credentials

            return True
        except Exception as e:
            logger.error(f"Error saving credentials: {e}")
            raise e

    def select_mode(self, user_input: str) -> str:
        """Determine content type (text, image, audio) and return mode string."""
        try:
            # System prompt for content classification
            system_prompt = "You are a content type classifier. Based on the user's input, respond with a single word: 'text', 'image', or 'audio'. Nothing else."

            # Use queue-based approach from credentials.json - try providers in strict order
            if "text" in self.credentials["modes"]:
                text_providers = self.credentials["modes"]["text"]["providers"]

                # Try each provider in the order they appear in credentials.json
                for provider_name, provider_config in text_providers.items():
                    if "models" in provider_config and provider_config["models"]:
                        # Use the first model in the list (queue order matters)
                        model_name = provider_config["models"][0]

                        try:
                            logger.info(
                                f"Using {provider_name}/{model_name} for content type detection"
                            )

                            # Use apicenter singleton to make the classification
                            response = self.api_center.text(
                                provider=provider_name,
                                model=model_name,
                                prompt=[
                                    {"role": "system", "content": system_prompt},
                                    {"role": "user", "content": user_input},
                                ],
                                temperature=0.0,
                            )

                            # Extract the response content and clean it
                            if isinstance(response, str):
                                mode = response.strip().lower()
                            elif isinstance(response, dict) and "content" in response:
                                mode = response["content"].strip().lower()
                            else:
                                logger.warning(f"Unexpected response format: {response}")
                                continue  # Try next provider in queue

                            # Validate the mode
                            if mode in ["text", "image", "audio"]:
                                logger.info(f"Selected mode: {mode}")
                                return mode
                            else:
                                logger.warning(
                                    f"Invalid mode '{mode}' from {provider_name}/{model_name}, trying next provider"
                                )
                                continue  # Try next provider in queue
                        except Exception as e:
                            logger.warning(
                                f"Error using {provider_name}/{model_name} for mode detection: {e}"
                            )
                            continue  # Try next provider in queue

            # If all providers failed or none configured, default to text
            logger.warning("All attempts to detect content type failed, defaulting to 'text'")
            return "text"

        except Exception as e:
            logger.error(f"Error in mode selection: {e}")
            return "text"  # Default to text mode on error

    def process_content(self, mode: str, prompt: str) -> Any:
        """Process content using provider queue and return response of appropriate type."""
        try:
            # Check for valid mode configuration
            if mode not in self.credentials["modes"]:
                raise ValueError(f"No providers configured for {mode} mode")

            providers = self.credentials["modes"][mode]["providers"]
            if not providers:
                raise ValueError(f"No providers available for {mode} mode")

            errors = []

            # Try each provider in strict order from credentials.json (queue)
            for provider_name, provider_config in providers.items():
                # Check if the provider has models defined
                if "models" not in provider_config or not provider_config["models"]:
                    logger.warning(f"No models defined for {provider_name} in {mode} mode")
                    continue

                # Try each model in strict order from credentials.json (queue)
                for model_name in provider_config["models"]:
                    try:
                        logger.info(f"Trying {provider_name}/{model_name} for {mode} mode")

                        # Call the appropriate apicenter singleton method based on the mode
                        response = None
                        if mode == "text":
                            response = self.api_center.text(
                                provider=provider_name, model=model_name, prompt=prompt
                            )
                        elif mode == "image":
                            response = self.api_center.image(
                                provider=provider_name, model=model_name, prompt=prompt
                            )
                        elif mode == "audio":
                            response = self.api_center.audio(
                                provider=provider_name, model=model_name, prompt=prompt
                            )

                        # If we got a response, return it immediately without trying further options
                        if response:
                            logger.info(f"Successfully processed with {provider_name}/{model_name}")
                            return response
                    except Exception as e:
                        error_msg = f"Error with {provider_name}/{model_name}: {e}"
                        logger.warning(error_msg)
                        errors.append(error_msg)
                        # Continue to next model or provider in the queue

            # All queue options exhausted with no success
            error_details = "\n".join(errors)
            raise Exception(f"All attempts to process {mode} content failed:\n{error_details}")

        except Exception as e:
            logger.error(f"Error processing content: {e}")
            raise Exception(f"Error processing {mode} content: {e}")

    def get_available_providers(self, mode: str) -> List[str]:
        """Get list of available providers for a specific mode."""
        try:
            if mode in self.credentials["modes"]:
                return list(self.credentials["modes"][mode]["providers"].keys())
            return []
        except Exception as e:
            logger.error(f"Error getting providers: {e}")
            return []

    def get_available_models(self, mode: str, provider: str) -> List[str]:
        """Get list of available models for a specific provider and mode."""
        try:
            if (
                mode in self.credentials["modes"]
                and provider in self.credentials["modes"][mode]["providers"]
                and "models" in self.credentials["modes"][mode]["providers"][provider]
            ):
                return self.credentials["modes"][mode]["providers"][provider]["models"]
            return []
        except Exception as e:
            logger.error(f"Error getting models: {e}")
            return []
