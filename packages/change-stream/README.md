# On-It-Chef Change Stream

A robust, resumable MongoDB change stream implementation for processing recipe version metrics and other database changes.

## Features

- **Resumable**: Automatically resumes from the last processed change using resume tokens
- **Heartbeat System**: Prevents resume token expiration by maintaining active change stream
- **Error Handling**: Robust error handling with graceful degradation
- **TypeScript**: Full TypeScript support with proper type definitions
- **Docker Ready**: Includes Docker and docker-compose setup for easy deployment
- **Collection Filtering**: Skip processing changes from specific collections to prevent infinite loops

## Architecture

The change stream uses two helper collections:

1. **resumeTokens**: Stores the latest processed resume token for each database
2. **changeStreamHeartbeats**: Maintains active change stream by updating timestamps

## Installation

```bash
# Install dependencies
bun install

# Build the package
bun run build

# Run in development mode
bun run dev

# Run the example
bun run example
```

## Docker Setup

```bash
# Build and run with docker-compose
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down
```

## Usage

### Basic Example

```typescript
import { ChangeStream, Logger } from "@on-it-chef/change-stream";
import { MongoClient } from "@on-it-chef/core";

async function main() {
  const client = new MongoClient("mongodb://localhost:27017/onItChef");
  await client.connect();

  const db = client.db("onItChef");

  const changeStream = new ChangeStream(
    db,
    "changeStreamHeartbeats",
    "resumeTokens",
    {
      collectionsToIgnore: ["resumeTokens", "changeStreamHeartbeats"],
    }
  );

  // Register handlers for different types of changes
  changeStream.registerHandler(async (change) => {
    if (change.ns.coll === "recipeVersions") {
      // Process recipe version changes
      Logger.info(`Processing recipe version change: ${change.operationType}`);

      // Your processing logic here
      // e.g., update materialized views, metrics, etc.
    }
  });

  // Start the change stream
  await changeStream.start();
}

main().catch(console.error);
```

### Advanced Example with Multiple Handlers

```typescript
import { ChangeStream, ChangeStreamHandler } from "@on-it-chef/change-stream";

// Handler for recipe version changes
const recipeVersionHandler: ChangeStreamHandler = async (change) => {
  if (change.ns.coll === "recipeVersions") {
    switch (change.operationType) {
      case "insert":
        // Handle new recipe version
        break;
      case "update":
        // Handle recipe version update
        break;
      case "delete":
        // Handle recipe version deletion
        break;
    }
  }
};

// Handler for user changes
const userHandler: ChangeStreamHandler = async (change) => {
  if (change.ns.coll === "users") {
    // Process user changes
  }
};

// Register all handlers
changeStream.registerHandler(recipeVersionHandler);
changeStream.registerHandler(userHandler);
```

## Configuration

### Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `NODE_ENV`: Environment (development/production)

### Change Stream Options

- `collectionsToIgnore`: Array of collection names to skip processing
- `resumeAfter`: Resume token for resuming from a specific point
- All standard MongoDB change stream options

## Collections

### resumeTokens

```typescript
interface ResumeTokenV2 {
  dbName: string;
  resumeToken: any; // MongoDB resume token
  updatedAt: Date;
}
```

### changeStreamHeartbeats

```typescript
interface ChangeStreamHeartbeat {
  dbName: string;
  heartbeatTimestamp: Date;
}
```

## Error Handling

The change stream includes comprehensive error handling:

- Individual handler failures don't stop the entire stream
- Failed changes are logged but processing continues
- Automatic retry logic for database operations
- Graceful shutdown capabilities

## Development

```bash
# Run tests
bun test

# Build for production
bun run build

# Start production server
bun start
```

## Docker Development

```bash
# Build the image
docker build -t onitchef-change-stream .

# Run the container
docker run -p 3000:3000 onitchef-change-stream

# View logs
docker logs <container-id>
```

## Monitoring

The change stream provides comprehensive logging:

- Change stream start/stop events
- Individual change processing
- Handler execution status
- Heartbeat updates
- Error conditions

## Best Practices

1. **Always specify collectionsToIgnore** to prevent infinite loops
2. **Handle errors gracefully** in your change handlers
3. **Use appropriate indexes** on the helper collections
4. **Monitor heartbeat frequency** to ensure resume tokens stay fresh
5. **Implement proper shutdown** procedures for production deployments

## Troubleshooting

### Common Issues

1. **Resume token expired**: Check heartbeat collection updates
2. **Infinite loops**: Verify collectionsToIgnore configuration
3. **Memory leaks**: Ensure proper cleanup in handlers
4. **Connection issues**: Verify MongoDB connection string and network access

### Debug Mode

Enable debug logging by setting the log level in your environment:

```bash
export LOG_LEVEL=debug
```

## License

This project is part of the On-It-Chef application suite.
