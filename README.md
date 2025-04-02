# Pseudo: Simulation of Omni Model Behavior

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)

## Overview

Pseudo is an intelligent request classification and routing system that dynamically directs user inputs to appropriate AI models based on content analysis. Its foundational premise is the "anything in, anything out" paradigm—though the current implementation processes text inputs and produces text, image, or audio outputs.

Developed as an application of [APICenter](https://github.com/alishchhetri/apicenter), Pseudo demonstrates how a standardized API abstraction layer can significantly reduce integration complexity when working with multiple AI service providers.

## Core Functionality

Pseudo implements a multi-stage processing pipeline:

1. **Intent Classification**: Analyzes natural language inputs to determine the intended output modality (text, image, or audio)
2. **Content Normalization**: Extracts the semantically relevant content by removing modality-specific instructions
3. **Gateway Routing**: Directs normalized inputs to appropriate AI services via a deterministic selection algorithm
4. **Response Normalization**: Standardizes diverse response formats into consistent user-facing presentations
5. **Persistent Storage**: Saves all content locally, including text, images, and audio, for future reference

## Architecture

Pseudo employs a three-tier architecture:

1. **Gateway System**: Implements classification, normalization, and routing logic to direct requests to appropriate services
2. **Persistence Layer**: Manages conversation state, media artifacts, and provider metadata across sessions
3. **Presentation Layer**: Provides a unified interface for interacting with multiple underlying AI capabilities

Pseudo utilizes APICenter as an abstraction layer, enabling modality-specific functionality while maintaining independence from provider-specific implementation details.

## Project Structure

```
pseudo/
├── pseudo/                   # Main package
│   ├── app/                  # Frontend components
│   │   ├── static/           # Static assets (CSS, JS)
│   │   │   ├── css/          # Stylesheets
│   │   │   └── js/           # JavaScript files (chat.js, sidebar.js)
│   │   └── templates/        # HTML templates
│   └── core/                 # Backend implementation
│       ├── services/         # Service modules
│       │   ├── chat_history.py   # Chat history management
│       │   ├── content_router.py # Gateway routing logic
│       │   └── media_manager.py  # Media file handling
│       ├── app.py            # Flask application entry point
│       ├── config.py         # Configuration settings
│       └── routes.py         # API endpoints
├── chat_history/             # Stored chat sessions and media files
├── credentials.json          # API credentials configuration
└── pyproject.toml            # Poetry project configuration
```

## Key Features

### Modern Chat Interface
- **Real-time Chat Updates**: Messages are instantly displayed and saved
- **Multi-Modal Responses**: Handles text, images, and audio seamlessly
- **Interactive Chat History**: Browse and switch between past conversations
- **Local Media Storage**: All images and audio are saved locally in specific folders

### Chat History Management
- **Persistent Storage**: All conversations are automatically saved
- **Conversation Browsing**: Easily access past conversations from the sidebar
- **Media Organization**: Images and audio files are stored in specific directories
- **Automatic Titling**: Chat titles are generated from the content of the first message

### Intelligent Content Routing
- **Automatic Mode Detection**: Determines whether to generate text, image, or audio based on user input
- **Fallback Mechanisms**: If one provider fails, the system tries alternative providers
- **Content Normalization**: Extracts the relevant content from user instructions

## APICenter Integration

Pseudo leverages APICenter's unified interface to interact with heterogeneous AI providers:

- **Text Generation**: OpenAI, Anthropic, Ollama (local models)
- **Image Generation**: OpenAI DALL-E, Stability AI
- **Audio Generation**: ElevenLabs

This integration decouples Pseudo's core routing logic from provider-specific implementations, allowing the system to focus on content classification and appropriate service selection while APICenter manages the complexities of different API specifications.

## Getting Started

### Prerequisites

- Python 3.12+
- [Poetry](https://python-poetry.org/docs/#installation) for dependency management
- API keys for desired AI services

### Installation

Pseudo requires APICenter to be installed as a sibling directory since it's not available on PyPI. The setup is simple:

1. Create a directory to contain both projects:
```bash
mkdir pseudo-project
cd pseudo-project
```

2. Clone both repositories side by side:
```bash
git clone https://github.com/alishchhetri/apicenter.git
git clone https://github.com/alishchhetri/pseudo.git
```

The resulting directory structure should look like this:
```
pseudo-project/
├── apicenter/        # APICenter repository
└── pseudo/           # Pseudo repository
```

3. Install Pseudo dependencies:
```bash
cd pseudo
poetry install
```

4. Configure your API credentials in `credentials.json` (see Configuration section)

5. Run the application:
```bash
poetry run pseudo
```

The application will be available at http://localhost:5000

## Configuration

Pseudo utilizes a `credentials.json` file to define available AI providers and their associated models. The hierarchical structure of this file determines the priority sequence for provider and model selection.

```json
{
  "modes": {
    "text": {
      "providers": {
        "openai": {
          "api_key": "YOUR_OPENAI_API_KEY",
          "organization": "YOUR_ORG_ID",
          "models": ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]
        },
        "anthropic": {
          "api_key": "YOUR_ANTHROPIC_API_KEY",
          "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"]
        },
        "ollama": {
          "models": ["llama3", "mistral", "phi3"]
        }
      }
    },
    "image": {
      "providers": {
        "openai": {
          "api_key": "YOUR_OPENAI_API_KEY",
          "organization": "YOUR_ORG_ID",
          "models": ["dall-e-3", "dall-e-2"]
        },
        "stability": {
          "api_key": "YOUR_STABILITY_API_KEY",
          "models": ["stable-diffusion-xl", "stable-diffusion-v1-5"]
        }
      }
    },
    "audio": {
      "providers": {
        "elevenlabs": {
          "api_key": "YOUR_ELEVENLABS_API_KEY",
          "models": ["eleven_multilingual_v2", "eleven_monolingual_v1"]
        }
      }
    }
  }
}
```

### Environment Variables

You can customize Pseudo's behavior with the following environment variables:

- `CHAT_HISTORY_DIR`: Override the default location for storing chat history
- `CREDENTIALS_FILE`: Specify a custom path for the credentials.json file
- `FLASK_HOST`: Set the host address (default: 0.0.0.0)
- `FLASK_PORT`: Set the port number (default: 5000)
- `FLASK_DEBUG`: Enable/disable debug mode (default: True)

## Chat History Management

Pseudo maintains a comprehensive chat history system that:

1. Stores all conversations in individual directories within the `chat_history` folder
2. Organizes media files (images, audio) in specific `media` subdirectories
3. Maintains a global index of all chats in `history.json`
4. Tracks chat metadata including creation time, update time, and messages
5. Automatically migrates conversations if chat history location changes

Each chat has its own directory with the following structure:
```
chat_history/
├── history.json                       # Global chat index
└── [chat-uuid]/                       # Individual chat directory
    ├── metadata.json                  # Chat metadata and messages
    └── media/                         # Media files directory
        ├── image_20250402_123456.png  # Image files
        └── audio_20250402_123456.mp3  # Audio files
```

## Usage Examples

- **Text Generation**: "Explain the concept of quantum entanglement in simple terms"
- **Image Creation**: "Generate an image of a futuristic city with flying cars"
- **Audio Synthesis**: "Convert to speech: Welcome to the future of artificial intelligence"

All generated media is automatically saved in the chat history for future reference, and can be easily downloaded through the user interface.

## Technical Implementation

Pseudo's integration with APICenter follows a structured four-phase process:

1. **Modality Classification**: Employs natural language understanding to analyze and classify inputs according to intended output modality
2. **Provider Resolution**: Traverses the provider hierarchy according to the deterministic selection algorithm
3. **Response Normalization**: Processes heterogeneous response formats into standardized representations
4. **Media Storage**: Automatically saves images and audio files locally for persistence
5. **Exception Handling**: Implements graceful degradation by sequentially attempting alternative providers when errors occur

This methodology enables Pseudo to abstract the complexities of multiple AI services while providing users with a unified interface that automatically selects appropriate modalities and providers based on natural language inputs.

## Frontend Architecture

The frontend is built using vanilla JavaScript and consists of several key components:

- **chat.js**: Handles the main chat functionality and message rendering
- **sidebar.js**: Manages the chat history sidebar and navigation
- **styles.css**: Contains all styling for the application

The interface implements several advanced features:
- Real-time UI updates when switching between chats
- Persistent chat state using browser-server synchronization
- Media rendering with loading states and error handling
- Responsive design for mobile and desktop
- Toast notifications for user feedback

## License

This project is licensed under the MIT License - see the LICENSE file for details.
