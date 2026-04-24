# PARKPOW - KENER

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

## Webhook Trigger — Pushbullet

One trigger per recipient. Only the `email` field changes between triggers.

### Trigger config

| Field  | Value                                    |
| ------ | ---------------------------------------- |
| Type   | `webhook`                                |
| URL    | `https://api.pushbullet.com/v2/pushes`   |
| Header | `Access-Token: $PUSHBULLET_ACCESS_TOKEN` |

If the email matches a Pushbullet account → push notification.
If not → Pushbullet falls back to a plain email.

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

### Example Trigger

```handlebars
{
  "type": "note",
  "email": "name@platerecognizer.com", <!-- Push Bullet account email -->
  "title": "{{#is_triggered}}⚠️{{/is_triggered}}{{#is_resolved}}✅{{/is_resolved}} {{alert_name}}",
  "body": "Monitor: {{alert_for}}\nStatus: {{alert_status}}\nSeverity: {{alert_severity}}\nValue: {{alert_value}}\n{{alert_message}}\n\n{{alert_cta_url}}"
}
```

### Output

```
⚠️ Alert pave-external for STATUS DOWN TRIGGERED at 2026-04-22T12:33:36.372Z

Monitor: STATUS
Status: TRIGGERED
Severity: WARNING
Value: DOWN
This is a test alert

https://status.parkpow.com/monitors/pave-external
```
