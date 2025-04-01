"""Routes user content to appropriate AI providers based on content type detection."""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

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
