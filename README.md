# Hevy Importer

A CLI tool to import workout plans from PDFs into Hevy using Claude AI for PDF processing and intelligent exercise matching.

## Features

- 📄 **PDF Processing**: Uses Claude AI to extract structured workout data from PDFs
- 🏋️ **Smart Exercise Matching**: Fuzzy matching to map PDF exercises to Hevy templates
- 📁 **Organized Import**: Creates folders for workout programs and routines for each week
- 👀 **Preview Mode**: See what would be imported before actually importing
- ⚙️ **Easy Setup**: Simple configuration of API keys

## Installation

```bash
npm install -g hevy-importer
```

Or run directly with npx:
```bash
npx hevy-importer
```

## Setup

Before using the tool, configure your API keys:

```bash
hevy-importer setup
```

You'll need:
- **Hevy API Key**: Get from https://hevy.com/settings?developer (requires Hevy Pro)
- **Claude API Key**: Get from https://console.anthropic.com/

## Usage

### Preview Import
See what would be imported without actually creating anything:
```bash
hevy-importer preview ./workout-plan.pdf
```

### Import Workout Plan
Import the workout plan into Hevy:
```bash
hevy-importer import ./workout-plan.pdf
```

## How It Works

1. **PDF Analysis**: Claude AI reads your PDF and extracts workout structure
2. **Exercise Matching**: Fuzzy matching maps PDF exercises to Hevy exercise templates
3. **Folder Creation**: Creates a routine folder for your workout program
4. **Routine Import**: Creates individual routines for each week/workout
5. **Organization**: Your 12-week program appears organized in Hevy

## Supported PDF Formats

The tool works best with PDFs that have:
- Clear weekly structure (Week 1, Week 2, etc.)
- Exercise names and set/rep schemes
- Organized workout days (Push, Pull, Legs, etc.)

## Troubleshooting

### API Connection Issues
- Verify your API keys are correct
- Check that you have Hevy Pro subscription
- Ensure Claude API has sufficient credits

### Exercise Matching Issues
- The tool uses fuzzy matching for exercise names
- Preview mode shows which exercises will be matched
- Unmatched exercises may need manual review

### PDF Processing Issues
- Ensure PDF is text-based (not scanned images)
- Complex layouts may require manual review
- Multi-page PDFs are supported

## Development

```bash
# Clone the repository
git clone <repo-url>
cd hevy-importer

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Configuration

Configuration is stored in `~/.hevy-importer/config.json`:

```json
{
  "hevyApiKey": "your-hevy-api-key",
  "claudeApiKey": "your-claude-api-key"
}
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Verify your API keys and permissions