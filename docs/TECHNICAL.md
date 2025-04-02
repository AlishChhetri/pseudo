# Pseudo Technical Documentation

This document provides detailed technical information about the internal workings of Pseudo, intended for developers who want to understand or contribute to the project.

## System Architecture

Pseudo is built as a Flask web application with a Python backend and a vanilla JavaScript frontend. The application follows a modular architecture with clear separation of concerns:

### Backend Components

1. **Core Application (`app.py`)**: Flask application setup and entry point
2. **Config Management (`config.py`)**: Configuration loading and environment variable handling
3. **Routes (`routes.py`)**: API endpoints and HTTP request handling
4. **Content Router (`content_router.py`)**: Routes user inputs to appropriate AI providers
5. **Chat History Manager (`chat_history.py`)**: Manages persistent chat storage
6. **Media Manager (`media_manager.py`)**: Handles media file operations

### Frontend Components

1. **Chat Interface (`chat.js`)**: Manages the main chat UI and messaging logic
2. **Sidebar (`sidebar.js`)**: Handles chat history navigation and management
3. **Styles (`styles.css`)**: Modern dark UI theme and responsive design

## Chat History System

The chat history system is designed to provide persistent storage of all conversations including text, images, and audio files. It has several key components:

### Directory Structure

```
chat_history/
├── history.json                # Global index of all chats
└── [chat-uuid]/                # Individual chat directory
    ├── metadata.json           # Chat metadata and messages
    └── media/                  # Media storage
        ├── image_[timestamp].png  # Image files
        └── audio_[timestamp].mp3  # Audio files
```

### Global Index (history.json)

The `history.json` file maintains a sorted list of all chats with minimal metadata for fast loading in the sidebar:

```json
{
  "chats": [
    {
      "id": "186be78d-b48f-4c9f-9216-f0a3a0336f4c",
      "title": "Generate an image of a cat",
      "created_at": "2025-04-02T03:58:00.466127",
      "updated_at": "2025-04-02T03:58:53.466127"
    },
    ... additional chats ...
  ]
}
```

### Chat Metadata (metadata.json)

Each chat has its own `metadata.json` file containing full details:

```json
{
  "id": "186be78d-b48f-4c9f-9216-f0a3a0336f4c",
  "title": "Generate an image of a cat",
  "created_at": "2025-04-02T03:58:00.466127",
  "updated_at": "2025-04-02T03:58:53.466127",
  "messages": [
    {
      "role": "user",
      "content": "Generate an image of a cat",
      "timestamp": "2025-04-02T03:58:00.466127"
    },
    {
      "role": "assistant",
      "mode": "image",
      "content": "Generated content",
      "media": "image_20250402_035853.png",
      "provider": "openai",
      "model": "dall-e-3",
      "timestamp": "2025-04-02T03:58:53.466127"
    }
  ]
}
```

### Migration System

The application includes an automatic migration system to handle changes in the chat history storage location. When the application starts:

1. It checks for the existence of the chat history in both the old and new locations
2. If content exists in the old location, it is copied to the new location
3. After successful migration, a README.txt file is placed in the old directory

This ensures backward compatibility when the storage location changes.

## Media Handling

Pseudo handles three types of content: text, images, and audio. Each has unique handling requirements:

### Text Content

Text content is directly stored in the message objects within the chat's metadata.json file.

### Image Content

Images are processed through the following workflow:

1. The Content Router selects the appropriate image provider and model
2. The image is generated and returned (either as raw bytes or URL)
3. The MediaManager and ChatManager work together to:
   - Save the image to the chat's media directory
   - Record the reference in the message object's `media` field
4. When loading the chat, image paths are converted to proper URLs
5. Frontend code loads images with loading states and error handling

### Audio Content

Audio follows a similar workflow to images:

1. The Content Router selects the audio provider
2. Audio is generated and returned (as bytes or URL)
3. The audio file is saved to the chat's media directory
4. Reference is stored in the message object
5. Frontend renders an audio player element with controls

## State Management

### Backend State

The backend maintains state through:

1. **Chat Manager Context**: Flask's application context (`g` object) maintains the ChatManager instance
2. **Filesystem**: Persistent state is stored in the filesystem structure
3. **In-Memory Caching**: Some operations use in-memory caching for performance

### Frontend State

The frontend manages state through several mechanisms:

1. **Current Chat**: Tracks the active chat ID and message history
2. **Temporary Chats**: New chats start with a temporary ID until first message is sent
3. **Chat ID Mapping**: Maps temporary IDs to real IDs to maintain consistency
4. **Event Dispatching**: Custom events for communication between modules
5. **DOM Updates**: Real-time UI updates reflect the current state

### Chat Lifecycle

A typical chat follows this lifecycle:

1. **Creation**: 
   - User clicks "New Chat" or loads the app for the first time
   - A temporary ID is generated (e.g., `temp-1649234982`)
   - UI displays empty chat with welcome screen

2. **First Message**:
   - User sends first message
   - Backend creates a new chat with UUID
   - Message is processed and saved
   - Temporary ID is mapped to real UUID

3. **Navigation**:
   - User can switch between chats via sidebar
   - UI state is preserved when switching
   - ID mapping ensures consistency

4. **Deletion**:
   - User clicks delete on a chat
   - Visual feedback is immediate (optimistic UI)
   - Backend removes the chat directory
   - UI updates to show next chat or create new chat

## Error Handling

Pseudo implements comprehensive error handling:

### Backend Errors

1. **Provider Fallback**: If one AI provider fails, system tries the next in queue
2. **Media Processing**: Errors during media handling are logged and gracefully managed
3. **Exception Logging**: All errors are properly logged with details
4. **Clean State**: System maintains a clean state even after errors

### Frontend Errors

1. **Loading States**: UI shows loading indicators during operations
2. **Error Recovery**: Failed operations can be retried
3. **Error Visualization**: Clear visual feedback for errors
4. **Fallback Content**: Default content shown when media fails to load

## Integration with APICenter

Pseudo interacts with APICenter through the ContentRouter module:

1. **Provider Setup**: Content Router loads credentials and configures providers
2. **Mode Detection**: Uses LLMs to detect the intended mode (text, image, audio)
3. **Prompt Processing**: Cleans user input to extract core content
4. **Model Selection**: Chooses appropriate model based on configuration
5. **Response Handling**: Processes various response formats into standardized structure

## Development Guidelines

### Adding New Features

1. **Backend Extensions**: 
   - Add new routes in `routes.py`
   - Extend service modules in `services/`
   - Maintain backward compatibility with existing chat history format

2. **Frontend Extensions**:
   - Add new functionality in appropriate JS file
   - Follow existing patterns for state management
   - Use CSS variables for styling

### Testing

1. **Manual Testing**:
   - Test each content type (text, image, audio)
   - Verify chat history persistence
   - Check error handling by intentionally causing failures

2. **Performance Testing**:
   - Monitor memory usage with large chat histories
   - Test with various media file sizes

### Common Issues

1. **Chat History Issues**:
   - Check file permissions in chat history directory
   - Verify JSON format in metadata files
   - Use migration function to fix location problems

2. **Media Issues**:
   - Ensure proper media directory exists
   - Check file permissions
   - Verify correct URL paths in frontend 