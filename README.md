# Pseudo - Smart Content Router

Pseudo is a Flask-based web application that mimics the behavior of an omni-model AI system using a "smart selection" mechanism. It intelligently routes user inputs to the appropriate AI mode (text, image, or audio) using APICenter as the underlying API management tool.

## How It Works

Pseudo uses a smart content routing system that:

1. **Analyzes Input**: Determines whether the user's input is requesting text, image, or audio content
2. **Routes to Providers**: Uses a queue-based system to select the appropriate provider and model
3. **Handles Responses**: Processes and displays the responses in a unified interface

## Architecture

- **Smart Mode Detection**: Uses a language model to classify user inputs as text, image, or audio requests
- **Queue-Based Selection**: Providers and models are arranged in a priority queue in credentials.json
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

The system follows a queue-based approach:
- Providers are tried from top to bottom in each mode section
- Models within each provider are tried from left to right

## Installation & Setup

### Prerequisites

- Python 3.12 or higher
- Poetry for dependency management

### Setup

Pseudo uses Poetry's path dependency feature to integrate with APICenter. Here's how to set it up:

1. Clone both Pseudo and APICenter repositories into the same parent directory:
   
   ```bash
   mkdir ai-projects
   cd ai-projects
   git clone https://github.com/user/apicenter.git
   git clone https://github.com/user/pseudo.git
   ```

2. Install dependencies with Poetry:
   
   ```bash
   cd pseudo
   poetry install
   ```

   This will automatically set up APICenter in development mode from the relative path.

### Running Pseudo

1. Set up your credentials.json file with your API keys in the project root

2. Run the application using Poetry:
   
   ```bash
   poetry run python -m pseudo.core.app
   ```

   Or use the CLI entry point:

   ```bash
   poetry run pseudo
   ```

3. Open your browser and navigate to http://localhost:5000

## Example Usage

- Type "Tell me about quantum physics" to get a text response
- Type "Generate an image of a sunset over mountains" to get an image
- Type "Convert to speech: Welcome to the future of AI" to get audio

## APICenter Integration

Pseudo demonstrates the power and flexibility of the APICenter library by using it to:

1. **Standardize API Calls**: All provider calls use the same consistent interface
2. **Handle Authentication**: API keys are managed through the credentials system
3. **Process Responses**: Responses from different providers are normalized
4. **Implement Fallbacks**: If one provider/model fails, it automatically tries the next in queue

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
- **Model Selection**: Allows users to manually select specific models if desired
- **Settings Management**: Easy-to-use interface for managing API keys and provider settings
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

## 🚀 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/pseudo.git
   cd pseudo
   ```

2. Install dependencies using Poetry:

   ```bash
   poetry install
   ```

3. Run the application:

   ```bash
   poetry run pseudo
   ```

4. Open your browser and navigate to `http://localhost:5000`

## 📝 Configuration

Pseudo uses a `credentials.json` file to store API keys. You can add your API keys through the web interface under Settings, or directly edit the file:

```json
{
    "modes": {
        "text": {
            "providers": {
                "openai": {
                    "api_key": "your-openai-api-key"
                },
                "anthropic": {
                    "api_key": "your-anthropic-api-key"
                }
            }
        },
        "image": {
            "providers": {
                "openai": {
                    "api_key": "your-openai-api-key"
                },
                "stability": {
                    "api_key": "your-stability-api-key"
                }
            }
        },
        "audio": {
            "providers": {
                "elevenlabs": {
                    "api_key": "your-elevenlabs-api-key"
                }
            }
        }
    }
}
```

## 🧠 How It Works

1. When a user enters a prompt, it's sent to an LLM (Ollama with `deepseek-r1`) that acts as a content classifier.
2. The classifier determines the likely intent: text, image, or audio generation.
3. Based on this classification, the prompt is routed to the appropriate AI service via APICenter.
4. The response is displayed to the user in the appropriate format.

## 📄 License

MIT License
