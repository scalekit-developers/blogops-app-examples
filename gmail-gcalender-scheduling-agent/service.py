# service.py — minimal (keep only if you want an HTTP API)
from __future__ import annotations
import os
from flask import Flask, jsonify, request, redirect
from dotenv import load_dotenv
from sk_connectors import get_connector

load_dotenv()

app = Flask(__name__)
connector = get_connector()

@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "scalekit-scheduler"})

@app.get("/auth/init")
def auth_init():
    """Start OAuth for gmail or googlecalendar. Example:
       /auth/init?service=gmail
       /auth/init?service=googlecalendar
       Optional: /auth/init?service=gmail&identifier=you@company.com
    """
    service = request.args.get("service")  # gmail | googlecalendar
    if not service:
        return jsonify({"error": "missing service"}), 400

    identifier = request.args.get("identifier") or connector.get_user_identifier()
    if not identifier:
        return jsonify({"error": "no identifier (set SCALEKIT_IDENTIFIER in .env or pass ?identifier=...)"}), 400

    url = connector.get_authorization_url(service, identifier)
    if not url:
        return jsonify({"error": "failed to generate authorization url"}), 500
    return redirect(url)

if __name__ == "__main__":
    # Run dev server: python service.py
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5001")), debug=True)
