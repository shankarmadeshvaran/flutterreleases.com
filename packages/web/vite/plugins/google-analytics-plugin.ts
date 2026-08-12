import type { Plugin } from "vite";

export default function googleAnalyticsPlugin(measurementId: string | undefined): Plugin {
	return {
		name: "google-analytics-plugin",
		enforce: "pre",
		transformIndexHtml(html) {
			if (!measurementId) return html;

			const scriptTag = `
		<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
		<script>
			window.dataLayer = window.dataLayer || [];
			function gtag(){dataLayer.push(arguments);}
			window.gtag = gtag;
			gtag('js', new Date());
			gtag('config', '${measurementId}', { anonymize_ip: true });
		</script>`;

			return html.replace("</head>", `${scriptTag}\n	</head>`);
		},
	};
}
