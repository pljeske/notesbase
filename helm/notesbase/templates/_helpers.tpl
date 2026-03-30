{{/*
Common labels applied to all resources.
*/}}
{{- define "notesbase.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels — stable identifiers used in matchLabels / Service selectors.
*/}}
{{- define "notesbase.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Name of the app Secret (created by this chart or pre-existing).
*/}}
{{- define "notesbase.secretName" -}}
{{- .Values.config.existingSecret | default (printf "%s-notesbase" .Release.Name) }}
{{- end }}

{{/*
Service account name.
*/}}
{{- define "notesbase.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- .Values.serviceAccount.name | default .Release.Name }}
{{- else }}
{{- .Values.serviceAccount.name | default "default" }}
{{- end }}
{{- end }}

{{/*
Full PostgreSQL connection URL.
When postgres.enabled=false, falls back to externalDatabase.url.
*/}}
{{- define "notesbase.databaseURL" -}}
{{- if .Values.postgres.enabled -}}
postgres://{{ .Values.postgres.userDatabase.user.value }}:{{ .Values.postgres.userDatabase.password.value }}@{{ .Release.Name }}-postgres:5432/{{ .Values.postgres.userDatabase.name.value }}?sslmode=disable
{{- else -}}
{{ required "externalDatabase.url is required when postgres.enabled=false" .Values.externalDatabase.url }}
{{- end -}}
{{- end }}

{{/*
MinIO endpoint (subchart service or external endpoint).
*/}}
{{- define "notesbase.minioEndpoint" -}}
{{- if .Values.minio.enabled -}}
{{ .Release.Name }}-minio:9000
{{- else -}}
{{ required "externalMinio.endpoint is required when minio.enabled=false" .Values.externalMinio.endpoint }}
{{- end -}}
{{- end }}

{{/*
MinIO access key (subchart rootUser or external).
*/}}
{{- define "notesbase.minioAccessKey" -}}
{{- if .Values.minio.enabled -}}
{{ .Values.minio.rootUser }}
{{- else -}}
{{ required "externalMinio.accessKey is required when minio.enabled=false" .Values.externalMinio.accessKey }}
{{- end -}}
{{- end }}

{{/*
MinIO secret key (subchart rootPassword or external).
*/}}
{{- define "notesbase.minioSecretKey" -}}
{{- if .Values.minio.enabled -}}
{{ required "minio.rootPassword is required" .Values.minio.rootPassword }}
{{- else -}}
{{ required "externalMinio.secretKey is required when minio.enabled=false" .Values.externalMinio.secretKey }}
{{- end -}}
{{- end }}

{{/*
CORS origin: use explicit value if set, otherwise derive from ingress host.
Fails if neither is configured to prevent an accidental wildcard origin.
*/}}
{{- define "notesbase.corsOrigins" -}}
{{- if .Values.config.corsAllowedOrigins -}}
{{ .Values.config.corsAllowedOrigins }}
{{- else if .Values.ingress.host -}}
https://{{ .Values.ingress.host }}
{{- else -}}
{{- fail "Either config.corsAllowedOrigins or ingress.host must be set" -}}
{{- end -}}
{{- end }}
