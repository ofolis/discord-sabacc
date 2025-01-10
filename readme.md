![alt text](https://github.com/ofolis/discord-sabacc/raw/main/images/sabacc-logo.png "Sabacc Logo")

# discord-sabacc

A Discord bot that allows users to play Kessel Sabacc. This is the version of Sabacc played in the Star Wars Outlaws videogame.

## Setup

### Discord

1. Open your [Discord developer portal](https://discord.com/developers/applications).
2. Create a new application.
3. Set any desired aesthetic items in the **General Information** section.
4. In the **General Information** section:
   1. **Save the application ID value for later.**
      In the **Installation** section:
   2. Ensure that **Guild Install** is the only context method.
   3. Disable the install link.
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

### Local Machine

1. Clone this repository.
2. Install Node.js (if you have not already).<br>**RECOMMENDED APPROACH:**
   1. [Install Node Version Manager.](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)
   2. Run `nvm use` in the project directory.
3. Run `npm install` in the project directory.
4. Create a `.env` file in the project root (you can rename the example included in the files).
5. Add the `DISCORD_APPLICATION_ID` value noted earlier.
6. Add the `DISCORD_BOT_TOKEN` value noted earlier.

### VS Code (optional)

1. Install required VSCode plugins:
   - **ESLint**
   - **Prettier**
2. Install optional VSCode plugins:
   - **commitlint**
   - **Markdown All in One**
   - **npm Intellisense**
   - **Sort JSON objects**

## Run

### Local Machine

1. In the project directory:
   1. Run `npm run build`.
   2. Run `npm start`.
