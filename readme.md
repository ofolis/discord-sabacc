![alt text](https://github.com/ofolis/discord-sabacc/raw/main/images/sabacc-logo.png "Sabacc Logo")

# discord-sabacc

A Discord bot that allows users to play [Kessel Sabacc](https://starwars.fandom.com/wiki/Kessel_Sabacc). This is the version of Sabacc played in the Star Wars Outlaws videogame.

Discord server members can create a Sabacc game in any channel where the bot is present (one active game per channel). Gameplay utilizes Discord messaging (not activities) so that players are able to play asynchronously.

## Setup

### 1. Create The Discord Bot

1. Open your [Discord developer portal](https://discord.com/developers/applications).
2. Create a new application.
3. In the **General Information** section:
   1. Set **Name** to `Sabacc` (or whatever you want it to appear in your server as).
   2. Optionally, upload an **App Icon**.
      - Use the `sabacc-logo.png` included in this project's `images` directory if you'd like.
   3. **Save the application ID value for later.**
4. In the **Installation** section:
   1. Ensure that **Guild Install** is the only context method.
   2. Disable the install link.
5. In the **OAuth2** section:
   1. Disable **Public Client**.
6. In the **Bot** section:
   1. Set any desired aesthetic items.
   2. Reset the token and **save the value for later**.
   3. Enable privileged gateway intents:
      - **Presence Intent**
      - **Server Memebers Intent**
      - **Message Content Intent**
7. Back in the **OAuth2** section:
   1. Create a guild install OAuth2 URL with only the `bot` scope.
8. Open the generated URL and install the bot in your Discord server.

### 2. Set Up The Application

> **NOTE:** these step-by-step instructions are for local setup/usage. Since this is a Node.js app, you can also run the bot on a remote server, but I'm not including those specific steps in this readme.

**Option 1 - For Usage Only**

1. Install [Node.js](https://nodejs.org).
2. Download the build ZIP file in [this project's latest release](https://github.com/ofolis/discord-sabacc/releases/latest) (not the source code).
3. Extract the folder somewhere on your machine.
4. Rename the `.env.example` file to `.env`.
5. Modify the `.env` file.
   1. Replace the `?` after `DISCORD_APPLICATION_ID=` with the value noted earlier.
   2. Replace the `?` after `DISCORD_BOT_TOKEN=` with the value noted earlier.
6. In the command line:
   1. Open the extracted folder.
   2. Run `npm install --ignore-scripts --omit=dev`.

**Option 2 - For Development & Usage**

1. Clone this repository.
2. Install the project's version of Node.js.
   1. [Install Node Version Manager.](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)
   2. Run `nvm use`.
3. Run `npm install`.
4. Modify the `.env.example` file.
   1. Add the `DISCORD_APPLICATION_ID` value noted earlier.
   2. Add the `DISCORD_BOT_TOKEN` value noted earlier.
5. Rename the `.env.example` file to `.env`.
6. Set up VSCode (if applicable).
   1. Install required plugins:
      - **ESLint**
      - **Prettier**
   2. Install optional plugins:
      - **commitlint**
      - **Markdown All in One**
      - **npm Intellisense**
      - **Sort JSON objects**
7. Run `npm run build`.

## Usage

### 1. Start The Bot

1. Run `npm start` in the local project directory.

### 2. Use The Bot

1. In your Discord server channel, execute the bot's commands.
   - `/new` - create a new game in the channel, optionally ending any active game.
   - `/info` - privately view the current game info, including your current items.
   - `/play` - complete any actions required for your turn.

## Sabacc Rules

Here are some resources to teach you how to play Kessel Sabacc:

- [Hyperspace Props' Sabacc Rules](https://hyperspaceprops.com/wp-content/uploads/2024/09/Kessel-Sabacc-Rules-v4.pdf)
- [Wookieepedia's Article](https://starwars.fandom.com/wiki/Kessel_Sabacc)

## Project Roadmap

This is simply to give you an idea of what is implemented and what is on my mind for the future. I have no specific timeline for these items.

| Status | Feature                                                       |
| ------ | ------------------------------------------------------------- |
| ✅     | Play the core game against human players. (MVP)               |
| 🔳     | Specify game player token total.                              |
| 🔳     | Use shift tokens.                                             |
| 🔳     | Play against AI players.                                      |
| 🔳     | See win/loss history & rankings.                              |
| 🔳     | Use a money mechanic (per-user credits, buyin, payout, etc.). |
| 🔳     | No longer see old/unnecessary bot output in the channel feed. |
