import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonInteraction,
  ComponentType,
  Message,
  InteractionCollector,
  CollectorFilter,
  TextChannel,
} from "discord.js";
import {
  Player,
  Session,
} from "../../types";
import {
  Utils,
} from "../../utils";
import {
  Discord,
} from "../../discord";
import {
  SessionStatus,
} from "../../enums";

export class Game {
  public static async createNewSession(guildId: string, channelId: string, startingPlayer: Player): Promise<void> {
    let gameStarted: boolean = false;
    const session: Session = {
      "channelId": channelId,
      "currentPlayerIndex": 0,
      "currentRoundIndex": 0,
      "currentTurnIndex": 0,
      "guildId": guildId,
      "players": [
        startingPlayer,
      ],
      "startingPlayer": startingPlayer,
      "status": SessionStatus.PENDING,
      "totalStartingTokens": 6,
    };
    Utils.saveData(
      guildId,
      channelId,
      session,
    );
    // Create buttons
    const joinButton: ButtonBuilder = new ButtonBuilder()
      .setCustomId("joinGame")
      .setLabel("Join Game")
      .setStyle(ButtonStyle.Primary);
    const startButton: ButtonBuilder = new ButtonBuilder()
      .setCustomId("startGame")
      .setLabel("Start Game")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true);
    const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(
      joinButton,
      startButton,
    );
    // Send initial message
    const channel: TextChannel | undefined = Discord.client.channels.cache.get(channelId) as TextChannel;
    if (channel === undefined) {
      throw new Error();
    }
    const gameMessage: Message = await channel.send({
      "content": `# New Game\nA new game was started by <@${startingPlayer.id}> (${startingPlayer.username}).\n## Players\n- <@${startingPlayer.id}> (${startingPlayer.username})\n\n**Click the button below to join!**`,
      "components": [
        row,
      ],
    });
    // Button interaction filter
    const collectorFilter: CollectorFilter<[ButtonInteraction]> = (i: ButtonInteraction) =>
      i.message.id === gameMessage.id && [
        "joinGame",
        "startGame",
      ].includes(i.customId);
    // Set up collector
    const collector: InteractionCollector<ButtonInteraction> = gameMessage.createMessageComponentCollector({
      "filter": collectorFilter,
      "componentType": ComponentType.Button,
      "time": 10 * 60 * 1000, // 10 minutes
    });
    collector.on(
      "collect",
      async(buttonInteraction: ButtonInteraction) => {
        if (buttonInteraction.customId === "joinGame") {
          if (!session.players.some(e => e.id === buttonInteraction.user.id)) {
            session.players.push({
              ...buttonInteraction.user,
              "totalPlayedTokens": 0,
              "totalUnplayedTokens": 0,
            });
            Utils.saveData(
              guildId,
              channelId,
              session,
            );
            // Update the message
            await gameMessage.edit({
              "content": `# New Game\nA new game was started by <@${startingPlayer.id}> (${startingPlayer.username}).\n## Players\n- ${session.players.map(p => `<@${p.id}> (${p.username})`).join("\n- ")}\n\n**Click the button below to join!**`,
              "components": [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                  joinButton,
                  startButton.setDisabled(session.players.length < 2), // Enable if 2+ players
                ),
              ],
            });
          }
          await buttonInteraction.deferUpdate(); // Acknowledge the interaction
        } else if (buttonInteraction.customId === "startGame") {
          // Lock the game
          await gameMessage.edit({
            "content": `# New Game\nA new game was started by <@${startingPlayer.id}> (${startingPlayer.username}).\n## Players\n- ${session.players.map(p => `<@${p.id}> (${p.username})`).join("\n- ")}\n\n**The game has started!**\n-# Use the **/info** command to view your hand and see game info.`,
            "components": [
            ], // Remove buttons
          });
          gameStarted = true;
          collector.stop(); // End the collector
          this.iterateSession(
            guildId,
            channelId,
          );
        }
      },
    );
    collector.on(
      "end",
      () => {
        // Handle expiration (if no one starts the game)
        if (!gameStarted && gameMessage.editable) {
          gameMessage.edit({
            "content": `# New Game\nA new game was started by <@${startingPlayer.id}> (${startingPlayer.username}).\n\n**Game setup timed out!**`,
            "components": [
            ],
          });
        }
      },
    );
  }

  private static async iterateSession(guildId: string, channelId: string): Promise<void> {
    const session: Session = this.getSession(
      guildId,
      channelId,
    );
    if (session.status === SessionStatus.PENDING) {
      // Starting game actions
      for (const player of session.players) {
        player.totalPlayedTokens = 0;
        player.totalUnplayedTokens = session.totalStartingTokens;
      };
      session.players = Utils.shuffleArray(session.players);
      session.startedAt = Date.now();
      session.status = SessionStatus.ACTIVE;
      Utils.saveData(
        guildId,
        channelId,
        session,
      );
    } else if (session.status !== SessionStatus.ACTIVE) {
      throw new Error(`Attempted to iterate session with status "${session.status}".`);
    }
    // Send initial message
    const channel: TextChannel | undefined = Discord.client.channels.cache.get(channelId) as TextChannel;
    if (channel === undefined) {
      throw new Error();
    }
    await channel.send({
      "content": `# <@${session.players[session.currentPlayerIndex].id}>'s Turn\n**Round:** \`${session.currentRoundIndex + 1}\`  |  **Turn:** \`${session.currentTurnIndex + 1}\`\n## Table\n${session.players.map((p, i) => `- **${p.username}**` + (i === session.currentPlayerIndex ? " 👤" : "") + `\n  - Played Tokens: \`${p.totalPlayedTokens}\`\n  - Unplayed Tokens: \`${p.totalUnplayedTokens}\``).join("\n")}\n\n-# Use the **/play** command to play your turn.\n-# Use the **/info** command to view your hand and see game info.`,
    });
  }

  public static getSession(guildId: string, channelId: string): Session {
    const loadResult: Session | null = Utils.loadData<Session>(
      guildId,
      channelId,
    );
    if (loadResult === null) {
      throw new Error(`No session exists for guild ${guildId} channel ${channelId}.`);
    }
    return loadResult;
  }
}
