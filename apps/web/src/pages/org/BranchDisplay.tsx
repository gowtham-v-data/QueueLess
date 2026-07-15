import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { queueService, type QueueEntry } from '../../services/queue.service';
import { organizationService, type Branch } from '../../services/organization.service';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function BranchDisplayPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [branch,   setBranch]   = useState<Branch | null>(null);
  const [queues,   setQueues]   = useState<QueueEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [needInteraction, setNeedInteraction] = useState(true);
  
  // Track last announced token to prevent double-announcing
  const announcedTokens = useRef<Set<string>>(new Set());

  const enableAudio = () => {
    setNeedInteraction(false);
    // Unblock Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch {}
    // Unblock TTS
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(u);
    }
  };

  useEffect(() => {
    if (!branchId) return;

    // Load branch details
    organizationService.getBranchById(branchId)
      .then(b => {
        if (b) {
          setBranch(b);
        } else {
          setError('Branch not found.');
        }
      })
      .catch(() => setError('Could not load branch information.'))
      .finally(() => setLoading(false));

    // Subscribe to live queues
    const unsub = queueService.subscribeToBranchQueue(branchId, (data) => {
      setQueues(data);
      
      // Filter currently called tokens
      const called = data.filter(q => q.status === 'CALLED');
      
      // Voice Announcement trigger
      called.forEach(q => {
        const announcementKey = `${q.id}-${q.status}`;
        if (!announcedTokens.current.has(announcementKey)) {
          announcedTokens.current.add(announcementKey);
          announceToken(q.tokenCode, q.counterName || 'Counter');
        }
      });
    });

    return unsub;
  }, [branchId]);

  const announceToken = (token: string, counter: string) => {
    // 1. Play clean chime sound (Web Audio API)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.8);
      osc2.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio Context failed to play chime:', e);
    }

    // 2. TTS Voice Announcement after chime
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        const text = `Token number ${token.split('').join(' ')}, please proceed to ${counter}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    }, 450);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#004741' }}>
      <LoadingSpinner size="lg" label="Loading display board…" />
    </div>
  );

  if (error || !branchId) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#004741', color: '#FFFDF1', gap: 16 }}>
      <p style={{ fontSize: 48 }}>📺</p>
      <h2>{error || 'Display screen configuration is invalid'}</h2>
      <Link to="/org/dashboard" className="btn btn-secondary" style={{ background: '#FFFDF1', color: '#004741' }}>Back to Admin</Link>
    </div>
  );

  const calledItems  = queues.filter(q => q.status === 'CALLED');
  const waitingItems = queues.filter(q => q.status === 'WAITING');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#004741', // Custom premium forest green base
      color: '#FFFDF1',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      padding: 32
    }}>
      {/* Upper header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid rgba(255, 253, 241, 0.1)',
        paddingBottom: 20,
        marginBottom: 28
      }}>
        <div>
          <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#C3D809', fontWeight: 800 }}>
            Live Queue Monitor
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 4, letterSpacing: '-0.02em' }}>
            {branch?.name || 'Main Branch'}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#C3D809', display: 'inline-block', animation: 'pulse-dot 1.5s infinite' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255, 253, 241, 0.7)' }}>CONNECTED</span>
          </div>
          <Link to="/org/dashboard" className="btn btn-sm btn-secondary" style={{ background: 'rgba(255, 253, 241, 0.1)', color: '#FFFDF1', borderColor: 'rgba(255, 253, 241, 0.2)' }}>
            Exit Screen
          </Link>
        </div>
      </header>

      {/* Main Board content split */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: 32, flex: 1, minHeight: 0 }}>
        
        {/* Left Side: Now Serving */}
        <div style={{
          background: 'rgba(255, 253, 241, 0.03)',
          border: '1px solid rgba(255, 253, 241, 0.1)',
          borderRadius: 24,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C3D809', marginBottom: 28, borderBottom: '1px solid rgba(255, 253, 241, 0.08)', paddingBottom: 12 }}>
            📢 Now Serving
          </h2>

          {calledItems.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <span style={{ fontSize: 64 }}>🎯</span>
              <p style={{ fontSize: 22, color: 'rgba(255, 253, 241, 0.6)', fontWeight: 600 }}>All counters are currently open</p>
              <p style={{ fontSize: 14, color: 'rgba(255, 253, 241, 0.4)' }}>Tokens will appear here once called by staff.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: calledItems.length > 2 ? 'repeat(2, 1fr)' : '1fr',
              gap: 20,
              flex: 1,
              overflowY: 'auto',
              alignContent: 'start',
              paddingRight: 10
            }}>
              {calledItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: '#FFFDF1', // Contrast background
                    color: '#2A2312',
                    borderRadius: 20,
                    padding: '24px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 12px 36px rgba(0, 71, 65, 0.3)',
                    animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    border: '3px solid #C3D809'
                  }}
                >
                  <div>
                    <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5c533e', fontWeight: 600 }}>
                      {item.serviceName}
                    </span>
                    <p style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.02em', color: '#004741', fontFamily: 'monospace', marginTop: 4, lineHeight: 1 }}>
                      {item.tokenCode}
                    </p>
                  </div>
                  
                  <div style={{
                    background: '#004741',
                    color: '#FFFDF1',
                    borderRadius: 14,
                    padding: '16px 24px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#C3D809', fontWeight: 800 }}>PROCEED TO</span>
                    <p style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>
                      {item.counterName || 'Counter 1'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Please Wait / Next In Line */}
        <div style={{
          background: 'rgba(255, 253, 241, 0.02)',
          border: '1px solid rgba(255, 253, 241, 0.08)',
          borderRadius: 24,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255, 253, 241, 0.7)', marginBottom: 20, borderBottom: '1px solid rgba(255, 253, 241, 0.05)', paddingBottom: 12 }}>
            ⏳ Please Wait
          </h2>

          {waitingItems.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
              <span style={{ fontSize: 32 }}>🎫</span>
              <p style={{ fontSize: 14, color: 'rgba(255, 253, 241, 0.4)' }}>No other tokens waiting</p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              flex: 1,
              overflowY: 'auto',
              paddingRight: 6
            }}>
              {waitingItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'rgba(255, 253, 241, 0.04)',
                    border: '1px solid rgba(255, 253, 241, 0.05)',
                    borderRadius: 14,
                    transition: 'background 0.2s'
                  }}
                >
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: '#FFFDF1' }}>
                      {item.tokenCode}
                    </p>
                    <span style={{ fontSize: 12, color: 'rgba(255, 253, 241, 0.5)' }}>
                      {item.serviceName}
                    </span>
                  </div>
                  <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: 12 }}>
                    Waiting
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Footer ticker */}
      <footer style={{
        marginTop: 28,
        paddingTop: 16,
        borderTop: '1px solid rgba(255, 253, 241, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 13,
        color: 'rgba(255, 253, 241, 0.4)'
      }}>
        <span>Please keep your token voucher ready. Watch this screen for counter announcements.</span>
        <span style={{ fontWeight: 600 }}>QueueLess Smart Display</span>
      </footer>

      {needInteraction && (
        <div 
          onClick={enableAudio} 
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0, 71, 65, 0.98)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', gap: 20, textAlign: 'center', padding: 24
          }}
        >
          <span style={{ fontSize: 72, animation: 'float 3s ease-in-out infinite' }}>🔊</span>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#FFFDF1', letterSpacing: '-0.02em' }}>
            Click to Enable Audio Announcements
          </h2>
          <p style={{ color: 'rgba(255, 253, 241, 0.7)', maxWidth: 440, fontSize: 15, lineHeight: 1.6 }}>
            Modern browsers block automatic audio and voice play. Click anywhere on this screen to activate token chime calls.
          </p>
          <button className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 15, marginTop: 12 }}>
            📢 Activate Screen Audio
          </button>
        </div>
      )}
    </div>
  );
}
