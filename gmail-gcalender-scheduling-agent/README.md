
# 📅 Gmail → Google Calendar Scheduling Agent

This project automates meeting scheduling:  
- Reads **meeting invitation emails** from Gmail.  
- Extracts time, duration, attendees, etc.  
- Proposes **free slots** from your Google Calendar.  
- Optionally books an event and sends invitations.  

Powered by **Scalekit connectors** for Gmail + Google Calendar.

---

## ⚙️ Setup

### 1. Clone & install
```bash
git clone <this-repo>
cd gmail-gcalender-scheduling-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

### 2. Configure environment

Copy `.env.local` → `.env`:

```env
# Scalekit connection
SCALEKIT_BASE_URL=https://hey.scalekit.dev
SCALEKIT_IDENTIFIER=you@yourcompany.com   # your email / unique user id
SCALEKIT_API_KEY=sk-xxxxxx                # your Scalekit API key

# Defaults
USER_DEFAULT_TZ=Asia/Kolkata
WORK_START_LOCAL=10:00
WORK_END_LOCAL=18:00
DEFAULT_DURATION_MIN=30
BUFFER_MIN=10

# Service
PORT=5001
```

---

## 🔑 Authentication

You must **authorize Gmail + Google Calendar** once.

Run the service:
```bash
python service.py
```

Then open in your browser:
- Gmail → [http://localhost:5001/auth/init?service=gmail](http://localhost:5001/auth/init?service=gmail)  
- Calendar → [http://localhost:5001/auth/init?service=googlecalendar](http://localhost:5001/auth/init?service=googlecalendar)  

✅ After success, Scalekit stores tokens and runner.py can work headlessly.

---

## ▶️ Usage

### 1. Debug service (optional)
```bash
python service.py
```
- `GET /health` → returns status  
- `GET /auth/init?...` → starts auth flow  

### 2. Run once from CLI
```bash
python runner.py
```

This will:
1. Search Gmail for invitations (`Invitation:`, `.ics` files, Google Meet links).  
2. Parse meeting time, subject, attendees.  
3. Look at your Google Calendar availability.  
4. Either:
   - **Book event** (if email has exact time), OR  
   - **Propose free slots** (if flexible).  

Example output:
```
Identifier: you@company.com
[gmail] matched 2 msg(s) for query:
  - Invitation: Project Kickoff @ Mon Oct 20, 2025 10:00am
Chosen message id: 199e77d984c0cd38
Subject: Invitation: Project Kickoff
Using calendar: you@company.com
PROPOSE:
- Tue, Oct 21 — 10:00 AM–10:30 AM Asia/Kolkata
- Tue, Oct 21 — 11:00 AM–11:30 AM Asia/Kolkata
```

---

## 📂 File Overview

- `runner.py` → main CLI runner (preferred for daily use).  
- `service.py` → minimal Flask service for OAuth + health checks.  
- `gmail_api.py` → wrappers for Gmail connector.  
- `calendar_api.py` → wrappers for Calendar connector.  
- `parsers.py` → parses subjects/bodies into meeting entities.  
- `slotting.py` → computes free/busy slots.  
- `sk_connectors.py` → Scalekit connector bootstrap.  
- `settings.py` → loads config.  
- `entities.py` → dataclasses for parsed entities (ParsedEmail, Attendee).  

---

## ✅ Tips
- Always run `service.py` once for auth before using `runner.py`.  
- If event creation fails with `INVALID_ARGUMENT`, check that `start.dateTime` and `end.dateTime` are in ISO format with timezone.  
- Adjust `runner.py` queries to better filter **only real invites**.  
