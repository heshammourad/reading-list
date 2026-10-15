# NYT charts ingester

Fetches the current NYT Combined Print & E-Book Fiction list from the NYT Books API, saves the top 15 to Postgres (the same database the reading list app reads), and emails a summary of the new chart and the top 15 unread books by points.

`main.py` is deployed as the Cloud Run function `nytimes-books-charts-ingester` (project `heshammourad`, region `us-west1`, entry point `update_books_trigger`). The Cloud Scheduler job `nytimes-charts-updater` calls it daily at 17:00 America/Los_Angeles. It only fetches the current list and does nothing if that date is already in the database, so it doesn't backfill weeks it missed. Running it again is safe.

If a run fails, it emails the traceback and returns a 500. The scheduler job retries failed runs up to 3 times, starting 5 minutes apart, so one bad day can send up to 4 failure emails (same subject, so they thread together).

The unread ranking comes from the `book_rank_summary` view in the database, not from this code.

## Configuration

Set as environment variables on the Cloud Run service:

- `DB_CONNECTION_STRING`: Postgres connection string. Connections retry a few times because the Neon database may be asleep.
- `NYT_API_KEY`: NYT Books API key.
- `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_TO`: Gmail account and app password the summary is sent from, and the recipient. If any is missing, the email is skipped.

## Deploy

From this directory:

```powershell
gcloud run deploy nytimes-books-charts-ingester --source . --function update_books_trigger --region us-west1 --project heshammourad
```

This builds with Google's buildpacks, like the current deployment, and keeps the service's existing environment variables.

## Run locally

With the variables above set in your environment:

```powershell
pip install -r requirements.txt
python main.py
```
