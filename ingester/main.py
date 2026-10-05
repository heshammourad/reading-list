import os
import time
import psycopg2
import smtplib
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date
from typing import Any, Dict, Optional
import requests

# --- CONFIGURATION ---
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING")
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
EMAIL_TO = os.getenv("EMAIL_TO")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
}

class BookEntry:
    def __init__(self, name, author, weeks, cover_image_url=None):
        self.name = name
        self.author = author
        self.weeks = weeks
        self.cover_image_url = cover_image_url

def get_db_connection():
    """
    Attempts to connect to the database with a retry mechanism.
    Crucial for Serverless DBs like Neon that sleep when inactive.
    """
    max_retries = 5
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(DB_CONNECTION_STRING, connect_timeout=10)
            return conn
        except psycopg2.OperationalError as e:
            print(f"DB Connection Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print(f"Neon DB might be sleeping. Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                raise e

def get_latest_date() -> Optional[date]:
    conn = None
    latest_date = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT MAX(date) FROM charts;")
        result = cur.fetchone()
        if result and result[0]:
            latest_date = result[0]
        cur.close()
    except Exception as e:
        print(f"Error fetching latest date: {e}")
    finally:
        if conn:
            conn.close()
    return latest_date

def fetch_nyt_chart() -> Dict[str, Any]:
    NYT_API_KEY = os.getenv("NYT_API_KEY")
    if not NYT_API_KEY:
        raise ValueError("NYT_API_KEY environment variable is not set")
        
    chart_data = {"books": []}
    
    url = f"https://api.nytimes.com/svc/books/v3/lists/current/combined-print-and-e-book-fiction.json?api-key={NYT_API_KEY}"
    
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    data = response.json()
    
    results = data.get("results", {})
    published_date_str = results.get("published_date")
    if not published_date_str:
        raise ValueError("Could not find published_date in NYT API response")
         
    chart_data["date"] = datetime.strptime(published_date_str, "%Y-%m-%d").date()
    
    books = results.get("books", [])[:15]
    for book in books:
        title = book.get("title", "").strip().upper()
        author = book.get("author", "").strip()
        weeks = book.get("weeks_on_list", 1)
        cover_image_url = book.get("book_image")
        if cover_image_url:
            cover_image_url = cover_image_url.replace("http:", "https:")
        
        chart_data["books"].append(BookEntry(title, author, weeks, cover_image_url))
        
    return chart_data

def save_to_db(chart_data):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        chart_date = chart_data["date"]
        print(f"Processing chart for date: {chart_date}")

        for rank, book in enumerate(chart_data["books"], start=1):
            cur.execute("""
                INSERT INTO books (name, author, cover_image_url) 
                VALUES (%s, %s, %s)
                ON CONFLICT (name, author) DO UPDATE 
                SET cover_image_url = COALESCE(EXCLUDED.cover_image_url, books.cover_image_url)
                RETURNING id;
            """, (book.name, book.author, book.cover_image_url))
            
            book_id = cur.fetchone()[0]

            cur.execute("""
                INSERT INTO charts (book_id, rank, weeks_on_list, date)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (book_id, date) DO NOTHING;
            """, (book_id, rank, book.weeks, chart_date))

        conn.commit()
        cur.close()
        print(f"Successfully processed {len(chart_data['books'])} books.")

    except Exception as e:
        print(f"Database Error: {e}")
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()

def send_email(subject, body):
    if not all([EMAIL_USER, EMAIL_PASSWORD, EMAIL_TO]):
        print("Email configuration missing. Skipping email.")
        return

    msg = MIMEMultipart()
    msg["From"] = EMAIL_USER
    msg["To"] = EMAIL_TO
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_USER, EMAIL_TO, msg.as_string())
        print("Email sent successfully!")
    except Exception as e:
        print(f"Failed to send email: {e}")

def get_status_char(status):
    if status == 'On Hold':
        return 'H'
    elif status == 'Available':
        return 'A'
    elif status == 'Unavailable':
        return 'X'
    elif status == 'Reading':
        return 'R'
    else:
        return '_'

def get_email_body_data(nyt_date):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Fetch latest chart books (for the just-saved date)
        cur.execute("""
            SELECT b.name, b.author, b.status, c.weeks_on_list, c.rank
            FROM books b
            JOIN charts c ON b.id = c.book_id
            WHERE c.date = %s
            ORDER BY c.rank;
        """, (nyt_date,))
        chart_books = cur.fetchall()
        
        # Fetch all unread books in points order
        cur.execute("""
            SELECT name, author, status, points, weeks
            FROM book_rank_summary
            WHERE status IS NULL OR status IN ('Unread', 'On Hold', 'Available', 'Unavailable')
            ORDER BY points DESC, weeks DESC, high ASC, last ASC, name ASC;
        """)
        unread_books = cur.fetchall()
        cur.close()
        
        return chart_books, unread_books
    except Exception as e:
        print(f"Error fetching email body data: {e}")
        return [], []
    finally:
        if conn:
            conn.close()

def run_ingestion():
    print("Starting ingestion check...")
    
    latest_db_date = get_latest_date()
    
    print("Fetching data from NYT...")
    nyt_data = fetch_nyt_chart()
    nyt_date = nyt_data["date"]

    print(f"Latest DB Date: {latest_db_date}")
    print(f"NYT Chart Date: {nyt_date}")

    if latest_db_date and nyt_date <= latest_db_date:
        print("Chart is already up-to-date. No action taken.")
        return "Skipped"

    save_to_db(nyt_data)
    
    chart_books, unread_books = get_email_body_data(nyt_date)
    
    unread_ranks = {}
    for idx, (name, author, status, points, weeks) in enumerate(unread_books, 1):
        unread_ranks[(name, author)] = idx
        
    chart_lines = []
    for name, author, status, weeks_on_list, rank in chart_books:
        if status == 'Read':
            label = 'Read'
        elif status == 'Reading':
            label = 'Reading'
        else:
            unread_rank = unread_ranks.get((name, author))
            label = str(unread_rank) if unread_rank is not None else '-'
        chart_lines.append(f"{rank:>4}. ({weeks_on_list} wks - {label}) {name} by {author}")
        
    top_unread_lines = []
    for idx, (name, author, status, points, weeks) in enumerate(unread_books[:15], 1):
        status_char = get_status_char(status)
        top_unread_lines.append(f"{idx:>4}. ({status_char}) {name} by {author} ({points} pts - {weeks} wks)")
        
    date_str = nyt_date.strftime('%B %d, %Y')
    subject = f"📚 NYT Charts Updated: {date_str}"
    
    chart_section = "\n".join(chart_lines)
    top_unread_section = "\n".join(top_unread_lines)
    
    body = (
        f"Chart of {date_str}\n\n"
        f"{chart_section}\n\n\n"
        f"Updated 1 charts!\n\n"
        f"Top unread books:\n\n"
        f"{top_unread_section}"
    )
    
    send_email(subject, body)
    return "Updated"


# --- Cloud Function Entry Point ---
def update_books_trigger(request):
    try:
        result = run_ingestion()
        return f"Process Complete: {result}", 200
    except Exception as e:
        error_msg = traceback.format_exc()
        print(f"CRITICAL FAILURE:\n{error_msg}")
        return f"Error: {e}", 500

if __name__ == "__main__":
    run_ingestion()