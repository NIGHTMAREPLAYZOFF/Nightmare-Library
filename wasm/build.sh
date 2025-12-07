
#!/bin/bash
# Build Rust WASM module for Cloudflare Workers

wasm-pack build --target web --out-dir ../functions/wasm-dist

echo "WASM module built successfully!"
echo "Output: functions/wasm-dist/"
