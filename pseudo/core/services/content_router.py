"""Routes user content to appropriate AI providers based on content type detection."""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

# Add parent directory to sys.path so apicenter is available
# This expects apicenter to be in a sibling directory
parent_dir = str(Path(__file__).resolve().parent.parent.parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import apicenter
try:
    from apicenter import apicenter
except ImportError as e:
    message = f"""
Error importing apicenter: {e}
    
Please ensure the directory structure is:
parent-directory/
  ├── apicenter/
  └── pseudo/
    
To fix this:
1. Create a parent directory
2. Clone both repositories side by side
3. Install using Poetry:
   cd pseudo
   poetry install
"""
    raise ImportError(message)

# Set up logger
logger = logging.getLogger(__name__)


class ContentRouter:
    """Routes content to appropriate providers based on detected mode."""

    def __init__(self) -> None:
        """Initialize content router with API center and credentials."""
        self.api_center = apicenter  # Use the singleton instance
        self.credentials_path = ""
        self.credentials = self._load_credentials()

    def _load_credentials(self) -> Dict[str, Any]:
        """Load credentials from available file locations and return credential dictionary."""
        try:
            # Define the default structure for empty credentials
            default_credentials = {
                "modes": {
                    "text": {
                        "providers": {
                            "openai": {
                                "api_key": "",
                                "organization": "",
                                "models": ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
                            },
                            "anthropic": {
                                "api_key": "",
                                "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
                            },
                            "ollama": {"models": ["llama3", "mistral", "phi3"]},
                        }
                    },
                    "image": {
                        "providers": {
                            "openai": {
                                "api_key": "",
                                "organization": "",
                                "models": ["dall-e-3", "dall-e-2"],
                            },
                            "stability": {
                                "api_key": "",
                                "models": ["stable-diffusion-xl", "stable-diffusion-v1-5"],
                            },
                        }
                    },
                    "audio": {
                        "providers": {
                            "elevenlabs": {
                                "api_key": "",
                                "models": ["eleven_multilingual_v2", "eleven_monolingual_v1"],
                            }
                        }
                    },
                }
            }

            # Search for credentials file in common locations
            search_paths = [
                "credentials.json",  # Current directory
                str(Path.home() / ".pseudo" / "credentials.json"),  # User home
                str(
                    Path(__file__).parent.parent.parent.parent / "credentials.json"
                ),  # Project root
                str(Path.cwd() / "credentials.json"),  # Working directory
            ]

            # Check if custom path is set in environment
            custom_path = os.environ.get("PSEUDO_CREDENTIALS_PATH")
            if custom_path:
                search_paths.insert(0, custom_path)

            # Try each path
            for path in search_paths:
                if os.path.exists(path):
                    with open(path, "r") as f:
                        credentials = json.load(f)
                        self.credentials_path = path

                        # Ensure the credentials have the right structure
                        if "modes" not in credentials:
                            logger.warning(
                                f"Invalid credentials format at {path}. Adding modes key."
                            )
                            credentials["modes"] = default_credentials["modes"]

                        for mode in ["text", "image", "audio"]:
                            if mode not in credentials["modes"]:
                                logger.warning(
                                    f"Missing {mode} mode in credentials. Adding default."
                                )
                                credentials["modes"][mode] = default_credentials["modes"][mode]
                            elif "providers" not in credentials["modes"][mode]:
                                logger.warning(f"Missing providers in {mode} mode. Adding default.")
                                credentials["modes"][mode]["providers"] = default_credentials[
                                    "modes"
                                ][mode]["providers"]

                        return credentials

            # No credentials found - use project root as default location
            project_root = Path(__file__).parent.parent.parent.parent
            default_path = project_root / "credentials.json"
            self.credentials_path = str(default_path.absolute())

            logger.warning(f"No credentials found. Creating default at: {self.credentials_path}")

            # Create default credentials file
            with open(self.credentials_path, "w") as f:
                json.dump(default_credentials, f, indent=2)

            return default_credentials

        except Exception as e:
            logger.error(f"Error loading credentials: {e}")

            # Ensure we have a valid path even in case of errors
            project_root = Path(__file__).parent.parent.parent.parent
            default_path = project_root / "credentials.json"
            self.credentials_path = str(default_path.absolute())

            logger.warning(f"Using fallback credentials path: {self.credentials_path}")

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
            # Ensure we have a valid path
            if not self.credentials_path or self.credentials_path == "":
                # Use project root as default location if path is empty
                project_root = Path(__file__).parent.parent.parent.parent
                self.credentials_path = str((project_root / "credentials.json").absolute())
                logger.warning(f"Empty credentials path. Using default: {self.credentials_path}")

            # Create directory if it doesn't exist
            directory = os.path.dirname(self.credentials_path)
            if directory and not os.path.exists(directory):
                os.makedirs(directory)

            # Write credentials to file
            with open(self.credentials_path, "w") as f:
                json.dump(credentials, f, indent=2)

            # Update the credentials in memory
            self.credentials = credentials

            logger.info(f"Successfully saved credentials to {self.credentials_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving credentials: {e}")
            raise e

    def select_mode_and_clean_content(self, user_input: str) -> tuple[str, str]:
        """Determine content type and extract cleaned content from user input.

        Returns a tuple of (mode, cleaned_content) where mode is one of 'text', 'image', 'audio'
        and cleaned_content is the extracted actual content the user wants to process.
        """
        try:
            # System prompt for content classification and extraction
            system_prompt = """You are a content analyzer that determines both the type of content requested and extracts the actual content to be processed.

Based on the user's input, you must respond with EXACTLY this format:
```
mode: <mode>
content: <cleaned content>
```

Where <mode> is one of: 'text', 'image', or 'audio'
And <cleaned content> is the actual content to be processed (removing meta-instructions).

For example:
- If input is "give me an image of a red cat", respond with:
```
mode: image
content: a red cat
```

- If input is "create audio saying hello world", respond with:
```
mode: audio
content: hello world
```

- If input is "tell me about quantum physics", respond with:
```
mode: text
content: tell me about quantum physics
```

Always maintain the meaning of the original request while removing only the parts that are instructions about the mode.
"""

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
                                f"Using {provider_name}/{model_name} for content detection and cleaning"
                            )

                            # Use apicenter singleton to make the classification and extraction
                            response = self.api_center.text(
                                provider=provider_name,
                                model=model_name,
                                prompt=[
                                    {"role": "system", "content": system_prompt},
                                    {"role": "user", "content": user_input},
                                ],
                                temperature=0.0,
                            )

                            # Extract the response content
                            if isinstance(response, str):
                                response_content = response
                            elif isinstance(response, dict) and "content" in response:
                                response_content = response["content"]
                            else:
                                logger.warning(f"Unexpected response format: {response}")
                                continue  #  Try next provider in queue

                            # Parse the response to extract mode and cleaned content
                            mode = None
                            cleaned_content = None

                            # Look for the mode and content pattern
                            for line in response_content.split("\n"):
                                line = line.strip()
                                if line.startswith("mode:"):
                                    mode = line.replace("mode:", "").strip().lower()
                                elif line.startswith("content:"):
                                    cleaned_content = line.replace("content:", "").strip()

                            # If response is in code block format, try to extract from that
                            if not mode or not cleaned_content:
                                import re

                                # Try to extract content between ```
                                code_block_match = re.search(
                                    r"```(.*?)```", response_content, re.DOTALL
                                )
                                if code_block_match:
                                    code_block = code_block_match.group(1)
                                    for line in code_block.split("\n"):
                                        line = line.strip()
                                        if line.startswith("mode:"):
                                            mode = line.replace("mode:", "").strip().lower()
                                        elif line.startswith("content:"):
                                            cleaned_content = line.replace("content:", "").strip()

                            # Validate the extracted information
                            if mode in ["text", "image", "audio"] and cleaned_content:
                                logger.info(
                                    f"Mode detected: {mode}, Cleaned content: '{cleaned_content}'"
                                )
                                return mode, cleaned_content
                            else:
                                logger.warning(
                                    f"Invalid output format from {provider_name}/{model_name}: mode={mode}, content={cleaned_content}"
                                )
                                continue  #  Try next provider in queue
                        except Exception as e:
                            logger.warning(
                                f"Error using {provider_name}/{model_name} for content detection: {e}"
                            )
                            continue  #  Try next provider in queue

            # If all providers failed or none configured, default to text with original input
            logger.warning(
                "All attempts to detect mode and clean content failed, defaulting to text mode with original input"
            )
            return "text", user_input

        except Exception as e:
            logger.error(f"Error in mode and content detection: {e}")
            return "text", user_input  #  Default to text mode with original input on error

    def select_mode(self, user_input: str) -> str:
        """Determine content type (text, image, audio) and return mode string."""
        # Get mode and cleaned content, but only return the mode
        mode, _ = self.select_mode_and_clean_content(user_input)
        return mode

    def get_cleaned_content(self, user_input: str) -> str:
        """Extract and return the cleaned content from user input."""
        # Get mode and cleaned content, but only return the cleaned content
        _, cleaned_content = self.select_mode_and_clean_content(user_input)
        return cleaned_content

    def process_content(self, mode: str, prompt: str) -> Any:
        """Process content using provider queue and return response of appropriate type."""
        try:
            # Check for valid mode configuration
            if mode not in self.credentials["modes"]:
                logger.error(f"No providers configured for {mode} mode")
                return {
                    "content": f"The '{mode}' mode is not configured in credentials.json. Please add providers for this mode.",
                    "provider": "system",
                    "model": "none",
                }

            providers = self.credentials["modes"][mode]["providers"]
            if not providers:
                logger.error(f"No providers available for {mode} mode")
                return {
                    "content": f"No providers are configured for the '{mode}' mode in credentials.json. Please add at least one provider.",
                    "provider": "system",
                    "model": "none",
                }

            # Check if any providers have API keys
            has_configured_provider = False
            for provider_name, provider_config in providers.items():
                # For non-local providers, check API keys
                if (
                    provider_name != "ollama"
                    and "api_key" in provider_config
                    and provider_config["api_key"]
                ):
                    has_configured_provider = True
                    break
                # For local providers like ollama, just check if it exists
                elif provider_name == "ollama":
                    has_configured_provider = True
                    break

            if not has_configured_provider:
                logger.error(f"No providers with API keys configured for {mode} mode")
                return {
                    "content": f"No API keys are configured for any providers in '{mode}' mode. Please add your API keys to credentials.json.",
                    "provider": "system",
                    "model": "none",
                }

            errors = []

            # Try each provider in strict order from credentials.json (queue)
            for provider_name, provider_config in providers.items():
                # Skip providers without API keys (except for ollama which is local)
                if (
                    provider_name != "ollama"
                    and "api_key" in provider_config
                    and not provider_config["api_key"]
                ):
                    logger.warning(f"Skipping {provider_name} - no API key provided")
                    continue

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

                            # For debugging
                            if mode == "image":
                                logger.info(f"Image response type: {type(response)}")
                                if isinstance(response, dict):
                                    logger.info(f"Image response keys: {list(response.keys())}")
                                    if "url" in response:
                                        logger.info(f"Image URL: {response['url']}")

                            # Return a dictionary with the response and provider/model info
                            if isinstance(response, (str, bytes)):
                                return {
                                    "content": response,
                                    "provider": provider_name,
                                    "model": model_name,
                                }
                            elif isinstance(response, dict):
                                # If response is already a dict, add provider/model info
                                response.update({"provider": provider_name, "model": model_name})
                                return response
                            else:
                                # For any other type, wrap it
                                return {
                                    "content": response,
                                    "provider": provider_name,
                                    "model": model_name,
                                }
                    except Exception as e:
                        error_msg = f"Error with {provider_name}/{model_name}: {e}"
                        logger.warning(error_msg)
                        errors.append(error_msg)
                        # Continue to next model or provider in the queue

            # All queue options exhausted with no success
            error_details = "\n".join(errors)
            logger.error(f"All attempts to process {mode} content failed:\n{error_details}")
            return {
                "content": f"Unable to process {mode} content. Please check your API keys in credentials.json.\n\nErrors:\n{error_details}",
                "provider": "system",
                "model": "none",
            }

        except Exception as e:
            logger.error(f"Error processing content: {e}")
            return {
                "content": f"Error processing {mode} content: {e}. Please check your configuration.",
                "provider": "system",
                "model": "none",
            }

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
