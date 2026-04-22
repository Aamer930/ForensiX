import sqlite3
import json
import os
from models import Job

DB_PATH = "/app/history.db" if os.environ.get("AI_MODE") else "history.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS cases (
            job_id TEXT PRIMARY KEY,
            filename TEXT,
            status TEXT,
            data TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_case(job: Job):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Serialize to JSON
    data_str = json.dumps(job.model_dump())
    c.execute('''
        INSERT OR REPLACE INTO cases (job_id, filename, status, data)
        VALUES (?, ?, ?, ?)
    ''', (job.job_id, job.filename, job.status, data_str))
    conn.commit()
    conn.close()

def get_all_cases():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT data FROM cases ORDER BY rowid DESC')
    rows = c.fetchall()
    conn.close()
    
    cases = []
    for row in rows:
        try:
            cases.append(json.loads(row[0]))
        except:
            pass
    return cases
