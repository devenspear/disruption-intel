"""
YouTube Transcript Service
Deployed to Railway as a separate Python service
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi

app = Flask(__name__)
CORS(app)


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "transcript-service"})


@app.route("/transcript", methods=["GET", "POST"])
def get_transcript():
    if request.method == "POST":
        data = request.get_json() or {}
        video_id = data.get("videoId")
    else:
        video_id = request.args.get("videoId")

    if not video_id:
        return jsonify({
            "success": False,
            "error": "videoId parameter required"
        }), 400

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

        return jsonify({
            "success": True,
            "videoId": video_id,
            "segments": segments,
            "fullText": full_text,
            "wordCount": word_count,
            "language": "en",
            "source": "youtube_auto"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "videoId": video_id,
            "error": str(e),
            "errorType": type(e).__name__
        }), 400


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
