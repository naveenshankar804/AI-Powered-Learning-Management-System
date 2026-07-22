export function buildPreviewDocument({ html = '', css = '', js = '' } = {}) {
  // Keep this document minimal and deterministic so preview behaves consistently.
  // Student code is executed inside the iframe/new tab just like the in-page preview.
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Amypo Preview</title>
    <style>
${css}
    </style>
  </head>
  <body>
${html}
    <script>
      try {
${js}
      } catch (error) {
        console.error('Runtime Error:', error);
      }
    </script>
  </body>
</html>`;
}

