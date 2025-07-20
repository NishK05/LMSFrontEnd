# Ollama Setup for AI Chat

To enable the full AI chat functionality with your course documents, you need to install and configure Ollama.

## Installation

### macOS
```bash
# Install via Homebrew
brew install ollama

# Or download from https://ollama.ai
```

### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows
Download from https://ollama.ai

## Setup

1. **Start Ollama**
   ```bash
   ollama serve
   ```

2. **Install the Mistral model**
   ```bash
   ollama pull mistral
   ```

3. **Verify installation**
   ```bash
   ollama list
   ```

## Testing

Once Ollama is running with the Mistral model, your chat interface will automatically use the AI-powered responses based on your course documents.

The chat will:
- Search through your uploaded course documents
- Provide contextual answers based on the content
- Reference specific files when answering questions

## Troubleshooting

- Make sure Ollama is running on port 11434
- Verify the Mistral model is installed: `ollama list`
- Check that the ClassGPT service is running: `curl http://localhost:8000/ping`

## Current Status

Without Ollama, the chat will still work but will provide basic course information instead of AI-powered responses based on your documents. 