import Peer from "peerjs";
import type { DataConnection, MediaConnection } from "peerjs";

import {
  CAMERA_CONSTRAINTS,
  CONNECT,
  DEFAULT_PEER_NAME,
  DEFAULT_SELF_NAME,
  HANDSHAKE_TOKEN,
  HEARTBEAT,
  ICE_SERVERS,
  SCREEN_CONSTRAINTS,
  SEAT_IDS,
  type Seat,
} from "@/lib/config";
import {
  getDeviceId,
  loadLastSeat,
  loadNames,
  loadPeerDeviceId,
  mergeNames,
  saveLastSeat,
  savePeerDeviceId,
  saveNames,
} from "./identity";
import type { DataMessage, NameMap } from "./protocol";
import { INITIAL_SNAPSHOT, type RoomEventMap, type RoomSnapshot } from "./types";

type EventCb = (payload: unknown) => void;

/**
 * The whole imperative WebRTC layer in one framework-agnostic class. It owns the
 * Peer, both connection kinds, the data-channel protocol, names, and media toggles,
 * and exposes (a) an immutable snapshot via subscribe/getSnapshot for
 * useSyncExternalStore and (b) discrete events (peer-joined, emoji) via on().
 *
 * Topology: the first browser to arrive claims seat A and is the sole *initiator*
 * of the always-on control channel + camera call (deterministic, so no glare).
 * The second claims seat B and only answers. Either seat may originate the separate
 * screen connection (M4). A third browser finds both seats taken → "room-full".
 */
export class RoomManager {
  // ─── reactive snapshot store ───
  private snap: RoomSnapshot = INITIAL_SNAPSHOT;
  private listeners = new Set<() => void>();
  private events = new Map<keyof RoomEventMap, Set<EventCb>>();

  // ─── identity / names ───
  private deviceId = "";
  private peerDeviceId: string | null = null;
  private nameMap: NameMap = {};
  private hydrated = false;

  // ─── webrtc ───
  private peer: Peer | null = null;
  private seat: Seat | null = null;
  private dc: DataConnection | null = null;
  private cameraConn: MediaConnection | null = null;
  private screenConnOut: MediaConnection | null = null;
  private localStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;

  // ─── timers / flags ───
  private connecting = false;
  private connectTimer: ReturnType<typeof setInterval> | null = null;
  private rejoinTimer: ReturnType<typeof setTimeout> | null = null;
  private rejoinDelay = CONNECT.REJOIN_BASE_MS;

  // ─── heartbeat / recovery (M6) ───
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private giveupTimer: ReturnType<typeof setTimeout> | null = null;
  private missedPongs = 0;
  private pingSeq = 0;
  private recovering = false;

  // ════════════════════════ store plumbing ════════════════════════
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  getSnapshot = (): RoomSnapshot => this.snap;
  getServerSnapshot = (): RoomSnapshot => INITIAL_SNAPSHOT;

  private patch(partial: Partial<RoomSnapshot>) {
    this.snap = { ...this.snap, ...partial };
    this.listeners.forEach((cb) => cb());
  }

  on<K extends keyof RoomEventMap>(
    event: K,
    cb: (payload: RoomEventMap[K]) => void,
  ): () => void {
    let set = this.events.get(event);
    if (!set) {
      set = new Set();
      this.events.set(event, set);
    }
    set.add(cb as EventCb);
    return () => {
      this.events.get(event)?.delete(cb as EventCb);
    };
  }
  private fire<K extends keyof RoomEventMap>(event: K, payload: RoomEventMap[K]) {
    this.events.get(event)?.forEach((cb) => cb(payload));
  }

  // ════════════════════════ lifecycle ════════════════════════
  /** Read deviceId + persisted names from localStorage. Call once, after mount. */
  hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    this.deviceId = getDeviceId();
    this.nameMap = loadNames();
    this.peerDeviceId = loadPeerDeviceId();
    this.resolveNames();
    this.patch({ deviceId: this.deviceId });
  }

  /** Acquire camera+mic (or adopt an existing preview stream), then claim a seat. */
  async join(existing?: MediaStream) {
    this.hydrate();
    // don't flash the pre-join screen when this is a silent reconnect
    if (this.snap.status === "idle" || this.snap.status === "error") {
      this.patch({ status: "connecting" });
    }

    if (!this.localStream) {
      try {
        this.localStream =
          existing ?? (await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS));
      } catch {
        this.patch({ status: "error" });
        return;
      }
    }
    this.patch({ localStream: this.localStream, micEnabled: true, camEnabled: true });

    // Prefer reclaiming the seat we last held (tolerating our own lingering zombie
    // id), then try the other. A fresh visitor with no history just tries A then B.
    const preferred = loadLastSeat();
    const order: Seat[] = preferred === "b" ? ["b", "a"] : ["a", "b"];

    for (let i = 0; i < order.length; i++) {
      const seat = order[i];
      // zombie-tolerant retries only on our previously-held seat
      const retries = seat === preferred ? CONNECT.RECLAIM_RETRIES : 0;
      const result = await this.claimSeatWithRetry(seat, retries);
      if (result === "ok") {
        this.rejoinDelay = CONNECT.REJOIN_BASE_MS;
        saveLastSeat(seat);
        this.onSeatClaimed();
        return;
      }
      if (result === "error") {
        this.scheduleRejoin();
        return;
      }
      // "taken" → try the next seat
    }
    // both seats taken by other people
    this.patch({ status: "room-full" });
  }

  /** Claim a seat, retrying past a lingering zombie of our own id (unavailable-id). */
  private async claimSeatWithRetry(
    seat: Seat,
    retries: number,
  ): Promise<"ok" | "taken" | "error"> {
    for (let attempt = 0; ; attempt++) {
      const r = await this.claimSeat(seat);
      if (r === "ok" || r === "error") return r;
      if (attempt >= retries) return "taken";
      await new Promise((res) => setTimeout(res, CONNECT.RECLAIM_DELAY_MS));
    }
  }

  private claimSeat(seat: Seat): Promise<"ok" | "taken" | "error"> {
    return new Promise((resolve) => {
      const peer = new Peer(SEAT_IDS[seat], {
        config: { iceServers: ICE_SERVERS },
        // 0 = silent. While alone, seat A polls the empty seat B and PeerJS would
        // otherwise log a "could not connect" error every retry. Our own
        // onPeerError() still handles the events.
        debug: 0,
      });
      let settled = false;
      const fail = setTimeout(() => finish("error"), 10000);

      const finish = (r: "ok" | "taken" | "error") => {
        if (settled) return;
        settled = true;
        clearTimeout(fail);
        peer.off("open", onOpen);
        peer.off("error", onError);
        if (r === "ok") {
          this.peer = peer;
          this.seat = seat;
          this.attachPeerHandlers(peer);
        } else {
          peer.destroy();
        }
        resolve(r);
      };
      const onOpen = () => finish("ok");
      const onError = (err: unknown) => {
        const type = (err as { type?: string }).type;
        if (type === "unavailable-id") finish("taken");
        else if (
          type === "network" ||
          type === "server-error" ||
          type === "socket-error" ||
          type === "ssl-unavailable"
        )
          finish("error");
        // other error types before open aren't decisive — keep waiting
      };
      peer.on("open", onOpen);
      peer.on("error", onError);
    });
  }

  private onSeatClaimed() {
    if (this.connectTimer) clearInterval(this.connectTimer);
    // keep the 💔 if we're mid-reconnect; otherwise we're freshly waiting
    this.patch({ seat: this.seat, status: this.snap.status === "reconnecting" ? "reconnecting" : "waiting" });
    this.setupIncoming();
    if (this.seat === "a") {
      // A is the sole initiator: keep trying to reach B until the channel is up.
      this.ensureConnected();
      this.connectTimer = setInterval(() => this.ensureConnected(), CONNECT.RETRY_INTERVAL_MS);
    }
  }

  private scheduleRejoin() {
    this.patch({ status: "reconnecting" });
    if (this.rejoinTimer) clearTimeout(this.rejoinTimer);
    this.rejoinTimer = setTimeout(() => {
      this.join(this.localStream ?? undefined);
    }, this.rejoinDelay);
    this.rejoinDelay = Math.min(this.rejoinDelay * 2, CONNECT.REJOIN_MAX_MS);
  }

  // ════════════════════════ connection (seat A initiates) ════════════════════════
  private ensureConnected() {
    if (this.seat !== "a" || !this.peer || !this.localStream) return;
    if (this.dc?.open || this.connecting) return;
    this.connecting = true;

    const target = SEAT_IDS.b;
    const dc = this.peer.connect(target, { reliable: true, metadata: { kind: "control" } });

    const abort = setTimeout(() => {
      this.connecting = false;
      try {
        dc.close();
      } catch {
        /* noop */
      }
    }, CONNECT.ATTEMPT_TIMEOUT_MS);

    dc.on("open", () => {
      clearTimeout(abort);
      this.connecting = false;
      this.adoptDataConnection(dc, false);
      this.sendHello();
      this.callCamera(target);
    });
    dc.on("error", () => {
      clearTimeout(abort);
      this.connecting = false;
    });
  }

  private callCamera(targetId: string) {
    if (!this.peer || !this.localStream) return;
    if (this.cameraConn?.open) return;
    const mc = this.peer.call(targetId, this.localStream, {
      metadata: { kind: "camera" },
    });
    this.bindCameraConnection(mc);
  }

  private setupIncoming() {
    if (!this.peer) return;
    this.peer.on("connection", (dc) => this.adoptDataConnection(dc, true));
    this.peer.on("call", (mc) => this.handleIncomingCall(mc));
  }

  private handleIncomingCall(mc: MediaConnection) {
    const kind = (mc.metadata as { kind?: string } | undefined)?.kind;
    if (kind === "screen") {
      // M4: receive the share one-way (answer with no stream).
      mc.answer();
      mc.on("stream", (remote) => {
        this.patch({ remoteScreenStream: remote, peerSharing: true });
      });
      mc.on("close", () => this.patch({ remoteScreenStream: null, peerSharing: false }));
      return;
    }
    // camera: answer with our own stream so media flows both ways over one connection
    mc.answer(this.localStream ?? undefined);
    this.bindCameraConnection(mc);
  }

  private bindCameraConnection(mc: MediaConnection) {
    this.cameraConn = mc;
    mc.on("stream", (remote) => {
      this.patch({ remoteCameraStream: remote });
      this.watchPeerConnection(mc.peerConnection);
    });
    mc.on("close", () => {
      if (this.cameraConn === mc) {
        this.cameraConn = null;
        this.patch({ remoteCameraStream: null });
      }
    });
    mc.on("error", () => {
      /* surfaced via dc close / heartbeat in M6 */
    });
  }

  // ════════════════════════ data channel ════════════════════════
  private adoptDataConnection(dc: DataConnection, incoming: boolean) {
    // glare guard: if we somehow already have a live channel, drop the duplicate
    if (this.dc && this.dc.open && this.dc !== dc) {
      try {
        dc.close();
      } catch {
        /* noop */
      }
      return;
    }
    this.dc = dc;
    dc.on("data", (raw) => this.handleData(raw));
    dc.on("open", () => this.watchPeerConnection(dc.peerConnection));
    dc.on("close", () => {
      if (this.dc === dc) this.onPeerGone();
    });
    dc.on("error", () => {
      /* close handler covers teardown */
    });
    if (dc.open) this.watchPeerConnection(dc.peerConnection);
    void incoming; // B waits for hello via handleData; A sent hello on open
  }

  private handleData(raw: unknown) {
    const msg = raw as DataMessage;
    switch (msg.t) {
      case "hello": {
        if (msg.token !== HANDSHAKE_TOKEN) {
          // silently reject a peer that isn't running our app
          try {
            this.dc?.close();
          } catch {
            /* noop */
          }
          return;
        }
        this.setPeerDevice(msg.deviceId);
        this.mergeIntoNames(msg.names);
        this.sendAck();
        this.markPeerPresent();
        break;
      }
      case "ack": {
        this.setPeerDevice(msg.deviceId);
        this.mergeIntoNames(msg.names);
        this.markPeerPresent();
        break;
      }
      case "ping":
        this.send({ t: "pong", seq: msg.seq });
        break;
      case "pong":
        this.missedPongs = 0;
        break;
      case "name-update":
        this.applyNameUpdate(msg.deviceId, msg.name, msg.ts);
        break;
      case "emoji":
        this.fire("emoji", { glyph: msg.glyph, id: msg.id, seed: msg.seed });
        break;
      case "share-state":
        if (msg.sharing) {
          this.patch({ peerSharing: true });
          // they're starting a share while I'm sharing → they take over the stage
          if (this.snap.sharing) {
            this.fire("toast", `${this.snap.peerName} took over the share 🎬`);
            this.stopShare();
          }
        } else {
          this.patch({ peerSharing: false, remoteScreenStream: null });
        }
        break;
    }
  }

  private send(msg: DataMessage) {
    if (this.dc?.open) {
      try {
        this.dc.send(msg);
      } catch {
        /* channel closing */
      }
    }
  }

  private sendHello() {
    this.send({
      t: "hello",
      token: HANDSHAKE_TOKEN,
      deviceId: this.deviceId,
      names: this.nameMap,
    });
  }
  private sendAck() {
    this.send({ t: "ack", deviceId: this.deviceId, names: this.nameMap });
  }

  private markPeerPresent() {
    const firstTime = !this.snap.peerPresent;
    this.recovering = false;
    this.clearGiveupTimer();
    this.resolveNames();
    this.patch({ peerPresent: true, status: "connected" });
    if (firstTime) this.fire("peer-joined", undefined);
    this.startHeartbeat();
    // if I was already sharing (e.g. partner reconnected mid-movie), re-send it
    this.reshareIfNeeded();
  }

  private onPeerGone() {
    const wasConnected = this.snap.peerPresent;
    this.stopHeartbeat();
    this.dc = null;
    this.cameraConn = null;
    this.patch({
      peerPresent: false,
      remoteCameraStream: null,
      remoteScreenStream: null,
      peerSharing: false,
      // if we'd been connected, we're trying to get them back (💔); otherwise alone
      status: wasConnected ? "reconnecting" : "waiting",
    });
    this.fire("peer-left", undefined);
    // after a while with no luck, drop the 💔 and show the waiting mole instead
    if (wasConnected) this.startGiveupTimer();
    // seat A's connectTimer will re-establish automatically; seat B waits.
  }

  // ════════════════════════ heartbeat & zombie recovery (M6) ════════════════════════
  private startHeartbeat() {
    this.stopHeartbeat();
    this.missedPongs = 0;
    this.heartbeatTimer = setInterval(() => {
      if (!this.dc?.open) return;
      if (this.missedPongs >= HEARTBEAT.MISSED_PONG_LIMIT) {
        // pongs stopped coming — the connection is a zombie, kill it fast
        this.handleDeadConnection();
        return;
      }
      this.missedPongs++;
      this.send({ t: "ping", seq: ++this.pingSeq });
    }, HEARTBEAT.PING_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Watch the underlying RTCPeerConnection — PeerJS doesn't surface ICE failures. */
  private watchPeerConnection(pc: RTCPeerConnection | undefined | null) {
    if (!pc) return;
    const check = () => {
      if (pc.connectionState === "failed" || pc.iceConnectionState === "failed") {
        this.handleDeadConnection();
      }
    };
    pc.addEventListener("connectionstatechange", check);
    pc.addEventListener("iceconnectionstatechange", check);
  }

  /** Tear down a dead/zombie connection and let the topology re-establish it. */
  private handleDeadConnection() {
    if (this.recovering) return;
    this.recovering = true;
    this.stopHeartbeat();
    try {
      this.dc?.close();
    } catch {
      /* noop */
    }
    try {
      this.cameraConn?.close();
    } catch {
      /* noop */
    }
    this.closeScreenOut();
    this.onPeerGone();
    // seat A re-initiates immediately; the retry loop covers the rest
    if (this.seat === "a") this.ensureConnected();
  }

  private startGiveupTimer() {
    this.clearGiveupTimer();
    this.giveupTimer = setTimeout(() => {
      if (!this.snap.peerPresent) this.patch({ status: "waiting" });
    }, CONNECT.GIVEUP_TO_WAITING_MS);
  }

  private clearGiveupTimer() {
    if (this.giveupTimer) {
      clearTimeout(this.giveupTimer);
      this.giveupTimer = null;
    }
  }

  // ════════════════════════ peer-level events ════════════════════════
  private attachPeerHandlers(peer: Peer) {
    peer.on("disconnected", () => {
      // signaling socket dropped (media may survive); reconnect keeps our seat id
      if (!peer.destroyed) {
        try {
          peer.reconnect();
        } catch {
          /* noop */
        }
      }
    });
    peer.on("close", () => {
      // the active peer was destroyed (fatal) — re-claim our seat from scratch,
      // preferring our last seat and tolerating our own lingering zombie id
      if (this.peer !== peer) return;
      this.peer = null;
      this.stopHeartbeat();
      if (this.connectTimer) {
        clearInterval(this.connectTimer);
        this.connectTimer = null;
      }
      this.patch({ status: "reconnecting", peerPresent: false });
      if (this.rejoinTimer) clearTimeout(this.rejoinTimer);
      this.rejoinTimer = setTimeout(() => this.join(this.localStream ?? undefined), this.rejoinDelay);
      this.rejoinDelay = Math.min(this.rejoinDelay * 2, CONNECT.REJOIN_MAX_MS);
    });
    peer.on("error", (err) => this.onPeerError(err));
  }

  private onPeerError(err: unknown) {
    const type = (err as { type?: string }).type;
    switch (type) {
      case "peer-unavailable":
        // target seat is offline — the retry loop will keep trying
        break;
      case "network":
      case "disconnected":
      case "socket-error":
      case "server-error":
        if (this.peer && !this.peer.destroyed) {
          try {
            this.peer.reconnect();
          } catch {
            /* noop */
          }
        }
        break;
      default:
        if (type !== "unavailable-id") console.warn("[room] peer error:", type, err);
    }
  }

  // ════════════════════════ names ════════════════════════
  private setPeerDevice(id: string) {
    this.peerDeviceId = id;
    savePeerDeviceId(id);
  }

  private mergeIntoNames(incoming: NameMap) {
    const { merged, changed } = mergeNames(this.nameMap, incoming);
    if (changed) {
      this.nameMap = merged;
      saveNames(this.nameMap);
    }
    this.resolveNames();
  }

  private resolveNames() {
    const selfName = this.nameMap[this.deviceId]?.name || DEFAULT_SELF_NAME;
    const peerKey = this.peerDeviceId ?? loadPeerDeviceId();
    const peerName = (peerKey && this.nameMap[peerKey]?.name) || DEFAULT_PEER_NAME;
    this.patch({ selfName, peerName });
  }

  private applyNameUpdate(deviceId: string, name: string, ts: number) {
    const cur = this.nameMap[deviceId];
    if (cur && ts <= cur.ts) return; // older write loses
    this.nameMap = { ...this.nameMap, [deviceId]: { name, ts } };
    saveNames(this.nameMap);
    this.resolveNames();
  }

  /** Set my own display name (LWW timestamp = now), and broadcast it. */
  setSelfName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ts = Date.now();
    this.applyNameUpdate(this.deviceId, trimmed, ts);
    this.send({ t: "name-update", deviceId: this.deviceId, name: trimmed, ts });
  }

  /** Rename the other person. Works offline if we've met them before. */
  setPeerName(name: string) {
    const trimmed = name.trim();
    const target = this.peerDeviceId ?? loadPeerDeviceId();
    if (!trimmed || !target) return;
    const ts = Date.now();
    this.applyNameUpdate(target, trimmed, ts);
    this.send({ t: "name-update", deviceId: target, name: trimmed, ts });
  }

  // ════════════════════════ media toggles ════════════════════════
  setMicEnabled(on: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = on));
    this.patch({ micEnabled: on });
  }
  setCamEnabled(on: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = on));
    this.patch({ camEnabled: on });
  }

  // ════════════════════════ screen share ════════════════════════
  private otherSeatId(): string {
    return this.seat === "a" ? SEAT_IDS.b : SEAT_IDS.a;
  }

  /** Capture a Chrome tab (with tab audio) and send it as the screen connection. */
  async startShare() {
    if (!this.peer || !this.snap.peerPresent) return; // need a partner to share to
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
    } catch {
      return; // user dismissed the picker
    }

    // cap at 1080p / 30fps and stop sharing when the native "Stop sharing" is used
    stream.getVideoTracks().forEach((t) => {
      t.applyConstraints({
        frameRate: { max: 30 },
        width: { max: 1920 },
        height: { max: 1080 },
      }).catch(() => {});
      t.onended = () => this.stopShare();
    });

    const tookOver = this.snap.peerSharing;
    this.localScreenStream = stream;
    this.patch({ sharing: true, localScreenStream: stream });
    this.callScreen();
    this.send({ t: "share-state", sharing: true });

    if (stream.getAudioTracks().length === 0) {
      this.fire("toast", 'no tab audio — reshare a Chrome tab and tick "share tab audio" 🔊');
    } else if (tookOver) {
      this.fire("toast", "you took over the share 🎬");
    }
  }

  stopShare() {
    this.localScreenStream?.getTracks().forEach((t) => t.stop());
    this.closeScreenOut();
    this.localScreenStream = null;
    this.patch({ sharing: false, localScreenStream: null });
    this.send({ t: "share-state", sharing: false });
  }

  private callScreen() {
    if (!this.peer || !this.localScreenStream) return;
    this.closeScreenOut();
    const mc = this.peer.call(this.otherSeatId(), this.localScreenStream, {
      metadata: { kind: "screen" },
    });
    this.screenConnOut = mc;
    mc.on("close", () => {
      if (this.screenConnOut === mc) this.screenConnOut = null;
    });
  }

  private closeScreenOut() {
    if (this.screenConnOut) {
      try {
        this.screenConnOut.close();
      } catch {
        /* noop */
      }
      this.screenConnOut = null;
    }
  }

  private reshareIfNeeded() {
    if (this.snap.sharing && this.localScreenStream) this.callScreen();
  }

  // ════════════════════════ reactions ════════════════════════
  /** Show a transient local toast (rendered by ShareToast). Local-only — not
   *  sent over the wire. */
  toast(msg: string) {
    this.fire("toast", msg);
  }

  /** Fire a reaction locally and over the wire (UI rendered in M5). */
  sendEmoji(glyph: string) {
    const id = crypto.randomUUID();
    const seed = Math.random();
    this.fire("emoji", { glyph, id, seed });
    this.send({ t: "emoji", glyph, id, seed });
  }

  // ════════════════════════ volumes (applied by UI in M4) ════════════════════════
  setVoiceVolume(v: number) {
    this.patch({ voiceVolume: Math.max(0, Math.min(1, v)) });
  }
  setShowVolume(v: number) {
    this.patch({ showVolume: Math.max(0, Math.min(1, v)) });
  }

  /** Acquire the camera+mic preview for the pre-join screen. Returns success. */
  async ensurePreview(): Promise<boolean> {
    this.hydrate();
    if (this.localStream) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      this.setLocalStream(stream);
      return true;
    } catch {
      return false;
    }
  }

  /** Expose the local preview stream for the pre-join screen. */
  getLocalStream() {
    return this.localStream;
  }
  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    this.patch({
      localStream: stream,
      micEnabled: !!stream?.getAudioTracks().some((t) => t.enabled),
      camEnabled: !!stream?.getVideoTracks().some((t) => t.enabled),
    });
  }
}
