"""
Python Serverless Function for YouTube Transcript Fetching
Deployed to Vercel as /api/transcript
"""

from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    HAS_TRANSCRIPT_API = True
except ImportError:
    HAS_TRANSCRIPT_API = False


def fetch_transcript(video_id: str) -> dict:
    """Fetch transcript for a YouTube video."""
    if not HAS_TRANSCRIPT_API:
        return {
            "success": False,
            "error": "youtube-transcript-api not installed",
            "errorType": "ImportError"
        }

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


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query parameters
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        video_id = params.get("videoId", [None])[0]

        if not video_id:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": "videoId parameter required"
            }).encode())
            return

        result = fetch_transcript(video_id)

        status = 200 if result.get("success") else 400
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())

    def do_POST(self):
        # Read body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode()

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {}

        video_id = data.get("videoId")

        if not video_id:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": "videoId required in request body"
            }).encode())
            return

        result = fetch_transcript(video_id)

        status = 200 if result.get("success") else 400
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
