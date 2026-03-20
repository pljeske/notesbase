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
Full PostgreSQL connection URL assembled from subchart values.
*/}}
{{- define "notesbase.databaseURL" -}}
postgres://{{ .Values.postgres.userDatabase.user.value }}:{{ .Values.postgres.userDatabase.password.value }}@{{ .Release.Name }}-postgres:5432/{{ .Values.postgres.userDatabase.name.value }}?sslmode=disable
{{- end }}

{{/*
MinIO endpoint (service name of the subchart).
*/}}
{{- define "notesbase.minioEndpoint" -}}
{{ .Release.Name }}-minio:9000
{{- end }}

{{/*
CORS origin: use explicit value if set, otherwise derive from ingress host.
*/}}
{{- define "notesbase.corsOrigins" -}}
{{- if .Values.config.corsAllowedOrigins -}}
{{ .Values.config.corsAllowedOrigins }}
{{- else if .Values.ingress.host -}}
https://{{ .Values.ingress.host }}
{{- else -}}
*
{{- end -}}
{{- end }}
