import type { Plugin } from "vite";

export default function runableAnalyticsPlugin(): Plugin {
	return {
		name: "runable-analytics-plugin",
		enforce: "pre",
		transformIndexHtml(html) {
			const websiteUrl = process.env.WEBSITE_URL ?? "";
			const hostname = websiteUrl ? new URL(websiteUrl).hostname : "";
			const devmode = hostname === "localhost" ? ` data-devmode="true"` : "";

			const scriptTag = `<script defer src="./runable.js" data-hostname="${hostname}" data-url="https://r.lilstts.com/events"${devmode}></script>`;

			return html.replace("</head>", `  ${scriptTag}\n</head>`);
		},
	};
}
