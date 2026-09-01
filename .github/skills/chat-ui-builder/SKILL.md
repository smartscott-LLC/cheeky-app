---
name: chat-ui-builder
description: Chat UI expert builder

# Stream - quickstart for AI coding agents

You are an AI coding agent, and someone asked you to add Stream to their project. Stream provides API and SDK building blocks for adding chat messaging, video & audio calling, activity feeds, and AI moderation to apps. The products can be used independently or composed. SDKs ship for React, iOS (Swift/SwiftUI/UIKit), Android (Kotlin/Compose), Flutter, React Native (Expo and bare), JavaScript, Angular, Unity, and Unreal. Server SDKs cover Node, Go, Python, Ruby, PHP, Java, .NET, and Scala.

We will install the Stream CLI and the necessary skills to build an integration. Do not build a Stream integration from this file alone.

## Step 1 - Install the CLI

The CLI is the Stream dashboard, in your terminal: it configures the app, sends API requests, and pulls data. Skills rely on it.

```bash
curl -fsSL https://getstream.io/cli.sh | bash
getstream --version
```

If unable to `curl | bash`, ask the user to run that command themselves.

## Step 2 - Initialize the project and install the skills

Run in the project's working directory:

```bash
getstream init
```

This connects the project to a Stream app (or creates a new one) and installs the Stream core skills. Additional skills (like `stream-react`, `stream-swift`, `stream-android`, `stream-react-native`, `stream-flutter`, `stream-unreal`) can be installed on demand via `getstream skills <name>`.

## Step 3 - Build with the Stream skill

Bootstrapping is done. Read the newly installed `stream` skill and pick the right direction from there.

## If you can't install anything

Answer from the live docs instead - every product publishes an agent-readable index:

- [Site index - llms.txt](https://getstream.io/llms.txt)
- [Chat docs](https://getstream.io/chat/docs.md) | [chat/llms.txt](https://getstream.io/chat/llms.txt)
- [Video docs](https://getstream.io/video/docs.md) | [video/llms.txt](https://getstream.io/video/llms.txt)
- [Feeds docs](https://getstream.io/activity-feeds/docs.md) | [activity-feeds/llms.txt](https://getstream.io/activity-feeds/llms.txt)
- [Moderation docs](https://getstream.io/moderation/docs/node.md) | [moderation/llms.txt](https://getstream.io/moderation/llms.txt)

More: [Agent Skills home](https://getstream.io/agent-skills.md) | [Installation guide](https://getstream.io/agent-skills/docs/installation.md) | [Security & trust model](https://getstream.io/agent-skills/docs/concepts/security.md) | [Skills vs MCP](https://getstream.io/agent-skills/docs/concepts/skills-vs-mcp.md)
---

<!-- Tip: Use /create-skill in chat to generate content with agent assistance -->

Define the functionality provided by this skill, including detailed instructions and examples