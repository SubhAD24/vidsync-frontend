import { useState, useEffect } from "react";
import axios from "axios";


const API = "https://vidfetch-backend-production.up.railway.app/api";

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState("");
  const [job, setJob] = useState(null);
  const [isAudio, setIsAudio] = useState(false);
  const [statusMsg, setStatusMsg] = useState("SYSTEM_READY");

  useEffect(() => {
    const messages = ["SYSTEM_OPTIMAL", "SSL_SECURE", "SERVERS_ONLINE", "BANDWIDTH_READY", "V.2.0.5_STABLE"];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setStatusMsg(messages[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (url.includes("youtube") || url.includes("youtu.be")) setPlatform("YouTube");
    else if (url.includes("instagram")) setPlatform("Instagram");
    else if (url.includes("facebook") || url.includes("fb.watch")) setPlatform("Facebook");
    else setPlatform(null);
  }, [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      alert("Please allow clipboard permissions or paste manually.");
    }
  };

  const fetchInfo = async () => {
    if (!url) return;
    setLoading(true);
    setInfo(null);
    try {
      const res = await axios.post(`${API}/info`, { url });
      setInfo(res.data);
      if (res.data.qualities?.length > 0) setSelectedQuality(res.data.qualities[0]);
    } catch (err) {
      alert("Could not find video. Please check the URL.");
    } finally {
      setLoading(false);
    }
  };

  const startDownload = async () => {
    if (!info) return;
    const newJob = { id: Date.now().toString(), title: info.title };
    setJob({ ...newJob, progress: 0, status: "starting" });

    try {
      await axios.post(`${API}/download`, {
        url,
        quality: selectedQuality,
        jobId: newJob.id,
        title: info.title,
        format: isAudio ? 'audio' : 'video'
      });

      const evt = new EventSource(`${API}/progress/${newJob.id}`);
      evt.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.status === "error") {
            evt.close();
            setJob(prev => ({ ...prev, status: "error" }));
            alert("Download failed. Please try again.");
            return;
        }
        setJob(prev => ({ ...prev, progress: data.progress || 0, status: data.status }));
        if (data.status === "done") {
            evt.close();
            window.location.href = `${API}/file/${newJob.id}`;
            setTimeout(() => {
                setJob(null);
                setInfo(null);
                setUrl("");
                setPlatform(null);
            }, 4000);
        }
      };
    } catch (err) {
      console.error(err);
      setJob(null);
    }
  };

  // 🟢 SMART PLAYER RENDERER
  const renderPreview = () => {
    if (!info) return null;

    if (platform === "YouTube") {
      let videoId = null;
      let isShorts = false;
      try {
        if (url.includes("shorts")) {
            videoId = url.split("shorts/")[1].split("?")[0];
            isShorts = true;
        } else if (url.includes("v=")) {
            videoId = url.split("v=")[1].split("&")[0];
        } else if (url.includes("youtu.be")) {
            videoId = url.split("youtu.be/")[1].split("?")[0];
        }
      } catch (e) { }

      if (videoId) {
        // 🟢 DISABLE AUTOPLAY ON MOBILE TO FIX SOUND
        const isMobile = window.innerWidth <= 768;
        const autoPlayState = isMobile ? 0 : 1; 

        return (
          <div className={`yt-container ${isShorts ? 'shorts-mode' : ''}`}>
            <iframe 
              className="preview-iframe"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoPlayState}&mute=0&controls=1&playsinline=1&modestbranding=1&rel=0`}
              title="YouTube Preview"
              allow="autoplay; encrypted-media"
              allowFullScreen
            ></iframe>
          </div>
        );
      }
    }

    if (platform === "Instagram") {
       const match = url.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
       if (match && match[1]) {
         return (
           <iframe 
             className="preview-iframe vertical"
             src={`https://www.instagram.com/p/${match[1]}/embed/captioned`}
             title="Insta Preview"
             scrolling="no"
             allowTransparency="true"
           ></iframe>
         );
       }
    }

    if (platform === "Facebook") {
      if (info.preview) {
        return (
          <video 
            className="preview-video" 
            src={info.preview} 
            controls autoPlay muted loop playsInline 
            poster={info.thumbnail}
            referrerPolicy="no-referrer"
          />
        );
      }
      const encodedUrl = encodeURIComponent(url);
      return (
        <iframe
          className="preview-iframe"
          src={`https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&t=0`}
          title="Facebook Preview"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      );
    }

    if (info.preview) {
      return (
        <video 
          className="preview-video" 
          src={info.preview} 
          controls autoPlay muted loop playsInline 
          poster={info.thumbnail}
          referrerPolicy="no-referrer"
        />
      );
    }

    return (
      <img 
        src={info.thumbnail} 
        alt="Preview" 
        className="preview-img" 
        referrerPolicy="no-referrer"
      />
    );
  };

  return (
    <div className="app-container">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="header">
        <div className="brand">Vid<span>Sync</span></div>
        <div className="brand-subtitle">
          Premium Downloader for <span>Video (MP4)</span> & <span>Audio (MP3)</span>
        </div>
      </div>

      <div className="clean-card">
        
        {!job && !info && (
          <>
            <div className="badge-container">
              {platform && (
                <div className={`badge badge-${platform === "YouTube" ? "yt" : platform === "Instagram" ? "ig" : "fb"}`}>
                  {platform} Detected
                </div>
              )}
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label className="input-label">Video Link</label>
              <div className="input-wrapper">
                <input 
                  className="clean-input"
                  placeholder="Paste URL here..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchInfo()}
                />
                <button className="paste-btn" onClick={handlePaste}>PASTE</button>
              </div>
            </div>

            <button className="primary-btn" onClick={fetchInfo} disabled={loading || !url}>
              {loading ? "Searching..." : "Find Video"}
            </button>

            <div className="supported-platforms">
              <span className="platform-label">Supported Platforms</span>
              <div className="platform-grid">
                
                <div className="platform-item">
                  <svg className="platform-icon yt" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  <span className="platform-name">YouTube</span>
                </div>

                <div className="platform-item">
                  {/* 🟢 PERFECT INSTAGRAM ICON (Squared Version) */}
                  <svg className="platform-icon ig" viewBox="0 0 24 24">
                    <path d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M19,5A1,1 0 0,1 20,6A1,1 0 0,1 19,7A1,1 0 0,1 18,6A1,1 0 0,1 19,5Z"/>
                  </svg>
                  <span className="platform-name">Instagram</span>
                </div>

                <div className="platform-item">
                  <svg className="platform-icon fb" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                  <span className="platform-name">Facebook</span>
                </div>
              </div>
            </div>
          </>
        )}

        {info && !job && (
          <>
             {/* VIDEO PREVIEW */}
             <div className="preview-container">
               {renderPreview()}
             </div>
             
             {/* AUDIO / VIDEO TOGGLE */}
             <div className="controls-row">
                <div style={{flex:1}}>
                  <span className="toggle-label">Format</span>
                </div>
                <div className={`switch-container ${isAudio ? 'audio-mode' : ''}`} onClick={() => setIsAudio(!isAudio)}>
                  <div className={`switch-option ${!isAudio ? 'active' : ''}`}>Video</div>
                  <div className={`switch-option ${isAudio ? 'active' : ''}`}>Audio</div>
                </div>
             </div>

             {!isAudio && (
               <>
                 <label className="input-label">Select Quality</label>
                 <select className="clean-select" value={selectedQuality} onChange={(e) => setSelectedQuality(e.target.value)}>
                   {info.qualities.map(q => <option key={q} value={q}>{q}p Resolution</option>)}
                 </select>
               </>
             )}

             <button className="primary-btn" onClick={startDownload}>
               {isAudio ? "Download MP3 Audio" : "Download Video File"}
             </button>
          </>
        )}

        {job && (
          <div style={{marginTop:'20px'}}>
             <div className="input-label" style={{marginBottom:'10px', fontSize:'14px', color:'#fff'}}>
               {job.status === "done" ? "Download Complete" : (isAudio ? "Converting Audio..." : "Downloading...")}
             </div>
             <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',color:'#888',marginBottom:'8px'}}>
               <span>{job.status === "done" ? "Ready" : "Processing"}</span>
               <span>{Math.round(job.progress)}%</span>
             </div>
             <div style={{width:'100%',height:'8px',background:'#222',borderRadius:'4px',overflow:'hidden'}}>
               <div style={{width: `${job.progress}%`,height:'100%',background:'#fff',transition:'width 0.3s'}} />
             </div>
          </div>
        )}

      </div>

      <footer className="footer">
        <div className="footer-links">
          <a href="#" className="footer-link">Terms</a>
          <a href="#" className="footer-link">Privacy</a>
          <a href="#" className="footer-link">Support</a>
        </div>
        <div className="footer-text" style={{ textAlign: 'center' }}>
          &copy; {new Date().getFullYear()} VidSync Inc.<br/>
          <span style={{ fontSize: '10px', opacity: 0.5 }}>Users are responsible for respecting platform terms and copyright</span>
        </div>
        <div className="social-tag">Secured by SSL</div>
      </footer>
      
      <div className="status-widget">
        <div className="status-dot"></div>
        <span>{statusMsg}</span>
      </div>

    </div>
  );
}