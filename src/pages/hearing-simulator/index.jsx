import { useRef, useEffect, useState } from 'react';

function HearingSimulator() {
  const videoRef = useRef();
  const contextRef = useRef();
  const sourceRef = useRef();
  const filtersRef = useRef([]);
  const gainRef = useRef();
  const [isAudioSetup, setIsAudioSetup] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState('normal');

  const setupAudio = async () => {
    if (!videoRef.current || isAudioSetup) return;

    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      contextRef.current = context;

      if (context.state === 'suspended') {
        await context.resume();
      }

      const source = context.createMediaElementSource(videoRef.current);
      sourceRef.current = source;

      // Setup multiple filters for precise frequency control
      const filters = [];
      
      // Create a series of peaking filters for different frequency ranges
      const frequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
      
      frequencies.forEach(freq => {
        const filter = context.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0; // 0 dB = no change initially
        filters.push(filter);
      });

      const gainNode = context.createGain();
      gainNode.gain.value = 1.0;
      gainRef.current = gainNode;

      // Connect filters in series: source -> filter1 -> filter2 -> ... -> gain -> speakers
      let currentNode = source;
      filters.forEach(filter => {
        currentNode.connect(filter);
        currentNode = filter;
      });
      currentNode.connect(gainNode);
      gainNode.connect(context.destination);

      filtersRef.current = filters;
      setIsAudioSetup(true);
      console.log('Audio setup berhasil!');
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const handleLoadedMetadata = () => {
    setupAudio();
  };

  const handlePlay = async () => {
    if (!isAudioSetup) {
      await setupAudio();
    }
    
    if (contextRef.current?.state === 'suspended') {
      await contextRef.current.resume();
    }
  };

  // Reset all filters to normal
  const resetFilters = () => {
    if (!filtersRef.current.length || !contextRef.current) return;
    
    const ctx = contextRef.current;
    filtersRef.current.forEach(filter => {
      filter.gain.setValueAtTime(0, ctx.currentTime); // 0 dB = no change
    });
    gainRef.current.gain.setValueAtTime(1.0, ctx.currentTime);
  };

  // Apply gain reduction to specific frequency ranges
  const applyFrequencyLoss = (freqRanges) => {
    if (!filtersRef.current.length || !contextRef.current) return;
    
    const ctx = contextRef.current;
    const frequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
    
    resetFilters(); // Start with clean slate
    
    filtersRef.current.forEach((filter, index) => {
      const freq = frequencies[index];
      let shouldReduce = false;
      
      freqRanges.forEach(range => {
        if (freq >= range.min && freq <= range.max) {
          shouldReduce = true;
        }
      });
      
      if (shouldReduce) {
        // Reduce gain by specified amount (negative dB)
        filter.gain.setValueAtTime(-25, ctx.currentTime); // -25dB reduction
      }
    });
  };

  const simulateNormal = () => {
    resetFilters();
    setActiveSimulation('normal');
    console.log('Simulasi: Pendengaran normal');
  };

  const simulateLowFreqLoss = () => {
    // Target frequencies < 500 Hz (125, 250 Hz)
    applyFrequencyLoss([
      { min: 50, max: 500 }
    ]);
    setActiveSimulation('lowfreq');
    console.log('Simulasi: Low-frequency hearing loss');
  };

  const simulateMidFreqLoss = () => {
    // Target frequencies 500-2000 Hz (500, 1000 Hz)
    applyFrequencyLoss([
      { min: 500, max: 2000 }
    ]);
    setActiveSimulation('midfreq');
    console.log('Simulasi: Mid-frequency hearing loss');
  };

  const simulateHighFreqLoss = () => {
    // Target frequencies 2000-8000 Hz (2000, 4000, 8000 Hz)
    applyFrequencyLoss([
      { min: 2000, max: 8000 }
    ]);
    setActiveSimulation('highfreq');
    console.log('Simulasi: High-frequency hearing loss');
  };

  const simulateFlatLoss = () => {
    if (!gainRef.current || !contextRef.current) return;
    
    const ctx = contextRef.current;
    resetFilters();
    // Reduce overall volume (flat loss across all frequencies)
    gainRef.current.gain.setValueAtTime(0.3, ctx.currentTime); // -10dB overall
    setActiveSimulation('flat');
    console.log('Simulasi: Flat hearing loss');
  };

  const simulateSlopingLoss = () => {
    // Normal at low freq, gradual loss towards high freq
    if (!filtersRef.current.length || !contextRef.current) return;
    
    const ctx = contextRef.current;
    const frequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
    const lossAmounts = [0, -2, -5, -10, -15, -20, -25]; // Progressive loss
    
    resetFilters();
    
    filtersRef.current.forEach((filter, index) => {
      filter.gain.setValueAtTime(lossAmounts[index], ctx.currentTime);
    });
    
    setActiveSimulation('sloping');
    console.log('Simulasi: Sloping hearing loss');
  };

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginBottom: '32px',
          fontSize: '32px',
          fontWeight: '300',
          letterSpacing: '0.5px'
        }}>
          Hearing Loss Simulator
        </h1>
        
        <div style={{ 
          backgroundColor: '#1a1a1a', 
          borderRadius: '16px', 
          padding: '24px',
          border: '1px solid #333'
        }}>
          <div style={{
            backgroundColor: '#252525',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid #333'
          }}>
            <p style={{ color: '#ccc', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '500' }}>
              Upload Video
            </p>
            <input 
              type="file" 
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && videoRef.current) {
                  const url = URL.createObjectURL(file);
                  videoRef.current.src = url;
                  setIsAudioSetup(false);
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #444',
                backgroundColor: '#333',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            />
          </div>

          <video
            ref={videoRef}
            controls
            crossOrigin="anonymous"
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={handlePlay}
            onError={(e) => console.error('Video error:', e)}
            style={{ 
              width: '100%', 
              height: 'auto',
              borderRadius: '12px',
              maxHeight: '60vh',
              backgroundColor: '#000'
            }}
          >
            {/* <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" /> */}
            {/* <source src="https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4" type="video/mp4" /> */}
            {/* <source src="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" type="video/mp4" /> */}
            <source src="/assets/video-display-2.mp4" type="video/mp4" />
            {/* <source src="https://www.dropbox.com/scl/fi/pr0ajmjprlmgaun154bej/Changing-The-Way-We-Talk-About-Disability-_-Amy-Oulton-_-TEDxBrighton.mp4?rlkey=xvjd1x4xug5a3z017dt10kybg&st=tvnvps7k&dl=0" type="video/mp4" /> */}
            Video tidak dapat dimuat. Silakan upload video lokal.
          </video>

          <div style={{
            marginTop: '32px'
          }}>
            <h3 style={{ 
              color: '#fff', 
              fontSize: '18px',
              fontWeight: '400',
              marginBottom: '20px',
              letterSpacing: '0.3px'
            }}>
              Simulasi Berdasarkan Rentang Frekuensi
            </h3>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {[
                { 
                  id: 'normal',
                  label: "Normal", 
                  range: "20-20kHz",
                  onClick: simulateNormal,
                  desc: "Pendengaran penuh di semua frekuensi"
                },
                { 
                  id: 'lowfreq',
                  label: "Low-Frequency Loss", 
                  range: "<500Hz",
                  onClick: simulateLowFreqLoss,
                  desc: "Sulit dengar bass, suara pria, deru kendaraan"
                },
                { 
                  id: 'midfreq',
                  label: "Mid-Frequency Loss", 
                  range: "500-2kHz",
                  onClick: simulateMidFreqLoss,
                  desc: "Sulit tangkap inti percakapan dan vokal"
                },
                { 
                  id: 'highfreq',
                  label: "High-Frequency Loss", 
                  range: "2-8kHz",
                  onClick: simulateHighFreqLoss,
                  desc: "Konsonan tidak jelas, percakapan 'mumbul'"
                },
                { 
                  id: 'flat',
                  label: "Flat Hearing Loss", 
                  range: "All freq",
                  onClick: simulateFlatLoss,
                  desc: "Semua suara pelan secara merata"
                },
                { 
                  id: 'sloping',
                  label: "Sloping Loss", 
                  range: "Progressive",
                  onClick: simulateSlopingLoss,
                  desc: "Normal rendah, hilang bertahap ke tinggi"
                }
              ].map((btn) => (
                <div
                  key={btn.id}
                  onClick={btn.onClick}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: activeSimulation === btn.id ? '2px solid #ffffff' : '1px solid #444',
                    backgroundColor: activeSimulation === btn.id ? '#2a2a2a' : '#1f1f1f',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onMouseOver={e => {
                    if (activeSimulation !== btn.id) {
                      e.currentTarget.style.backgroundColor = '#262626';
                      e.currentTarget.style.borderColor = '#666';
                    }
                  }}
                  onMouseOut={e => {
                    if (activeSimulation !== btn.id) {
                      e.currentTarget.style.backgroundColor = '#1f1f1f';
                      e.currentTarget.style.borderColor = '#444';
                    }
                  }}
                >
                  {activeSimulation === btn.id && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#00ff88',
                      animation: 'pulse 2s infinite'
                    }} />
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h4 style={{
                      color: activeSimulation === btn.id ? '#fff' : '#ddd',
                      fontSize: '16px',
                      fontWeight: '500',
                      margin: '0',
                      letterSpacing: '0.2px'
                    }}>
                      {btn.label}
                    </h4>
                    <span style={{
                      color: activeSimulation === btn.id ? '#00ff88' : '#888',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: activeSimulation === btn.id ? 'rgba(0,255,136,0.1)' : '#333',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {btn.range}
                    </span>
                  </div>
                  
                  <p style={{
                    color: activeSimulation === btn.id ? '#ccc' : '#999',
                    fontSize: '13px',
                    margin: '0',
                    lineHeight: '1.4'
                  }}>
                    {btn.desc}
                  </p>
                </div>
              ))}
            </div>

            {!isAudioSetup && (
              <div style={{ 
                backgroundColor: '#2a1f1f',
                border: '1px solid #553333',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '20px'
              }}>
                <p style={{ 
                  color: '#ff9999', 
                  margin: '0',
                  fontSize: '14px'
                }}>
                  ⚠️ Audio belum aktif. Klik play pada video untuk mengaktifkan simulasi.
                </p>
              </div>
            )}

            <div style={{
              backgroundColor: '#1f1f1f',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '16px'
            }}>
              <p style={{
                color: '#aaa',
                fontSize: '13px',
                margin: '0',
                lineHeight: '1.5'
              }}>
                💡 <strong>Tips:</strong> High-frequency loss adalah yang paling umum terjadi. 
                Cobalah berbagai simulasi sambil mendengarkan percakapan atau musik untuk merasakan perbedaannya.
              </p>
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '24px', 
          color: '#666', 
          fontSize: '13px',
          textAlign: 'center'
        }}>
          <p>Gunakan headphone untuk pengalaman simulasi yang optimal</p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `
      }} />
    </div>
  );
}

export default HearingSimulator;