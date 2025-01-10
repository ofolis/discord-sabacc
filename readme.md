![alt text](https://github.com/ofolis/discord-sabacc/raw/main/images/sabacc-logo.png "Sabacc Logo")

# discord-sabacc

A Discord bot that allows users to play [Kessel Sabacc](https://starwars.fandom.com/wiki/Kessel_Sabacc). This is the version of Sabacc played in the Star Wars Outlaws videogame.

**PLEASE NOTE:** Version 1 does not have shift tokens. Obviously it's still fully playable, but that mechanic isn't implemented yet.

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
2. Install Node.js (if you have not already).
3. Run `npm install`.
4. Create a `.env` file in the project root (you can rename the example included in the files).
   1. Add the `DISCORD_APPLICATION_ID` value noted earlier.
   2. Add the `DISCORD_BOT_TOKEN` value noted earlier.

### Local Machine Cont. (for development only)

1. Install the project's version of Node.js.
   1. [Install Node Version Manager.](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)
   2. Run `nvm use` in the project directory.
2. Set up VSCode (if applicable).
   1. Install required plugins:
      - **ESLint**
      - **Prettier**
   2. Install optional plugins:
      - **commitlint**
      - **Markdown All in One**
      - **npm Intellisense**
      - **Sort JSON objects**

## Usage

### Local Machine

1. In the project directory:
   1. Run `npm start`.

## Playing Sabacc

Here are some resources to teach you how to play:

- [Hyperspace Props' Sabacc Rules](https://hyperspaceprops.com/wp-content/uploads/2024/09/Kessel-Sabacc-Rules-v4.pdf)
- [Wookieepedia's Article](https://starwars.fandom.com/wiki/Kessel_Sabacc)
