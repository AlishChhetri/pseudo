import ollama
import os
import sys
import time
import json
import base64
import re
from datetime import datetime

# Add apicenter to Python path
APICENTER_PATH = "/home/alishchhetri/comp/test_apicenter"
if APICENTER_PATH not in sys.path:
    sys.path.insert(0, APICENTER_PATH)

from apicenter.apicenter import apicenter


def ensure_ollama_running():
    """Ensure Ollama service is running, start if not"""
    try:
        result = os.system("systemctl is-active --quiet ollama")
        if result != 0:
            print("Starting Ollama service...")
            os.system("sudo systemctl start ollama")
            time.sleep(2)
        return True
    except Exception as e:
        print(f"Error managing Ollama service: {e}")
        return False


def init_ollama_model():
    """Initialize the deepseek-r1 model"""
    try:
        if not ensure_ollama_running():
            return False

        try:
            models = ollama.list()
            model_exists = any(
                model.get("name") == "deepseek-r1:8b"
                for model in models.get("models", [])
            )

            if not model_exists:
                print("Downloading deepseek-r1 model...")
                ollama.pull("deepseek-r1:8b")
                print("Model download complete!")
            else:
                print("deepseek-r1 model already available")

            return True

        except Exception as e:
            print("Error connecting to Ollama service")
            return False

    except Exception as e:
        print(f"Error initializing model: {e}")
        return False


def select_mode(user_input):
    """Use Ollama's deepseek model to classify input into modes"""
    try:
        prompt = """Classify (text/image/audio) - respond with single word:
        
        text: writing, coding, analysis
        image: creating/editing images, visual generation
        audio: speech, music, sound
        
        Input: {input}""".format(input=user_input)

        response = ollama.chat(
            model="deepseek-r1:8b",
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.0},
        )

        # Get the full response content
        full_response = response["message"]["content"]
        print(f"Raw response: {full_response}")

        # Extract just the mode word (text, image, or audio) from the response
        # This handles both clean responses and those with thinking tags

        # First, remove any <think> tags and their content
        clean_response = re.sub(
            r"<think>.*?</think>", "", full_response, flags=re.DOTALL
        )

        # Strip whitespace and get the last non-empty line
        # This should be just the mode word
        lines = [line.strip() for line in clean_response.split("\n") if line.strip()]
        if lines:
            mode = lines[-1].lower()  # Get the last line, which should be the mode
            print(f"Extracted mode: {mode}")

            if mode in ["text", "image", "audio"]:
                return mode
            else:
                print(f"Invalid mode '{mode}', defaulting to 'text'")
                return "text"
        else:
            print("No mode detected, defaulting to 'text'")
            return "text"

    except Exception as e:
        print(f"Error in mode selection: {e}")
        return "text"  # Default to text mode


def process_user_message(user_message, conversation_history=None):
    """Process each user message independently, determining mode and routing to provider"""
    if conversation_history is None:
        conversation_history = []

    # Determine the mode for this specific message
    detected_mode = select_mode(user_message)
    print(f"Selected mode: {detected_mode}")  # Debug print

    # Get response from appropriate provider based on current message's mode
    try:
        response = get_provider_response(detected_mode, user_message)

        # Add this interaction to conversation history
        conversation_history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "user_message": user_message,
                "detected_mode": detected_mode,
                "response": response,
            }
        )

        return response, detected_mode, conversation_history

    except Exception as e:
        error_message = f"Error processing message in {detected_mode} mode: {e}"
        print(error_message)
        return error_message, detected_mode, conversation_history


def get_provider_response(mode, message, selected_provider=None, selected_model=None):
    """Route request to appropriate provider using apicenter"""
    try:
        with open("credentials.json", "r") as f:
            configs = json.load(f)

        providers = configs["modes"].get(mode, {}).get("providers", {})
        if not providers:
            raise Exception(f"No providers configured for {mode} mode")

        print(f"Processing {mode} request")

        # Use specified provider/model or auto-select first available
        if selected_provider and selected_model:
            if selected_provider not in providers:
                raise Exception(f"Provider {selected_provider} not configured")
            response = route_to_provider(
                mode, message, selected_provider, selected_model
            )
            return process_provider_response(response, mode)

        # Try first available provider
        for provider_name, provider_config in providers.items():
            try:
                model = provider_config["models"][0]
                print(f"Using {provider_name}/{model} for {mode}")
                response = route_to_provider(mode, message, provider_name, model)
                if response:
                    return process_provider_response(response, mode)
            except Exception as e:
                print(f"Provider {provider_name} failed: {e}")
                continue

        raise Exception(f"No available providers responded for {mode} mode")

    except Exception as e:
        print(f"Error in provider selection: {e}")
        raise


def process_provider_response(response, mode):
    """Process and format provider response based on mode"""
    if not response:
        return None

    if mode == "image":
        # Handle both single image and list of images
        if isinstance(response, list):
            return response[0] if response else None
        return response
    elif mode == "audio":
        # Handle audio response
        if isinstance(response, (bytes, bytearray)):
            return response
        return response
    else:
        # Handle text response
        return str(response)


def route_to_provider(mode, message, provider, model):
    """Route the request to specific provider/model"""
    try:
        print(f"Routing {mode} request to {provider} using {model}")

        if mode == "text":
            return apicenter.text(provider=provider, model=model, prompt=message)
        elif mode == "image":
            response = apicenter.image(provider=provider, model=model, prompt=message)
            return response
        elif mode == "audio":
            return apicenter.audio(provider=provider, model=model, prompt=message)

        return f"Unsupported mode: {mode}"

    except Exception as e:
        print(f"Error routing to {provider}/{model}: {e}")
        return None
