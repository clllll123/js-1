
import { PlayerState, GameSyncPayload, P2PPayload } from "../types";

// Access PeerJS from the global window object since it's loaded via CDN script tag in index.html
const Peer = (window as any).Peer;

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

    // Helper to get configuration based on environment
    private getPeerConfig() {
        const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        
        // Google's public STUN servers are highly reliable and low latency
        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ];

        if (isProduction) {
            // In Google Cloud, connect to the internal signaling server on the same domain
            // FORCE secure: true and port 443 for Cloud Run HTTPS
            // Path must match the Express mount point + PeerServer path: /peerjs + /bizsim
            return {
                host: window.location.hostname,
                port: 443,
                path: '/peerjs/bizsim', 
                secure: true,
                config: { iceServers },
                debug: 2
            };
        }

        // Localhost development
        return {
            host: window.location.hostname,
            port: window.location.port ? parseInt(window.location.port) : 9000,
            path: '/peerjs/bizsim',
            config: { iceServers },
            debug: 2
        };
    }

    // Init as HOST (Teacher)
    public initHost(roomCode: string, onReady: (id: string) => void) {
        if (!Peer) {
            alert("Network library not loaded. Please refresh.");
            return;
        }

        this.isHost = true;
        const peerId = `bizsim-${roomCode}`;
        const config = this.getPeerConfig();
        
        // Pass PeerID as first arg, config as second
        this.peer = new Peer(peerId, config);

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
            
            conn.on('error', (err: any) => {
                console.error('Connection error:', err);
            });
        });

        this.peer.on('error', (err: any) => {
            console.error('PeerJS Error:', err);
            if (err.type === 'unavailable-id') {
                // If ID is taken, usually means we reloaded the page and old session is active
                console.warn("Room ID unavailable, likely zombie session.");
                // Try to reconnect with same ID is risky, usually better to alert user or wait
                alert("房间号被占用或连接未完全断开，请稍等几秒后重试，或刷新页面。");
            } else if (err.type === 'peer-unavailable') {
                // Normal in mesh networking sometimes
            } else if (err.type === 'network') {
                 alert("连接服务器失败 (Network Error)。请检查网络或防火墙设置。如果是公司/学校网络，可能屏蔽了WebSocket。");
            } else {
                alert(`网络连接错误 (${err.type})，请尝试刷新页面。`);
            }
        });
        
        this.peer.on('disconnected', () => {
            console.log('Peer disconnected from server, reconnecting...');
            this.peer.reconnect();
        });
    }

    // Init as CLIENT (Student)
    public initClient(roomCode: string, onConnect: () => void) {
        if (!Peer) {
            alert("Network library not loaded. Please refresh.");
            return;
        }

        this.isHost = false;
        const config = this.getPeerConfig();
        
        // No ID provided, server generates one
        this.peer = new Peer(config); 

        this.peer.on('open', () => {
            const hostId = `bizsim-${roomCode}`;
            console.log('Connecting to host:', hostId);
            
            // Connect to host
            const conn = this.peer.connect(hostId, {
                reliable: true
            });
            
            conn.on('open', () => {
                console.log('Connected to Host!');
                this.hostConn = conn;
                onConnect();
            });

            conn.on('data', (data: P2PPayload) => {
                this.handleData(data);
            });

            conn.on('close', () => {
                console.log("Connection to host closed");
                alert("与主机的连接已断开");
            });

            conn.on('error', (err: any) => console.error('Connection Error', err));
        });
        
        this.peer.on('error', (err: any) => {
            console.error("Client Peer Error:", err);
            if (err.type === 'peer-unavailable') {
                alert("找不到该房间号，请检查大屏是否已开启，或房间号是否输入正确。");
            } else if (err.type === 'network') {
                alert("连接服务器失败，请检查网络。");
            }
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
        this.connections.forEach(conn => {
            if(conn.open) conn.send(msg);
        });
    }

    public broadcastEvent(message: string) {
        if (!this.isHost) return;
        const msg: P2PPayload = { type: 'GAME_EVENT', payload: message };
        this.connections.forEach(conn => {
            if(conn.open) conn.send(msg);
        });
    }

    // Client: Send update to host
    public sendPlayerUpdate(payload: PlayerState) {
        if (this.isHost || !this.hostConn || !this.hostConn.open) return;
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
