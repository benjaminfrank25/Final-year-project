import { styleText } from "node:util";

type Format = Parameters<typeof styleText>[0];

// validateStream: false keeps colors on even when output is piped (e.g. via concurrently)
const paint = (format: Format, text: string) =>
  styleText(format, text, { validateStream: false });

const time = () => paint("gray", new Date().toLocaleTimeString());

export const log = {
  info: (msg: string) =>
    console.log(`${time()} ${paint(["bold", "cyan"], "INFO")}    ${msg}`),
  success: (msg: string) =>
    console.log(`${time()} ${paint(["bold", "green"], "SUCCESS")} ${msg}`),
  warn: (msg: string) =>
    console.warn(`${time()} ${paint(["bold", "yellow"], "WARN")}    ${msg}`),
  error: (msg: string, err?: unknown) => {
    console.error(`${time()} ${paint(["bold", "red"], "ERROR")}   ${msg}`);
    if (err) console.error(err);
  },
};
