<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" />

  <xsl:template match="/">
    <html>
      <head>
        <meta charset="utf-8"/>
        <title><xsl:value-of select="/rss/channel/title"/></title>
        <style>
          body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.5;color:#0f172a;background:#fff;padding:28px;}
          .meta{color:#6b7280;margin-bottom:12px;}
          .item{border-top:1px solid #e6e9ee;padding:18px 0;}
          .item:first-of-type{border-top:0}
          h1{font-size:20px;margin:0 0 6px}
          h2{font-size:14px;margin:0 0 6px;color:#374151}
          a{color:#0366d6;text-decoration:none}
          a:hover{text-decoration:underline}
          .pub{color:#6b7280;font-size:13px}
        </style>
      </head>
      <body>
        <h1><xsl:value-of select="/rss/channel/title"/></h1>
        <div class="meta">
          <xsl:value-of select="/rss/channel/description"/> — <span class="pub">Last build: <xsl:value-of select="/rss/channel/pubDate"/></span>
        </div>

        <xsl:for-each select="/rss/channel/item">
          <div class="item">
            <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
            <div class="pub"><xsl:value-of select="pubDate"/> — <xsl:value-of select="guid"/></div>
            <div class="content">
              <xsl:copy-of select="description/node()"/>
            </div>
          </div>
        </xsl:for-each>

      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>