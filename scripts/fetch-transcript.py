#!/usr/bin/env python3
"""
YouTube Transcript Fetcher
Usage: python3 fetch-transcript.py <video_id>
Returns JSON with transcript data
"""

import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def fetch_transcript(video_id: str) -> dict:
    """Fetch transcript for a YouTube video."""
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)

        segments = []
        for entry in transcript:
            segments.append({
                "start": entry.start,
                "duration": entry.duration,
                "text": entry.text
            })

        full_text = " ".join([s["text"] for s in segments])
        word_count = len(full_text.split())

        return {
            "success": True,
            "videoId": video_id,
            "segments": segments,
            "fullText": full_text,
            "wordCount": word_count,
            "language": "en",
            "source": "youtube_auto"
        }

    except Exception as e:
        return {
            "success": False,
            "videoId": video_id,
            "error": str(e),
            "errorType": type(e).__name__
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Video ID required"}))
        sys.exit(1)

    video_id = sys.argv[1]
    result = fetch_transcript(video_id)
    print(json.dumps(result))
