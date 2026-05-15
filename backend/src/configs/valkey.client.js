let valkey;

if (process.env.NODE_ENV === "production") {
  ({ default: valkey } = await import("./valkey.js"));
} else {
  ({ default: valkey } = await import("./valkey.render.js"));
}

export default valkey;
