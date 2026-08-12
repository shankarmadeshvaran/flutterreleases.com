import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite"
import path from "path";
import googleAnalyticsPlugin from "./vite/plugins/google-analytics-plugin";

const root = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, root, '');
	Object.assign(process.env, env);
	const gaMeasurementId = env.VITE_GA_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID;

	return {
		plugins: [react(), googleAnalyticsPlugin(gaMeasurementId), tailwind()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src/web"),
			},
		},
		server: {
			allowedHosts: true,
			hmr: { overlay: false, },
			cors: false
		}
	};
});
