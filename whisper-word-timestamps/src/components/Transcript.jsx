import { useMemo } from "react";

const Chunk = ({ chunk, currentTime, onClick, ...props }) => {
  const { text, timestamp } = chunk;
  const [start, end] = timestamp;

  const bolded = start <= currentTime && currentTime < end;

  return (
    <span {...props}>
      {text.startsWith(" ") ? " " : ""}
      <span
        onClick={onClick}
        className="text-md text-gray-600 dark:text-gray-300 cursor-pointer hover:text-red-600"
        title={timestamp.map((x) => x.toFixed(2)).join(" → ")}
        style={{
          textDecoration: bolded ? "underline" : "none",
          textShadow: bolded ? "0 0 1px #000" : "none",
        }}
      >
        {text.trim()}
      </span>
    </span>
  );
};

const Transcript = ({ transcript, currentTime, setCurrentTime, ...props }) => {
  const jsonTranscript = useMemo(() => {
    return (
      JSON.stringify(transcript, null, 2)
        // post-process the JSON to make it more readable
        .replace(/( {4}"timestamp": )\[\s+(\S+)\s+(\S+)\s+\]/gm, "$1[$2 $3]")
    );
  }, [transcript]);

  const downloadTranscript = () => {
    const blob = new Blob([jsonTranscript], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcript.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupWordsIntoPhrases = (chunks) => {
    const phrases = [];
    let currentPhrase = [];
    let phraseStart = null;
    
    chunks.forEach((chunk, index) => {
      const [start, end] = chunk.timestamp;
      const text = chunk.text.trim();
      
      // Start new phrase if this is the first chunk
      if (currentPhrase.length === 0) {
        phraseStart = start;
        currentPhrase.push({ text, start, end });
      } else {
        // Check if we should start a new phrase based on:
        // 1. Punctuation (., ?, !)
        // 2. Long gaps between words (> 1 second)
        // 3. Phrase length limit (~10-12 words)
        const lastChunk = currentPhrase[currentPhrase.length - 1];
        const timeGap = start - lastChunk.end;
        const hasPunctuation = /[.!?]$/.test(lastChunk.text);
        const isTooLong = currentPhrase.length >= 12;
        
        if (hasPunctuation || timeGap > 1.0 || isTooLong) {
          // Finalize current phrase
          const phraseEnd = lastChunk.end;
          phrases.push({
            text: currentPhrase.map(c => c.text).join(' '),
            start: phraseStart,
            end: phraseEnd
          });
          
          // Start new phrase
          currentPhrase = [{ text, start, end }];
          phraseStart = start;
        } else {
          // Add to current phrase
          currentPhrase.push({ text, start, end });
        }
      }
    });
    
    // Add the last phrase if it exists
    if (currentPhrase.length > 0) {
      const lastChunk = currentPhrase[currentPhrase.length - 1];
      phrases.push({
        text: currentPhrase.map(c => c.text).join(' '),
        start: phraseStart,
        end: lastChunk.end
      });
    }
    
    return phrases;
  };

  const convertToVTT = () => {
    let vttContent = "WEBVTT\n\n";
    const phrases = groupWordsIntoPhrases(transcript.chunks);
    
    phrases.forEach((phrase, index) => {
      const startTime = formatTimeForVTT(phrase.start);
      const endTime = formatTimeForVTT(phrase.end);
      vttContent += `${index + 1}\n`;
      vttContent += `${startTime} --> ${endTime}\n`;
      vttContent += `${phrase.text}\n\n`;
    });
    
    return vttContent;
  };

  const convertToSRT = () => {
    let srtContent = "";
    const phrases = groupWordsIntoPhrases(transcript.chunks);
    
    phrases.forEach((phrase, index) => {
      const startTime = formatTimeForSRT(phrase.start);
      const endTime = formatTimeForSRT(phrase.end);
      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${phrase.text}\n\n`;
    });
    
    return srtContent;
  };

  const formatTimeForVTT = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const formatTimeForSRT = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const downloadVTT = () => {
    const vttContent = convertToVTT();
    const blob = new Blob([vttContent], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subtitles.vtt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSRT = () => {
    const srtContent = convertToSRT();
    const blob = new Blob([srtContent], { type: "text/srt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subtitles.srt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div {...props}>
        {transcript.chunks.map((chunk, i) => (
          <Chunk
            key={i}
            chunk={chunk}
            currentTime={currentTime}
            onClick={(e) => {
              setCurrentTime(chunk.timestamp[0]); // Set to start of chunk
            }}
          />
        ))}
      </div>

      <div className="flex justify-center border-t text-sm text-gray-600 max-h-[150px] overflow-y-auto p-2 scrollbar-thin">
        <div className="flex gap-2 flex-wrap justify-center">
          <button
            className="flex items-center border px-2 py-1 rounded-lg bg-green-400 text-white hover:bg-green-500 cursor-pointer"
            onClick={downloadTranscript}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Download JSON
          </button>
          
          <button
            className="flex items-center border px-2 py-1 rounded-lg bg-blue-400 text-white hover:bg-blue-500 cursor-pointer"
            onClick={downloadVTT}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Download VTT
          </button>
          
          <button
            className="flex items-center border px-2 py-1 rounded-lg bg-purple-400 text-white hover:bg-purple-500 cursor-pointer"
            onClick={downloadSRT}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6 mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Download SRT
          </button>
        </div>
      </div>
    </>
  );
};
export default Transcript;
