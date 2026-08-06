# PARKPOW - KENER

## Deployment

The production server (`kener`) has ~1 GB RAM — not enough to run the Vite build. **Always build locally and transfer the image.**

```bash
# 1. Build locally
docker build -t kener-parkpow .

# 2. Transfer image to server
docker save kener-parkpow | ssh kener 'docker load'

# 3. Deploy
ssh kener 'cd /home/pef/kener && git pull && docker compose up -d'
```

Step 3 needs the `git pull`. The server holds its own clone at `/home/pef/kener`, and `docker compose` reads `docker-compose.yml` from that directory. A new image alone does not apply a compose change.

---

## Database

Kener uses SQLite through `better-sqlite3`. The file is `/app/database/kener.sqlite.db` in the Docker volume `kener_db`.

**The driver is synchronous.** Every query blocks the Node event loop until it returns. Do not run heavy ad-hoc SQL against the live database. Stop the container first.

| Setting        | Value   | Where it lives                       |
| -------------- | ------- | ------------------------------------ |
| `journal_mode` | `wal`   | the database file header, permanent  |
| `busy_timeout` | 5000 ms | `knexfile.ts`, per connection        |
| `cache_size`   | 64 MB   | `knexfile.ts`, per connection        |
| Retention      | 30 days | `dataRetentionPolicy` in `site_data` |

SQLite keeps `busy_timeout` and `cache_size` on the connection, not in the file. A `pool.afterCreate` hook in `knexfile.ts` applies them at each start. Set `SQLITE_BUSY_TIMEOUT_MS` and `SQLITE_CACHE_SIZE_KIB` to change them.

Retention is a global setting in the admin interface, not a per-monitor one. A cleanup job runs each day at 00:00 UTC. Keep the value near 30 days. The server has only ~1 GB of RAM, and a database larger than the free memory makes every read go to disk.

### Backup

Stop the container first. A copy of a live SQLite file can hold a partial transaction.

```bash
ssh kener 'docker stop kener'
ssh kener 'sudo cp -a /var/lib/docker/volumes/kener_db/_data/kener.sqlite.db /home/pef/kener-db-backup-$(date +%Y%m%d).sqlite.db'
ssh kener 'docker start kener'
```

Check the copy with `md5sum` against the source. Then run `PRAGMA quick_check` on the backup.

---

## Logs

Kener does not write timestamps in its log lines. Add `-t` and Docker prepends the time it captured each line.

```bash
docker logs kener -t --since 1h 2>&1 | tail -50
```

Use `2>&1`. Docker keeps stdout and stderr apart, and Node writes errors to stderr. Without `2>&1` no error line appears.

A monitor edit removes and re-registers that monitor's scheduler. This behavior is correct. Hide those lines to find real errors.

```bash
docker logs kener -t --since 1h 2>&1 | grep -viE "ADDING NEW SCHEDULER|REMOVING INACTIVE SCHEDULER"
```

---

## Parkpow Health Check

### Expected Response

```json
{
  "Background Task Health Check": "working",
  "Cache backend: default": "working",
  "DatabaseBackend": "working",
  "DatabaseBackend[default]": "working",
  "DatabaseBackend[huey]": "working",
  "DatabaseHeartBeatCheck": "working",
  "DefaultFileStorageHealthCheck": "working",
  "DiskUsage": "working",
  "MailHealthCheck": "working",
  "MemoryUsage": "working",
  "MigrationsHealthCheck": "working",
  "S3Boto3StorageHealthCheck": "working",
  "Scheduled Tasks Health Check": "working"
}
```

---

## Useful Webhook Triggers

### Pushbullet

One trigger per recipient. Only the `email` field changes between triggers.

| Field  | Value                                    |
| ------ | ---------------------------------------- |
| Type   | `webhook`                                |
| URL    | `https://api.pushbullet.com/v2/pushes`   |
| Header | `Access-Token: $PUSHBULLET_ACCESS_TOKEN` |

If the email matches a Pushbullet account → push notification.
If not → Pushbullet falls back to a plain email.

```handlebars
{
  "type": "note",
  "email": "name@platerecognizer.com",
  "title": "{{#is_triggered}}⚠️{{/is_triggered}}{{#is_resolved}}✅{{/is_resolved}} {{alert_name}}",
  "body": "Monitor: {{alert_for}}\nStatus: {{alert_status}}\nSeverity: {{alert_severity}}\nValue: {{alert_value}}\n{{alert_message}}\n\n{{alert_cta_url}}"
}
```

### Google Chat

One trigger per space. Auth is embedded in the URL — no headers needed.

| Field   | Value                                                                                 |
| ------- | ------------------------------------------------------------------------------------- |
| Type    | `webhook`                                                                             |
| URL     | `https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=...&token=$GCHAT_TOKEN` |
| Headers | none                                                                                  |

Get the URL from the space → **Apps & Integrations → Webhooks**.

```handlebars
{
  "text": "{{#is_triggered}}🚨 *{{alert_name}}*{{/is_triggered}}{{#is_resolved}}✅ *{{alert_name}} Resolved*{{/is_resolved}}\n\nMonitor: {{alert_for}}\nStatus: {{alert_status}}\nSeverity: {{alert_severity}}\nValue: {{alert_value}}\n{{alert_message}}\n\n{{alert_cta_text}}: {{alert_cta_url}}"
}
```

### Available template variables

```handlebars
{
  "alert_id": {{alert_id}},
  "alert_name": "{{alert_name}}",
  "alert_for": "{{alert_for}}",
  "alert_value": "{{alert_value}}",
  "alert_status": "{{alert_status}}",
  "alert_severity": "{{alert_severity}}",
  "alert_message": "{{alert_message}}",
  "alert_source": "{{alert_source}}",
  "alert_timestamp": "{{alert_timestamp}}",
  "alert_cta_url": "{{alert_cta_url}}",
  "alert_cta_text": "{{alert_cta_text}}",
  "alert_incident_id": {{#alert_incident_id}}{{alert_incident_id}}{{/alert_incident_id}}{{^alert_incident_id}}null{{/alert_incident_id}},
  "alert_incident_url": {{#alert_incident_url}}"{{alert_incident_url}}"{{/alert_incident_url}}{{^alert_incident_url}}null{{/alert_incident_url}},
  "alert_failure_threshold": {{alert_failure_threshold}},
  "alert_success_threshold": {{alert_success_threshold}},
  "is_resolved": {{is_resolved}},
  "is_triggered": {{is_triggered}},
  "site_url": "{{site_url}}",
  "site_name": "{{site_name}}",
  "site_logo_url": "{{site_logo_url}}",
  "colors_up": "{{colors_up}}",
  "colors_down": "{{colors_down}}",
  "colors_degraded": "{{colors_degraded}}",
  "colors_maintenance": "{{colors_maintenance}}"
}
```
