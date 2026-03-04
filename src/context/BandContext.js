import React, { createContext, useContext, useState, useEffect } from 'react';

export const INSTRUMENTS = [
  { id: 'vocals_lead',   title: 'Lead Vocals',    emoji: '🎤' },
  { id: 'vocals_back',   title: 'Backing Vocals', emoji: '🎤' },
  { id: 'guitar_lead',   title: 'Lead Guitar',    emoji: '🎸' },
  { id: 'guitar_rhythm', title: 'Rhythm Guitar',  emoji: '🎸' },
  { id: 'bass',          title: 'Bass Guitar',    emoji: '🎵' },
  { id: 'drums',         title: 'Drums',          emoji: '🥁' },
  { id: 'keys',          title: 'Keys / Piano',   emoji: '🎹' },
  { id: 'sax',           title: 'Saxophone',      emoji: '🎷' },
  { id: 'trumpet',       title: 'Trumpet',        emoji: '🎺' },
  { id: 'violin',        title: 'Violin',         emoji: '🎻' },
  { id: 'producer',      title: 'Producer',       emoji: '🎧' },
  { id: 'other',         title: 'Other',          emoji: '🎼' },
];

export const GENRES = [
  'Rock', 'Jazz', 'Pop', 'Blues', 'Country', 'Metal',
  'R&B', 'EDM', 'Classical', 'Hip-Hop', 'Folk', 'Punk',
];

const BandContext = createContext(null);

function loadBands() {
  try {
    return JSON.parse(localStorage.getItem('bands') || '[]');
  } catch {
    return [];
  }
}

export function BandProvider({ children, currentUser }) {
  const [allBands, setAllBands] = useState(loadBands);

  useEffect(() => {
    localStorage.setItem('bands', JSON.stringify(allBands));
  }, [allBands]);

  // Derived: band where currentUser holds a filled position
  const userBand = allBands.find(b =>
    b.positions.some(p => p.filledBy === currentUser?.id)
  ) || null;

  // Derived: pending application by currentUser in any band
  const userPendingApp = allBands.reduce((found, band) => {
    if (found) return found;
    const app = band.applications.find(
      a => a.userId === currentUser?.id && a.status === 'pending'
    );
    return app ? { ...app, bandId: band.id, bandName: band.name } : null;
  }, null);

  // Count of pending applications on the user's own band (for notification badge)
  const pendingApplicationCount = userBand
    ? userBand.applications.filter(a => a.status === 'pending').length
    : 0;

  // Re-read bands from localStorage (for "Check Status" after another user approves)
  const refreshBands = () => setAllBands(loadBands());

  // ── Operations ──────────────────────────────────────────────────────────────

  const createBand = ({ name, genre, description, positions, ownerPositionId }) => {
    const band = {
      id: 'band_' + Date.now(),
      name,
      genre,
      description,
      ownerId: currentUser.id,
      positions: positions.map(p => ({
        ...p,
        filledBy:       p.id === ownerPositionId ? currentUser.id       : null,
        filledByName:   p.id === ownerPositionId ? currentUser.username  : null,
        filledByAvatar: p.id === ownerPositionId ? currentUser.avatar    : null,
      })),
      applications: [],
      createdAt: Date.now(),
    };
    setAllBands(prev => [...prev, band]);
    return band;
  };

  const applyToBand = (bandId, positionId, message) => {
    setAllBands(prev => prev.map(band => {
      if (band.id !== bandId) return band;
      // Prevent duplicate pending applications
      const alreadyApplied = band.applications.some(
        a => a.userId === currentUser.id && a.status === 'pending'
      );
      if (alreadyApplied) return band;
      const position = band.positions.find(p => p.id === positionId);
      return {
        ...band,
        applications: [...band.applications, {
          id:            'app_' + Date.now(),
          userId:        currentUser.id,
          userName:      currentUser.username,
          userAvatar:    currentUser.avatar,
          positionId,
          positionTitle: position?.title || '',
          positionEmoji: position?.emoji || '🎵',
          message,
          status:        'pending',
          appliedAt:     Date.now(),
        }],
      };
    }));
  };

  const approveApplication = (bandId, applicationId) => {
    setAllBands(prev => prev.map(band => {
      if (band.id !== bandId) return band;
      const app = band.applications.find(a => a.id === applicationId);
      if (!app) return band;
      return {
        ...band,
        positions: band.positions.map(p =>
          p.id === app.positionId
            ? { ...p, filledBy: app.userId, filledByName: app.userName, filledByAvatar: app.userAvatar }
            : p
        ),
        // Accept this application; auto-reject others competing for the same slot
        applications: band.applications.map(a =>
          a.id === applicationId
            ? { ...a, status: 'accepted' }
            : (a.positionId === app.positionId && a.status === 'pending')
              ? { ...a, status: 'rejected' }
              : a
        ),
      };
    }));
  };

  const rejectApplication = (bandId, applicationId) => {
    setAllBands(prev => prev.map(band => {
      if (band.id !== bandId) return band;
      return {
        ...band,
        applications: band.applications.map(a =>
          a.id === applicationId ? { ...a, status: 'rejected' } : a
        ),
      };
    }));
  };

  const withdrawApplication = (bandId, applicationId) => {
    setAllBands(prev => prev.map(band => {
      if (band.id !== bandId) return band;
      return {
        ...band,
        applications: band.applications.filter(a => a.id !== applicationId),
      };
    }));
  };

  const removeMember = (bandId, userId) => {
    setAllBands(prev => prev.map(band => {
      if (band.id !== bandId) return band;
      return {
        ...band,
        positions: band.positions.map(p =>
          p.filledBy === userId
            ? { ...p, filledBy: null, filledByName: null, filledByAvatar: null }
            : p
        ),
      };
    }));
  };

  const transferOwnership = (bandId, newOwnerId) => {
    setAllBands(prev => prev.map(b =>
      b.id === bandId ? { ...b, ownerId: newOwnerId } : b
    ));
  };

  const leaveBand = (bandId) => {
    setAllBands(prev => prev.map(band => {
      if (band.id !== bandId) return band;
      return {
        ...band,
        positions: band.positions.map(p =>
          p.filledBy === currentUser.id
            ? { ...p, filledBy: null, filledByName: null, filledByAvatar: null }
            : p
        ),
      };
    }));
  };

  const disbandBand = (bandId) => {
    setAllBands(prev => prev.filter(b => b.id !== bandId));
  };

  return (
    <BandContext.Provider value={{
      allBands,
      userBand,
      userPendingApp,
      pendingApplicationCount,
      refreshBands,
      createBand,
      applyToBand,
      approveApplication,
      rejectApplication,
      withdrawApplication,
      removeMember,
      transferOwnership,
      leaveBand,
      disbandBand,
    }}>
      {children}
    </BandContext.Provider>
  );
}

export function useBand() {
  const ctx = useContext(BandContext);
  if (!ctx) throw new Error('useBand must be used within BandProvider');
  return ctx;
}
