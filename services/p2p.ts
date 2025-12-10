
import { PlayerState, GameSyncPayload, P2PPayload } from "../types";

// Declare PeerJS global
declare const Peer: any;

export class P2PService {
    private peer: any;
    private connections: any[] = [];
    private hostConn: any = null;
    private isHost: boolean = false;
    private callbacks: {
        onPlayerUpdate?: (data: PlayerState) => void;
        onGameSync?: (data: GameSyncPayload) => void;
        onGameEvent?: (msg: string) => void;
    } = {};

    constructor() {}

    // Init as HOST (Teacher)
    public initHost(roomCode: string, onReady: (id: string) => void) {
        this.isHost = true;
        const peerId = `bizsim-${roomCode}`;
        this.peer = new Peer(peerId);

        this.peer.on('open', (id: string) => {
            console.log('Host initialized:', id);
            onReady(id);
        });

        this.peer.on('connection', (conn: any) => {
            console.log('New student connected:', conn.peer);
            this.connections.push(conn);
            
            conn.on('data', (data: P2PPayload) => {
                this.handleData(data);
            });

            conn.on('close', () => {
                this.connections = this.connections.filter(c => c !== conn);
            });
        });

        this.peer.on('error', (err: any) => {
            console.error('PeerJS Error:', err);
            if (err.type === 'unavailable-id') {
                alert("房间号已被占用或连接错误，请刷新重试。");
            }
        });
    }

    // Init as CLIENT (Student)
    public initClient(roomCode: string, onConnect: () => void) {
        this.isHost = false;
        this.peer = new Peer(); // Auto ID for student

        this.peer.on('open', () => {
            const hostId = `bizsim-${roomCode}`;
            console.log('Connecting to host:', hostId);
            const conn = this.peer.connect(hostId);
            
            conn.on('open', () => {
                console.log('Connected to Host!');
                this.hostConn = conn;
                onConnect();
            });

            conn.on('data', (data: P2PPayload) => {
                this.handleData(data);
            });

            conn.on('error', (err: any) => console.error('Connection Error', err));
        });
    }

    private handleData(data: P2PPayload) {
        if (this.isHost) {
            // Host logic: receiving updates from students
            if (data.type === 'PLAYER_UPDATE' && this.callbacks.onPlayerUpdate) {
                this.callbacks.onPlayerUpdate(data.payload);
            }
        } else {
            // Client logic: receiving updates from host
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
        if (!this.isHost) return;
        const msg: P2PPayload = { type: 'GAME_SYNC', payload };
        this.connections.forEach(conn => conn.send(msg));
    }

    public broadcastEvent(message: string) {
        if (!this.isHost) return;
        const msg: P2PPayload = { type: 'GAME_EVENT', payload: message };
        this.connections.forEach(conn => conn.send(msg));
    }

    // Client: Send update to host
    public sendPlayerUpdate(payload: PlayerState) {
        if (this.isHost || !this.hostConn) return;
        const msg: P2PPayload = { type: 'PLAYER_UPDATE', payload };
        this.hostConn.send(msg);
    }

    public setCallbacks(cbs: typeof this.callbacks) {
        this.callbacks = { ...this.callbacks, ...cbs };
    }

    public destroy() {
        if (this.peer) this.peer.destroy();
    }
}

export const p2p = new P2PService();
