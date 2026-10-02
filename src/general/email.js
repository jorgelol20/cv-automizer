export function renderEmailHtml(kit, source) {
  const keyPoints = (kit.keyPoints || [])
    .map((point) => `<li>${point}</li>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Email de Candidatura - ${source.name || ""}</title>
  <style>
    body {
      font-family: Georgia, serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      font-size: 20px;
      margin-bottom: 10px;
    }
    .subject {
      background: #f5f5f5;
      padding: 15px;
      border-left: 4px solid #333;
      margin: 20px 0;
    }
    .subject strong {
      display: block;
      margin-bottom: 5px;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
    }
    .body {
      margin: 20px 0;
    }
    .key-points {
      margin: 20px 0;
    }
    .key-points h2 {
      font-size: 14px;
      margin-bottom: 10px;
    }
    .key-points ul {
      padding-left: 20px;
    }
    .key-points li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <h1>Email de Candidatura Espontánea</h1>

  <div class="subject">
    <strong>Asunto sugerido</strong>
    ${kit.emailSubject || ""}
  </div>

  <div class="body">
    <strong>Cuerpo del email:</strong>
    <p>${kit.emailBody || ""}</p>
  </div>

  <div class="key-points">
    <h2>Puntos clave</h2>
    <ul>
      ${keyPoints}
    </ul>
  </div>
</body>
</html>`;
}
