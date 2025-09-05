import node from "solid-start-node";
import solid from "solid-start/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [solid({ adapter: node(), ssr: false })]
});
