class CollaborationService {
  constructor() {
    this.eventTarget = new EventTarget();
    this.sessionId = 'local-session';
    this.userId = 'local-user';
    this.state = {
      participants: [],
      recordingByUser: {},
      policy: {
        liveMicPublish: false
      },
      transport: {
        status: 'idle',
        positionMs: 0
      }
    };
  }

  connect({ sessionId, userId }) {
    this.sessionId = sessionId || 'local-session';
    this.userId = userId || 'local-user';
    this.emit('connection:status', {
      status: 'connected',
      sessionId: this.sessionId,
      userId: this.userId
    });
  }

  disconnect() {
    this.emit('connection:status', {
      status: 'disconnected',
      sessionId: this.sessionId,
      userId: this.userId
    });
  }

  subscribe(eventName, handler) {
    const listener = (event) => handler(event.detail);
    this.eventTarget.addEventListener(eventName, listener);
    return () => this.eventTarget.removeEventListener(eventName, listener);
  }

  emit(eventName, detail) {
    this.eventTarget.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  getSnapshot() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      ...this.state
    };
  }

  setParticipants(participants) {
    const recordingByUser = { ...this.state.recordingByUser };
    const nextParticipants = (participants || []).map((participant) => {
      const isRecording = !!participant.isRecording;
      recordingByUser[participant.id] = isRecording;
      return {
        ...participant,
        isRecording
      };
    });

    this.state = {
      ...this.state,
      participants: nextParticipants,
      recordingByUser
    };

    this.emit('participants:update', {
      participants: nextParticipants
    });
  }

  setParticipantRecording(userId, isRecording) {
    const nextParticipants = (this.state.participants || []).map((participant) => (
      participant.id === userId ? { ...participant, isRecording: !!isRecording } : participant
    ));

    const recordingByUser = {
      ...this.state.recordingByUser,
      [userId]: !!isRecording
    };

    this.state = {
      ...this.state,
      participants: nextParticipants,
      recordingByUser
    };

    this.emit('recording:update', {
      userId,
      isRecording: !!isRecording
    });

    this.emit('participants:update', {
      participants: nextParticipants
    });
  }

  anyUserRecording() {
    return Object.values(this.state.recordingByUser).some(Boolean);
  }

  requestLiveMicPublish({ requesterUserId, enabled }) {
    const requesterRecording = !!this.state.recordingByUser[requesterUserId];
    const anyRecording = this.anyUserRecording();

    if (enabled && (requesterRecording || anyRecording)) {
      const result = {
        allowed: false,
        reason: 'Live mic publish is blocked while any user is recording.'
      };
      this.emit('policy:denied', {
        type: 'live-mic-publish',
        ...result
      });
      return result;
    }

    this.state = {
      ...this.state,
      policy: {
        ...this.state.policy,
        liveMicPublish: !!enabled
      }
    };

    const result = {
      allowed: true,
      reason: ''
    };

    this.emit('policy:update', {
      policy: this.state.policy
    });

    return result;
  }

  canHearLiveMic(listenerUserId, sourceUserId) {
    if (!this.state.policy.liveMicPublish) {
      return false;
    }

    if (listenerUserId === sourceUserId) {
      return true;
    }

    const listenerRecording = !!this.state.recordingByUser[listenerUserId];
    const sourceRecording = !!this.state.recordingByUser[sourceUserId];

    if (listenerRecording || sourceRecording) {
      return false;
    }

    return true;
  }

  updateTransport(payload) {
    this.state = {
      ...this.state,
      transport: {
        ...this.state.transport,
        ...payload
      }
    };

    this.emit('transport:update', {
      transport: this.state.transport
    });
  }
}

export const collaborationService = new CollaborationService();
