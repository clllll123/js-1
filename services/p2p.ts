
import mqtt from "mqtt";
import { PlayerState, GameSyncPayload, P2PPayload, ConnectionStatus } from "../types";

// MQTT Topics Structure:
// Host Subscribes: bizsim/{roomCode}/client/+  (Wildcard for all clients)
// Client Publishes: bizsim/{roomCode}/client/{clientId}
// Host Publishes Broadcast: bizsim/{roomCode}/broadcast

export class P2PService {
    private client: mqtt.MqttClient | null = null;
    private isHost: boolean = false;
    private roomCode: string = "";
    private clientId: string = "";
    private callbacks: {
        onPlayerUpdate?: (data: PlayerState) => void;
        onGameSync?: (data: GameSyncPayload) => void;
        onGameEvent?: (msg: string) => void;
        onConnectionStatus?: (status: ConnectionStatus) => void;
    } = {};

    constructor() {
        // Mobile Visibility API: Force reconnect on wake up
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    console.log("📱 App woke up. Checking connection...");
                    if (this.client && !this.client.connected) {
                        console.log("📱 Connection lost. Forcing reconnect...");
                        this.client.reconnect();
                    }
                }
            });
        }
    }

    private getMqttConfig() {
        // Using Public EMQX Broker over WSS (Secure WebSocket)
        // Port 8084 is standard for WSS on EMQX
        return {
            url: 'wss://broker.emqx.io:8084/mqtt',
            options: {
                keepalive: 60, // 60s Heartbeat (User suggestion)
                clean: true,   // Clean session for gaming (don't need offline msg persistence)
                reconnectPeriod: 1000, // 1s Reconnect (User suggestion: Aggressive reconnect)
                connectTimeout: 5000,
                clientId: `bizsim_${Math.random().toString(16).substr(2, 8)}`,
                // QoS 0 is used for game state (speed > reliability) in publish, but config here is general
            }
        };
    }

    private updateStatus(status: ConnectionStatus) {
        if (this.callbacks.onConnectionStatus) {
            this.callbacks.onConnectionStatus(status);
        }
    }

    // Init as HOST (Teacher)
    public initHost(roomCode: string, onReady: (id: string) => void) {
        this.isHost = true;
        this.roomCode = roomCode;
        this.clientId = "host";

        const { url, options } = this.getMqttConfig();
        // Host needs a stable ID if we wanted session persistence, but random is fine for this logic
        options.clientId = `bizsim_host_${roomCode}_${Math.random().toString(16).substr(2, 4)}`;

        console.log(`🔌 Connecting to MQTT Broker: ${url}`);
        this.updateStatus('reconnecting');
        this.client = mqtt.connect(url, options);

        this.client.on('connect', () => {
            console.log('✅ MQTT Connected');
            this.updateStatus('connected');
            
            // Host subscribes to all client updates in this room
            const topic = `bizsim/${roomCode}/client/+`;
            this.client?.subscribe(topic, { qos: 0 }, (err) => {
                if (!err) {
                    console.log(`📡 Host listening on: ${topic}`);
                    onReady(roomCode); // Host is ready immediately upon connection
                } else {
                    console.error("Subscribe Error:", err);
                    alert("网络订阅失败，请刷新重试");
                }
            });
        });

        this.client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString()) as P2PPayload;
                this.handleData(payload);
            } catch (e) {
                console.warn("Invalid message format", e);
            }
        });

        this.client.on('error', (err) => {
            console.error("MQTT Error:", err);
            this.updateStatus('disconnected');
        });
        
        this.client.on('offline', () => {
            console.warn("MQTT Offline");
            this.updateStatus('disconnected');
        });

        this.client.on('reconnect', () => {
            console.log("🔄 MQTT Reconnecting...");
            this.updateStatus('reconnecting');
        });
    }

    // Init as CLIENT (Student)
    public initClient(roomCode: string, onConnect: () => void) {
        this.isHost = false;
        this.roomCode = roomCode;
        // Generate a stable client ID for this session (could use localStorage if needed)
        this.clientId = `p_${Math.random().toString(36).substr(2, 9)}`;

        const { url, options } = this.getMqttConfig();
        options.clientId = this.clientId;

        console.log(`🔌 Connecting to MQTT Broker: ${url}`);
        this.updateStatus('reconnecting');
        this.client = mqtt.connect(url, options);

        this.client.on('connect', () => {
            console.log('✅ MQTT Connected');
            this.updateStatus('connected');
            
            // Client subscribes to Broadcasts from Host
            const topic = `bizsim/${roomCode}/broadcast`;
            this.client?.subscribe(topic, { qos: 0 }, (err) => {
                if (!err) {
                    console.log(`📡 Client listening on: ${topic}`);
                    onConnect();
                } else {
                    alert("加入房间失败，网络连接不稳定");
                }
            });
        });

        this.client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString()) as P2PPayload;
                this.handleData(payload);
            } catch (e) {
                console.warn("Invalid message format", e);
            }
        });
        
        this.client.on('reconnect', () => {
            console.log("🔄 MQTT Reconnecting...");
            this.updateStatus('reconnecting');
        });
        
        this.client.on('error', (err) => {
            console.error("MQTT Error:", err);
            this.updateStatus('disconnected');
        });
        
        this.client.on('offline', () => {
            this.updateStatus('disconnected');
        });
    }

    private handleData(data: P2PPayload) {
        if (this.isHost) {
            // Host logic: receiving updates from students via `bizsim/{room}/client/{id}`
            if (data.type === 'PLAYER_UPDATE' && this.callbacks.onPlayerUpdate) {
                this.callbacks.onPlayerUpdate(data.payload);
            }
        } else {
            // Client logic: receiving broadcast from host via `bizsim/{room}/broadcast`
            if (data.type === 'GAME_SYNC' && this.callbacks.onGameSync) {
                this.callbacks.onGameSync(data.payload);
            }
            if (data.type === 'GAME_EVENT' && this.callbacks.onGameEvent) {
                this.callbacks.onGameEvent(data.payload);
            }
        }
    }

    // Host: Broadcast state to all students
    public broadcastGameSync(payload: GameSyncPayload) {
        if (!this.isHost || !this.client || !this.client.connected) return;
        
        // Optimisation: We could diff payload here, but for now we trust the React logic to debounce
        const msg: P2PPayload = { type: 'GAME_SYNC', payload };
        // QoS 0 (At most once) - fast, fire and forget
        this.client.publish(`bizsim/${this.roomCode}/broadcast`, JSON.stringify(msg), { qos: 0, retain: true }); // Retain true so new joiners get latest state
    }

    public broadcastEvent(message: string) {
        if (!this.isHost || !this.client || !this.client.connected) return;
        const msg: P2PPayload = { type: 'GAME_EVENT', payload: message };
        this.client.publish(`bizsim/${this.roomCode}/broadcast`, JSON.stringify(msg), { qos: 0 });
    }

    // Client: Send update to host
    public sendPlayerUpdate(payload: PlayerState) {
        if (this.isHost || !this.client || !this.client.connected) return;
        
        const msg: P2PPayload = { type: 'PLAYER_UPDATE', payload };
        // Send to specific topic for this client
        this.client.publish(`bizsim/${this.roomCode}/client/${this.clientId}`, JSON.stringify(msg), { qos: 0 });
    }

    public setCallbacks(cbs: typeof this.callbacks) {
        this.callbacks = { ...this.callbacks, ...cbs };
    }

    public destroy() {
        if (this.client) {
            this.client.end();
            this.client = null;
        }
    }
}

export const p2p = new P2PService();
