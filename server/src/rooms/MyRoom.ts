import { Room, Client } from "@colyseus/core";
import {MyRoomState, Player} from "./schema/MyRoomState";

export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;

  fixedTimeStep = 1000 / 60;

  onCreate (options: any) {
    this.setState(new MyRoomState());

    let elapsedTime = 0;

    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });

    this.onMessage(0, (client, data) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player.inputQueue.push(data);
      const velocity = 2;

      if (data.left) {
        player.x -= velocity;

      } else if (data.right) {
        player.x += velocity;
      }

      if (data.up) {
        player.y -= velocity;

      } else if (data.down) {
        player.y += velocity;
      }
    });

    this.onMessage("type", (client, message) => {
      //
      // handle "type" message
      //
    });
  }

  fixedTick(deltaTime: number) {
    const velocity = 2;

    this.state.players.forEach(player => {
      let input: any;

      // dequeue player inputs
      while (input = player.inputQueue.shift()) {
        if (input.left) {
          player.x -= velocity;

        } else if (input.right) {
          player.x += velocity;
        }

        if (input.up) {
          player.y -= velocity;

        } else if (input.down) {
          player.y += velocity;
        }
      }
    });
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    const mapWidth = 800;
    const mapHeight = 600;

    // create Player instance
    const player = new Player();

    // place Player at a random position
    player.x = (Math.random() * mapWidth);
    player.y = (Math.random() * mapHeight);

    // place player in the map of players by its sessionId
    // (client.sessionId is unique per connection!)
    this.state.players.set(client.sessionId, player);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}
