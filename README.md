# Pseudo - Smart AI Content Router

Pseudo is a smart content router for AI-generated text, images, and audio. It provides a consistent interface for working with different AI providers.

## 🚀 Quick Start

Pseudo requires APICenter to be available as a sibling directory, since APICenter is not published to PyPI.

1. Create a parent directory for both projects:
```bash
mkdir ai-projects
cd ai-projects
```

2. Clone both repositories as siblings:
```bash
git clone https://github.com/alishchhetri/apicenter.git
git clone https://github.com/yourusername/pseudo.git
```

3. Install Pseudo dependencies:
```bash
cd pseudo
poetry install
```

4. Run the application:
```bash
poetry run pseudo
```

5. Open your browser and navigate to `http://0.0.0.0:5000`

## 🔄 APICenter Integration

Pseudo uses the APICenter library to communicate with AI providers. Since APICenter is not published to PyPI, you must set up both projects as sibling directories:

```
parent-directory/
├── apicenter/        # APICenter repository
└── pseudo/           # Pseudo repository
```

Pseudo automatically detects and uses the APICenter package from the sibling directory. The import system will look for the apicenter directory at the same level as the pseudo directory.

## ⚙️ Configuration

You can configure the application using environment variables:

- `FLASK_HOST`: The host to bind to (default: `0.0.0.0`)
- `FLASK_PORT`: The port to listen on (default: `5000`)
- `FLASK_DEBUG`: Enable debug mode (`True`/`False`, default: `True`)

Example:
```bash
FLASK_HOST=localhost FLASK_PORT=8000 FLASK_DEBUG=False poetry run pseudo
```

## Development

The application is built using Flask and leverages the APICenter library for interfacing with various AI providers.

## How It Works

Pseudo uses a smart content routing system that:

1. **Analyzes Input**: Determines whether the user's input is requesting text, image, or audio content
2. **Routes to Providers**: Uses a strict queue-based system to select the appropriate provider and model
3. **Handles Responses**: Processes and displays the responses in a unified interface

## Architecture

- **Smart Mode Detection**: Uses a language model to classify user inputs as text, image, or audio requests
- **Queue-Based Selection**: Providers and models are tried in the exact order they appear in credentials.json
- **APICenter Integration**: All API calls are made through APICenter for standardized access
- **Modern Web Interface**: Clean and responsive UI for interacting with various AI models

## Credentials System

Pseudo uses a credentials.json file that follows this structure:

```json
{
  "modes": {
    "text": {
      "providers": {
        "openai": {
          "api_key": "YOUR_OPENAI_API_KEY",
          "organization": "YOUR_ORG_ID",
          "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"]
        },
        "anthropic": {
          "api_key": "YOUR_ANTHROPIC_API_KEY",
          "models": ["claude-2", "claude-3-opus", "claude-3-sonnet"]
        }
      }
    },
    "image": {
      "providers": {
        "openai": {
          "api_key": "YOUR_OPENAI_API_KEY",
          "organization": "YOUR_ORG_ID",
          "models": ["dall-e-2", "dall-e-3"]
        },
        "stability": {
          "api_key": "YOUR_STABILITY_API_KEY",
          "models": ["stable-diffusion-v1-5", "stable-diffusion-xl"]
        }
      }
    },
    "audio": {
      "providers": {
        "elevenlabs": {
          "api_key": "YOUR_ELEVENLABS_API_KEY",
          "models": ["eleven_monolingual_v1", "eleven_multilingual_v2"]
        }
      }
    }
  }
}
```

The system strictly follows a queue-based approach:
- Providers are tried in exactly the order they appear in the JSON (top to bottom)
- Models within each provider are tried in exactly the order they appear in the array (left to right)
- If a provider or model fails, the system automatically tries the next one in the queue
- No default providers or models are used - only those specified in credentials.json

### Queue Order Matters

The order of providers and models in your credentials.json is critical:
- The first provider listed for each mode will be tried first
- The first model listed for each provider will be tried first
- Rearranging the order changes the priority of which services are used

## Example Usage

- Type "Tell me about quantum physics" to get a text response
- Type "Generate an image of a sunset over mountains" to get an image
- Type "Convert to speech: Welcome to the future of AI" to get audio

## APICenter Integration

Pseudo uses APICenter for all AI provider interactions:

1. **Content Type Detection**: Uses the first available text provider to determine if input requires text, image, or audio
2. **Provider Queue Processing**: Tries each provider and model in the exact order specified in credentials.json
3. **Standardized Response Handling**: Processes different response formats from various providers
4. **Automatic Fallback**: If one provider fails, automatically tries the next in the queue

No default providers are hardcoded - the system strictly follows the queue as defined in credentials.json.

## Technical Details

### Directory Structure

```
pseudo/
├── pseudo/                 # Main package
│   ├── app/                # Frontend components
│   │   ├── static/         # Static assets
│   │   └── templates/      # HTML templates
│   └── core/               # Backend code
│       ├── services/       # Service modules
│       │   ├── chat_history/   # Chat history management
│       │   ├── content_router.py  # Content routing logic
│       │   └── media_manager.py   # Media file handling
│       ├── app.py          # Flask application
│       ├── config.py       # Configuration
│       └── routes.py       # API routes
├── chat_history/           # Stored chat histories
├── credentials.json        # API credentials
└── pyproject.toml          # Poetry configuration
```

### Chat History

Pseudo keeps a record of all conversations, including:
- Text messages between user and AI
- Generated images and audio files
- Metadata about each chat session

Users can:
- Start new chat sessions
- Resume previous conversations
- Download generated media
- Delete chat history entries

### Media Handling

Media files (images and audio) are:
- Saved to the media directory
- Associated with specific chat sessions
- Easily downloadable via the UI
- Preserved between application restarts

## 🚀 Overview

Pseudo is a web application that:

1. Takes natural language input from a user
2. Automatically determines the appropriate content type (text, image, or audio)
3. Routes the request to the right AI model
4. Returns the generated content

This allows users to interact with a single unified interface while Pseudo intelligently selects the best tool for the job.

## ✨ Features

- **Smart Content Detection**: Automatically detects whether the user wants text, image, or audio generation
- **Multiple AI Providers**: Supports multiple AI providers through the APICenter library:
  - **Text**: OpenAI, Anthropic, Ollama (local models)
  - **Image**: OpenAI DALL-E, Stability AI
  - **Audio**: ElevenLabs
- **Model Selection**: Automatically selects appropriate models based on content type
- **Credential Management**: Simple JSON file configuration for API keys
- **Modern UI**: Clean, responsive interface with light/dark mode support

## 🔧 Technology Stack

- **Backend**: Python with Flask
- **Frontend**: HTML, CSS, JavaScript
- **AI Integration**: [APICenter](https://github.com/alishchhetri/apicenter) for universal API access
- **Local Models**: Ollama for running models locally

## 📋 Requirements

- Python 3.12+
- Ollama (for local model support and content type detection)
- API keys for desired services

## 📝 Configuration

Pseudo uses a `credentials.json` file to store API keys. You need to manually edit this file to add your API keys:

```json
{
    "modes": {
        "text": {
            "providers": {
                "openai": {
                    "api_key": "your-openai-api-key",
                    "models": ["gpt-4", "gpt-3.5-turbo"]
                },
                "anthropic": {
                    "api_key": "your-anthropic-api-key",
                    "models": ["claude-3-opus", "claude-3-sonnet"]
                }
            }
        },
        "image": {
            "providers": {
                "openai": {
                    "api_key": "your-openai-api-key",
                    "models": ["dall-e-3"]
                }
            }
        }
    }
}
```

The order of providers and models in the file determines the priority in which they are used:
- Providers are tried from top to bottom
- Models within a provider are tried from left to right
- If one fails, the next in line is automatically tried

## 🧠 How It Works

1. When a user enters a prompt, it's sent to the first available text provider in credentials.json (using APICenter)
2. The system uses this provider to classify the intent as text, image, or audio generation
3. Based on this classification, the prompt is routed to the appropriate AI services via APICenter, trying providers and models in the order they appear in credentials.json
4. The response is displayed to the user in the appropriate format

## 📄 License

MIT License
